import pool from "../config/database.js";
import { createAuditLog, findAuditLogs } from "../models/auditLog.model.js";
import {
  getAdminDashboardSnapshot,
  getAdminEntries,
  getAdminPayments,
  getAdminPlayers,
  getAdminTeams
} from "../models/admin.model.js";
import { findEntry, updateEntryStatus, updatePaymentStatus as updateEntryPaymentStatus } from "../models/entry.model.js";
import {
  addPlayerTransaction,
  clearEntryPlayers,
  getEntryPlayers
} from "../models/entryPlayer.model.js";
import { updatePaymentStatus as updateGatewayPaymentStatus, findPayment } from "../models/payment.model.js";
import { findPlayersByIds, findPlayer, updatePlayerAdmin } from "../models/player.model.js";
import { findTeamWithContext, updateTeamAdmin } from "../models/team.model.js";
import { findTournament } from "../models/tournament.model.js";
import { createNotification } from "../models/notification.model.js";
import {
  createDispute,
  createPenalty,
  createSupportTicket,
  findDispute,
  findPenalty,
  findSupportTicket,
  getAdminPenalties,
  getDisputes,
  getSupportTickets,
  updateDispute,
  updatePenalty,
  updateSupportTicket
} from "../models/communityAdmin.model.js";

export async function getAdminDashboard() {
  return await getAdminDashboardSnapshot();
}

export async function listAdminEntries(filters = {}) {
  return await getAdminEntries(filters);
}

export async function listAdminPayments(filters = {}) {
  return await getAdminPayments(filters);
}

export async function listAdminTeams() {
  return await getAdminTeams();
}

export async function listAdminPlayers(filters = {}) {
  return await getAdminPlayers(filters);
}

export async function listAdminLineup(entryId) {
  const entry = await findEntry(entryId);

  if (!entry) {
    throw new Error("Inscricao nao encontrada.");
  }

  return await getEntryPlayers(entryId);
}

export async function approveAdminEntry(adminUser, entryId) {
  const entry = await requireEntry(entryId);
  await updateEntryStatus(entry.id, "confirmado");

  await notifyTeamCreator(
    entry.team_id,
    "Inscricao aprovada",
    "Sua equipe foi aprovada para o torneio.",
    "entry_approved",
    `/torneios/${entry.tournament_id}`
  );

  await audit(adminUser.id, "entry.approved", "entry", entry.id, {
    previous_status: entry.status,
    next_status: "confirmado"
  });
}

export async function cancelAdminEntry(adminUser, entryId) {
  const entry = await requireEntry(entryId);
  await updateEntryStatus(entry.id, "cancelado");

  await notifyTeamCreator(
    entry.team_id,
    "Inscricao cancelada",
    "A inscricao da equipe foi cancelada pelo administrador.",
    "entry_cancelled",
    `/torneios/${entry.tournament_id}`
  );

  await audit(adminUser.id, "entry.cancelled", "entry", entry.id, {
    previous_status: entry.status,
    next_status: "cancelado"
  });
}

export async function updateAdminEntryPayment(adminUser, entryId, paymentStatus) {
  const entry = await requireEntry(entryId);

  if (!["aguardando", "pago", "falhou"].includes(paymentStatus)) {
    throw new Error("Status de pagamento invalido.");
  }

  await updateEntryPaymentStatus(entry.id, paymentStatus);

  if (paymentStatus === "pago" && entry.status === "pendente") {
    await updateEntryStatus(entry.id, "pago");
  }

  if (paymentStatus === "falhou" && entry.status === "pago") {
    await updateEntryStatus(entry.id, "pendente");
  }

  await audit(adminUser.id, "entry.payment.updated", "entry", entry.id, {
    previous_payment_status: entry.payment_status,
    next_payment_status: paymentStatus
  });
}

export async function updateAdminPayment(adminUser, paymentId, status) {
  const payment = await findPayment(paymentId);

  if (!payment) {
    throw new Error("Pagamento nao encontrado.");
  }

  if (!["pendente", "aprovado", "cancelado", "rejeitado"].includes(status)) {
    throw new Error("Status de pagamento invalido.");
  }

  await updateGatewayPaymentStatus(payment.id, {
    payment_id: payment.payment_id,
    status,
    paid_at: status === "aprovado" ? new Date() : null
  });

  if (status === "aprovado") {
    await updateEntryPaymentStatus(payment.entry_id, "pago");
  }

  if (status === "cancelado" || status === "rejeitado") {
    await updateEntryPaymentStatus(payment.entry_id, "falhou");
  }

  await audit(adminUser.id, "payment.updated", "payment", payment.id, {
    previous_status: payment.status,
    next_status: status
  });
}

