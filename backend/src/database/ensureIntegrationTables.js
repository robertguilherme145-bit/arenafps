import pool from "../config/database.js";

export async function ensureIntegrationTables() {
  await ensureColumn("users", "phone", "VARCHAR(32) NULL AFTER discord");
  await ensureColumn("users", "whatsapp_opt_in", "TINYINT(1) NOT NULL DEFAULT 0 AFTER phone");
  await ensureColumn("users", "pix_key", "VARCHAR(255) NULL AFTER whatsapp_opt_in");
  await ensureColumn("users", "pix_key_type", "VARCHAR(24) NULL AFTER pix_key");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS match_discord_rooms (
      match_id INT NOT NULL,
      text_channel_id VARCHAR(32) NULL,
      team_a_voice_channel_id VARCHAR(32) NULL,
      team_b_voice_channel_id VARCHAR(32) NULL,
      status ENUM('pendente','ativo','arquivado','falhou') NOT NULL DEFAULT 'pendente',
      error_message VARCHAR(1000) NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (match_id),
      CONSTRAINT fk_match_discord_rooms_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS integration_deliveries (
      id BIGINT NOT NULL AUTO_INCREMENT,
      provider ENUM('discord','whatsapp') NOT NULL,
      event_type VARCHAR(80) NOT NULL,
      dedupe_key VARCHAR(190) NOT NULL,
      user_id INT NULL,
      match_id INT NULL,
      destination VARCHAR(255) NULL,
      status ENUM('pendente','enviado','ignorado','falhou') NOT NULL DEFAULT 'pendente',
      provider_message_id VARCHAR(255) NULL,
      error_message VARCHAR(1000) NULL,
      payload_json JSON NULL,
      sent_at DATETIME NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_integration_delivery (provider, dedupe_key),
      KEY idx_integration_delivery_status (provider, status, created_at),
      CONSTRAINT fk_integration_delivery_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      CONSTRAINT fk_integration_delivery_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function ensureColumn(table, column, definition) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?`,
    [table, column]
  );
  if (!rows.length) await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}
