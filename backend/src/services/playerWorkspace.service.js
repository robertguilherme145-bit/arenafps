import bcrypt from "bcrypt";
import QRCode from "qrcode";
import { findGame } from "../models/game.model.js";
import { findNotifications } from "../models/notification.model.js";
import {
  cancelPlayerRequest,
  createPlayerRequest,
  createPlayerTeamMessage,
  createPlayerTicket,
  findPlayerCareerData,
  findPlayerEvents,
  findPlayerLineups,
  findPlayerMatches,
  findPlayerRequests,
  findPlayerTeamMembers,
  findPlayerTeamMessages,
  findPlayerTickets,
  findPlayerWorkspaceContexts,
  findPlayerWorkspaceGames,
  findPlayerWorkspaceProfile,
  findPublicPlayerBySlug,
  findUpcomingPlayerTournaments,
  replyPlayerTicket,
  respondPlayerInvite,
  savePlayerEventAttendance,
  savePlayerGameProfile,
  savePlayerMatchAttendance,
  savePlayerProfile,
  searchPlayerTeams,
  updatePlayerPassword
} from "../models/playerWorkspace.model.js";
import { findCaptain, findLeader, findTeam } from "../models/team.model.js";
import { findPendingRequest } from "../models/teamRequest.model.js";
import { findUserById } from "../models/user.model.js";
import { disableTwoFactor, enableTwoFactor, findTwoFactor, findUserSessions, revokeCurrentSession, revokeUserSession, saveTwoFactorSecret } from "../models/security.model.js";
import {
  findLeaderMember,
  isUserBlockedByTeam,
  logLeaderMemberHistory,
  removeLeaderMember,
  saveLeaderPreferences
} from "../models/leader.model.js";
import { getMatchOperations } from "./competitionSetup.service.js";
import { notify } from "./notification.service.js";
import { getTeamPlayerRanking } from "./teamRanking.service.js";
import { createTotpSecret, createTotpUri, verifyTotp } from "../utils/totp.js";
import { evaluateAchievements } from "./achievement.service.js";

export async function getPlayerWorkspace(user, requestedTeamId = null) {
  const [profileRow, games, contexts, requests, notifications, twoFactor, sessions] = await Promise.all([
    findPlayerWorkspaceProfile(user.id),
    findPlayerWorkspaceGames(user.id),
    findPlayerWorkspaceContexts(user.id),
    findPlayerRequests(user.id),
    findNotifications(user.id),
    findTwoFactor(user.id),
    findUserSessions(user.id, user.jti)
  ]);
  if (!profileRow) throw new Error("Perfil de jogador nao encontrado.");

  const selectedTeamId = requestedTeamId ?? user.active_team_id;
  const context = contexts.find((item) => Number(item.team_id) === Number(selectedTeamId))
    ?? contexts.find((item) => Number(item.game_id) === Number(user.active_game_id))
    ?? contexts[0]
    ?? null;
  const [recommendedTeams, tickets] = await Promise.all([
    searchPlayerTeams(user.id, { recruiting: true }),
    findPlayerTickets(user.id)
  ]);

  const base = {
    profile: normalizeProfile(profileRow),
    games: games.map(normalizeGame),
    teams: contexts.map(normalizeContext),
    requests,
    recommended_teams: recommendedTeams.map(normalizeSearchTeam),
    notifications: notifications.map((item) => ({ ...item, lida: Boolean(item.lida) })),
    tickets,
    permissions: playerPermissions(),
    security: { two_factor_enabled: Boolean(twoFactor?.enabled), sessions }
  };

  if (!context) {
    const career = await findPlayerCareerData(user.id, null, user.active_game_id);
    return {
      ...base,
      current_team: null,
      members: [], lineups: [], matches: [], events: [], messages: { team: [] }, upcoming_tournaments: [],
      team_ranking: { team_id: 0, generated_at: new Date().toISOString(), players: [] },
      career: await buildCareer(user.id, user.active_game_id, career, notifications)
    };
  }

  const [members, lineups, matches, events, messages, teamRanking, career, upcomingTournaments] = await Promise.all([
    findPlayerTeamMembers(context.team_id),
    findPlayerLineups(context.team_id, context.player_id),
    findPlayerMatches(context.team_id, user.id, context.player_id),
    findPlayerEvents(context.team_id, user.id),
    findPlayerTeamMessages(context.team_id),
    getTeamPlayerRanking(context.team_id),
    findPlayerCareerData(user.id, context.player_id, context.game_id),
    findUpcomingPlayerTournaments(user.id, context.game_id)
  ]);

  return {
    ...base,
    current_team: normalizeContext(context),
    members: members.map((item) => ({ ...item, player_id: item.player_id ? Number(item.player_id) : null })),
    lineups: groupLineups(lineups),
    matches: matches.map(normalizeMatch),
    events,
    messages: { team: messages },
    upcoming_tournaments: upcomingTournaments,
    team_ranking: teamRanking,
    career: await buildCareer(user.id, context.game_id, career, notifications)
  };
}

