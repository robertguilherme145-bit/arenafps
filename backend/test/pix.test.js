import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeBase64Image,
  normalizeGatewayPaymentStatus,
  preparePixData,
  resolvePaymentStatusTransition
} from "../src/utils/pix.js";

test("normaliza status do Mercado Pago para o dominio da Arena Camp", () => {
  assert.equal(normalizeGatewayPaymentStatus("pending"), "pendente");
  assert.equal(normalizeGatewayPaymentStatus("in_process"), "pendente");
  assert.equal(normalizeGatewayPaymentStatus("approved"), "aprovado");
  assert.equal(normalizeGatewayPaymentStatus("rejected"), "rejeitado");
  assert.equal(normalizeGatewayPaymentStatus("refunded"), "cancelado");
});

test("remove prefixo de data URL da imagem recebida pelo gateway", () => {
  assert.equal(normalizeBase64Image("data:image/png;base64,QUJD"), "QUJD");
  assert.equal(normalizeBase64Image("QUJD"), "QUJD");
});

test("gera QR Code local quando o gateway retorna apenas o codigo PIX", async () => {
  const data = await preparePixData({
    point_of_interaction: { transaction_data: { qr_code: "00020101021226890014br.gov.bcb.pix" } }
  });
  assert.equal(data.copia_cola, "00020101021226890014br.gov.bcb.pix");
  assert.match(data.qr_code_base64, /^iVBORw0KGgo/);
});

test("nao regride pagamento aprovado para um estado temporario", () => {
  assert.equal(resolvePaymentStatusTransition("aprovado", "pending"), "aprovado");
  assert.equal(resolvePaymentStatusTransition("aprovado", "rejected"), "aprovado");
  assert.equal(resolvePaymentStatusTransition("aprovado", "refunded"), "cancelado");
  assert.equal(resolvePaymentStatusTransition("pendente", "approved"), "aprovado");
});
