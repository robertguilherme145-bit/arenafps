import test from "node:test";
import assert from "node:assert/strict";
import { createTotpSecret, generateTotp, verifyTotp } from "../src/utils/totp.js";

test("gera codigos TOTP de seis digitos", () => {
  const secret = createTotpSecret();
  assert.match(secret, /^[A-Z2-7]{32}$/);
  assert.match(generateTotp(secret, 1), /^\d{6}$/);
});

test("valida o codigo atual e tolera uma janela de relogio", () => {
  const secret = "JBSWY3DPEHPK3PXP";
  const now = 1_800_000;
  const code = generateTotp(secret, Math.floor(now / 30000));
  assert.equal(verifyTotp(secret, code, now), true);
  assert.equal(verifyTotp(secret, code, now + 30000), true);
  assert.equal(verifyTotp(secret, "000000", now), false);
});