export async function getPlayerTeamSearch(user, filters) {
  return (await searchPlayerTeams(user.id, filters)).map(normalizeSearchTeam);
}

export async function getPlayerCareerSummary(userId, gameId, notifications = []) {
  const data = await findPlayerCareerData(userId, null, gameId);
  return await buildCareer(userId, gameId, data, notifications);
}

export async function getPublicPlayerProfile(slug) {
  const account = await findPublicPlayerBySlug(slug);
  if (!account) { const error = new Error("Perfil publico nao encontrado."); error.status = 404; throw error; }
  const [profileRow, games, contexts] = await Promise.all([
    findPlayerWorkspaceProfile(account.id),
    findPlayerWorkspaceGames(account.id),
    findPlayerWorkspaceContexts(account.id)
  ]);
  const publicGameId = contexts[0]?.game_id ?? games.find((game) => game.profile_id)?.game_id ?? null;
  const careerData = await findPlayerCareerData(account.id, null, publicGameId);
  const context = contexts[0] ?? null;
  const ranking = context ? await getTeamPlayerRanking(context.team_id) : { team_id: 0, generated_at: new Date().toISOString(), players: [] };
  const profile = normalizeProfile(profileRow);
  delete profile.email;
  delete profile.birth_date;
  delete profile.phone;
  delete profile.whatsapp_opt_in;
  delete profile.pix_key;
  delete profile.pix_key_type;
  return {
    profile,
    games: games.map(normalizeGame).filter((game) => game.selected),
    current_team: context ? normalizeContext(context) : null,
    team_ranking: ranking,
    career: await buildCareer(account.id, publicGameId, careerData, [])
  };
}

export async function updatePlayerWorkspaceProfile(user, payload) {
  const nickname = requiredText(payload.nickname, "Informe seu nickname.", 50);
  const nome = requiredText(payload.nome, "Informe seu nome.", 255);
  const languages = uniqueTexts(payload.languages, 10, 20);
  const linkKeys = ["steam", "faceit", "discord", "riot_id", "xbox", "playstation", "epic_games", "battlenet", "twitch", "youtube", "kick", "instagram", "x", "tiktok"];
  const links = Object.fromEntries(linkKeys.map((key) => [key, optionalText(payload.links?.[key], 255)]));

  await savePlayerProfile(user.id, {
    nome,
    nickname,
    avatar: optionalUrl(payload.avatar),
    banner: optionalUrl(payload.banner),
    bio: optionalText(payload.bio, 2000),
    cidade: optionalText(payload.cidade, 100),
    estado: optionalText(payload.estado, 100),
    pais: optionalText(payload.pais, 100),
    birth_date: optionalDate(payload.birth_date),
    languages,
    phone: optionalPhone(payload.phone),
    whatsapp_opt_in: payload.whatsapp_opt_in === true,
    pix_key: optionalText(payload.pix_key, 255),
    pix_key_type: optionalPixType(payload.pix_key_type),
    links
  });
  return { mensagem: "Perfil competitivo atualizado." };
}

