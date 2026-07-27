import { findContextPreference, findGlobalRoles, findIdentityAccount, findSelectedGames, findTeamContexts, replaceSelectedGames, saveContextPreference } from "../models/identity.model.js";

const ROLE_ORDER = ["jogador", "lider", "capitao", "admin"];

export async function resolveUserAccess(userId, fallbackRole = null) {
  const [account, globalRoles, teamContexts, games, preference] = await Promise.all([
    findIdentityAccount(userId), findGlobalRoles(userId), findTeamContexts(userId), findSelectedGames(userId), findContextPreference(userId)
  ]);
  if (!account) return null;
  const roles = new Set(globalRoles);
  if (account.role === "admin") roles.add("admin");
  if (teamContexts.length) roles.add("jogador");
  if (teamContexts.some((item) => item.cargo === "leader")) roles.add("lider");
  if (teamContexts.some((item) => item.cargo === "captain")) roles.add("capitao");
  if (!roles.size) roles.add("jogador");
  const availableRoles = ROLE_ORDER.filter((role) => roles.has(role));
  const activeRole = availableRoles.includes(preference?.active_role) ? preference.active_role : availableRoles.includes(fallbackRole) ? fallbackRole : availableRoles[0];
  const allowedTeams = teamContexts.filter((item) => roleMatchesTeam(activeRole, item.cargo));
  const activeTeam = allowedTeams.find((item) => Number(item.team_id) === Number(preference?.active_team_id)) ?? allowedTeams[0] ?? null;
  const activeGame = games.find((item) => Number(item.id) === Number(preference?.active_game_id)) ?? games.find((item) => Number(item.id) === Number(activeTeam?.game_id)) ?? games[0] ?? null;
  return {
    id: Number(account.id), nome: account.nome, email: account.email, nickname: account.nickname, avatar: account.avatar,
    role: activeRole, active_role: activeRole, roles: availableRoles,
    active_game_id: activeGame ? Number(activeGame.id) : null, active_team_id: activeTeam ? Number(activeTeam.team_id) : null,
    email_verified: Boolean(account.email_verified_at), onboarding_completed: Boolean(account.onboarding_completed_at),
    needs_email: /@oauth\.arena-camp\.local$/i.test(String(account.email || "")),
    games: games.map((item) => ({ ...item, id: Number(item.id), is_primary: Boolean(item.is_primary) })),
    team_contexts: teamContexts.map((item) => ({ ...item, team_id: Number(item.team_id), game_id: Number(item.game_id), role: teamRole(item.cargo) })),
    organization_contexts: []
  };
}

export async function switchUserContext(user, payload) {
  const access = await resolveUserAccess(user.id, user.role);
  const role = String(payload.role || access.active_role);
  if (!access.roles.includes(role)) throw new Error("Este perfil nao esta disponivel para sua conta.");
  const matchingTeams = access.team_contexts.filter((item) => item.role === role || role === "jogador");
  const requestedGameId = payload.game_id ? Number(payload.game_id) : null;
  const team = payload.team_id
    ? matchingTeams.find((item) => Number(item.team_id) === Number(payload.team_id))
    : matchingTeams.find((item) => requestedGameId && Number(item.game_id) === requestedGameId)
      ?? matchingTeams.find((item) => Number(item.team_id) === Number(access.active_team_id))
      ?? matchingTeams[0]
      ?? null;
  const gameId = payload.game_id ? Number(payload.game_id) : Number(team?.game_id || access.active_game_id) || null;
  if (gameId && !access.games.some((game) => Number(game.id) === gameId) && !team) throw new Error("Este jogo nao esta vinculado a sua conta.");
  await saveContextPreference(user.id, { active_role: role, active_game_id: gameId, active_team_id: team?.team_id ?? null });
  return await resolveUserAccess(user.id, role);
}

export async function updateUserGames(user, payload) {
  const gameIds = [...new Set((Array.isArray(payload.game_ids) ? payload.game_ids : []).map(Number).filter(Number.isInteger))];
  if (!gameIds.length) throw new Error("Selecione pelo menos um jogo.");
  const primaryGameId = gameIds.includes(Number(payload.primary_game_id)) ? Number(payload.primary_game_id) : gameIds[0];
  await replaceSelectedGames(user.id, gameIds, primaryGameId);
  const access = await resolveUserAccess(user.id, user.role);
  await saveContextPreference(user.id, { active_role: access.active_role, active_game_id: primaryGameId, active_team_id: access.active_team_id });
  return await resolveUserAccess(user.id, access.active_role);
}

function teamRole(cargo) { return cargo === "leader" ? "lider" : cargo === "captain" ? "capitao" : "jogador"; }
function roleMatchesTeam(role, cargo) { return role === "jogador" || (role === "lider" && cargo === "leader") || (role === "capitao" && cargo === "captain"); }
