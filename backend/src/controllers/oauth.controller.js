import { completeOAuthProfile } from "../services/auth.service.js";
import { createOAuthAuthorization, exchangeOAuthCode, finishOAuthCallback, validateOAuthState } from "../services/oauth.service.js";

export function startOAuth(req, res) {
  try {
    const { url, state } = createOAuthAuthorization(req.params.provider);
    res.cookie("arena_oauth_state", state, cookieOptions(req));
    return res.redirect(url);
  } catch (error) {
    return redirectError(res, error);
  }
}

export async function oauthCallback(req, res) {
  try {
    if (req.query.error) throw new Error("A autorizacao foi cancelada no provedor.");
    const state = String(req.query.state || "");
    validateOAuthState(req.params.provider, state, readCookie(req, "arena_oauth_state"));
    const code = await finishOAuthCallback(req.params.provider, req.query);
    res.clearCookie("arena_oauth_state", { path:"/auth/oauth" });
    const url = new URL("/oauth/callback", frontendUrl());
    url.searchParams.set("code", code);
    return res.redirect(url.toString());
  } catch (error) {
    res.clearCookie("arena_oauth_state", { path:"/auth/oauth" });
    return redirectError(res, error);
  }
}

export async function exchangeOAuth(req, res) {
  try {
    const result = await exchangeOAuthCode(req.body.code, { user_agent:req.get("user-agent"), ip_address:req.ip });
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ erro:error.message });
  }
}

export async function completeOAuthAccount(req, res) {
  try { return res.json(await completeOAuthProfile(req.user, req.body)); }
  catch (error) { return res.status(400).json({ erro:error.message }); }
}

function redirectError(res, error) {
  const url = new URL("/entrar", frontendUrl());
  url.searchParams.set("oauth_error", error?.message || "Nao foi possivel autenticar com este provedor.");
  return res.redirect(url.toString());
}
function frontendUrl() { return String(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, ""); }
function readCookie(req, name) {
  const prefix = `${name}=`;
  const item = String(req.headers.cookie || "").split(";").map((value) => value.trim()).find((value) => value.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : null;
}
function cookieOptions(req) {
  return { httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV === "production" || req.secure, maxAge:10 * 60 * 1000, path:"/auth/oauth" };
}
