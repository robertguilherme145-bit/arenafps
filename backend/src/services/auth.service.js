import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { findTwoFactor } from "../models/security.model.js";
import { createUser, findUserByEmail } from "../models/user.model.js";
import { completeRegistration, createEmailVerificationToken, createPasswordResetToken, deleteIncompleteUser, markOnboardingComplete, resetPasswordWithToken, verifyEmailToken } from "../models/account.model.js";
import { completeOAuthEmail } from "../models/oauth.model.js";
import { verifyTotp } from "../utils/totp.js";
import { resolveUserAccess } from "./identity.service.js";
import { sendTransactionalMail } from "./mail.service.js";
import { oauthProviderEnabled } from "./oauth.service.js";
import { createAuthenticatedSession } from "./sessionAuth.service.js";

export async function register(payload) {
  const email = String(payload.email || "").trim().toLowerCase();
  const name = required(payload.name, "Informe seu nome.", 255);
  const nickname = required(payload.nickname || payload.name, "Informe seu nickname.", 50);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Informe um email valido.");
  validatePassword(payload.password);
  if (await findUserByEmail(email)) throw new Error("Email ja cadastrado.");

  const intendedRole = ["jogador", "lider"].includes(payload.intended_role) ? payload.intended_role : "jogador";
  const gameIds = [...new Set((Array.isArray(payload.game_ids) ? payload.game_ids : []).map(Number).filter(Number.isInteger))];
  if (!gameIds.length) throw new Error("Selecione pelo menos um jogo.");
  const primaryGameId = gameIds.includes(Number(payload.primary_game_id)) ? Number(payload.primary_game_id) : gameIds[0];
  const passwordHash = await bcrypt.hash(payload.password, 10);
  const user = await createUser({ nome:name, email, cpf:optional(payload.cpf, 14), senhaHash:passwordHash, role:"jogador" });

  try {
    await completeRegistration(user.id, {
      nickname,
      discord:optional(payload.discord, 100),
      steam:optional(payload.steam, 255),
      intended_role:intendedRole,
      game_ids:gameIds,
      primary_game_id:primaryGameId
    });
    const verification = await issueEmailVerification(user.id, email, name);
    return { id:user.id, email, verification_required:true, email_sent:verification.sent };
  } catch (error) {
    await deleteIncompleteUser(user.id);
    throw error;
  }
}

export async function login({ email, password, two_factor_code }, metadata = {}) {
  const user = await findUserByEmail(String(email || "").trim().toLowerCase());
  if (!user) throw new Error("Usuario nao encontrado.");
  if (!await bcrypt.compare(password, user.senha_hash)) throw new Error("Senha invalida.");

  const twoFactor = await findTwoFactor(user.id);
  if (twoFactor?.enabled && !two_factor_code) return { requires_two_factor:true };
  if (twoFactor?.enabled && !verifyTotp(twoFactor.secret, two_factor_code)) throw new Error("Codigo de autenticacao invalido.");

  return await createAuthenticatedSession(user.id, user.role, metadata);
}

export async function verifyEmail(token) {
  if (!await verifyEmailToken(hashToken(token))) throw new Error("O link de verificacao e invalido ou expirou.");
  return { mensagem:"Email confirmado com sucesso." };
}

export async function resendVerification(user) {
  if (user.email_verified) return { mensagem:"Seu email ja esta confirmado." };
  const result = await issueEmailVerification(user.id, user.email, user.nome);
  return { mensagem:result.sent ? "Enviamos um novo link de verificacao para seu email." : "Nao foi possivel enviar o email. Tente novamente em alguns minutos.", email_sent:result.sent };
}

export async function requestPasswordReset(email) {
  const account = await findUserByEmail(String(email || "").trim().toLowerCase());
  if (!account) return { mensagem:"Se o email estiver cadastrado, voce recebera as instrucoes." };
  const token = crypto.randomBytes(32).toString("hex");
  await createPasswordResetToken(account.id, hashToken(token));
  const url = `${frontendUrl()}/recuperar-senha?token=${token}`;
  const mail = await sendTransactionalMail({ user_id:account.id, recipient:account.email, subject:"Redefina sua senha da Arena Camp", html:mailTemplate("Redefinicao de senha", "Recebemos uma solicitacao para redefinir sua senha. O link expira em 1 hora.", url, "Criar nova senha") });
  return { mensagem:"Se o email estiver cadastrado, voce recebera as instrucoes.", email_sent:mail.sent };
}

export async function resetPassword(token, password) {
  validatePassword(password);
  const passwordHash = await bcrypt.hash(password, 10);
  if (!await resetPasswordWithToken(hashToken(token), passwordHash)) throw new Error("O link de recuperacao e invalido ou expirou.");
  return { mensagem:"Senha atualizada. Entre novamente em sua conta." };
}

export async function completeOnboarding(user, intendedRole) {
  const role = ["jogador", "lider"].includes(intendedRole) ? intendedRole : "jogador";
  await markOnboardingComplete(user.id, role);
  return await resolveUserAccess(user.id, role);
}

export async function completeOAuthProfile(user, payload) {
  if (!user.needs_email) throw new Error("Esta conta ja possui um email valido.");
  const email = String(payload.email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Informe um email valido.");
  const nickname = String(payload.nickname || user.nickname || "").trim().slice(0, 50);
  const account = await completeOAuthEmail(user.id, email, nickname);
  if (!account) throw new Error("Conta nao encontrada.");
  const verification = await issueEmailVerification(account.id, account.email, account.nome);
  return { mensagem:verification.sent ? "Email salvo. Enviamos o link de confirmacao." : "Email salvo, mas o envio falhou. Solicite um novo link na plataforma.", email_sent:verification.sent };
}

export function authProviders() {
  return {
    google:oauthProviderEnabled("google"),
    discord:oauthProviderEnabled("discord"),
    steam:oauthProviderEnabled("steam"),
    password:true
  };
}

async function issueEmailVerification(userId, email, name) {
  const token = crypto.randomBytes(32).toString("hex");
  await createEmailVerificationToken(userId, hashToken(token));
  const url = `${frontendUrl()}/verificar-email?token=${token}`;
  const mail = await sendTransactionalMail({ user_id:userId, recipient:email, subject:"Confirme seu email na Arena Camp", html:mailTemplate(`Ola, ${name}`, "Confirme seu email para liberar todas as funcoes competitivas da sua conta.", url, "Confirmar email") });
  return { sent:mail.sent };
}

function mailTemplate(title, text, url, action) { return `<div style="font-family:Arial,sans-serif;background:#07111f;color:#f7fbff;padding:32px"><h1>${title}</h1><p style="color:#b8c4d6">${text}</p><p><a href="${url}" style="display:inline-block;background:#16c8e5;color:#001018;padding:12px 18px;text-decoration:none;font-weight:700">${action}</a></p><p style="color:#7d8ca3;font-size:12px">Se voce nao solicitou esta acao, ignore esta mensagem.</p></div>`; }
function hashToken(token) { return crypto.createHash("sha256").update(String(token || "")).digest("hex"); }
function frontendUrl() { return String(process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, ""); }
function required(value, message, max) { const text = String(value || "").trim(); if (!text) throw new Error(message); return text.slice(0, max); }
function optional(value, max) { const text = String(value || "").trim(); return text ? text.slice(0, max) : null; }
function validatePassword(password) { if (String(password || "").length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new Error("A senha deve ter ao menos 8 caracteres, uma letra e um numero."); }