export async function updatePlayerGame(user, payload) {
  const gameId = Number(payload.game_id);
  if (!Number.isInteger(gameId) || !await findGame(gameId)) throw new Error("Jogo nao encontrado.");
  await savePlayerGameProfile(user.id, {
    game_id: gameId,
    nickname: requiredText(payload.nickname, "Informe o nickname usado no jogo.", 50),
    game_player_id: requiredText(payload.game_player_id, "Informe o ID da plataforma.", 100),
    rank_name: optionalText(payload.rank_name, 100),
    elo: optionalInteger(payload.elo),
    level: optionalInteger(payload.level)
  });
  return { mensagem: "Jogo vinculado ao perfil." };
}

export async function requestPlayerTeam(user, teamId, payload) {
  const team = await findTeam(Number(teamId));
  if (!team || !team.ativo) throw new Error("Equipe nao encontrada.");
  if (!team.recrutando) throw new Error("Esta equipe nao esta recebendo solicitacoes.");
  if (await isUserBlockedByTeam(team.id, user.id)) throw new Error("Nao e possivel solicitar entrada nesta equipe.");
  const contexts = await findPlayerWorkspaceContexts(user.id);
  if (contexts.some((item) => Number(item.game_id) === Number(team.game_id))) throw new Error("Voce ja pertence a uma equipe deste jogo.");
  if (await findPendingRequest(team.id, user.id, "request")) throw new Error("Sua solicitacao ja esta aguardando resposta.");
  if (await findPendingRequest(team.id, user.id, "invite")) throw new Error("Esta equipe ja enviou um convite para voce.");

  const account = await findUserById(user.id);
  const requestId = await createPlayerRequest(team.id, user.id, optionalText(payload.message, 500));
  const leader = await findLeader(team.id);
  if (leader) await notify({ user_id: leader.user_id, titulo: "Nova solicitacao de entrada", mensagem: `${userName(account || user)} quer entrar na equipe ${team.nome}.`, tipo: "team_request", link: "/lider?module=roster" });
  return { id: requestId, mensagem: "Solicitacao enviada ao lider." };
}

export async function cancelPlayerTeamRequest(user, requestId) {
  if (!await cancelPlayerRequest(Number(requestId), user.id)) throw new Error("Solicitacao pendente nao encontrada.");
  return { mensagem: "Solicitacao cancelada." };
}

export async function answerPlayerInvite(user, requestId, action) {
  if (!["accept", "reject", "block"].includes(action)) throw new Error("Resposta de convite invalida.");
  const request = await respondPlayerInvite(Number(requestId), user.id, action);
  const account = await findUserById(user.id);
  if (action === "accept") await logLeaderMemberHistory(request.team_id, user.id, user.id, "convite_aceito", { request_id: request.id });
  const leader = await findLeader(request.team_id);
  if (leader) await notify({ user_id: leader.user_id, titulo: action === "accept" ? "Convite aceito" : "Convite recusado", mensagem: `${userName(account || user)} ${action === "accept" ? "entrou na" : "recusou o convite da"} equipe ${request.team_name}.`, tipo: "team_invite_response", link: "/lider?module=roster" });
  return { mensagem: action === "accept" ? "Convite aceito. Bem-vindo a equipe." : "Convite recusado." };
}

export async function updatePlayerMatchAttendance(user, matchId, payload) {
  const workspace = await getPlayerWorkspace(user, payload.team_id);
  const match = workspace.matches.find((item) => Number(item.id) === Number(matchId));
  if (!match) throw new Error("Partida nao encontrada para sua equipe.");
  if (!match.in_official_lineup) throw new Error("Somente jogadores da lineup oficial confirmam presenca.");
  if (match.status === "finalizada") throw new Error("A partida ja foi finalizada.");
  const status = attendanceStatus(payload.status);
  await savePlayerMatchAttendance(match.id, user.id, status, optionalText(payload.note, 500));
  if (status === "ausente") await notifyTeamStaff(workspace.current_team.team_id, `${workspace.profile.nickname} nao podera jogar`, `O jogador informou ausencia na partida contra ${match.opponent}.`, "player_absent", "/lider?module=calendar");
  return { mensagem: "Presenca atualizada." };
}

