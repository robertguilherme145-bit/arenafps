import { countEntries, findEntryByTeamAndTournament, updateEntryStatus } from "../models/entry.model.js";
import { getTournamentCompetitionRecord } from "../models/competitionSetup.model.js";
import {
  createEntryFromLineup,
  createLeaderCompetitionRequest,
  createLeaderDispute,
  createLeaderDocument,
  createLeaderEvent,
  createLeaderMessage,
  createLeaderTicket,
  replyLeaderTicket,
  createTeamInvitation,
  decideTeamRequest,
  deleteLeaderEvent,
  demoteTeamCaptains,
  findLeaderMember,
  findLeaderEvent,
  findLeaderTeam,
  findLineup,
  findPendingTeamRequest,
  findRequestForLeader,
  findTeamMatch,
  getActiveTeamPlayers,
  getLeaderWorkspaceData,
  getLeaderTournamentCenterData,
  getLineupPlayers,
  isUserBlockedByTeam,
  listLeaderGames,
  logLeaderMemberHistory,
  removeLeaderMember,
  resendTeamInvitation,
  saveLeaderLineup,
  saveLeaderPreferences,
  setLeaderEventAttendance,
  setLeaderTeamArchived,
  setLineupStatus,
  transferLeaderMembership,
  updateLeaderMember,
  updateLeaderTeam
} from "../models/leader.model.js";
import { findMembershipByUserAndTeam } from "../models/team.model.js";
import { findTournament } from "../models/tournament.model.js";
import { findUserByEmail } from "../models/user.model.js";
import { getMatchOperations, performParticipantVetoAction } from "./competitionSetup.service.js";
import { notify } from "./notification.service.js";
import { createEntryPayment, syncTeamPendingPayments } from "./payment.service.js";
import { getTeamPlayerRanking } from "./teamRanking.service.js";
import { getPlayerCareerSummary } from "./playerWorkspace.service.js";
import { notifyTournamentRegulationToTeam } from "./tournamentRegulation.service.js";

const MEMBER_ROLES = ["captain", "manager", "player"];
const MEMBER_STATUSES = ["ativo", "inativo"];
const LINEUP_STATUSES = ["rascunho", "ativa", "congelada"];

export async function getLeaderWorkspace(user) {
  const [team, games] = await Promise.all([findLeaderTeam(user.id), listLeaderGames()]);
  if (!team) return emptyWorkspace(games);
  const [workspace, teamRanking, career] = await Promise.all([
    getLeaderWorkspaceData(team, user.id),
    getTeamPlayerRanking(team.id),
    getPlayerCareerSummary(user.id, team.game_id)
  ]);
  return { ...workspace, games, team_ranking: teamRanking, career, permissions: leaderPermissions() };
}

export async function saveLeaderTeam(user, payload) {
  const team = await requireLeaderTeam(user.id);
  const nome = requiredText(payload.nome, "Informe o nome da equipe.", 100);
  const tag = requiredText(payload.tag, "Informe a tag da equipe.", 10).toUpperCase();
  await updateLeaderTeam(team.id, {
    nome,
    tag,
    logo: optionalUrl(payload.logo),
    banner: optionalUrl(payload.banner),
    descricao: optionalText(payload.descricao, 2000),
    regiao: optionalText(payload.regiao, 100),
    discord: optionalText(payload.discord, 255),
    steam: optionalText(payload.steam, 255),
    instagram: optionalText(payload.instagram, 255),
    youtube: optionalText(payload.youtube, 255),
    twitch: optionalText(payload.twitch, 255),
    tiktok: optionalText(payload.tiktok, 255),
    website: optionalUrl(payload.website),
    recrutando: payload.recrutando !== false,
    privada: Boolean(payload.privada)
  });
  return await getLeaderWorkspace(user);
}

