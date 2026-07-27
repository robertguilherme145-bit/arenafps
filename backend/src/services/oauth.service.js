import bcrypt from "bcrypt";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { findUserByEmail } from "../models/user.model.js";
import { consumeOAuthLoginCode, createOAuthLoginCode, createOAuthUser, findOAuthAccount, linkOAuthAccount, touchOAuthAccount } from "../models/oauth.model.js";
import { createAuthenticatedSession } from "./sessionAuth.service.js";

const PROVIDERS = ["google", "discord", "steam"];
const STEAM_OPENID = "https://steamcommunity.com/openid/login";

export function oauthProviderEnabled(provider) {
  if (provider === "google") return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  if (provider === "discord") return Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
  if (provider === "steam") return Boolean(process.env.STEAM_API_KEY);
  return false;
}

export function createOAuthAuthorization(provider) {
  assertProvider(provider);
  if (!oauthProviderEnabled(provider)) throw new Error("Este provedor ainda nao foi configurado.");
  const state = jwt.sign({ type:"oauth_state", provider, nonce:crypto.randomUUID() }, process.env.JWT_SECRET, { expiresIn:"10m" });
  const callback = callbackUrl(provider);
  if (provider === "google") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    addParams(url, { client_id:process.env.GOOGLE_CLIENT_ID, redirect_uri:callback, response_type:"code", scope:"openid email profile", state, prompt:"select_account" });
    return { url:url.toString(), state };
  }
  if (provider === "discord") {
    const url = new URL("https://discord.com/oauth2/authorize");
    addParams(url, { client_id:process.env.DISCORD_CLIENT_ID, redirect_uri:callback, response_type:"code", scope:"identify email", state, prompt:"consent" });
    return { url:url.toString(), state };
  }
  const returnTo = new URL(callback);
  returnTo.searchParams.set("state", state);
  const url = new URL(STEAM_OPENID);
  addParams(url, {
    "openid.ns":"http://specs.openid.net/auth/2.0", "openid.mode":"checkid_setup",
    "openid.return_to":returnTo.toString(), "openid.realm":new URL(apiUrl()).origin,
    "openid.identity":"http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id":"http://specs.openid.net/auth/2.0/identifier_select"
  });
  return { url:url.toString(), state };
}

export function validateOAuthState(provider, state, cookieState) {
  if (!state || !cookieState || state !== cookieState) throw new Error("A sessao de autenticacao expirou. Tente novamente.");
  const payload = jwt.verify(state, process.env.JWT_SECRET);
  if (payload.type !== "oauth_state" || payload.provider !== provider) throw new Error("Estado OAuth invalido.");
}

export async function finishOAuthCallback(provider, query) {
  assertProvider(provider);
  const profile = provider === "google" ? await googleProfile(query.code) : provider === "discord" ? await discordProfile(query.code) : await steamProfile(query);
  let account = await findOAuthAccount(provider, profile.id);
  let userId = account ? Number(account.user_id) : null;
  if (account) {
    await touchOAuthAccount(account.id);
  } else {
    const email = normalizedEmail(profile.email);
    const existing = email && profile.email_verified ? await findUserByEmail(email) : null;
    if (existing) {
      userId = Number(existing.id);
      await linkOAuthAccount(userId, oauthInput(provider, profile));
    } else {
      const accountEmail = email || `${provider}_${safeId(profile.id)}@oauth.arena-camp.local`;
      const conflicting = await findUserByEmail(accountEmail);
      if (conflicting) throw new Error("Ja existe uma conta com este email. Entre com senha e vincule o provedor nas configuracoes.");
      userId = await createOAuthUser({
        ...oauthInput(provider, profile), email:accountEmail,
        name:String(profile.name || profile.nickname || "Competidor Arena").slice(0, 255),
        nickname:String(profile.nickname || profile.name || `${provider}-${safeId(profile.id).slice(-8)}`).slice(0, 50),
        password_hash:await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10)
      });
    }
  }
  const rawCode = crypto.randomBytes(32).toString("hex");
  await createOAuthLoginCode(userId, hash(rawCode));
  return rawCode;
}

export async function exchangeOAuthCode(code, metadata) {
  const login = await consumeOAuthLoginCode(hash(code));
  if (!login) throw new Error("O codigo de acesso social e invalido ou expirou.");
  return await createAuthenticatedSession(Number(login.user_id), login.role, metadata);
}