export async function updatePlayerEventAttendance(user, eventId, payload) {
  const workspace = await getPlayerWorkspace(user, payload.team_id);
  const event = workspace.events.find((item) => Number(item.id) === Number(eventId));
  if (!event) throw new Error("Evento nao encontrado para sua equipe.");
  await savePlayerEventAttendance(event.id, user.id, attendanceStatus(payload.status));
  return { mensagem: "Presenca no evento atualizada." };
}

export async function getPlayerMatchRoom(user, matchId, teamId = null) {
  const workspace = await getPlayerWorkspace(user, teamId);
  const match = workspace.matches.find((item) => Number(item.id) === Number(matchId));
  if (!match || !workspace.current_team) throw new Error("Partida nao encontrada para sua equipe.");
  const room = await getMatchOperations(match.id);
  if (!match.in_official_lineup) {
    room.match.server_address = null;
    room.match.server_password = null;
  }
  return { ...room, attendance_status: match.attendance_status, in_official_lineup: match.in_official_lineup, read_only: true };
}

export async function sendPlayerTeamMessage(user, payload) {
  const workspace = await getPlayerWorkspace(user, payload.team_id);
  if (!workspace.current_team) throw new Error("Voce nao pertence a uma equipe ativa.");
  const id = await createPlayerTeamMessage(workspace.current_team.team_id, user.id, {
    message: requiredText(payload.message, "Escreva uma mensagem.", 5000),
    attachment_url: optionalUrl(payload.attachment_url)
  });
  return { id, mensagem: "Mensagem enviada." };
}

export async function openPlayerTicket(user, payload) {
  const id = await createPlayerTicket(user.id, {
    category: requiredText(payload.category || "geral", "Informe a categoria.", 80),
    priority: ["baixa", "media", "alta", "critica"].includes(payload.priority) ? payload.priority : "media",
    subject: requiredText(payload.subject, "Informe o assunto.", 160),
    message: requiredText(payload.message, "Descreva sua solicitacao.", 5000)
  });
  return { id, mensagem: "Chamado aberto." };
}

export async function replyToPlayerTicket(user, ticketId, payload) {
  const message = requiredText(payload.message, "Escreva uma resposta.", 5000);
  if (!await replyPlayerTicket(Number(ticketId), user.id, message)) throw new Error("Chamado nao encontrado.");
  return { mensagem: "Resposta adicionada ao chamado." };
}

export async function updatePlayerSettings(user, payload) {
  await saveLeaderPreferences(user.id, {
    language: ["pt-BR", "en-US", "es-ES"].includes(payload.language) ? payload.language : "pt-BR",
    theme: ["dark", "light", "system"].includes(payload.theme) ? payload.theme : "dark",
    steam_profile: optionalText(payload.steam_profile, 255),
    email_notifications: payload.email_notifications !== false,
    discord_notifications: Boolean(payload.discord_notifications),
    profile_public: payload.profile_public !== false
  });
  return { mensagem: "Preferencias atualizadas." };
}

export async function changePlayerPassword(user, payload) {
  const account = await findUserById(user.id);
  if (!account || !await bcrypt.compare(String(payload.current_password ?? ""), account.senha_hash)) throw new Error("A senha atual esta incorreta.");
  const nextPassword = String(payload.new_password ?? "");
  if (nextPassword.length < 8) throw new Error("A nova senha deve ter pelo menos 8 caracteres.");
  if (nextPassword !== payload.confirm_password) throw new Error("A confirmacao da nova senha nao confere.");
  await updatePlayerPassword(user.id, await bcrypt.hash(nextPassword, 10));
  return { mensagem: "Senha alterada com seguranca." };
}

export async function startPlayerTwoFactor(user) {
  const account = await findUserById(user.id);
  if (!account) throw new Error("Conta nao encontrada.");
  const current = await findTwoFactor(user.id);
  if (current?.enabled) throw new Error("A autenticacao em duas etapas ja esta ativa.");
  const secret = createTotpSecret();
  const uri = createTotpUri(secret, account.email);
  await saveTwoFactorSecret(user.id, secret);
  return { secret, manual_key: secret, qr_code: await QRCode.toDataURL(uri, { width: 280, margin: 1 }) };
}

