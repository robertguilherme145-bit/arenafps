import pool from "../config/database.js";
import { openSecret, sealSecret } from "../utils/secretBox.js";

// O segredo do 2FA fica criptografado no banco. Se a chave mudou e o segredo nao abre:
// configuracao nao concluida e descartada; 2FA ativo exige redefinicao (nunca vira "sem 2FA").
export function readTwoFactorSecret(row, environment = process.env) {
  try {
    return { secret:openSecret(row.secret, environment) };
  } catch {
    if (!Number(row.enabled)) return { discard:true };
    throw new Error("O 2FA desta conta precisa ser redefinido. Fale com o suporte da Arena Camp.");
  }
}

export async function findTwoFactor(userId) {
  const [[row]] = await pool.query("SELECT * FROM user_two_factor WHERE user_id = ? LIMIT 1", [userId]);
  if (!row) return null;
  const read = readTwoFactorSecret(row);
  if (read.discard) {
    await pool.query("DELETE FROM user_two_factor WHERE user_id = ? AND enabled = 0", [userId]);
    return null;
  }
  const { secret } = read;
  if (!String(row.secret).startsWith("v1.")) {
    await pool.query("UPDATE user_two_factor SET secret = ? WHERE user_id = ?", [sealSecret(secret), userId]);
  }
  return { ...row, secret };
}

export async function saveTwoFactorSecret(userId, secret) {
  await pool.query("INSERT INTO user_two_factor (user_id, secret, enabled) VALUES (?, ?, 0) ON DUPLICATE KEY UPDATE secret=VALUES(secret), enabled=0, confirmed_at=NULL", [userId, sealSecret(secret)]);
}

export async function enableTwoFactor(userId) {
  await pool.query("UPDATE user_two_factor SET enabled = 1, confirmed_at = CURRENT_TIMESTAMP WHERE user_id = ?", [userId]);
}

export async function disableTwoFactor(userId) {
  await pool.query("DELETE FROM user_two_factor WHERE user_id = ?", [userId]);
}

export async function createUserSession(userId, jti, metadata) {
  const [result] = await pool.query("INSERT INTO user_sessions (user_id, token_jti, user_agent, ip_address, expires_at) VALUES (?, ?, ?, ?, ?)", [userId, jti, metadata.user_agent || null, metadata.ip_address || null, metadata.expires_at]);
  return result.insertId;
}

export async function touchUserSession(jti) {
  const [result] = await pool.query("UPDATE user_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token_jti = ? AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP", [jti]);
  return result.affectedRows > 0;
}

export async function findUserSessions(userId, currentJti) {
  const [rows] = await pool.query("SELECT id, user_agent, ip_address, last_seen_at, expires_at, revoked_at, created_at, token_jti = ? AS is_current FROM user_sessions WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP ORDER BY revoked_at IS NULL DESC, last_seen_at DESC", [currentJti || "", userId]);
  return rows.map((row) => ({ ...row, is_current: Boolean(row.is_current), active: !row.revoked_at }));
}

export async function revokeUserSession(userId, sessionId) {
  const [result] = await pool.query("UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND revoked_at IS NULL", [sessionId, userId]);
  return result.affectedRows > 0;
}

export async function revokeCurrentSession(userId, jti) {
  if (!jti) return false;
  const [result] = await pool.query("UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_jti = ? AND user_id = ? AND revoked_at IS NULL", [jti, userId]);
  return result.affectedRows > 0;
}

export async function revokeAllUserSessions(userId) {
  await pool.query("UPDATE user_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=? AND revoked_at IS NULL", [userId]);
}
