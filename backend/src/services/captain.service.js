import { createAuditLog } from "../models/auditLog.model.js";
import {
  createMatchMessage,
  findCaptainContext,
  findCaptainMatch,
  findTeamLeaderUser,
  getCaptainMatchExtras,
  getCaptainWorkspaceData,
  saveCaptainMatchAttendance,
  saveCaptainResultConfirmation
} from "../models/captain.model.js";
import {
  createLeaderDispute,
  createLeaderMessage,
  createTeamInvitation,
  findLeaderEvent,
  findLeaderMember,
  findPendingTeamRequest,
  getLeaderTournamentCenterData,
  isUserBlockedByTeam,
  logLeaderMemberHistory,
  removeLeaderMember,
  saveLeaderPreferences,
  setLeaderEventAttendance
} from "../models/leader.model.js";
import { findMembershipByUserAndTeam } from "../models/team.model.js";
import { findUserByEmail } from "../models/user.model.js";
import { getMatchOperations, performParticipantVetoAction, resolveExpiredVetoAction } from "./competitionSetup.service.js";
import { notify } from "./notification.service.js";
import { getTeamPlayerRanking } from "./teamRanking.service.js";
import { getPlayerCareerSummary } from "./playerWorkspace.service.js";

export async function getCaptainWorkspace(user) {
  const context = await requireCaptainContext(user.id);
  const [workspace, teamRanking, career] = await Promise.all([
    getCaptainWorkspaceData(context),
    getTeamPlayerRanking(context.team_id),
    getPlayerCareerSummary(user.id, context.game_id)
  ]);
  return { ...workspace, team_ranking: teamRanking, career };
}

export async function getCaptainMatchRoom(user, matchId) {
  const context = await requireCaptainContext(user.id);
  await requireTeamMatch(Number(matchId), context.team_id);
  await resolveExpiredVetoAction(Number(matchId));
  const [operations, extras] = await Promise.all([
    getMatchOperations(Number(matchId)),
    getCaptainMatchExtras(Number(matchId), user.id, context.team_id)
  ]);
  return { ...operations, ...extras, captain_team_id: context.team_id, captain_player_id: context.player_id };
}

export async function respondCaptainMatchAttendance(user, matchId, payload) {
  const context = await requireCaptainContext(user.id);
  const match = await requireTeamMatch(Number(matchId), context.team_id);
  if (match.status === "finalizada") throw new Error("A partida ja foi finalizada.");
  const status = ["confirmado", "ausente", "talvez"].includes(payload.status) ? payload.status : null;
  if (!status) throw new Error("Informe uma resposta de presenca valida.");
  await saveCaptainMatchAttendance(match.id, user.id, status, optionalText(payload.note, 500));
  if (status === "ausente") {
    const leaderId = await findTeamLeaderUser(context.team_id);
    if (leaderId) await notify({ user_id: leaderId, titulo: "Capitao indisponivel", mensagem: `${context.nick || "O capitao"} informou ausencia na partida #${match.id}.`, tipo: "match_attendance", link: "/lider?module=matches" });
  }
  await audit(user.id, "captain.match.attendance", "match", match.id, { status });
  return { mensagem: "Presenca atualizada." };
}

export async function performCaptainVeto(user, matchId, payload) {
  const context = await requireCaptainContext(user.id);
  await requireTeamMatch(Number(matchId), context.team_id);
  await resolveExpiredVetoAction(Number(matchId));
  return await performParticipantVetoAction(user, Number(matchId), payload);
}

export async function confirmCaptainResult(user, matchId, payload) {
  const context = await requireCaptainContext(user.id);
  const match = await requireTeamMatch(Number(matchId), context.team_id);
  if (match.status !== "finalizada") throw new Error("O resultado ainda nao foi finalizado pela organizacao.");
  const operations = await getMatchOperations(match.id);
  if (!operations.match.captain_confirmation_enabled) throw new Error("A confirmacao pelo capitao esta desabilitada para esta partida.");

  const correct = payload.correct === true;
  const comments = optionalText(payload.comments, 5000);
  if (!correct) {
    const title = requiredText(payload.title, "Informe o motivo da contestacao.", 160);
    const description = requiredText(payload.description, "Descreva a divergencia encontrada.", 5000);
    await createLeaderDispute(context.team_id, user.id, {
      match_id: match.id,
      tournament_id: match.tournament_id,
      title,
      description,
      evidence: optionalText(payload.evidence, 5000)
    });
  }
  await saveCaptainResultConfirmation(match.id, context.team_id, user.id, correct ? "correto" : "contestado", comments);
  const leaderId = await findTeamLeaderUser(context.team_id);
  if (leaderId) await notify({ user_id: leaderId, titulo: correct ? "Resultado confirmado" : "Resultado contestado", mensagem: `O capitao respondeu sobre a partida #${match.id}.`, tipo: "match_result_confirmation", link: "/lider?module=matches" });
  await audit(user.id, "captain.match.result_confirmation", "match", match.id, { status: correct ? "correto" : "contestado" });
  return { mensagem: correct ? "Resultado confirmado." : "Resultado contestado e disputa aberta." };
}