export async function confirmPlayerTwoFactor(user, payload) {
  const current = await findTwoFactor(user.id);
  if (!current || !verifyTotp(current.secret, payload.code)) throw new Error("Codigo de autenticacao invalido.");
  await enableTwoFactor(user.id);
  return { mensagem: "Autenticacao em duas etapas ativada." };
}

export async function disablePlayerTwoFactor(user, payload) {
  const [account, current] = await Promise.all([findUserById(user.id), findTwoFactor(user.id)]);
  if (!account || !await bcrypt.compare(String(payload.password ?? ""), account.senha_hash)) throw new Error("A senha atual esta incorreta.");
  if (!current?.enabled || !verifyTotp(current.secret, payload.code)) throw new Error("Codigo de autenticacao invalido.");
  await disableTwoFactor(user.id);
  return { mensagem: "Autenticacao em duas etapas desativada." };
}

export async function revokePlayerSession(user, sessionId) {
  if (!await revokeUserSession(user.id, Number(sessionId))) throw new Error("Sessao ativa nao encontrada.");
  return { mensagem: "Sessao encerrada." };
}

export async function logoutPlayerSession(user) {
  await revokeCurrentSession(user.id, user.jti);
  return { mensagem: "Sessao encerrada." };
}

export async function leavePlayerTeam(user, payload) {
  const workspace = await getPlayerWorkspace(user, payload.team_id);
  const team = workspace.current_team;
  if (!team) throw new Error("Equipe ativa nao encontrada.");
  if (String(payload.team_name ?? "").trim().toLocaleLowerCase("pt-BR") !== team.team_name.toLocaleLowerCase("pt-BR")) throw new Error(`Digite ${team.team_name} para confirmar a saida.`);
  const member = await findLeaderMember(team.membership_id);
  if (!member || Number(member.user_id) !== Number(user.id) || ["leader", "captain"].includes(member.cargo)) throw new Error("Este vinculo nao pode ser encerrado pelo painel do jogador.");
  await logLeaderMemberHistory(team.team_id, user.id, user.id, "saida_voluntaria", { previous_role: member.cargo });
  await removeLeaderMember(member);
  await notifyTeamStaff(team.team_id, "Jogador saiu da equipe", `${workspace.profile.nickname} saiu voluntariamente da equipe ${team.team_name}.`, "team_member_left", "/lider?module=roster");
  return { mensagem: `Voce saiu da equipe ${team.team_name}.` };
}

