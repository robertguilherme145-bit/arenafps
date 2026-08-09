import test from "node:test";
import assert from "node:assert/strict";
import { resolvePayPalAmount } from "../src/services/paypal.service.js";

test("converte inscricao em BRL para USD usando cotacao externa", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(String(url), "https://example.test/latest?amount=10&from=BRL&to=USD");
    return new Response(JSON.stringify({ rates: { USD: 1.95 } }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };

  try {
    const amount = await resolvePayPalAmount(10, {
      PAYPAL_CURRENCY: "USD",
      PAYPAL_EXCHANGE_API_URL: "https://example.test/latest"
    });
    assert.equal(amount, 1.95);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("usa taxa reserva em USD quando a cotacao externa falha", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ message: "indisponivel" }), {
      status: 503,
      headers: { "content-type": "application/json" }
    });

  try {
    const amount = await resolvePayPalAmount(10, {
      PAYPAL_CURRENCY: "USD",
      PAYPAL_EXCHANGE_API_URL: "https://example.test/latest",
      PAYPAL_BRL_TO_USD_RATE: "0.18"
    });
    assert.equal(amount, 1.8);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("bloqueia pagamento internacional sem cotacao valida", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ rates: {} }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });

  try {
    await assert.rejects(
      () =>
        resolvePayPalAmount(10, {
          PAYPAL_CURRENCY: "USD",
          PAYPAL_EXCHANGE_API_URL: "https://example.test/latest"
        }),
      /Nao foi possivel converter BRL para USD/
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
