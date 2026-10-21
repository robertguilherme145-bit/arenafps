import COMPETITION_EVENTS from "../constants/competitionEvents.js";
import { randomUUID } from "node:crypto";
import { findEntry } from "../models/entry.model.js";
import {
  createPayment,
  findPaymentByEntry,
  findPaymentByExternalReference,
  findPaymentByGatewayId,
  findPaymentWithEntry,
  findPendingPayments,
  findPendingPaymentsByTeam,
  declarePayment,
  findPayment,
  reconcileGatewayPayment,
  replacePayment
} from "../models/payment.model.js";
import { buildManualPix } from "./paymentSettings.js";
import { getPaymentSettings } from "./paymentSettings.service.js";
import { findUserTeam } from "../models/team.model.js";
import { findTournament } from "../models/tournament.model.js";
import { findUserById, findUserIdsByRole } from "../models/user.model.js";
import { normalizeGatewayPaymentStatus, preparePixData, resolvePaymentStatusTransition } from "../utils/pix.js";
import { dispatchCompetitionEvent } from "./competitionEngine.service.js";
import { buildPixDescription, createPixPayment, getPayment } from "./mercadopago.service.js";
import { notify } from "./notification.service.js";
import { findPendingMixPayments } from "../models/mixTournament.model.js";
import { processMixGatewayPayment } from "./mixTournament.service.js";
import {
  buildPayPalDescription,
  capturePayPalOrder,
  createPayPalOrder,
  extractPayPalApprovalUrl,
  extractPayPalCapturedAmount,
  extractPayPalExternalReference,
  extractPayPalPaidAt,
  normalizePayPalOrderStatus,
  resolvePayPalAmount,
  resolvePayPalCancelUrl,
  resolvePayPalCurrency,
  resolvePayPalReturnUrl
} from "./paypal.service.js";

export async function createEntryPayment(userId, entryId) {
  const { team, user, entry } = await requireOwnEntry(userId, entryId);
  const existingPayment = await findPaymentByEntry(entry.id);
  if (existingPayment?.status === "aprovado") throw new Error("Esta inscricao ja esta paga.");

  const tournament = await findTournament(entry.tournament_id);
  if (!tournament) throw new Error("Torneio nao encontrado.");

  const settings = await getPaymentSettings();
  if (settings.mode === "pix_manual") return createManualEntryPayment({ entry, team, tournament, settings, existingPayment });

  // Mercado Pago: reaproveita o PIX automatico ja gerado; um PIX proprio pendente e trocado.
  if (existingPayment?.provider === "mercadopago") return formatPaymentResponse(existingPayment);
  if (existingPayment && existingPayment.provider !== "pix_manual") throw new Error("Ja existe outro pagamento pendente para esta inscricao.");
  if (existingPayment?.declared_at) throw new Error("Voce ja informou o pagamento pelo PIX. Aguarde a organizacao confirmar.");

  const pix = await createPixPayment({
    valor: tournament.valor,
    descricao: buildPixDescription(team.nome, tournament.nome),
    email: user.email,
    cpf: user.cpf,
    externalReference: `ENTRY_${entryId}`
  });
  const pixData = await preparePixData(pix);
  const data = {
    entry_id: entry.id,
    provider: "mercadopago",
    payment_id: String(pix.id),
    external_reference: pix.external_reference,
    status: normalizeGatewayPaymentStatus(pix.status),
    valor: pix.transaction_amount,
    qr_code: pixData.qr_code,
    qr_code_base64: pixData.qr_code_base64,
    copia_cola: pixData.copia_cola
  };
  const localPayment = existingPayment ? await replacePayment(existingPayment.id, data) : await createPayment(data);
  return { ...formatPaymentResponse(localPayment), payment_id: pix.id };
}