async function buildCareer(userId, gameId, data, notifications) {
  const history = data.history.map((item) => ({
    ...item,
    kills: Number(item.kills), deaths: Number(item.deaths), assists: Number(item.assists), headshots: Number(item.headshots),
    mvp: Boolean(item.mvp), won: Number(item.winner_team_id) === Number(item.team_id),
    kd: ratio(item.kills, item.deaths), hs_percent: percent(item.headshots, item.kills)
  }));
  const totals = history.reduce((sum, item) => ({
    matches: sum.matches + 1, wins: sum.wins + (item.won ? 1 : 0), losses: sum.losses + (item.won ? 0 : 1),
    kills: sum.kills + item.kills, deaths: sum.deaths + item.deaths, assists: sum.assists + item.assists,
    headshots: sum.headshots + item.headshots, mvps: sum.mvps + (item.mvp ? 1 : 0)
  }), { matches: 0, wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0, headshots: 0, mvps: 0 });
  const globalRank = data.global_ranking.findIndex((item) => Number(item.user_id) === Number(userId));
  const streak = longestWinStreak([...history].reverse());
  const achievements = await evaluateAchievements(userId, gameId, { ...totals, win_streak: streak, global_rank: globalRank >= 0 ? globalRank + 1 : 0 });
  const achievementXp = achievements.filter((item) => item.unlocked).reduce((sum, item) => sum + item.xp_reward, 0);
  const xp = totals.matches * 50 + totals.wins * 100 + totals.kills * 2 + totals.assists + totals.mvps * 25 + achievementXp;
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
  const feed = [
    ...history.map((item) => ({ id: `match-${item.id}`, type: "match", title: item.won ? "Vitoria registrada" : "Partida finalizada", description: `${item.team_name} vs ${item.opponent} · ${item.kills}/${item.deaths}/${item.assists}`, created_at: item.finished_at })),
    ...data.team_history.map((item) => ({ id: `team-${item.id}`, type: "team", title: historyAction(item.action), description: item.team_name, created_at: item.created_at })),
    ...notifications.slice(0, 20).map((item) => ({ id: `notification-${item.id}`, type: "notification", title: item.titulo, description: item.mensagem, created_at: item.created_at }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50);

  return {
    level, xp, next_level_xp: level * level * 100,
    totals: { ...totals, kd: ratio(totals.kills, totals.deaths), kda: ratio(totals.kills + totals.assists, totals.deaths), hs_percent: percent(totals.headshots, totals.kills), win_rate: percent(totals.wins, totals.matches), global_rank: globalRank >= 0 ? globalRank + 1 : null, longest_win_streak: streak, titles: 0, runner_ups: 0, top_four: 0 },
    history,
    monthly: data.monthly.map((item) => ({ ...item, kills: Number(item.kills), deaths: Number(item.deaths), assists: Number(item.assists), headshots: Number(item.headshots), mvps: Number(item.mvps), matches: Number(item.matches), wins: Number(item.wins), kd: ratio(item.kills, item.deaths), hs_percent: percent(item.headshots, item.kills), win_rate: percent(item.wins, item.matches) })),
    tournaments: data.tournaments.map((item) => ({ ...item, matches: Number(item.matches), wins: Number(item.wins), kills: Number(item.kills), deaths: Number(item.deaths), assists: Number(item.assists), mvps: Number(item.mvps), kd: ratio(item.kills, item.deaths), win_rate: percent(item.wins, item.matches) })),
    achievements,
    feed
  };
}

function groupLineups(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const lineup = grouped.get(Number(row.entry_id)) ?? { entry_id: Number(row.entry_id), tournament_id: Number(row.tournament_id), tournament_name: row.tournament_name, entry_status: row.entry_status, lineup_id: row.lineup_id ? Number(row.lineup_id) : null, lineup_name: row.lineup_name, my_position: null, players: [] };
    const player = { player_id: Number(row.player_id), titular: Boolean(row.titular), confirmado: Boolean(row.confirmado), ordem: Number(row.ordem), nick: row.nick, game_uid: row.game_uid, foto: row.foto, is_me: Boolean(row.is_me) };
    lineup.players.push(player);
    if (player.is_me) lineup.my_position = player.titular ? "titular" : "reserva";
    grouped.set(Number(row.entry_id), lineup);
  }
  return [...grouped.values()];
}

function normalizeProfile(row) {
  return {
    id: Number(row.id), nome: row.nome, email: row.email, avatar: row.avatar, banner: row.banner,
    nickname: row.nickname || row.nome, bio: row.bio, pais: row.pais, estado: row.estado, cidade: row.cidade,
    birth_date: row.birth_date, languages: parseJson(row.languages, []), phone: row.phone, whatsapp_opt_in: Boolean(row.whatsapp_opt_in), pix_key: row.pix_key, pix_key_type: row.pix_key_type, created_at: row.created_at,
    links: { steam: row.steam, faceit: row.faceit, discord: row.linked_discord || row.discord, riot_id: row.riot_id, xbox: row.xbox, playstation: row.playstation, epic_games: row.epic_games, battlenet: row.battlenet, twitch: row.twitch, youtube: row.youtube, kick: row.kick, instagram: row.instagram, x: row.x, tiktok: row.tiktok },
    preferences: { language: row.language || "pt-BR", theme: row.theme || "dark", steam_profile: row.steam_profile, email_notifications: row.email_notifications === null ? true : Boolean(row.email_notifications), discord_notifications: Boolean(row.discord_notifications), profile_public: row.profile_public === null ? true : Boolean(row.profile_public) }
  };
}

function normalizeGame(row) { return { ...row, game_id: Number(row.game_id), profile_id: row.profile_id ? Number(row.profile_id) : null, elo: row.elo === null ? null : Number(row.elo), level: row.level === null ? null : Number(row.level), selected: Boolean(row.selected), is_primary: Boolean(row.is_primary) }; }
function normalizeContext(row) { return { ...row, membership_id: Number(row.membership_id), team_id: Number(row.team_id), game_id: Number(row.game_id), player_id: row.player_id ? Number(row.player_id) : null }; }
function normalizeSearchTeam(row) { return { ...row, id: Number(row.id), game_id: Number(row.game_id), member_count: Number(row.member_count), recruiting: Boolean(row.recrutando), private: Boolean(row.privada), pending_request_id: row.pending_request_id ? Number(row.pending_request_id) : null }; }
function normalizeMatch(row) { return { ...row, id: Number(row.id), in_official_lineup: Boolean(row.in_official_lineup), mvp: Boolean(row.mvp), server_password: null }; }

async function notifyTeamStaff(teamId, title, message, type, link) {
  const [leader, captain] = await Promise.all([findLeader(teamId), findCaptain(teamId)]);
  const ids = [...new Set([leader?.user_id, captain?.user_id].filter(Boolean).map(Number))];
  await Promise.all(ids.map((userId) => notify({ user_id: userId, titulo: title, mensagem: message, tipo: type, link })));
}

function playerPermissions() { return { edit_profile: true, manage_game_profiles: true, request_team: true, respond_invites: true, confirm_attendance: true, view_veto: true, view_match_room: true, send_team_messages: true, open_tickets: true, edit_results: false, operate_veto: false, manage_lineup: false, manage_payments: false }; }
function attendanceStatus(value) { if (!["confirmado", "ausente", "talvez"].includes(value)) throw new Error("Status de presenca invalido."); return value; }
function requiredText(value, message, max) { const text = String(value ?? "").trim(); if (!text) throw new Error(message); return text.slice(0, max); }
function optionalText(value, max) { const text = String(value ?? "").trim(); return text ? text.slice(0, max) : null; }
function optionalUrl(value) { const text = String(value ?? "").trim(); if (!text) return null; try { return new URL(text).toString(); } catch { throw new Error("Informe uma URL valida."); } }
function optionalDate(value) { if (!value) return null; const date = new Date(value); if (Number.isNaN(date.getTime()) || date > new Date()) throw new Error("Data de nascimento invalida."); return date.toISOString().slice(0, 10); }
function optionalPhone(value) { const phone=String(value??"").replace(/\D/g,""); if (!phone) return null; if (phone.length<10||phone.length>15) throw new Error("Informe um telefone valido com DDD e codigo do pais."); return `+${phone}`; }
function optionalPixType(value) { const type=String(value??"").trim(); return ["cpf","cnpj","email","telefone","aleatoria"].includes(type) ? type : null; }
function optionalInteger(value) { if (value === null || value === undefined || value === "") return null; const number = Number(value); return Number.isInteger(number) ? number : null; }
function uniqueTexts(value, limit, max) { return [...new Set((Array.isArray(value) ? value : []).map((item) => String(item).trim().slice(0, max)).filter(Boolean))].slice(0, limit); }
function parseJson(value, fallback) { if (!value) return fallback; if (typeof value !== "string") return value; try { return JSON.parse(value); } catch { return fallback; } }
function ratio(value, total) { const numerator = Number(value ?? 0); const denominator = Number(total ?? 0); return denominator ? Number((numerator / denominator).toFixed(2)) : numerator; }
function percent(value, total) { return Number(total) ? Number(((Number(value) / Number(total)) * 100).toFixed(1)) : 0; }
function longestWinStreak(history) { let best = 0; let current = 0; for (const match of history) { current = match.won ? current + 1 : 0; best = Math.max(best, current); } return best; }
function historyAction(value) { return ({ convite_aceito: "Entrou na equipe", saida_voluntaria: "Mudou de equipe", membro_atualizado: "Funcao atualizada", lideranca_transferida: "Lideranca atualizada" })[value] ?? String(value).replaceAll("_", " "); }
function userName(user) { return user.nome || user.nickname || `Jogador #${user.id}`; }