export async function inviteLeaderPlayer(user, payload) {
  const team = await requireLeaderTeam(user.id);
  const email = requiredText(payload.email, "Informe o email do jogador.", 255).toLowerCase();
  const invited = await findUserByEmail(email);
  if (!invited) throw new Error("Nenhuma conta foi encontrada com este email.");
  if (Number(invited.id) === Number(user.id)) throw new Error("Voce ja lidera esta equipe.");
  if (await findMembershipByUserAndTeam(invited.id, team.id)) throw new Error("Este jogador ja faz parte da equipe.");
  if (await isUserBlockedByTeam(team.id, invited.id)) throw new Error("Este usuario esta bloqueado para a equipe.");
  if (await findPendingTeamRequest(team.id, invited.id)) throw new Error("Ja existe um convite ou solicitacao pendente para este jogador.");

  const invitation = await createTeamInvitation(team.id, invited.id, user.id);
  await logLeaderMemberHistory(team.id, user.id, invited.id, "convite_enviado", { email });
  await notify({
    user_id: invited.id,
    titulo: `Convite da equipe ${team.nome}`,
    mensagem: "Voce recebeu um convite para integrar a equipe.",
    tipo: "team_invite",
    link: "/jogador?module=convites"
  });
  return invitation;
}

export async function respondLeaderRequest(user, requestId, action) {
  const team = await requireLeaderTeam(user.id);
  const request = await findRequestForLeader(Number(requestId));
  if (!request || Number(request.team_id) !== Number(team.id)) throw new Error("Solicitacao nao encontrada nesta equipe.");

  if (action === "resend") {
    if (request.tipo !== "invite") throw new Error("Somente convites podem ser reenviados.");
    await resendTeamInvitation(request.id);
    await notify({ user_id: request.user_id, titulo: `Convite reenviado por ${team.nome}`, mensagem: "O convite para a equipe continua disponivel.", tipo: "team_invite", link: "/jogador?module=convites" });
    return { mensagem: "Convite reenviado." };
  }

  if (!['accept', 'reject', 'cancel', 'block'].includes(action)) throw new Error("Acao de solicitacao invalida.");
  if (request.status !== "pending") throw new Error("Esta solicitacao ja foi processada.");
  if (request.tipo === "invite" && !["cancel"].includes(action)) throw new Error("O convidado precisa aceitar ou recusar o proprio convite.");
  if (request.tipo === "request" && action === "cancel") throw new Error("Use recusar para pedidos recebidos.");

  await decideTeamRequest(request, action, user.id);
  await logLeaderMemberHistory(team.id, user.id, request.user_id, `solicitacao_${action}`, { request_id: request.id, type: request.tipo });
  if (["accept", "reject", "block"].includes(action)) {
    const accepted = action === "accept";
    await notify({
      user_id: request.user_id,
      titulo: accepted ? "Entrada aprovada" : "Solicitacao encerrada",
      mensagem: accepted ? `Voce agora faz parte da equipe ${team.nome}.` : `A equipe ${team.nome} encerrou sua solicitacao.`,
      tipo: "team_request",
      link: accepted ? `/equipe/${team.slug}` : null
    });
  }
  return { mensagem: "Solicitacao atualizada." };
}

export async function saveLeaderMember(user, memberId, payload) {
  const team = await requireLeaderTeam(user.id);
  const member = await requireTeamMember(team.id, memberId);
  if (member.cargo === "leader") throw new Error("Use a transferencia de lideranca para alterar o lider.");
  const cargo = MEMBER_ROLES.includes(payload.cargo) ? payload.cargo : member.cargo;
  const lineupStatus = payload.lineup_status === "reserva" ? "reserva" : "titular";
  const status = MEMBER_STATUSES.includes(payload.status) ? payload.status : "ativo";
  const canInvitePlayers = cargo === "captain" && Boolean(payload.can_invite_players);
  const canRemovePlayers = cargo === "captain" && Boolean(payload.can_remove_players);
  if (cargo === "captain") await demoteTeamCaptains(team.id, member.id);
  await updateLeaderMember(member, { cargo, lineup_status: lineupStatus, status, can_invite_players: canInvitePlayers, can_remove_players: canRemovePlayers });
  await logLeaderMemberHistory(team.id, user.id, member.user_id, "membro_atualizado", {
    previous: { cargo: member.cargo, lineup_status: member.lineup_status, status: member.status },
    next: { cargo, lineup_status: lineupStatus, status, can_invite_players: canInvitePlayers, can_remove_players: canRemovePlayers }
  });
  return { mensagem: "Jogador atualizado." };
}

export async function transferLeaderTeam(user, memberId) {
  const team = await requireLeaderTeam(user.id);
  const member = await requireTeamMember(team.id, memberId);
  if (Number(member.user_id) === Number(user.id)) throw new Error("Voce ja e o lider da equipe.");
  if (member.status === "inativo") throw new Error("Reative o membro antes de transferir a lideranca.");
  await transferLeaderMembership(team.id, user.id, member);
  await logLeaderMemberHistory(team.id, user.id, member.user_id, "lideranca_transferida");
  return { mensagem: "Lideranca transferida. Sua conta agora possui permissao de capitao." };
}

