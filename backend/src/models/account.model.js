import pool from "../config/database.js";

export async function deleteIncompleteUser(userId) {
  await pool.query(`DELETE FROM users WHERE id = ? AND email_verified_at IS NULL`, [userId]);
}

export async function completeRegistration(userId, data) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`UPDATE users SET nickname = ?, discord = ? WHERE id = ?`, [data.nickname, data.discord, userId]);
    await connection.query(`INSERT IGNORE INTO user_roles (user_id, role) VALUES (?, 'jogador')`, [userId]);
    if (data.intended_role === "lider") {
      await connection.query(`INSERT IGNORE INTO user_roles (user_id, role) VALUES (?, ?)`, [userId, data.intended_role]);
    }
    if (data.game_ids.length) {
      await connection.query(`INSERT INTO user_games (user_id, game_id, is_primary) VALUES ?`, [data.game_ids.map((gameId) => [userId, gameId, gameId === data.primary_game_id ? 1 : 0])]);
    }
    await connection.query(`INSERT INTO player_links (user_id, steam, discord) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE steam=VALUES(steam), discord=VALUES(discord)`, [userId, data.steam, data.discord]);
    await connection.query(`INSERT INTO user_context_preferences (user_id, active_role, active_game_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE active_role=VALUES(active_role), active_game_id=VALUES(active_game_id)`, [userId, data.intended_role, data.primary_game_id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createEmailVerificationToken(userId, tokenHash) {
  await pool.query(`UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL`, [userId]);
  await pool.query(`INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`, [userId, tokenHash]);
}

export async function verifyEmailToken(tokenHash) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[token]] = await connection.query(`SELECT * FROM email_verification_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() FOR UPDATE`, [tokenHash]);
    if (!token) {
      const [[verified]] = await connection.query(`SELECT evt.id FROM email_verification_tokens evt INNER JOIN users u ON u.id=evt.user_id WHERE evt.token_hash=? AND evt.used_at IS NOT NULL AND u.email_verified_at IS NOT NULL LIMIT 1`, [tokenHash]);
      await connection.commit();
      return Boolean(verified);
    }
    await connection.query(`UPDATE users SET email_verified_at = NOW() WHERE id = ?`, [token.user_id]);
    await connection.query(`UPDATE email_verification_tokens SET used_at = NOW() WHERE id = ?`, [token.id]);
    await connection.commit();
    return true;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

export async function createPasswordResetToken(userId, tokenHash) {
  await pool.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL`, [userId]);
  await pool.query(`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`, [userId, tokenHash]);
}

export async function resetPasswordWithToken(tokenHash, passwordHash) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[token]] = await connection.query(`SELECT * FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() FOR UPDATE`, [tokenHash]);
    if (!token) return false;
    await connection.query(`UPDATE users SET senha_hash = ? WHERE id = ?`, [passwordHash, token.user_id]);
    await connection.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?`, [token.id]);
    await connection.query(`UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`, [token.user_id]);
    await connection.commit();
    return true;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

export async function markOnboardingComplete(userId, intendedRole) {
  await pool.query(`INSERT IGNORE INTO user_roles (user_id, role) VALUES (?, ?)`, [userId, intendedRole]);
  await pool.query(`UPDATE users SET onboarding_completed_at = NOW() WHERE id = ?`, [userId]);
  await pool.query(`INSERT INTO user_context_preferences (user_id, active_role) VALUES (?, ?) ON DUPLICATE KEY UPDATE active_role=VALUES(active_role)`, [userId, intendedRole]);
}

export async function createMailOutbox(input) {
  const [result] = await pool.query(`INSERT INTO mail_outbox (user_id, recipient, subject, html_body) VALUES (?, ?, ?, ?)`, [input.user_id, input.recipient, input.subject, input.html]);
  return Number(result.insertId);
}

export async function updateMailOutbox(id, status, metadata = {}) {
  await pool.query(`UPDATE mail_outbox SET status = ?, provider_message_id = ?, error_message = ?, sent_at = IF(? = 'enviado', NOW(), sent_at) WHERE id = ?`, [status, metadata.message_id ?? null, metadata.error ?? null, status, id]);
}
