import assert from "node:assert/strict";
import test from "node:test";
import { buildManualPix, isManualPixReady, mergePaymentSettings, validatePaymentSettings } from "../src/services/paymentSettings.js";

const complete = { mode:"pix_manual", pix_key_type:"email", pix_key:"Pix@Arena.com", receiver_name:"Organização Arena", receiver_city:"São Paulo" };

test("sem nada salvo, comeca no PIX proprio e ainda nao esta pronto", () => {
  const settings = mergePaymentSettings(null);
  assert.equal(settings.mode, "pix_manual");
  assert.equal(isManualPixReady(settings), false);
});

test("PIX proprio completo e salvo normalizado", () => {
  const settings = validatePaymentSettings(complete);
  assert.equal(settings.pix_key, "pix@arena.com");
  assert.equal(settings.receiver_name, "Organizacao Arena");
  assert.equal(settings.receiver_city, "Sao Paulo");
  assert.equal(isManualPixReady(settings), true);
});

test("PIX proprio exige chave, nome e cidade", () => {
  assert.throws(() => validatePaymentSettings({ ...complete, pix_key:"" }), /chave PIX/);
  assert.throws(() => validatePaymentSettings({ ...complete, receiver_name:"" }), /nome/);
  assert.throws(() => validatePaymentSettings({ ...complete, receiver_city:"" }), /cidade/);
  assert.throws(() => validatePaymentSettings({ ...complete, mode:"paypal" }), /Mercado Pago ou PIX/);
});

test("Mercado Pago pode guardar a chave do PIX proprio para trocar depois", () => {
  const settings = validatePaymentSettings({ ...complete, mode:"mercadopago" });
  assert.equal(settings.mode, "mercadopago");
  assert.equal(settings.pix_key, "pix@arena.com");
  const bare = validatePaymentSettings({ mode:"mercadopago" });
  assert.equal(bare.pix_key, "");
});

test("gera copia e cola e QR do PIX proprio com valor", async () => {
  const pix = await buildManualPix(validatePaymentSettings(complete), { amount:25, txid:"ARENAE7" });
  assert.ok(pix.copia_cola.includes("540525.00"));
  assert.ok(pix.copia_cola.includes("0507ARENAE7"));
  assert.ok(pix.qr_code_base64.length > 100);
  assert.ok(!pix.qr_code_base64.startsWith("data:"));
});

test("PIX proprio sem configuracao avisa para falar com a organizacao", async () => {
  await assert.rejects(() => buildManualPix(mergePaymentSettings(null), { amount:10, txid:"X" }), /não configurou o PIX/);
});
