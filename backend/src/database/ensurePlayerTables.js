import pool from "../config/database.js";

export async function ensurePlayerTables() {
  await ensureColumn("users", "banner", "VARCHAR(500) NULL AFTER avatar");
  await ensureColumn("users", "birth_date", "DATE NULL AFTER cidade");
  await ensureColumn("users", "languages", "JSON NULL AFTER birth_date");
  await ensureColumn("team_requests", "message", "VARCHAR(500) NULL AFTER created_by");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS player_links (
      user_id INT NOT NULL,
      steam VARCHAR(255) NULL,
      faceit VARCHAR(255) NULL,
      discord VARCHAR(255) NULL,
      riot_id VARCHAR(120) NULL,
      xbox VARCHAR(120) NULL,
      playstation VARCHAR(120) NULL,
      epic_games VARCHAR(120) NULL,
      battlenet VARCHAR(120) NULL,
      twitch VARCHAR(255) NULL,
      youtube VARCHAR(255) NULL,
      kick VARCHAR(255) NULL,
      instagram VARCHAR(255) NULL,
      x VARCHAR(255) NULL,
      tiktok VARCHAR(255) NULL,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id),
      CONSTRAINT fk_player_links_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_ticket_messages (
      id INT NOT NULL AUTO_INCREMENT,
      ticket_id INT NOT NULL,
      user_id INT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_support_ticket_messages_ticket (ticket_id, created_at),
      CONSTRAINT fk_support_ticket_messages_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
      CONSTRAINT fk_support_ticket_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_two_factor (
      user_id INT NOT NULL,
      secret VARCHAR(64) NOT NULL,
      enabled TINYINT(1) NOT NULL DEFAULT 0,
      confirmed_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id),
      CONSTRAINT fk_user_two_factor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      token_jti VARCHAR(64) NOT NULL,
      user_agent VARCHAR(500) NULL,
      ip_address VARCHAR(64) NULL,
      last_seen_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      revoked_at TIMESTAMP NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_user_sessions_jti (token_jti),
      KEY idx_user_sessions_user (user_id, revoked_at, expires_at),
      CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function ensureColumn(table, column, definition) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (!rows.length) await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}
