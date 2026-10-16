import assert from "node:assert/strict";
import test from "node:test";
import { openSecret, sealSecret } from "../src/utils/secretBox.js";

const env = { JWT_SECRET:"segredo-de-teste-com-tamanho-suficiente" };

test("criptografa e devolve o mesmo segredo", () => {
  const sealed = sealSecret("JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP", env);
  assert.match(sealed, /^v1\./);
  assert.ok(!sealed.includes("JBSWY3DP"));
  assert.ok(sealed.length <= 255);
  assert.equal(openSecret(sealed, env), "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP");
});

test("cada gravacao gera um texto diferente", () => {
  assert.notEqual(sealSecret("ABC", env), sealSecret("ABC", env));
});

test("segredo antigo em texto puro continua funcionando", () => {
  assert.equal(openSecret("JBSWY3DPEHPK3PXP", env), "JBSWY3DPEHPK3PXP");
});

test("chave errada ou texto adulterado falha fechado", () => {
  const sealed = sealSecret("ABC", env);
  assert.throws(() => openSecret(sealed, { JWT_SECRET:"outra-chave" }));
  assert.throws(() => openSecret(`${sealed.slice(0, -2)}xx`, env));
});

test("TOTP_ENCRYPTION_KEY tem prioridade sobre o JWT_SECRET", () => {
  const sealed = sealSecret("ABC", { ...env, TOTP_ENCRYPTION_KEY:"chave-propria" });
  assert.equal(openSecret(sealed, { JWT_SECRET:"mudou", TOTP_ENCRYPTION_KEY:"chave-propria" }), "ABC");
});