async function googleProfile(code) {
  if (!code) throw new Error("O Google nao retornou o codigo de autorizacao.");
  const token = await postForm("https://oauth2.googleapis.com/token", {
    code, client_id:process.env.GOOGLE_CLIENT_ID, client_secret:process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri:callbackUrl("google"), grant_type:"authorization_code"
  });
  const data = await getJson("https://openidconnect.googleapis.com/v1/userinfo", token.access_token);
  return { id:String(data.sub), email:data.email, email_verified:Boolean(data.email_verified), name:data.name, nickname:data.given_name || data.name, avatar:data.picture, raw:data };
}

async function discordProfile(code) {
  if (!code) throw new Error("O Discord nao retornou o codigo de autorizacao.");
  const token = await postForm("https://discord.com/api/oauth2/token", {
    code, client_id:process.env.DISCORD_CLIENT_ID, client_secret:process.env.DISCORD_CLIENT_SECRET,
    redirect_uri:callbackUrl("discord"), grant_type:"authorization_code"
  });
  const data = await getJson("https://discord.com/api/v10/users/@me", token.access_token);
  const avatar = data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png?size=256` : null;
  return { id:String(data.id), email:data.email, email_verified:Boolean(data.verified), name:data.global_name || data.username, nickname:data.global_name || data.username, avatar, label:data.username, raw:data };
}

async function steamProfile(query) {
  if (query["openid.mode"] !== "id_res") throw new Error("A Steam nao confirmou a autenticacao.");
  const verification = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (key.startsWith("openid.")) verification.set(key, String(value));
  verification.set("openid.mode", "check_authentication");
  const response = await fetch(STEAM_OPENID, { method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded" }, body:verification });
  const body = await response.text();
  if (!response.ok || !/(^|\n)is_valid:true(\n|$)/.test(body)) throw new Error("Nao foi possivel validar a identidade Steam.");
  const claimedId = String(query["openid.claimed_id"] || "");
  const match = claimedId.match(/steamcommunity\.com\/openid\/id\/(\d+)$/);
  if (!match) throw new Error("A Steam retornou uma identidade invalida.");
  const steamId = match[1];
  let player = null;
  try {
    const url = new URL("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/");
    addParams(url, { key:process.env.STEAM_API_KEY, steamids:steamId });
    const data = await getJson(url.toString());
    player = data?.response?.players?.[0] ?? null;
  } catch {}
  return { id:steamId, email:null, email_verified:false, name:player?.personaname || `Steam ${steamId.slice(-6)}`, nickname:player?.personaname, avatar:player?.avatarfull || null, label:steamId, raw:{ steam_id:steamId, profile_url:player?.profileurl || null } };
}

async function postForm(url, fields) {
  const response = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded", Accept:"application/json" }, body:new URLSearchParams(fields) });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error("O provedor recusou a autenticacao.");
  return data;
}
async function getJson(url, accessToken) {
  const response = await fetch(url, { headers:{ Accept:"application/json", ...(accessToken ? { Authorization:`Bearer ${accessToken}` } : {}) } });
  if (!response.ok) throw new Error("Nao foi possivel consultar o perfil no provedor.");
  return await response.json();
}
function oauthInput(provider, profile) { return { provider, provider_user_id:profile.id, provider_email:normalizedEmail(profile.email), provider_label:profile.label || profile.nickname, email_verified:Boolean(profile.email_verified), avatar:profile.avatar || null, metadata:profile.raw || {} }; }
function callbackUrl(provider) { return String(process.env[`${provider.toUpperCase()}_REDIRECT_URI`] || `${apiUrl()}/auth/oauth/${provider}/callback`); }
function apiUrl() { return String(process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 4000}`).replace(/\/$/, ""); }
function normalizedEmail(value) { const email = String(value || "").trim().toLowerCase(); return /^\S+@\S+\.\S+$/.test(email) ? email : null; }
function safeId(value) { return String(value).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120); }
function hash(value) { return crypto.createHash("sha256").update(String(value || "")).digest("hex"); }
function assertProvider(provider) { if (!PROVIDERS.includes(provider)) throw new Error("Provedor de autenticacao invalido."); }
function addParams(url, values) { for (const [key, value] of Object.entries(values)) if (value !== undefined && value !== null) url.searchParams.set(key, String(value)); }