export async function deleteLeaderMember(user, memberId) {
  const team = await requireLeaderTeam(user.id);
  const member = await requireTeamMember(team.id, memberId);
  if (member.cargo === "leader") throw new Error("O lider nao pode remover a propria conta.");
  await logLeaderMemberHistory(team.id, user.id, member.user_id, "membro_removido", { cargo: member.cargo });
  await removeLeaderMember(member);
  return { mensagem: "Membro removido e historico competitivo preservado." };
}

export async function saveLeaderLineupConfiguration(user, lineupId, payload) {
  const team = await requireLeaderTeam(user.id);
  const current = lineupId ? await findLineup(Number(lineupId)) : null;
  if (lineupId && (!current || Number(current.team_id) !== Number(team.id))) throw new Error("Lineup nao encontrada.");
  if (current?.status === "congelada") throw new Error("Uma lineup congelada nao pode ser editada. Duplique-a para criar uma nova versao.");

  const titulares = uniqueIntegerIds(payload.titulares);
  const reservas = uniqueIntegerIds(payload.reservas);
  if (!titulares.length) throw new Error("Selecione ao menos um titular.");
  if (new Set([...titulares, ...reservas]).size !== titulares.length + reservas.length) throw new Error("Um jogador nao pode ser titular e reserva ao mesmo tempo.");
  const eligible = new Set((await getActiveTeamPlayers(team.id)).map((player) => Number(player.id)));
  if ([...titulares, ...reservas].some((id) => !eligible.has(id))) throw new Error("A lineup contem jogador inativo ou de outra equipe.");

  const status = LINEUP_STATUSES.includes(payload.status) ? payload.status : "rascunho";
  const id = await saveLeaderLineup({
    id: current?.id ?? null,
    teamId: team.id,
    userId: user.id,
    name: requiredText(payload.name, "Informe o nome da lineup.", 100),
    status,
    titulares,
    reservas
  });
  return { id, mensagem: "Lineup salva." };
}

export async function duplicateLeaderLineup(user, lineupId) {
  const team = await requireLeaderTeam(user.id);
  const lineup = await findLineup(Number(lineupId));
  if (!lineup || Number(lineup.team_id) !== Number(team.id)) throw new Error("Lineup nao encontrada.");
  const players = await getLineupPlayers(lineup.id);
  const id = await saveLeaderLineup({
    teamId: team.id,
    userId: user.id,
    name: `${lineup.name} - copia`.slice(0, 100),
    status: "rascunho",
    titulares: players.filter((item) => Boolean(item.titular)).map((item) => Number(item.player_id)),
    reservas: players.filter((item) => !Boolean(item.titular)).map((item) => Number(item.player_id))
  });
  return { id, mensagem: "Lineup duplicada." };
}

export async function freezeLeaderLineup(user, lineupId) {
  const team = await requireLeaderTeam(user.id);
  const lineup = await findLineup(Number(lineupId));
  if (!lineup || Number(lineup.team_id) !== Number(team.id)) throw new Error("Lineup nao encontrada.");
  if (!(await getLineupPlayers(lineup.id)).length) throw new Error("Nao e possivel congelar uma lineup vazia.");
  await setLineupStatus(lineup.id, "congelada");
  return { mensagem: "Lineup congelada." };
}

