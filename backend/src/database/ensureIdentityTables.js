import pool from "../config/database.js";

export async function ensureIdentityTables() {
  await ensureColumn("users", "email_verified_at", "DATETIME NULL AFTER email");
  await ensureColumn("users", "onboarding_completed_at", "DATETIME NULL AFTER email_verified_at");

  await pool.query(`CREATE TABLE IF NOT EXISTS platform_migrations (migration_key VARCHAR(120) NOT NULL PRIMARY KEY, applied_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [legacyVerification] = await pool.query(`INSERT IGNORE INTO platform_migrations (migration_key) VALUES ('identity_grandfather_email_v1')`);
  if (legacyVerification.affectedRows) await pool.query(`UPDATE users SET email_verified_at = COALESCE(created_at, NOW()) WHERE email_verified_at IS NULL`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INT NOT NULL,
      role VARCHAR(32) NOT NULL,
      granted_by INT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, role),
      KEY idx_user_roles_role (role, user_id),
      CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_games (
      user_id INT NOT NULL,
      game_id INT NOT NULL,
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, game_id),
      KEY idx_user_games_game (game_id, user_id),
      CONSTRAINT fk_user_games_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_user_games_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_context_preferences (
      user_id INT NOT NULL,
      active_role VARCHAR(32) NOT NULL DEFAULT 'jogador',
      active_game_id INT NULL,
      active_team_id INT NULL,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id),
      CONSTRAINT fk_user_context_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_user_context_game FOREIGN KEY (active_game_id) REFERENCES games(id) ON DELETE SET NULL,
      CONSTRAINT fk_user_context_team FOREIGN KEY (active_team_id) REFERENCES teams(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INT NOT NULL AUTO_INCREMENT,
      owner_user_id INT NOT NULL,
      name VARCHAR(120) NOT NULL,
      slug VARCHAR(140) NOT NULL,
      logo VARCHAR(500) NULL,
      description TEXT NULL,
      verified TINYINT(1) NOT NULL DEFAULT 0,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_organizations_slug (slug),
      CONSTRAINT fk_organizations_owner FOREIGN KEY (owner_user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS organization_members (
      organization_id INT NOT NULL,
      user_id INT NOT NULL,
      role VARCHAR(32) NOT NULL DEFAULT 'organizador',
      status VARCHAR(20) NOT NULL DEFAULT 'ativo',
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (organization_id, user_id),
      KEY idx_organization_members_user (user_id, status),
      CONSTRAINT fk_organization_members_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      CONSTRAINT fk_organization_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_email_verification_token (token_hash),
      KEY idx_email_verification_user (user_id, used_at),
      CONSTRAINT fk_email_verification_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_password_reset_token (token_hash),
      KEY idx_password_reset_user (user_id, used_at),
      CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mail_outbox (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NULL,
      recipient VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      html_body MEDIUMTEXT NOT NULL,
      status ENUM('pendente','enviado','falhou') NOT NULL DEFAULT 'pendente',
      provider_message_id VARCHAR(255) NULL,
      error_message VARCHAR(1000) NULL,
      sent_at DATETIME NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_mail_outbox_status (status, created_at),
      CONSTRAINT fk_mail_outbox_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS oauth_accounts (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      provider VARCHAR(24) NOT NULL,
      provider_user_id VARCHAR(255) NOT NULL,
      provider_email VARCHAR(255) NULL,
      metadata_json JSON NULL,
      last_login_at DATETIME NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_oauth_provider_account (provider, provider_user_id),
      UNIQUE KEY uq_oauth_user_provider (user_id, provider),
      KEY idx_oauth_provider_email (provider, provider_email),
      CONSTRAINT fk_oauth_account_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS oauth_login_codes (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      code_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_oauth_login_code (code_hash),
      KEY idx_oauth_login_user (user_id, used_at),
      CONSTRAINT fk_oauth_login_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`INSERT IGNORE INTO user_roles (user_id, role) SELECT id, role FROM users WHERE role IN ('admin','jogador')`);
  await pool.query(`INSERT IGNORE INTO user_roles (user_id, role) SELECT DISTINCT user_id, 'jogador' FROM team_members`);
  await pool.query(`INSERT IGNORE INTO user_games (user_id, game_id, is_primary) SELECT user_id, game_id, 0 FROM player_game_profiles`);
  await pool.query(`INSERT IGNORE INTO user_games (user_id, game_id, is_primary) SELECT DISTINCT tm.user_id, t.game_id, 0 FROM team_members tm INNER JOIN teams t ON t.id = tm.team_id`);
  await pool.query(`UPDATE user_games ug INNER JOIN (SELECT user_id, MIN(game_id) game_id FROM user_games GROUP BY user_id) first_game ON first_game.user_id = ug.user_id AND first_game.game_id = ug.game_id SET ug.is_primary = 1 WHERE NOT EXISTS (SELECT 1 FROM user_games existing WHERE existing.user_id = ug.user_id AND existing.is_primary = 1)`);
  await pool.query(`INSERT IGNORE INTO user_context_preferences (user_id, active_role, active_game_id, active_team_id) SELECT u.id, CASE WHEN u.role = 'admin' THEN 'admin' WHEN EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id=u.id AND tm.cargo='leader' AND tm.status='ativo') THEN 'lider' WHEN EXISTS (SELECT 1 FROM team_members tm WHERE tm.user_id=u.id AND tm.cargo='captain' AND tm.status='ativo') THEN 'capitao' ELSE 'jogador' END, (SELECT ug.game_id FROM user_games ug WHERE ug.user_id=u.id ORDER BY ug.is_primary DESC, ug.game_id LIMIT 1), (SELECT tm.team_id FROM team_members tm WHERE tm.user_id=u.id AND tm.status='ativo' ORDER BY tm.joined_at LIMIT 1) FROM users u`);
}

async function ensureColumn(table, column, definition) {
  const [rows] = await pool.query(`SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?`, [table, column]);
  if (!rows.length) await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}
