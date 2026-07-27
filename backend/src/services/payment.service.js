import COMPETITION_EVENTS from "../constants/competitionEvents.js";
import { findEntry } from "../models/entry.model.js";
import {
  createPayment,
  findPaymentByEntry,
  findPaymentByExternalReference,
  findPaymentByGatewayId,
  findPendingPayments,
  findPendingPaymentsByTeam,
  reconcileGatewayPayment
} from "../models/payment.model.js";
import { findUserTeam } from "../models/team.model.js";
import { findTournament } from "../models/tournament.model.js";
import { findUserById, findUserIdsByRole } from "../models/user.model.js";
import { normalizeGatewayPaymentStatus, preparePixData, resolvePaymentStatusTransition } from "../utils/pix.js";
import { dispatchCompetitionEvent } from "./competitionEngine.service.js";
import { buildPixDescription, createPixPayment, getPayment } from "./mercadopago.service.js";
import { notify } from "./notification.service.js";

export async function createEntryPayment(userId, entryId) {
  const [team, user, entry] = await Promise.all([
    findUserTeam(userId),
    findUserById(userId),
    findEntry(entryId)
  ]);

  if (!team) throw new Error("Equipe nao encontrada.");
  if (!user) throw new Error("Usuario nao encontrado.");
  if (!entry) throw new Error("Inscricao nao encontrada.");
  if (Number(entry.team_id) !== Number(team.id)) {
    throw new Error("Esta inscricao nao pertence a sua equipe.");
  }

  if (await findPaymentByEntry(entry.id)) {
    throw new Error("Ja existe um pagamento para esta inscricao.");
  }

  const tournament = await findTournament(entry.tournament_id);
  if (!tournament) throw new Error("Torneio nao encontrado.");

  const pix = await createPixPayment({
    valor: tournament.valor,
    descricao: buildPixDescription(team.nome, tournament.nome),
    email: user.email,
    cpf: user.cpf,
    externalReference: `ENTRY_${entryId}`
  });
  const pixData = await preparePixData(pix);
  const status = normalizeGatewayPaymentStatus(pix.status);

  const localPayment = await createPayment({
    entry_id: entry.id,
    provider: "mercadopago",
    payment_id: String(pix.id),
    external_reference: pix.external_reference,
    status,
    valor: pix.transaction_amount,
    qr_code: pixData.qr_code,
    qr_code_base64: pixData.qr_code_base64,
    copia_cola: pixData.copia_cola
  });

  return {
    id: localPayment.id,
    payment_id: pix.id,
    status,
    qr_code: pixData.qr_code,
    qr_code_base64: pixData.qr_code_base64,
    copia_cola: pixData.copia_cola
  };
}

export async function processWebhook(paymentId) {
  const gatewayPayment = await getPayment(paymentId);
  const localPayment =
    await findPaymentByGatewayId(gatewayPayment.id) ??
    await findPaymentByExternalReference(gatewayPayment.external_reference);

  if (!localPayment) {
    return { ignored: true, reason: "payment_not_found" };
  }

  validateGatewayPayment(gatewayPayment, localPayment);

  const status = resolvePaymentStatusTransition(localPayment.status, gatewayPayment.status);
  const paidAt = status === "aprovado"
    ? validDateOrNow(gatewayPayment.date_approved ?? localPayment.paid_at)
    : null;
  const reconciled = await reconcileGatewayPayment(localPayment.id, {
    payment_id: String(gatewayPayment.id),
    status,
    paid_at: paidAt
  });

  if (status === "aprovado") {
    await dispatchCompetitionEvent(COMPETITION_EVENTS.PAYMENT_APPROVED, {
      payment_id: reconciled.id,
      entry_id: reconciled.entry_id
    });
    await notifyPaymentApproved(reconciled);
  }

  return {
    ignored: false,
    payment_id: reconciled.id,
    entry_id: reconciled.entry_id,
    previous_status: reconciled.previous_status,
    status: reconciled.status,
    status_changed: reconciled.status_changed
  };
}

export async function syncTeamPendingPayments(teamId) {
  const payments = await findPendingPaymentsByTeam(teamId);
  return syncPayments(payments);
}

export async function syncPendingPayments(limit = 50) {
  const payments = await findPendingPayments(limit);
  return syncPayments(payments);
}

async function syncPayments(payments) {
  const results = [];

  for (const payment of payments) {
    try {
      results.push(await processWebhook(payment.payment_id));
    } catch (error) {
      console.error(`Falha ao sincronizar pagamento local #${payment.id}:`, error.message);
      results.push({ payment_id: payment.id, error: true });
    }
  }

  return {
    checked: payments.length,
    updated: results.filter((item) => item?.status_changed).length,
    approved: results.filter((item) => item?.status === "aprovado").length
  };
}

function validateGatewayPayment(gatewayPayment, localPayment) {
  if (String(localPayment.payment_id ?? gatewayPayment.id) !== String(gatewayPayment.id)) {
    throw new Error("O pagamento retornado nao corresponde ao pagamento local.");
  }

  if (String(localPayment.external_reference ?? "") !== String(gatewayPayment.external_reference ?? "")) {
    throw new Error("A referencia externa do pagamento nao confere.");
  }

  if (Math.abs(Number(localPayment.valor) - Number(gatewayPayment.transaction_amount)) > 0.001) {
    throw new Error("O valor confirmado pelo gateway nao corresponde ao valor da inscricao.");
  }

  if (gatewayPayment.currency_id && gatewayPayment.currency_id !== "BRL") {
    throw new Error("A moeda confirmada pelo gateway e invalida para esta inscricao.");
  }
}

async function notifyPaymentApproved(payment) {
  const adminIds = await findUserIdsByRole("admin");
  const amount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(payment.valor));
  const message = `Pagamento de ${amount} da equipe ${payment.team_name} confirmado para o torneio ${payment.tournament_name}.`;

  await Promise.all(adminIds.map((adminId) => notify({
    user_id: adminId,
    titulo: "Pagamento PIX confirmado",
    mensagem: message,
    tipo: "payment_approved",
    link: "/admin?module=finance",
    dedupe_key: `payment-approved:${payment.id}:admin:${adminId}`
  })));

  await notify({
    user_id: Number(payment.team_creator_id),
    titulo: "Pagamento confirmado",
    mensagem: `O pagamento da equipe ${payment.team_name} para ${payment.tournament_name} foi confirmado automaticamente.`,
    tipo: "payment_approved",
    link: "/lider?module=finance",
    dedupe_key: `payment-approved:${payment.id}:leader:${payment.team_creator_id}`
  });
}

function validDateOrNow(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}
