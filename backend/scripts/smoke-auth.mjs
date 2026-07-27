import assert from "node:assert/strict";
import crypto from "node:crypto";
import pool from "../src/config/database.js";
import { createOAuthLoginCode } from "../src/models/oauth.model.js";

const apiUrl = String(process.env.API_URL || "http://localhost:4000").replace(/\/$/, "");
const email = "codex.auth.smoke@arena-camp.test";
const password = "ArenaTeste2026";
const teamSlug = "auth-smoke-team";

try {
  await pool.query(`DELETE FROM teams WHERE slug=?`, [teamSlug]);
  await pool.query(`DELETE FROM users WHERE email=?`, [email]);
  const games = await request("/game");
  assert.ok(games.length, "O catalogo precisa ter ao menos um jogo ativo.");

  const registration = await request("/auth/register", {
    method:"POST",
    body:{ name:"Teste de autenticacao", nickname:"AuthSmoke", email, password, game_ids:[Number(games[0].id)], primary_game_id:Number(games[0].id) }
  });
  assert.equal(registration.verification_required, true);
  assert.equal(registration.dev_verification_url, undefined, "Tokens nao podem ser devolvidos pela API.");
  const [[verificationMail]] = await pool.query(`SELECT html_body FROM mail_outbox WHERE recipient=? AND subject LIKE 'Confirme%' ORDER BY id DESC LIMIT 1`, [email]);
  const verificationToken = extractToken(verificationMail?.html_body, "/verificar-email");
  await request("/auth/verify-email", { method:"POST", body:{ token:verificationToken } });
  const login = await request("/auth/login", { method:"POST", body:{ email, password } });
  assert.ok(login.token);
  assert.equal(login.usuario.email_verified, true);

  const recovery = await request("/auth/forgot-password", { method:"POST", body:{ email } });
  assert.equal(recovery.dev_reset_url, undefined, "Tokens de recuperacao nao podem ser devolvidos pela API.");
  const [[recoveryMail]] = await pool.query(`SELECT html_body FROM mail_outbox WHERE recipient=? AND subject LIKE 'Redefina%' ORDER BY id DESC LIMIT 1`, [email]);
  assert.ok(extractToken(recoveryMail?.html_body, "/recuperar-senha"));

  const oauthCode = crypto.randomBytes(32).toString("hex");
  const oauthCodeHash = crypto.createHash("sha256").update(oauthCode).digest("hex");
  await createOAuthLoginCode(login.usuario.id, oauthCodeHash);
  const socialLogin = await request("/auth/oauth/exchange", { method:"POST", body:{ code:oauthCode } });
  assert.ok(socialLogin.token);
  const repeatedExchange = await fetch(`${apiUrl}/auth/oauth/exchange`, { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ code:oauthCode }) });
  assert.equal(repeatedExchange.status, 400);

  const identity = await request("/auth/onboarding", { method:"POST", token:login.token, body:{ role:"lider" } });
  assert.equal(identity.active_role, "lider");
  assert.equal(identity.onboarding_completed, true);
  assert.equal(identity.games[0].id, Number(games[0].id));
  const team = await request("/team", { method:"POST", token:login.token, body:{ game_id:Number(games[0].id), nome:"Auth Smoke Team", tag:"AST", slug:teamSlug, descricao:"Equipe temporaria de teste" } });
  assert.ok(team.id);
  console.log(JSON.stringify({ registration:true, verification:true, password_recovery_email:true, local_token_exposure:false, login:true, oauth_exchange:true, oauth_replay_blocked:true, onboarding:true, leader_team_creation:true, active_role:identity.active_role, game:identity.games[0].nome }));
} finally {
  await pool.query(`DELETE FROM teams WHERE slug=?`, [teamSlug]);
  await pool.query(`DELETE FROM users WHERE email=?`, [email]);
  await pool.end();
}

function extractToken(html, path) {
  const href = String(html || "").match(/href="([^"]+)"/)?.[1];
  assert.ok(href, "O email deve conter um link seguro.");
  const url = new URL(href.replace(/&amp;/g, "&"));
  assert.equal(url.pathname, path);
  const token = url.searchParams.get("token");
  assert.ok(token);
  return token;
}

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method:options.method || "GET",
    headers:{ Accept:"application/json", ...(options.body ? { "Content-Type":"application/json" } : {}), ...(options.token ? { Authorization:`Bearer ${options.token}` } : {}) },
    body:options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${path}: ${data.erro || response.statusText}`);
  return data;
}