export async function sendCaptainMatchMessage(user, matchId, payload) {
  const context = await requireCaptainContext(user.id);
  await requireTeamMatch(Number(matchId), context.team_id);
  const data = messagePayload(payload);
  const id = await createMatchMessage(Number(matchId), user.id, data);
  return { id, mensagem: "Mensagem enviada para a sala da partida." };
}

export async function sendAdminMatchMessage(user, matchId, payload) {
  await getMatchOperations(Number(matchId));
  const data = messagePayload(payload);
  const id = await createMatchMessage(Number(matchId), user.id, { ...data, type: payload.type === "announcement" ? "announcement" : "message" });
  return { id, mensagem: "Comunicado enviado para a partida." };
}

export async function sendCaptainTeamMessage(user, payload) {
  const context = await requireCaptainContext(user.id);
  const id = await createLeaderMessage("team_messages", { teamId: context.team_id }, user.id, messagePayload(payload));
  return { id, mensagem: "Mensagem enviada para a equipe." };
}

export async function openCaptainDispute(user, payload) {
  const context = await requireCaptainContext(user.id);
  const match = await requireTeamMatch(Number(payload.match_id), context.team_id);
  const id = await createLeaderDispute(context.team_id, user.id, {
    match_id: match.id,
    tournament_id: match.tournament_id,
    title: requiredText(payload.title, "Informe o titulo da disputa.", 160),
    description: requiredText(payload.description, "Descreva o motivo da disputa.", 5000),
    evidence: optionalText(payload.evidence, 5000)
  });
  return { id, mensagem: "Disputa aberta para analise." };
}

export async function getCaptainTournamentCenter(user, tournamentId) {
  const context = await requireCaptainContext(user.id);
  const membership = await findMembershipByUserAndTeam(user.id, context.team_id);
  if (!membership) throw new Error("Vinculo com a equipe nao encontrado.");
  const center = await getLeaderTournamentCenterData(Number(tournamentId), context.team_id);
  if (!center || !center.participants.some((entry) => Number(entry.team_id) === context.team_id)) throw new Error("A equipe nao participa deste torneio.");
  return center;
}

export async function respondCaptainEventAttendance(user, eventId, payload) {
  const context = await requireCaptainContext(user.id);
  if (!await findLeaderEvent(Number(eventId), context.team_id)) throw new Error("Evento nao encontrado na agenda da equipe.");
  const status = ["confirmado", "ausente", "talvez"].includes(payload.status) ? payload.status : null;
  if (!status) throw new Error("Informe uma resposta valida.");
  await setLeaderEventAttendance(Number(eventId), user.id, status);
  return { mensagem: "Presenca no evento atualizada." };
}

