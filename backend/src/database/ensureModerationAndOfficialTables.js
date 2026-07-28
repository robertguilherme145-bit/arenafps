import pool from "../config/database.js";

export async function ensureModerationAndOfficialTables() {
  await addUserColumn("banned_until", "DATETIME NULL");
  await addUserColumn("banned_permanent", "TINYINT(1) NOT NULL DEFAULT 0");
  await addUserColumn("ban_reason", "VARCHAR(500) NULL");
  await addUserColumn("banned_at", "DATETIME NULL");
  await addUserColumn("banned_by", "INT NULL");

  await pool.query(`CREATE TABLE IF NOT EXISTS official_tournaments (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(180) NOT NULL,
    organizer VARCHAR(140) NOT NULL,
    game_name VARCHAR(120) NOT NULL,
    logo_url VARCHAR(500) NULL,
    banner_url VARCHAR(500) NULL,
    description TEXT NULL,
    location VARCHAR(180) NULL,
    prize_pool VARCHAR(100) NULL,
    format_label VARCHAR(120) NULL,
    official_url VARCHAR(500) NULL,
    starts_at DATETIME NULL,
    ends_at DATETIME NULL,
    status ENUM('anunciado','em_andamento','finalizado','cancelado') NOT NULL DEFAULT 'anunciado',
    featured TINYINT(1) NOT NULL DEFAULT 0,
    published TINYINT(1) NOT NULL DEFAULT 1,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_official_public (published,status,starts_at),
    CONSTRAINT fk_official_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS official_matches (
    id INT NOT NULL AUTO_INCREMENT,
    official_tournament_id INT NOT NULL,
    stage_label VARCHAR(120) NULL,
    team_a VARCHAR(140) NOT NULL,
    team_a_logo VARCHAR(500) NULL,
    team_b VARCHAR(140) NOT NULL,
    team_b_logo VARCHAR(500) NULL,
    score_a INT NULL,
    score_b INT NULL,
    best_of ENUM('bo1','bo3','bo5') NOT NULL DEFAULT 'bo3',
    map_summary VARCHAR(500) NULL,
    winner_name VARCHAR(140) NULL,
    scheduled_at DATETIME NULL,
    status ENUM('agendada','ao_vivo','finalizada','cancelada') NOT NULL DEFAULT 'agendada',
    stream_url VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_official_match (official_tournament_id,status,scheduled_at),
    CONSTRAINT fk_official_match_tournament FOREIGN KEY (official_tournament_id) REFERENCES official_tournaments(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

async function addUserColumn(name, definition) {
  const [rows] = await pool.query(`SHOW COLUMNS FROM users LIKE ?`, [name]);
  if (!rows.length) await pool.query(`ALTER TABLE users ADD COLUMN \`${name}\` ${definition}`);
}
