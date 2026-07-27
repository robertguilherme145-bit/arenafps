import crypto from "crypto";
import { Payment } from "mercadopago";
import client from "../config/mercadopago.js";

const payment = new Payment(client);

export function buildPixDescription(teamName, tournamentName) {
  const team = compactText(teamName).slice(0, 80);
  const tournament = compactText(tournamentName).slice(0, 120);
  return `Arena Camp | Equipe: ${team} | Torneio: ${tournament}`.slice(0, 255);
}

export async function createPixPayment({ valor, descricao, email, cpf, externalReference }) {
  const notificationUrl = resolveMercadoPagoWebhookUrl();
  const body = {
    transaction_amount: Number(valor),
    description: descricao,
    payment_method_id: "pix",
    external_reference: externalReference,
    payer: {
      email,
      identification: {
        type: "CPF",
        number: cpf
      }
    }
  };

  if (notificationUrl) body.notification_url = notificationUrl;

  try {
    return await payment.create({
      body,
      requestOptions: {
        idempotencyKey: crypto.randomUUID()
      }
    });
  } catch (error) {
    console.error("Falha ao criar pagamento PIX no Mercado Pago:", gatewayErrorMessage(error));
    throw error;
  }
}

export async function getPayment(paymentId) {
  try {
    return await payment.get({ id: paymentId });
  } catch (error) {
    console.error(`Falha ao consultar pagamento ${paymentId} no Mercado Pago:`, gatewayErrorMessage(error));
    throw error;
  }
}

export function resolveMercadoPagoWebhookUrl(environment = process.env) {
  let raw = String(environment.MP_WEBHOOK_URL ?? "").trim();

  if (!raw && environment.PUBLIC_API_URL) {
    raw = new URL("/payment/webhook", ensureTrailingSlash(environment.PUBLIC_API_URL)).toString();
  }

  if (!raw) return null;

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("MP_WEBHOOK_URL precisa ser uma URL HTTPS valida.");
  }

  if (url.protocol !== "https:") {
    throw new Error("MP_WEBHOOK_URL precisa usar HTTPS para receber notificacoes do Mercado Pago.");
  }

  url.searchParams.set("source_news", "webhooks");
  return url.toString();
}

function ensureTrailingSlash(value) {
  const url = String(value).trim();
  return url.endsWith("/") ? url : `${url}/`;
}

function compactText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function gatewayErrorMessage(error) {
  return error?.message ?? error?.cause?.message ?? "Erro nao identificado pelo gateway.";
}