export async function registerLeaderEntry(user, payload) {
  const team = await requireLeaderTeam(user.id);
  if (!payload.accepted_rules) throw new Error("Aceite o regulamento para confirmar a inscricao.");
  const tournament = await findTournament(Number(payload.tournament_id));
  if (!tournament) throw new Error("Torneio nao encontrado.");
  if (tournament.status !== "aberto") throw new Error("As inscricoes deste torneio nao estao abertas.");
  if (Number(tournament.game) !== Number(team.game_id)) throw new Error("O torneio pertence a outro jogo.");
  if (await findEntryByTeamAndTournament(tournament.id, team.id)) throw new Error("A equipe ja esta inscrita neste torneio.");
  if (Number(await countEntries(tournament.id)) >= Number(tournament.max_teams)) throw new Error("O limite de equipes foi atingido.");

  const lineup = await findLineup(Number(payload.lineup_id));
  if (!lineup || Number(lineup.team_id) !== Number(team.id) || lineup.status === "arquivada") throw new Error("Selecione uma lineup valida da equipe.");
  const players = await getLineupPlayers(lineup.id);
  const titularCount = players.filter((item) => Boolean(item.titular)).length;
  const reserveCount = players.length - titularCount;
  if (titularCount !== Number(tournament.titulares)) throw new Error(`O torneio exige exatamente ${tournament.titulares} titulares.`);
  if (reserveCount > Number(tournament.reservas)) throw new Error(`O torneio permite no maximo ${tournament.reservas} reservas.`);

  const entryId = await createEntryFromLineup({ teamId: team.id, tournamentId: tournament.id, lineupId: lineup.id });
  await setLineupStatus(lineup.id, "congelada");
  const competition = await getTournamentCompetitionRecord(tournament.id);
  const automaticFreeEntry = Number(tournament.valor || 0) <= 0 && competition?.registration_approval === "automatic";
  if (automaticFreeEntry) {
    await updateEntryStatus(entryId, "confirmado");
    await notifyTournamentRegulationToTeam(tournament.id, team.id);
  }
  return { id: entryId, mensagem: automaticFreeEntry ? "Inscricao confirmada. O regulamento foi enviado para a equipe." : "Equipe inscrita. A lineup foi congelada para auditoria." };
}

export async function createLeaderPayment(user, entryId) {
  await requireLeaderTeam(user.id);
  return await createEntryPayment(user.id, Number(entryId));
}

export async function syncLeaderPayments(user) {
  const team = await requireLeaderTeam(user.id);
  return await syncTeamPendingPayments(team.id);
}

export async function getLeaderTournamentCenter(user, tournamentId) {
  const team = await requireLeaderTeam(user.id);
  const entry = await findEntryByTeamAndTournament(Number(tournamentId), team.id);
  if (!entry || entry.status === "cancelado") throw new Error("A central e exclusiva para equipes inscritas neste torneio.");
  const center = await getLeaderTournamentCenterData(Number(tournamentId), team.id);
  if (!center) throw new Error("Torneio nao encontrado.");
  return center;
}

export async function archiveLeaderTeam(user, payload) {
  const team = await requireLeaderTeam(user.id);
  const archived = payload.archived !== false;
  await setLeaderTeamArchived(team.id, archived);
  await logLeaderMemberHistory(team.id, user.id, user.id, archived ? "equipe_arquivada" : "equipe_reativada");
  return { mensagem: archived ? "Equipe arquivada sem apagar o historico." : "Equipe reativada." };
}

export async function getLeaderMatch(user, matchId) {
  const team = await requireLeaderTeam(user.id);
  if (!await findTeamMatch(Number(matchId), team.id)) throw new Error("Partida nao pertence a sua equipe.");
  return await getMatchOperations(Number(matchId));
}

export async function performLeaderVeto(user, matchId, payload) {
  const team = await requireLeaderTeam(user.id);
  if (!await findTeamMatch(Number(matchId), team.id)) throw new Error("Partida nao pertence a sua equipe.");
  return await performParticipantVetoAction(user, Number(matchId), payload);
}

export async function addLeaderEvent(user, payload) {
  const team = await requireLeaderTeam(user.id);
  const startsAt = validDate(payload.starts_at, "Informe a data do evento.");
  const endsAt = payload.ends_at ? validDate(payload.ends_at, "Data final invalida.") : null;
  if (endsAt && startsAt >= endsAt) throw new Error("O encerramento deve ser posterior ao inicio.");
  const id = await createLeaderEvent(team.id, user.id, {
    title: requiredText(payload.title, "Informe o titulo do evento.", 160),
    type: ["treino", "partida", "evento", "reuniao"].includes(payload.type) ? payload.type : "treino",
    starts_at: toSqlDate(startsAt),
    ends_at: endsAt ? toSqlDate(endsAt) : null,
    location: optionalText(payload.location, 255),
    notes: optionalText(payload.notes, 2000)
  });
  return { id, mensagem: "Evento adicionado ao calendario." };
}

export async function removeLeaderEvent(user, eventId) {
  const team = await requireLeaderTeam(user.id);
  await deleteLeaderEvent(team.id, Number(eventId));
  return { mensagem: "Evento removido." };
}