// PIX proprio: copia e cola gerado aqui, com o valor e o codigo da inscricao. Quem confirma e a organizacao.
async function createManualEntryPayment({ entry, team, tournament, settings, existingPayment }) {
  if (existingPayment?.provider === "pix_manual" && existingPayment.declared_at) return formatPaymentResponse(existingPayment, settings);
  if (existingPayment?.provider === "mercadopago" && existingPayment.status === "pendente" && existingPayment.payment_id) {
    // Um PIX do Mercado Pago ja pode ter sido pago: confere antes de trocar.
    const result = await processWebhook(existingPayment.payment_id).catch(() => null);
    if (result?.status === "aprovado") throw new Error("Esta inscricao ja esta paga.");
  }
  const reference = `ARENA-E${entry.id}`;
  const pix = await buildManualPix(settings, { amount:Number(tournament.valor), txid:reference, description:`Inscricao ${team.nome}` });
  if (existingPayment?.provider === "pix_manual" && existingPayment.status === "pendente" && existingPayment.copia_cola === pix.copia_cola) {
    return formatPaymentResponse(existingPayment, settings);
  }
  const data = { entry_id:entry.id, provider:"pix_manual", payment_id:null, external_reference:reference, status:"pendente", valor:Number(tournament.valor), ...pix };
  const localPayment = existingPayment ? await replacePayment(existingPayment.id, data) : await createPayment(data);
  return formatPaymentResponse(localPayment, settings);
}

// "Ja paguei": avisa a organizacao para conferir no extrato.
export async function declareEntryPayment(userId, entryId, receiptUrl) {
  const { team, entry } = await requireOwnEntry(userId, entryId);
  const payment = await findPaymentByEntry(entry.id);
  if (!payment || payment.provider !== "pix_manual") throw new Error("Gere o PIX antes de informar o pagamento.");
  if (payment.status === "aprovado") throw new Error("Este pagamento ja foi confirmado.");
  const updated = await declarePayment(payment.id, safeReceiptUrl(receiptUrl));
  const tournament = await findTournament(entry.tournament_id);
  const adminIds = await findUserIdsByRole("admin");
  await Promise.all(adminIds.map((adminId) => notify({
    user_id: adminId,
    titulo: "PIX para conferir",
    mensagem: `A equipe ${team.nome} informou o pagamento de ${tournament?.nome ?? "um torneio"}. Confira no extrato (codigo ${payment.external_reference}).`,
    tipo: "payment_declared",
    link: "/admin/financeiro",
    dedupe_key: `payment-declared:${payment.id}:admin:${adminId}`
  })));
  return formatPaymentResponse(updated, await getPaymentSettings());
}

// Decisao do admin no Financeiro. Aprovar segue o mesmo caminho da confirmacao automatica:
// confirma a inscricao, roda as regras do torneio e avisa a equipe.
export async function decidePaymentByAdmin(paymentId, status) {
  const payment = await findPayment(paymentId);
  if (!payment) throw new Error("Pagamento nao encontrado.");
  const paidAt = status === "aprovado" ? validDateOrNow(payment.paid_at) : null;
  const reconciled = await reconcileGatewayPayment(payment.id, { payment_id: payment.payment_id, status, paid_at: paidAt });
  if (status === "aprovado" && reconciled.status_changed) {
    await dispatchCompetitionEvent(COMPETITION_EVENTS.PAYMENT_APPROVED, { payment_id: reconciled.id, entry_id: reconciled.entry_id });
    await notifyPaymentApproved(reconciled);
  }
  return reconciled;
}

async function requireOwnEntry(userId, entryId) {
  const [team, user, entry] = await Promise.all([findUserTeam(userId), findUserById(userId), findEntry(entryId)]);
  if (!team) throw new Error("Equipe nao encontrada.");
  if (!user) throw new Error("Usuario nao encontrado.");
  if (!entry) throw new Error("Inscricao nao encontrada.");
  if (Number(entry.team_id) !== Number(team.id)) throw new Error("Esta inscricao nao pertence a sua equipe.");
  return { team, user, entry };
}