export async function updateAdminTeam(adminUser, teamId, data) {
  const team = await findTeamWithContext(teamId);

  if (!team) {
    throw new Error("Equipe nao encontrada.");
  }

  const nextState = {
    nome: data.nome ?? team.nome,
    tag: data.tag ?? team.tag,
    descricao: data.descricao ?? team.descricao,
    recrutando: normalizeTinyInt(data.recrutando ?? team.recrutando),
    privada: normalizeTinyInt(data.privada ?? team.privada),
    ativo: normalizeTinyInt(data.ativo ?? team.ativo)
  };

  await updateTeamAdmin(team.id, nextState);

  await audit(adminUser.id, "team.updated", "team", team.id, {
    previous: {
      nome: team.nome,
      tag: team.tag,
      descricao: team.descricao,
      recrutando: team.recrutando,
      privada: team.privada,
      ativo: team.ativo
    },
    next: nextState
  });
}

export async function updateAdminPlayer(adminUser, playerId, data) {
  const player = await findPlayer(playerId);

  if (!player) {
    throw new Error("Jogador nao encontrado.");
  }

  const nextState = {
    nick: data.nick ?? player.nick,
    game: data.game ?? player.game,
    game_uid: data.game_uid ?? player.game_uid,
    foto: data.foto ?? player.foto,
    status: data.status ?? player.status
  };

  if (!["ativo", "reserva", "banido", "inativo"].includes(nextState.status)) {
    throw new Error("Status de jogador invalido.");
  }

  await updatePlayerAdmin(player.id, nextState);

  await audit(adminUser.id, "player.updated", "player", player.id, {
    previous: {
      nick: player.nick,
      game: player.game,
      game_uid: player.game_uid,
      status: player.status
    },
    next: nextState
  });
}