export async function respondLeaderEventAttendance(user, eventId, payload) {
  const team = await requireLeaderTeam(user.id);
  if (!await findLeaderEvent(Number(eventId), team.id)) throw new Error("Evento nao encontrado na agenda da equipe.");
  const status = ["confirmado", "ausente", "talvez"].includes(payload.status) ? payload.status : null;
  if (!status) throw new Error("Informe uma resposta de presenca valida.");
  await setLeaderEventAttendance(Number(eventId), user.id, status);
  return { mensagem: "Presenca atualizada." };
}

export async function sendLeaderTeamMessage(user, payload) {
  const team = await requireLeaderTeam(user.id);
  const id = await createLeaderMessage("team_messages", { teamId: team.id }, user.id, messagePayload(payload));
  return { id, mensagem: "Mensagem enviada." };
}

export async function sendLeaderTournamentMessage(user, tournamentId, payload) {
  const team = await requireLeaderTeam(user.id);
  if (!await findEntryByTeamAndTournament(Number(tournamentId), team.id)) throw new Error("A equipe nao esta inscrita neste torneio.");
  const id = await createLeaderMessage("tournament_messages", { teamId: team.id, tournamentId: Number(tournamentId) }, user.id, messagePayload(payload));
  return { id, mensagem: "Mensagem enviada para a central do torneio." };
}

export async function openLeaderDispute(user, payload) {
  const team = await requireLeaderTeam(user.id);
  const match = await findTeamMatch(Number(payload.match_id), team.id);
  if (!match) throw new Error("Selecione uma partida da equipe.");
  const id = await createLeaderDispute(team.id, user.id, {
    match_id: match.id,
    tournament_id: match.tournament_id,
    title: requiredText(payload.title, "Informe o titulo da disputa.", 160),
    description: requiredText(payload.description, "Descreva o motivo da disputa.", 5000),
    evidence: optionalText(payload.evidence, 5000)
  });
  return { id, mensagem: "Disputa aberta para analise administrativa." };
}

export async function openLeaderTicket(user, payload) {
  await requireLeaderTeam(user.id);
  const id = await createLeaderTicket(user.id, {
    category: optionalText(payload.category, 80) || "geral",
    priority: ["baixa", "media", "alta", "critica"].includes(payload.priority) ? payload.priority : "media",
    subject: requiredText(payload.subject, "Informe o assunto do ticket.", 160),
    message: requiredText(payload.message, "Descreva sua solicitacao.", 5000)
  });
  return { id, mensagem: "Ticket aberto." };
}

export async function replyToLeaderTicket(user, ticketId, payload) {
  await requireLeaderTeam(user.id);
  const replied = await replyLeaderTicket(
    Number(ticketId),
    user.id,
    requiredText(payload.message, "Escreva uma mensagem para o suporte.", 5000)
  );
  if (!replied) throw new Error("Chamado nao encontrado.");
  return { mensagem: "Resposta enviada ao suporte." };
}

export async function openLeaderCompetitionRequest(user, payload) {
  const team = await requireLeaderTeam(user.id);
  const type = ["substituicao", "adiamento", "reembolso", "outro"].includes(payload.type) ? payload.type : "outro";
  const tournamentId = payload.tournament_id ? Number(payload.tournament_id) : null;
  const matchId = payload.match_id ? Number(payload.match_id) : null;
  const outgoingPlayerId = payload.outgoing_player_id ? Number(payload.outgoing_player_id) : null;
  const incomingPlayerId = payload.incoming_player_id ? Number(payload.incoming_player_id) : null;

  if (tournamentId && !await findEntryByTeamAndTournament(tournamentId, team.id)) throw new Error("A equipe nao esta inscrita no torneio informado.");
  if (matchId && !await findTeamMatch(matchId, team.id)) throw new Error("A partida informada nao pertence a equipe.");
  if (type === "substituicao" && (!tournamentId || !outgoingPlayerId || !incomingPlayerId)) throw new Error("Selecione o torneio e os dois jogadores da substituicao.");
  if (type === "adiamento" && (!matchId || !payload.requested_for)) throw new Error("Selecione a partida e a nova data solicitada.");
  if (type === "reembolso" && !tournamentId) throw new Error("Selecione a inscricao para solicitar reembolso.");

  if (outgoingPlayerId || incomingPlayerId) {
    const eligible = new Set((await getActiveTeamPlayers(team.id)).map((player) => Number(player.id)));
    if ((outgoingPlayerId && !eligible.has(outgoingPlayerId)) || (incomingPlayerId && !eligible.has(incomingPlayerId))) throw new Error("A substituicao contem um jogador que nao pertence a equipe.");
    if (outgoingPlayerId === incomingPlayerId) throw new Error("Selecione jogadores diferentes para a substituicao.");
  }

  const id = await createLeaderCompetitionRequest(team.id, user.id, {
    type,
    tournament_id: tournamentId,
    match_id: matchId,
    subject: requiredText(payload.subject, "Informe o assunto da solicitacao.", 160),
    description: requiredText(payload.description, "Descreva a solicitacao.", 5000),
    requested_for: payload.requested_for ? toSqlDate(validDate(payload.requested_for, "Data solicitada invalida.")) : null,
    outgoing_player_id: outgoingPlayerId,
    incoming_player_id: incomingPlayerId,
    evidence_url: payload.evidence_url ? requiredUrl(payload.evidence_url, "Informe uma URL valida para a evidencia.") : null
  });
  return { id, mensagem: "Solicitacao enviada para a administracao." };
}

