import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { verifySessionToken } from "../src/middleware/auth.middleware.js";
import { passwordMatches } from "../src/services/auth.service.js";
import { escapeHtml } from "../src/utils/html.js";

const secret = "segredo-de-teste-com-tamanho-suficiente-para-hs256";

test("aceita token de sessao com jti", () => {
  const token = jwt.sign({ id:7, role:"jogador", jti:"abc" }, secret, { expiresIn:"1h" });
  assert.equal(verifySessionToken(token, secret).id, 7);
});

test("recusa token sem jti, estado OAuth e algoritmo none", () => {
  assert.throws(() => verifySessionToken(jwt.sign({ id:7 }, secret), secret));
  assert.throws(() => verifySessionToken(jwt.sign({ type:"oauth_state", jti:"x", id:7 }, secret), secret));
  const none = `${Buffer.from(JSON.stringify({ alg:"none", typ:"JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ id:7, jti:"x" })).toString("base64url")}.`;
  assert.throws(() => verifySessionToken(none, secret));
  assert.throws(() => verifySessionToken(jwt.sign({ id:7, jti:"x" }, secret, { algorithm:"HS512" }), secret));
});

test("senha confere sem revelar se o email existe", async () => {
  const hash = await bcrypt.hash("Senha123", 4);
  assert.equal(await passwordMatches({ senha_hash:hash }, "Senha123"), true);
  assert.equal(await passwordMatches({ senha_hash:hash }, "errada"), false);
  assert.equal(await passwordMatches(null, "Senha123"), false);
  assert.equal(await passwordMatches({ senha_hash:hash }, undefined), false);
});

test("escapa HTML em textos que vao para o email", () => {
  assert.equal(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`), "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;");
  assert.equal(escapeHtml(null), "");
});
