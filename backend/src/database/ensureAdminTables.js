import pool from "../config/database.js";

export async function ensureAdminTables() {
  await ensureColumn("notifications", "dedupe_key", "VARCHAR(190) NULL AFTER link");
  await ensureIndex("notifications", "uq_notifications_dedupe_key", "UNIQUE KEY uq_notifications_dedupe_key (dedupe_key)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT NOT NULL AUTO_INCREMENT,
      actor_user_id INT NOT NULL,
      action VARCHAR(120) NOT NULL,
      entity_type VARCHAR(80) NOT NULL,
      entity_id INT NULL,
      details JSON NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_audit_logs_actor (actor_user_id),
      KEY idx_audit_logs_entity (entity_type, entity_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_penalties (
      id INT NOT NULL AUTO_INCREMENT,
      player_id INT NOT NULL,
      tournament_id INT NULL,
      type ENUM('warning','suspension','temporary_ban','permanent_ban','tournament_ban','season_ban','global_ban') NOT NULL,
      scope ENUM('player','tournament','season','global') NOT NULL DEFAULT 'player',
      status ENUM('ativa','encerrada') NOT NULL DEFAULT 'ativa',
      reason TEXT NOT NULL,
      evidence TEXT NULL,
      duration_days INT NULL,
      notes TEXT NULL,
      created_by INT NOT NULL,
      resolved_by INT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME NULL,
      PRIMARY KEY (id),
      KEY idx_admin_penalties_player (player_id),
      KEY idx_admin_penalties_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NULL,
      category VARCHAR(80) NOT NULL DEFAULT 'geral',
      priority ENUM('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
      status ENUM('aberto','em_analise','respondido','fechado') NOT NULL DEFAULT 'aberto',
      subject VARCHAR(160) NOT NULL,
      message TEXT NOT NULL,
      response TEXT NULL,
      assigned_admin_id INT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_support_tickets_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS disputes (
      id INT NOT NULL AUTO_INCREMENT,
      match_id INT NULL,
      tournament_id INT NULL,
      team_id INT NULL,
      created_by INT NULL,
      title VARCHAR(160) NOT NULL,
      description TEXT NOT NULL,
      evidence TEXT NULL,
      status ENUM('aberta','em_analise','aceita','rejeitada') NOT NULL DEFAULT 'aberta',
      resolution_notes TEXT NULL,
      resolved_by INT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_disputes_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function ensureColumn(table, column, definition) {
  const [rows] = await pool.query(
    `
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
    LIMIT 1
    `,
    [table, column]
  );

  if (!rows.length) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function ensureIndex(table, index, definition) {
  const [rows] = await pool.query(
    `
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
    LIMIT 1
    `,
    [table, index]
  );

  if (!rows.length) {
    await pool.query(`ALTER TABLE \`${table}\` ADD ${definition}`);
  }
}