export async function updateCaptainPreferences(user, payload) {
  await requireCaptainContext(user.id);
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

export async function inviteCaptainPlayer(user, payload) {
  const context = await requireCaptainContext(user.id);
  if (!context.can_invite_players) throw new Error("O lider nao delegou permissao para enviar convites.");
  const email = requiredText(payload.email, "Informe o email do jogador.", 255).toLowerCase();
  const invited = await findUserByEmail(email);
  if (!invited) throw new Error("Nenhuma conta foi encontrada com este email.");
  if (await findMembershipByUserAndTeam(invited.id, context.team_id)) throw new Error("Este jogador ja faz parte da equipe.");
  if (await isUserBlockedByTeam(context.team_id, invited.id)) throw new Error("Este usuario esta bloqueado para a equipe.");
  if (await findPendingTeamRequest(context.team_id, invited.id)) throw new Error("Ja existe um convite ou solicitacao pendente.");
  const invitation = await createTeamInvitation(context.team_id, invited.id, user.id);
  await logLeaderMemberHistory(context.team_id, user.id, invited.id, "convite_capitao", { email });
  await notify({ user_id: invited.id, titulo: `Convite da equipe ${context.team_name}`, mensagem: "O capitao enviou um convite para integrar a equipe.", tipo: "team_invite", link: "/jogador?module=convites" });
  return invitation;
}

export async function removeCaptainPlayer(user, memberId) {
  const context = await requireCaptainContext(user.id);
  if (!context.can_remove_players) throw new Error("O lider nao delegou permissao para remover jogadores.");
  const member = await findLeaderMember(Number(memberId));
  if (!member || Number(member.team_id) !== context.team_id || member.cargo !== "player") throw new Error("Somente jogadores da equipe podem ser removidos pelo capitao.");
  await logLeaderMemberHistory(context.team_id, user.id, member.user_id, "membro_removido_capitao", { member_id: member.id });
  await removeLeaderMember(member);
  return { mensagem: "Jogador removido e historico preservado." };
}

export async function leaveCaptainTeam(user, payload) {
  const context = await requireCaptainContext(user.id);
  const confirmation = String(payload.team_name ?? "").trim();
  if (confirmation.toLocaleLowerCase("pt-BR") !== context.team_name.toLocaleLowerCase("pt-BR")) {
    throw new Error(`Digite ${context.team_name} para confirmar a saida.`);
  }

  const member = await findLeaderMember(context.membership_id);
  if (!member || Number(member.user_id) !== Number(user.id) || member.cargo !== "captain") {
    throw new Error("O vinculo de capitao nao foi encontrado.");
  }

  const workspace = await getCaptainWorkspaceData(context);
  const pendingMatches = workspace.matches.filter((match) => match.status !== "finalizada").length;
  const activeTournaments = workspace.tournaments.filter((tournament) => ["fechado", "em_andamento"].includes(tournament.status)).length;

  await logLeaderMemberHistory(context.team_id, user.id, user.id, "saida_voluntaria", {
    previous_role: "captain",
    pending_matches: pendingMatches,
    active_tournaments: activeTournaments
  });
  await removeLeaderMember(member);
  await audit(user.id, "captain.team.left", "team", context.team_id, {
    previous_role: "captain",
    pending_matches: pendingMatches,
    active_tournaments: activeTournaments
  });

  const leaderId = await findTeamLeaderUser(context.team_id);
  if (leaderId) {
    try {
      await notify({
        user_id: leaderId,
        titulo: "Capitao saiu da equipe",
        mensagem: `${context.nick || "O capitao"} encerrou voluntariamente o vinculo com ${context.team_name}.`,
        tipo: "team_member_left",
        link: "/lider?module=roster"
      });
    } catch (error) {
      console.error("Falha ao notificar saida voluntaria:", error.message);
    }
  }

  return {
    mensagem: `Voce saiu da equipe ${context.team_name}.`,
    redirect: "/jogador",
    pending_matches: pendingMatches,
    active_tournaments: activeTournaments
  };
}

async function requireCaptainContext(userId) {
  const context = await findCaptainContext(userId);
  if (!context) throw new Error("Somente o capitao ativo pode executar esta acao.");
  return context;
}

async function requireTeamMatch(matchId, teamId) {
  const match = await findCaptainMatch(matchId, teamId);
  if (!match) throw new Error("A partida nao pertence a sua equipe.");
  return match;
}

function messagePayload(payload) {
  return { message: requiredText(payload.message, "Digite uma mensagem.", 5000), attachment_url: payload.attachment_url ? validUrl(payload.attachment_url) : null };
}

function requiredText(value, message, maxLength) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(message);
  if (text.length > maxLength) throw new Error(`O campo deve ter no maximo ${maxLength} caracteres.`);
  return text;
}

function optionalText(value, maxLength) { const text = String(value ?? "").trim(); return text ? text.slice(0, maxLength) : null; }
function validUrl(value) { try { return new URL(String(value)).toString(); } catch { throw new Error("Informe uma URL valida para o anexo."); } }
async function audit(actorUserId, action, entityType, entityId, details) { await createAuditLog({ actor_user_id: actorUserId, action, entity_type: entityType, entity_id: entityId, details }); }
