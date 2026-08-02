import pool from "../config/database.js";

export async function findOAuthAccount(provider, providerUserId) {
  const [[row]] = await pool.query(
    `SELECT oa.*, u.role legacy_role FROM oauth_accounts oa INNER JOIN users u ON u.id=oa.user_id WHERE oa.provider=? AND oa.provider_user_id=? LIMIT 1`,
    [provider, providerUserId]
  );
  return row ?? null;
}

export async function createOAuthUser(input) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO users (nome,email,cpf,senha_hash,role,nickname,avatar,email_verified_at) VALUES (?,?,NULL,?,'jogador',?,?,?)`,
      [input.name, input.email, input.password_hash, input.nickname, input.avatar, input.email_verified ? new Date() : null]
    );
    const userId = Number(result.insertId);
    await connection.query(`INSERT INTO user_roles (user_id,role) VALUES (?,'jogador')`, [userId]);
    await connection.query(`INSERT INTO user_context_preferences (user_id,active_role) VALUES (?,'jogador')`, [userId]);
    await connection.query(
      `INSERT INTO oauth_accounts (user_id,provider,provider_user_id,provider_email,metadata_json,last_login_at) VALUES (?,?,?,?,?,NOW())`,
      [userId, input.provider, input.provider_user_id, input.provider_email, JSON.stringify(input.metadata ?? {})]
    );
    if (input.provider === "steam" || input.provider === "discord") {
      await connection.query(
        `INSERT INTO player_links (user_id,steam,discord) VALUES (?,?,?) ON DUPLICATE KEY UPDATE steam=COALESCE(VALUES(steam),steam),discord=COALESCE(VALUES(discord),discord)`,
        [userId, input.provider === "steam" ? input.provider_user_id : null, input.provider === "discord" ? input.provider_label : null]
      );
    }
    await connection.commit();
    return userId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function linkOAuthAccount(userId, input) {
  await pool.query(
    `INSERT INTO oauth_accounts (user_id,provider,provider_user_id,provider_email,metadata_json,last_login_at)
     VALUES (?,?,?,?,?,NOW())
     ON DUPLICATE KEY UPDATE provider_email=VALUES(provider_email),metadata_json=VALUES(metadata_json),last_login_at=NOW()`,
    [userId, input.provider, input.provider_user_id, input.provider_email, JSON.stringify(input.metadata ?? {})]
  );
  await pool.query(
    `UPDATE users SET avatar=COALESCE(avatar,?),email_verified_at=IF(?=1,COALESCE(email_verified_at,NOW()),email_verified_at) WHERE id=?`,
    [input.avatar, input.email_verified ? 1 : 0, userId]
  );
  if (input.provider === "discord") {
    await pool.query(`INSERT INTO player_links (user_id,discord) VALUES (?,?) ON DUPLICATE KEY UPDATE discord=VALUES(discord)`, [userId, input.provider_label || input.provider_user_id]);
  }
}

export async function touchOAuthAccount(id) {
  await pool.query(`UPDATE oauth_accounts SET last_login_at=NOW() WHERE id=?`, [id]);
}

export async function createOAuthLoginCode(userId, codeHash) {
  await pool.query(`INSERT INTO oauth_login_codes (user_id,code_hash,expires_at) VALUES (?,?,DATE_ADD(NOW(), INTERVAL 2 MINUTE))`, [userId, codeHash]);
}

export async function consumeOAuthLoginCode(codeHash) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[row]] = await connection.query(
      `SELECT olc.id,olc.user_id,u.role FROM oauth_login_codes olc INNER JOIN users u ON u.id=olc.user_id WHERE olc.code_hash=? AND olc.used_at IS NULL AND olc.expires_at>NOW() FOR UPDATE`,
      [codeHash]
    );
    if (!row) {
      await connection.rollback();
      return null;
    }
    await connection.query(`UPDATE oauth_login_codes SET used_at=NOW() WHERE id=?`, [row.id]);
    await connection.commit();
    return row;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function completeOAuthEmail(userId, email, nickname) {
  const [[existing]] = await pool.query(`SELECT id FROM users WHERE email=? AND id<>? LIMIT 1`, [email, userId]);
  if (existing) throw new Error("Este email ja pertence a outra conta.");
  await pool.query(
    `UPDATE users SET email=?,nickname=COALESCE(NULLIF(?,''),nickname),email_verified_at=NULL WHERE id=? AND email LIKE '%@oauth.arena-camp.local'`,
    [email, nickname, userId]
  );
  const [[account]] = await pool.query(`SELECT id,nome,email FROM users WHERE id=? LIMIT 1`, [userId]);
  return account ?? null;
}
