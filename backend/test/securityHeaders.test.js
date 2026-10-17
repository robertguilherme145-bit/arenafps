import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { securityHeaders } from "../src/middleware/securityHeaders.js";

async function headersFor(options) {
  const app = express();
  app.use(securityHeaders(options));
  app.get("/", (req, res) => res.send("ok"));
  const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
  try { return (await fetch(`http://127.0.0.1:${server.address().port}/`)).headers; }
  finally { server.close(); }
}

test("bloqueia iframe de outros sites e adivinhacao de tipo", async () => {
  const headers = await headersFor({ production:false });
  assert.equal(headers.get("x-frame-options"), "DENY");
  assert.equal(headers.get("x-content-type-options"), "nosniff");
  assert.equal(headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.match(headers.get("permissions-policy"), /camera=\(\)/);
});

test("CSP so permite scripts do proprio site", async () => {
  const csp = (await headersFor({ production:false })).get("content-security-policy");
  for (const directive of ["default-src 'self'", "script-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data: blob: https:", "frame-src https://player.twitch.tv https://www.youtube-nocookie.com https://player.kick.com"]) {
    assert.ok(csp.includes(directive), directive);
  }
  assert.ok(!/script-src[^;]*unsafe/.test(csp));
});

test("HSTS so em producao", async () => {
  assert.equal((await headersFor({ production:false })).get("strict-transport-security"), null);
  assert.match((await headersFor({ production:true })).get("strict-transport-security"), /max-age=31536000/);
});