export async function addLeaderDocument(user, payload) {
  const team = await requireLeaderTeam(user.id);
  const id = await createLeaderDocument(team.id, user.id, {
    name: requiredText(payload.name, "Informe o nome do documento.", 160),
    type: ["regulamento", "comprovante", "evidencia", "outro"].includes(payload.type) ? payload.type : "outro",
    url: requiredUrl(payload.url, "Informe uma URL valida para o documento.")
  });
  return { id, mensagem: "Documento adicionado." };
}

export async function updateLeaderPreferences(user, payload) {
  await saveLeaderPreferences(user.id, {
    language: ["pt-BR", "en-US", "es-ES"].includes(payload.language) ? payload.language : "pt-BR",
    theme: ["dark", "light", "system"].includes(payload.theme) ? payload.theme : "dark",
    steam_profile: optionalText(payload.steam_profile, 255),
    email_notifications: payload.email_notifications !== false,
    discord_notifications: Boolean(payload.discord_notifications),
    profile_public: payload.profile_public !== false
  });
  return { mensagem: "Preferencias salvas." };
}

async function requireLeaderTeam(userId) {
  const team = await findLeaderTeam(userId);
  if (!team) throw new Error("Somente o lider atual pode executar esta acao.");
  return team;
}

async function requireTeamMember(teamId, memberId) {
  const member = await findLeaderMember(Number(memberId));
  if (!member || Number(member.team_id) !== Number(teamId)) throw new Error("Membro nao encontrado nesta equipe.");
  return member;
}

function emptyWorkspace(games) {
  return {
    team: null, games, members: [], requests: [], lineups: [], tournaments: [], entries: [], payments: [], matches: [],
    statistics: { matches: 0, wins: 0, losses: 0, win_rate: 0, kills: 0, deaths: 0, assists: 0, headshots: 0, hs_percent: 0, mvps: 0, platform_rank: null, seasons: [], achievements: [] },
    events: [], notifications: [], disputes: [], tickets: [], messages: { team: [], tournaments: [] }, documents: [],
    competition_requests: [], member_history: [],
    team_ranking: { team_id: 0, generated_at: new Date().toISOString(), players: [] },
    preferences: { language: "pt-BR", theme: "dark", steam_profile: null, email_notifications: true, discord_notifications: false, profile_public: true },
    permissions: { create_team: true }
  };
}

function leaderPermissions() {
  return { edit_team: true, manage_members: true, manage_lineups: true, register_tournaments: true, manage_finance: true, operate_veto: true, create_team: false };
}

function uniqueIntegerIds(value) {
  return [...new Set((Array.isArray(value) ? value : []).map(Number).filter(Number.isInteger))];
}

function requiredText(value, message, maxLength) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(message);
  if (text.length > maxLength) throw new Error(`O campo deve ter no maximo ${maxLength} caracteres.`);
  return text;
}

function optionalText(value, maxLength) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}

function requiredUrl(value, message) {
  const text = requiredText(value, message, 500);
  try { return new URL(text).toString(); } catch { throw new Error(message); }
}

function optionalUrl(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  try { return new URL(text).toString(); } catch { throw new Error("Informe uma URL valida."); }
}

function validDate(value, message) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(message);
  return date;
}

function toSqlDate(date) { return date.toISOString().slice(0, 19).replace("T", " "); }
function messagePayload(payload) { return { message: requiredText(payload.message, "Escreva uma mensagem.", 5000), attachment_url: optionalUrl(payload.attachment_url) }; }
