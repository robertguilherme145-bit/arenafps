const PAYPAL_BASE_URLS = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com"
};

export function buildPayPalDescription(teamName, tournamentName) {
  const team = compactText(teamName).slice(0, 80);
  const tournament = compactText(tournamentName).slice(0, 120);
  return `Arena Camp | Team: ${team} | Tournament: ${tournament}`.slice(0, 127);
}

export function resolvePayPalCurrency(environment = process.env) {
  return String(environment.PAYPAL_CURRENCY || "USD").trim().toUpperCase();
}

export function resolvePayPalAmount(value, environment = process.env) {
  const override = Number(environment.PAYPAL_ENTRY_AMOUNT || 0);
  if (override > 0) return roundMoney(override);

  const rate = Number(environment.PAYPAL_BRL_TO_USD_RATE || 0);
  if (rate > 0) return roundMoney(Number(value) * rate);

  return roundMoney(value);
}

export async function createPayPalOrder({ amount, currency, description, externalReference, returnUrl, cancelUrl }) {
  const accessToken = await getPayPalAccessToken();
  const body = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: externalReference,
        custom_id: externalReference,
        description,
        amount: {
          currency_code: currency,
          value: formatPayPalAmount(amount)
        }
      }
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: "Arena Camp",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          return_url: returnUrl,
          cancel_url: cancelUrl
        }
      }
    }
  };

  return paypalRequest("/v2/checkout/orders", {
    method: "POST",
    accessToken,
    body
  });
}

export async function capturePayPalOrder(orderId) {
  const accessToken = await getPayPalAccessToken();
  return paypalRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    accessToken
  });
}

export function extractPayPalApprovalUrl(order) {
  return order?.links?.find((link) => link.rel === "payer-action" || link.rel === "approve")?.href ?? null;
}

export function normalizePayPalOrderStatus(order) {
  const status = String(order?.status || "").toUpperCase();
  if (status === "COMPLETED") return "aprovado";
  if (status === "VOIDED") return "cancelado";
  if (["CREATED", "SAVED", "APPROVED", "PAYER_ACTION_REQUIRED"].includes(status)) return "pendente";
  return "rejeitado";
}

export function extractPayPalPaidAt(order) {
  const capture = order?.purchase_units?.[0]?.payments?.captures?.[0];
  return validDateOrNow(capture?.update_time ?? capture?.create_time);
}

export function extractPayPalCapturedAmount(order) {
  const capture = order?.purchase_units?.[0]?.payments?.captures?.[0];
  return Number(capture?.amount?.value ?? order?.purchase_units?.[0]?.amount?.value ?? 0);
}

export function extractPayPalExternalReference(order) {
  const unit = order?.purchase_units?.[0];
  return unit?.custom_id ?? unit?.reference_id ?? null;
}

export function resolvePayPalReturnUrl(environment = process.env) {
  const base = resolveFrontendUrl(environment);
  const url = new URL("/lider", base);
  url.searchParams.set("module", "finance");
  url.searchParams.set("paypal", "retorno");
  return url.toString();
}

export function resolvePayPalCancelUrl(environment = process.env) {
  const base = resolveFrontendUrl(environment);
  const url = new URL("/lider", base);
  url.searchParams.set("module", "finance");
  url.searchParams.set("paypal", "cancelado");
  return url.toString();
}

async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Configure PAYPAL_CLIENT_ID e PAYPAL_CLIENT_SECRET nas variaveis de ambiente.");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const data = await parsePayPalResponse(response);
  return data.access_token;
}

async function paypalRequest(path, { method, accessToken, body = null }) {
  const response = await fetch(`${getPayPalBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  return parsePayPalResponse(response);
}

async function parsePayPalResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = data?.message || data?.details?.[0]?.description || `Erro PayPal HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function getPayPalBaseUrl() {
  const environment = String(process.env.PAYPAL_ENV || "sandbox").trim().toLowerCase();
  return PAYPAL_BASE_URLS[environment] ?? PAYPAL_BASE_URLS.sandbox;
}

function resolveFrontendUrl(environment) {
  const raw = String(environment.FRONTEND_URL || environment.PUBLIC_API_URL || "http://localhost:5173")
    .split(",")[0]
    .trim();
  const value = raw.endsWith("/") ? raw : `${raw}/`;
  return new URL(value);
}

function compactText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function roundMoney(value) {
  return Math.max(Number(Number(value || 0).toFixed(2)), 0);
}

function formatPayPalAmount(value) {
  return roundMoney(value).toFixed(2);
}

function validDateOrNow(value) {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
}