export async function saveAdminLineup(adminUser, entryId, titulares = [], reservas = []) {
  const entry = await requireEntry(entryId);
  const tournament = await findTournament(entry.tournament_id);

  if (!tournament) {
    throw new Error("Torneio nao encontrado.");
  }

  if (titulares.length !== tournament.titulares) {
    throw new Error(`O torneio exige exatamente ${tournament.titulares} titulares.`);
  }

  if (reservas.length > tournament.reservas) {
    throw new Error(`O torneio permite no maximo ${tournament.reservas} reservas.`);
  }

  const allPlayers = [...titulares, ...reservas];
  const uniquePlayers = [...new Set(allPlayers.map(Number))];

  if (uniquePlayers.length !== allPlayers.length) {
    throw new Error("Ha jogadores repetidos na lineup.");
  }

  const players = await findPlayersByIds(uniquePlayers);

  if (players.length !== uniquePlayers.length) {
    throw new Error("Existem jogadores invalidos na lineup.");
  }

  for (const player of players) {
    if (player.team_id !== entry.team_id) {
      throw new Error(`O jogador ${player.nick} nao pertence a equipe desta inscricao.`);
    }

    if (player.status === "inativo" || player.status === "banido") {
      throw new Error(`O jogador ${player.nick} nao esta elegivel para a lineup.`);
    }
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await clearEntryPlayers(entry.id, connection);

    let ordem = 1;

    for (const playerId of titulares.map(Number)) {
      await addPlayerTransaction(connection, {
        entry_id: entry.id,
        player_id: playerId,
        titular: true,
        ordem
      });
      ordem += 1;
    }

    for (const playerId of reservas.map(Number)) {
      await addPlayerTransaction(connection, {
        entry_id: entry.id,
        player_id: playerId,
        titular: false,
        ordem
      });
      ordem += 1;
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  await audit(adminUser.id, "entry.lineup.saved", "entry", entry.id, {
    titulares,
    reservas
  });

  return await getEntryPlayers(entry.id);
}

export async function sendAdminNotification(adminUser, payload) {
  if (!payload.user_ids?.length) {
    throw new Error("Informe ao menos um destinatario.");
  }

  if (!payload.titulo || !payload.mensagem) {
    throw new Error("Titulo e mensagem sao obrigatorios.");
  }

  for (const userId of payload.user_ids) {
    await createNotification({
      user_id: userId,
      titulo: payload.titulo,
      mensagem: payload.mensagem,
      tipo: payload.tipo ?? "admin",
      link: payload.link ?? null
    });
  }

  await audit(adminUser.id, "notification.sent", "notification", null, {
    recipients: payload.user_ids,
    titulo: payload.titulo,
    tipo: payload.tipo ?? "admin"
  });
}

export async function listAdminAuditLogs(limit = 50) {
  return await findAuditLogs(limit);
}

export async function listAdminPenalties() {
  return await getAdminPenalties();
}

export async function openAdminPenalty(adminUser, payload) {
  const player = await findPlayer(payload.player_id);

  if (!player) {
    throw new Error("Jogador nao encontrado.");
  }

  const tournamentId = payload.tournament_id ? Number(payload.tournament_id) : null;

  if (tournamentId) {
    const tournament = await findTournament(tournamentId);

    if (!tournament) {
      throw new Error("Torneio nao encontrado.");
    }
  }

  const penalty = await createPenalty({
    player_id: Number(payload.player_id),
    tournament_id: tournamentId,
    type: payload.type,
    scope: payload.scope,
    reason: payload.reason,
    evidence: payload.evidence ?? null,
    duration_days: payload.duration_days ? Number(payload.duration_days) : null,
    notes: payload.notes ?? null,
    created_by: adminUser.id
  });

  if (["temporary_ban", "permanent_ban", "tournament_ban", "season_ban", "global_ban"].includes(payload.type)) {
    await updatePlayerAdmin(player.id, {
      nick: player.nick,
      game: player.game,
      game_uid: player.game_uid,
      foto: player.foto,
      status: "banido"
    });
  }

  await audit(adminUser.id, "penalty.opened", "penalty", penalty.id, {
    player_id: player.id,
    type: payload.type,
    scope: payload.scope
  });
}

export async function closeAdminPenalty(adminUser, penaltyId, notes) {
  const penalty = await findPenalty(penaltyId);

  if (!penalty) {
    throw new Error("Penalidade nao encontrada.");
  }

  await updatePenalty(penalty.id, {
    status: "encerrada",
    notes: notes ?? penalty.notes,
    resolved_by: adminUser.id,
    resolved_at: new Date()
  });

  await audit(adminUser.id, "penalty.closed", "penalty", penalty.id, {
    previous_status: penalty.status,
    next_status: "encerrada"
  });
}

export async function listAdminTickets() {
  return await getSupportTickets();
}

export async function createAdminTicket(adminUser, payload) {
  if (!payload.subject || !payload.message) {
    throw new Error("Assunto e mensagem sao obrigatorios.");
  }

  const ticket = await createSupportTicket({
    user_id: payload.user_id ? Number(payload.user_id) : null,
    category: payload.category ?? "geral",
    priority: payload.priority ?? "media",
    status: "aberto",
    subject: payload.subject,
    message: payload.message,
    assigned_admin_id: payload.assigned_admin_id ? Number(payload.assigned_admin_id) : adminUser.id
  });

  await audit(adminUser.id, "ticket.created", "ticket", ticket.id, {
    category: payload.category ?? "geral",
    priority: payload.priority ?? "media"
  });
}

export async function updateAdminTicket(adminUser, ticketId, payload) {
  const ticket = await findSupportTicket(ticketId);

  if (!ticket) {
    throw new Error("Ticket nao encontrado.");
  }

  await updateSupportTicket(ticket.id, {
    status: payload.status ?? ticket.status,
    priority: payload.priority ?? ticket.priority,
    response: payload.response ?? ticket.response,
    assigned_admin_id: payload.assigned_admin_id ? Number(payload.assigned_admin_id) : ticket.assigned_admin_id
  });

  await audit(adminUser.id, "ticket.updated", "ticket", ticket.id, {
    previous_status: ticket.status,
    next_status: payload.status ?? ticket.status
  });
}

export async function listAdminDisputes() {
  return await getDisputes();
}

export async function createAdminDispute(adminUser, payload) {
  if (!payload.title || !payload.description) {
    throw new Error("Titulo e descricao sao obrigatorios.");
  }

  const dispute = await createDispute({
    match_id: payload.match_id ? Number(payload.match_id) : null,
    tournament_id: payload.tournament_id ? Number(payload.tournament_id) : null,
    team_id: payload.team_id ? Number(payload.team_id) : null,
    created_by: adminUser.id,
    title: payload.title,
    description: payload.description,
    evidence: payload.evidence ?? null
  });

  await audit(adminUser.id, "dispute.created", "dispute", dispute.id, {
    match_id: payload.match_id ?? null,
    team_id: payload.team_id ?? null
  });
}

export async function updateAdminDispute(adminUser, disputeId, payload) {
  const dispute = await findDispute(disputeId);

  if (!dispute) {
    throw new Error("Disputa nao encontrada.");
  }

  await updateDispute(dispute.id, {
    status: payload.status ?? dispute.status,
    resolution_notes: payload.resolution_notes ?? dispute.resolution_notes,
    resolved_by: adminUser.id
  });

  await audit(adminUser.id, "dispute.updated", "dispute", dispute.id, {
    previous_status: dispute.status,
    next_status: payload.status ?? dispute.status
  });
}

async function requireEntry(entryId) {
  const entry = await findEntry(entryId);

  if (!entry) {
    throw new Error("Inscricao nao encontrada.");
  }

  return entry;
}

async function notifyTeamCreator(teamId, titulo, mensagem, tipo, link) {
  const team = await findTeamWithContext(teamId);

  if (!team) {
    return;
  }

  await createNotification({
    user_id: team.creator_id,
    titulo,
    mensagem,
    tipo,
    link
  });
}

async function audit(actorUserId, action, entityType, entityId, details) {
  await createAuditLog({
    actor_user_id: actorUserId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details
  });
}

function normalizeTinyInt(value) {
  return value ? 1 : 0;
}
