import assert from "node:assert/strict";
import test from "node:test";
import { receiptToken, receiptUrlFor } from "../src/utils/receiptUrl.js";

const token = "0123456789abcdef0123456789abcdef";

test("aceita so o endereco privado do comprovante", () => {
  assert.equal(receiptToken(receiptUrlFor(token)), token);
  assert.equal(receiptToken(` ${receiptUrlFor(token)} `), token);
});

test("recusa links externos, imagens publicas e truques", () => {
  for (const value of [
    "https://exemplo.com/comprovante.png",
    "/media/files/3/comprovante.png",
    "javascript:alert(1)",
    `/payment/receipts/${token}/../../admin`,
    `/payment/receipts/${token.toUpperCase()}`,
    "/payment/receipts/123",
    "",
    null
  ]) assert.equal(receiptToken(value), null, String(value));
});
