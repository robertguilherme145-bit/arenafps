import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { loginLimiter, emailLimiter } from "../src/middleware/rateLimit.middleware.js";

async function withServer(middleware, action) {
  const app = express();
  app.use(express.json());
  app.post("/alvo", middleware, (req, res) => res.json({ ok:true }));
  const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
  const url = `http://127.0.0.1:${server.address().port}/alvo`;
  try { await action((body) => fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body) })); }
  finally { server.close(); }
}

test("bloqueia o login depois de 10 tentativas para o mesmo email", async () => {
  await withServer(loginLimiter(), async (send) => {
    for (let i = 0; i < 10; i++) assert.equal((await send({ email:"alvo@arena.gg" })).status, 200);
    const blocked = await send({ email:"ALVO@arena.gg " });
    assert.equal(blocked.status, 429);
    assert.match((await blocked.json()).erro, /Muitas tentativas/);
    assert.equal((await send({ email:"outro@arena.gg" })).status, 200);
  });
});

test("limita envios de email por IP", async () => {
  await withServer(emailLimiter(), async (send) => {
    for (let i = 0; i < 5; i++) assert.equal((await send({ email:`p${i}@arena.gg` })).status, 200);
    assert.equal((await send({ email:"p9@arena.gg" })).status, 429);
  });
});
