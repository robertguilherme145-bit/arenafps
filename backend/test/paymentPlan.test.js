import assert from "node:assert/strict";
import test from "node:test";
import { planPayment } from "../src/services/paymentPlan.js";

const manual = (status, declared = false) => ({ provider:"pix_manual", status, declared_at:declared ? "2026-10-21 10:00:00" : null, gateway_id:null });
const mp = (status, gatewayId = "123") => ({ provider:"mercadopago", status, declared_at:null, gateway_id:gatewayId });

test("sem pagamento: cria", () => {
  assert.equal(planPayment("pix_manual", null), "create");
  assert.equal(planPayment("mercadopago", undefined), "create");
});

test("pagamento ja aprovado nunca e trocado", () => {
  assert.throws(() => planPayment("pix_manual", manual("aprovado")), /ja esta paga/);
  assert.throws(() => planPayment("mercadopago", mp("aprovado")), /ja esta paga/);
});

test("PIX proprio: pendente renova, informado fica, recusado pode pagar de novo", () => {
  assert.equal(planPayment("pix_manual", manual("pendente")), "refresh");
  assert.equal(planPayment("pix_manual", manual("pendente", true)), "reuse");
  assert.equal(planPayment("pix_manual", manual("rejeitado", true)), "replace");
  assert.equal(planPayment("pix_manual", manual("cancelado")), "replace");
});

test("troca do Mercado Pago para PIX proprio confere o PIX antigo antes", () => {
  assert.equal(planPayment("pix_manual", mp("pendente")), "check-gateway");
  assert.equal(planPayment("pix_manual", mp("pendente", null)), "replace");
  assert.equal(planPayment("pix_manual", mp("rejeitado")), "replace");
});

test("Mercado Pago: reaproveita pendente, troca recusado e PIX proprio nao informado", () => {
  assert.equal(planPayment("mercadopago", mp("pendente")), "reuse");
  assert.equal(planPayment("mercadopago", mp("cancelado")), "replace");
  assert.equal(planPayment("mercadopago", manual("pendente")), "replace");
  assert.equal(planPayment("mercadopago", manual("rejeitado", true)), "replace");
  assert.throws(() => planPayment("mercadopago", manual("pendente", true)), /ja informou/);
});