// Comprovante: so links https ou imagens enviadas ao proprio site.
export function safeReceiptUrl(value) {
  const url = String(value ?? "").trim();
  if (!url) return null;
  if (url.length > 500) throw new Error("Link do comprovante muito longo.");
  if (/^https:\/\//i.test(url) || /^\/media\/files\/\d+\//.test(url)) return url;
  throw new Error("Envie o comprovante como imagem ou um link https.");
}

export async function createEntryPaypalPayment(userId, entryId) {
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

  const existingPayment = await findPaymentByEntry(entry.id);
  if (existingPayment) {
    if (existingPayment.status === "aprovado") throw new Error("Esta inscricao ja esta paga.");
    if (existingPayment.provider === "paypal" && existingPayment.checkout_url) return formatPaymentResponse(existingPayment);
    throw new Error("Ja existe um pagamento PIX pendente para esta inscricao.");
  }

  const tournament = await findTournament(entry.tournament_id);
  if (!tournament) throw new Error("Torneio nao encontrado.");

  const currency = resolvePayPalCurrency();
  const amount = await resolvePayPalAmount(tournament.valor);
  if (amount <= 0) throw new Error("O valor do PayPal precisa ser maior que zero.");

  const externalReference = `ENTRY_${entryId}_PAYPAL_${randomUUID()}`;
  const order = await createPayPalOrder({
    amount,
    currency,
    description: buildPayPalDescription(team.nome, tournament.nome),
    externalReference,
    returnUrl: resolvePayPalReturnUrl(),
    cancelUrl: resolvePayPalCancelUrl()
  });
  const checkoutUrl = extractPayPalApprovalUrl(order);
  if (!checkoutUrl) throw new Error("O PayPal nao retornou o link de aprovacao.");

  const localPayment = await createPayment({
    entry_id: entry.id,
    provider: "paypal",
    payment_id: String(order.id),
    external_reference: externalReference,
    status: normalizePayPalOrderStatus(order),
    valor: amount,
    checkout_url: checkoutUrl,
    currency
  });

  return formatPaymentResponse(localPayment);
}

export async function captureEntryPaypalPayment(userId, orderId) {
  const team = await findUserTeam(userId);
  if (!team) throw new Error("Equipe nao encontrada.");
  if (!orderId) throw new Error("Informe a ordem do PayPal.");

  const localPayment = await findPaymentByGatewayId(orderId);
  if (!localPayment || localPayment.provider !== "paypal") {
    throw new Error("Pagamento PayPal nao encontrado.");
  }

  const paymentWithEntry = await findPaymentWithEntry(localPayment.id);
  if (!paymentWithEntry || Number(paymentWithEntry.team_id) !== Number(team.id)) {
    throw new Error("Este pagamento nao pertence a sua equipe.");
  }

  if (localPayment.status === "aprovado") return formatPaymentResponse(paymentWithEntry);

  const order = await capturePayPalOrder(orderId);
  validatePayPalPayment(order, paymentWithEntry);

  const status = normalizePayPalOrderStatus(order);
  const reconciled = await reconcileGatewayPayment(paymentWithEntry.id, {
    payment_id: String(order.id),
    status,
    paid_at: status === "aprovado" ? extractPayPalPaidAt(order) : null
  });

  if (status === "aprovado") {
    await dispatchCompetitionEvent(COMPETITION_EVENTS.PAYMENT_APPROVED, {
      payment_id: reconciled.id,
      entry_id: reconciled.entry_id
    });
    await notifyPaymentApproved(reconciled);
  }

  return formatPaymentResponse(reconciled);
}

export async function processWebhook(paymentId) {
  const gatewayPayment = await getPayment(paymentId);
  const localPayment =
    await findPaymentByGatewayId(gatewayPayment.id) ??
    await findPaymentByExternalReference(gatewayPayment.external_reference);

  if (!localPayment) {
    const mixResult = await processMixGatewayPayment(gatewayPayment);
    return mixResult ?? { ignored: true, reason: "payment_not_found" };
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
  const standard = await syncPayments(payments);
  const mixPayments = await findPendingMixPayments(limit);
  const mixResults=[];
  for(const payment of mixPayments){try{mixResults.push(await processMixGatewayPayment(await getPayment(payment.payment_id)));}catch(error){console.error(`Falha ao sincronizar pagamento Mix #${payment.id}:`,error.message);mixResults.push({error:true});}}
  return { checked:standard.checked+mixPayments.length,updated:standard.updated+mixResults.filter(item=>item?.status_changed).length,approved:standard.approved+mixResults.filter(item=>item?.status==='aprovado').length };
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

function validatePayPalPayment(order, localPayment) {
  if (String(localPayment.payment_id ?? "") !== String(order?.id ?? "")) {
    throw new Error("A ordem do PayPal nao corresponde ao pagamento local.");
  }

  if (String(localPayment.external_reference ?? "") !== String(extractPayPalExternalReference(order) ?? "")) {
    throw new Error("A referencia externa do PayPal nao confere.");
  }

  const capturedAmount = extractPayPalCapturedAmount(order);
  if (normalizePayPalOrderStatus(order) === "aprovado" && Math.abs(Number(localPayment.valor) - capturedAmount) > 0.001) {
    throw new Error("O valor confirmado pelo PayPal nao corresponde ao valor da inscricao.");
  }

  const currency = order?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code
    ?? order?.purchase_units?.[0]?.amount?.currency_code;
  if (currency && String(currency).toUpperCase() !== String(localPayment.currency || "USD").toUpperCase()) {
    throw new Error("A moeda confirmada pelo PayPal e invalida para esta inscricao.");
  }
}

async function notifyPaymentApproved(payment) {
  const adminIds = await findUserIdsByRole("admin");
  const currency = payment.currency || "BRL";
  const amount = new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency
  }).format(Number(payment.valor));
  const message = `Pagamento de ${amount} da equipe ${payment.team_name} confirmado para o torneio ${payment.tournament_name}.`;
  const providerName = payment.provider === "paypal" ? "PayPal" : "PIX";

  await Promise.all(adminIds.map((adminId) => notify({
    user_id: adminId,
    titulo: `Pagamento ${providerName} confirmado`,
    mensagem: message,
    tipo: "payment_approved",
    link: "/admin/financeiro",
    dedupe_key: `payment-approved:${payment.id}:admin:${adminId}`
  })));

  await notify({
    user_id: Number(payment.team_creator_id),
    titulo: "Pagamento confirmado",
    mensagem: `O pagamento da equipe ${payment.team_name} para ${payment.tournament_name} foi confirmado.`,
    tipo: "payment_approved",
    link: "/minha-arena/time?aba=pagamentos",
    dedupe_key: `payment-approved:${payment.id}:leader:${payment.team_creator_id}`
  });
}

function formatPaymentResponse(payment, settings = null) {
  return {
    id: payment.id,
    entry_id: payment.entry_id,
    provider: payment.provider,
    payment_id: payment.payment_id,
    external_reference: payment.external_reference,
    status: payment.status,
    valor: payment.valor,
    currency: payment.currency || "BRL",
    qr_code: payment.qr_code ?? null,
    qr_code_base64: payment.qr_code_base64 ?? null,
    copia_cola: payment.copia_cola ?? null,
    checkout_url: payment.checkout_url ?? null,
    paid_at: payment.paid_at ?? null,
    declared_at: payment.declared_at ?? null,
    receipt_url: payment.receipt_url ?? null,
    receiver_name: payment.provider === "pix_manual" ? settings?.receiver_name ?? null : null,
    instructions: payment.provider === "pix_manual" ? settings?.instructions || null : null
  };
}

function validDateOrNow(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}
