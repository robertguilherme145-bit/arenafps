import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { createUserSession } from "../models/security.model.js";
import { resolveUserAccess } from "./identity.service.js";

export async function createAuthenticatedSession(userId, fallbackRole, metadata = {}) {
  const access = await resolveUserAccess(userId, fallbackRole);
  if (!access) throw new Error("Conta nao encontrada.");
  const jti = crypto.randomUUID();
  const token = jwt.sign({ id:userId, role:access.active_role, jti }, process.env.JWT_SECRET, { expiresIn:"7d" });
  await createUserSession(userId, jti, {
    user_agent:String(metadata.user_agent || "").slice(0, 500),
    ip_address:String(metadata.ip_address || "").slice(0, 64),
    expires_at:new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  return { token, usuario:access };
}
