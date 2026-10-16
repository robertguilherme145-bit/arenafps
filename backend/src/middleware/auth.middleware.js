import jwt from "jsonwebtoken";
import { touchUserSession } from "../models/security.model.js";
import { resolveUserAccess } from "../services/identity.service.js";

// So aceita tokens de sessao: HS256, com jti (revogavel) e nunca o "state" do OAuth.
export function verifySessionToken(token, secret) {
  const payload = jwt.verify(token, secret, { algorithms:["HS256"] });
  if (!payload?.jti || payload.type) throw new Error("Token de sessao invalido.");
  return payload;
}

export async function auth(req, res, next) {
  const bearer = req.headers.authorization;
  if (!bearer) return res.status(401).json({ erro:"Token ausente" });

  try {
    const payload = verifySessionToken(bearer.replace("Bearer ", ""), process.env.JWT_SECRET);
    if (!await touchUserSession(payload.jti)) return res.status(401).json({ erro:"Sessao encerrada" });

    const access = await resolveUserAccess(payload.id, payload.role);
    if (!access) return res.status(401).json({ erro:"Conta nao encontrada" });

    req.user = { ...payload, ...access, role:access.active_role };
    next();
  } catch {
    return res.status(401).json({ erro:"Token inválido" });
  }
}
