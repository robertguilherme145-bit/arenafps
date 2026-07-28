import pool from "../config/database.js";

export async function ensureMixTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS mix_tournament_settings (
    tournament_id INT NOT NULL,
    payment_mode ENUM('free','paid') NOT NULL DEFAULT 'free',
    price_per_player DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_players INT NOT NULL,
    players_per_team INT NOT NULL,
    team_count INT NOT NULL,
    team_labels JSON DEFAULT NULL,
    draw_status ENUM('pending','completed') NOT NULL DEFAULT 'pending',
    drawn_at DATETIME DEFAULT NULL,
    drawn_by INT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (tournament_id),
    CONSTRAINT fk_mix_settings_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    CONSTRAINT fk_mix_settings_drawn_by FOREIGN KEY (drawn_by) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await addColumn("mix_tournament_settings", "team_labels", "JSON DEFAULT NULL");

  await pool.query(`CREATE TABLE IF NOT EXISTS mix_registrations (
    id INT NOT NULL AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    user_id INT NOT NULL,
    status ENUM('pending_payment','confirmed','waitlist','assigned','cancelled') NOT NULL,
    payment_status ENUM('free','pending','paid','failed') NOT NULL,
    assigned_team_id INT DEFAULT NULL,
    rules_accepted_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_mix_registration_user (tournament_id,user_id),
    KEY idx_mix_registration_status (tournament_id,status),
    CONSTRAINT fk_mix_registration_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    CONSTRAINT fk_mix_registration_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_mix_registration_team FOREIGN KEY (assigned_team_id) REFERENCES teams(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS mix_payments (
    id INT NOT NULL AUTO_INCREMENT,
    registration_id INT NOT NULL,
    provider ENUM('mercadopago') NOT NULL DEFAULT 'mercadopago',
    payment_id VARCHAR(150) DEFAULT NULL,
    external_reference VARCHAR(100) NOT NULL,
    status ENUM('pendente','aprovado','cancelado','rejeitado') NOT NULL DEFAULT 'pendente',
    valor DECIMAL(10,2) NOT NULL,
    qr_code TEXT DEFAULT NULL,
    qr_code_base64 LONGTEXT DEFAULT NULL,
    copia_cola TEXT DEFAULT NULL,
    paid_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_mix_payment_registration (registration_id),
    UNIQUE KEY uq_mix_payment_gateway (payment_id),
    UNIQUE KEY uq_mix_payment_reference (external_reference),
    CONSTRAINT fk_mix_payment_registration FOREIGN KEY (registration_id) REFERENCES mix_registrations(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS mix_generated_teams (
    id INT NOT NULL AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    team_id INT NOT NULL,
    color_name VARCHAR(40) NOT NULL,
    color_hex CHAR(7) NOT NULL,
    seed_number INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_mix_generated_team (tournament_id,team_id),
    UNIQUE KEY uq_mix_generated_seed (tournament_id,seed_number),
    CONSTRAINT fk_mix_generated_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    CONSTRAINT fk_mix_generated_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

async function addColumn(table, column, definition) {
  const [rows] = await pool.query(`SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?`, [table,column]);
  if (!rows.length) await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}
