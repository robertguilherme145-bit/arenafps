import pool from "../config/database.js";

export async function ensureCaptainTables() {
  await ensureColumn("team_members", "can_invite_players", "TINYINT(1) NOT NULL DEFAULT 0 AFTER last_seen_at");
  await ensureColumn("team_members", "can_remove_players", "TINYINT(1) NOT NULL DEFAULT 0 AFTER can_invite_players");
  await ensureColumn("match_competition_settings", "server_password", "VARCHAR(120) NULL AFTER server_address");
  await ensureColumn("match_competition_settings", "responsible_admin_id", "INT NULL AFTER server_password");
  await ensureColumn("match_competition_settings", "captain_confirmation_enabled", "TINYINT(1) NOT NULL DEFAULT 1 AFTER responsible_admin_id");
  await ensureColumn("match_competition_settings", "veto_action_seconds", "INT NOT NULL DEFAULT 30 AFTER captain_confirmation_enabled");
  await ensureColumn("match_veto_sessions", "action_seconds", "INT NOT NULL DEFAULT 30 AFTER current_step");
  await ensureColumn("match_veto_sessions", "action_deadline", "DATETIME NULL AFTER action_seconds");
  await ensureColumn("user_preferences", "steam_profile", "VARCHAR(255) NULL AFTER theme");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS match_attendance (
      match_id INT NOT NULL,
      user_id INT NOT NULL,
      status ENUM('confirmado','ausente','talvez') NOT NULL DEFAULT 'talvez',
      note VARCHAR(500) NULL,
      responded_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (match_id, user_id),
      KEY idx_match_attendance_user (user_id),
      CONSTRAINT fk_match_attendance_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS match_messages (
      id INT NOT NULL AUTO_INCREMENT,
      match_id INT NOT NULL,
      user_id INT NOT NULL,
      message TEXT NOT NULL,
      attachment_url VARCHAR(500) NULL,
      type ENUM('message','announcement','system') NOT NULL DEFAULT 'message',
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_match_messages_context (match_id, created_at),
      CONSTRAINT fk_match_messages_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS match_result_confirmations (
      match_id INT NOT NULL,
      team_id INT NOT NULL,
      confirmed_by INT NOT NULL,
      status ENUM('correto','contestado') NOT NULL,
      comments TEXT NULL,
      confirmed_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (match_id, team_id),
      KEY idx_match_result_confirmation_user (confirmed_by),
      CONSTRAINT fk_match_result_confirmation_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      CONSTRAINT fk_match_result_confirmation_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
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
