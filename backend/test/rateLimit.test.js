import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { clientKey, emailLimiter, loginAccountLimiter, loginLimiter, parseTrustProxy, registerLimiter } from "../src/middleware/rateLimit.middleware.js";

async function withServer(middleware, action, status = 200) {
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json());
  app.post("/alvo", middleware, (req, res) => res.status(status).json({ ok:status < 400 }));
  const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
  const url = `http://127.0.0.1:${server.address().port}/alvo`;
  const send = (body, ip = "203.0.113.10") => fetch(url, { method:"POST", headers:{ "Content-Type":"application/json", "X-Forwarded-For":ip }, body:JSON.stringify(body) });
  try { await action(send); }
  finally { server.close(); }
}

test("bloqueia o login depois de 10 tentativas para o mesmo email no mesmo IP", async () => {
  await withServer(loginLimiter(), async (send) => {
    for (let i = 0; i < 10; i++) assert.equal((await send({ email:"alvo@arena.gg" })).status, 200);
    const blocked = await send({ email:"ALVO@arena.gg " });
    assert.equal(blocked.status, 429);
    assert.match((await blocked.json()).erro, /Muitas tentativas/);
    assert.equal((await send({ email:"outro@arena.gg" })).status, 200);
  });
});

test("protege a conta mesmo com tentativas vindas de varios IPs", async () => {
  await withServer(loginAccountLimiter(), async (send) => {
    for (let i = 0; i < 30; i++) assert.equal((await send({ email:"alvo@arena.gg" }, `198.51.100.${i + 1}`)).status, 200);
    assert.equal((await send({ email:"alvo@arena.gg" }, "198.51.100.200")).status, 429);
  });
});

test("limita envios de email por IP", async () => {
  await withServer(emailLimiter(), async (send) => {
    for (let i = 0; i < 5; i++) assert.equal((await send({ email:`p${i}@arena.gg` })).status, 200);
    assert.equal((await send({ email:"p9@arena.gg" })).status, 429);
  });
});

test("cadastro recusado por erro de validacao nao gasta o limite", async () => {
  await withServer(registerLimiter(), async (send) => {
    for (let i = 0; i < 15; i++) assert.equal((await send({ email:`p${i}@arena.gg` })).status, 400);
  }, 400);
});

test("IPv6 do mesmo /64 conta como um cliente", () => {
  assert.equal(clientKey("2001:db8:1:2:aaaa::1"), clientKey("2001:db8:1:2:bbbb::9"));
  assert.notEqual(clientKey("2001:db8:1:2::1"), clientKey("2001:db8:1:3::1"));
  assert.equal(clientKey("::ffff:203.0.113.7"), "203.0.113.7");
  assert.equal(clientKey("203.0.113.7"), "203.0.113.7");
});

test("TRUST_PROXY_HOPS invalido volta para 1", () => {
  assert.equal(parseTrustProxy(undefined), 1);
  assert.equal(parseTrustProxy(""), 1);
  assert.equal(parseTrustProxy("abc"), 1);
  assert.equal(parseTrustProxy("-2"), 1);
  assert.equal(parseTrustProxy("2"), 2);
  assert.equal(parseTrustProxy("0"), 0);
});
