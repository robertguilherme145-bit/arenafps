import pool from "../config/database.js";

export async function ensureLeaderTables() {
  await normalizeUserRoles();
  await ensureColumn("players", "user_id", "INT NULL AFTER team_id");
  await ensureColumn("teams", "regiao", "VARCHAR(100) NULL AFTER descricao");
  await ensureColumn("teams", "steam", "VARCHAR(255) NULL AFTER discord");
  await ensureColumn("teams", "archived_at", "DATETIME NULL AFTER ativo");
  await ensureColumn("team_members", "lineup_status", "ENUM('titular','reserva') NOT NULL DEFAULT 'titular' AFTER cargo");
  await ensureColumn("team_members", "status", "ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo' AFTER lineup_status");
  await ensureColumn("team_members", "last_seen_at", "DATETIME NULL AFTER status");
  await ensureColumn("entries", "lineup_id", "INT NULL AFTER team_id");
  await ensureColumn("entries", "rules_accepted_at", "DATETIME NULL AFTER payment_status");
  await pool.query(`UPDATE payments SET status = 'pendente' WHERE status IS NULL OR status NOT IN ('pendente', 'aprovado', 'cancelado', 'rejeitado')`);
  await ensureIndex("players", "uq_players_team_user", "UNIQUE KEY uq_players_team_user (team_id, user_id)");
  await backfillPlayerUsers();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_lineups (
      id INT NOT NULL AUTO_INCREMENT,
      team_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      status ENUM('rascunho','ativa','congelada','arquivada') NOT NULL DEFAULT 'rascunho',
      created_by INT NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_team_lineups_team (team_id),
      CONSTRAINT fk_team_lineups_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_lineup_players (
      id INT NOT NULL AUTO_INCREMENT,
      lineup_id INT NOT NULL,
      player_id INT NOT NULL,
      titular TINYINT(1) NOT NULL DEFAULT 1,
      ordem INT NOT NULL DEFAULT 0,
      PRIMARY KEY (id),
      UNIQUE KEY uq_team_lineup_player (lineup_id, player_id),
      KEY idx_team_lineup_players_lineup (lineup_id),
      CONSTRAINT fk_team_lineup_players_lineup FOREIGN KEY (lineup_id) REFERENCES team_lineups(id) ON DELETE CASCADE,
      CONSTRAINT fk_team_lineup_players_player FOREIGN KEY (player_id) REFERENCES players(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_events (
      id INT NOT NULL AUTO_INCREMENT,
      team_id INT NOT NULL,
      created_by INT NOT NULL,
      title VARCHAR(160) NOT NULL,
      type ENUM('treino','partida','evento','reuniao') NOT NULL DEFAULT 'treino',
      starts_at DATETIME NOT NULL,
      ends_at DATETIME NULL,
      location VARCHAR(255) NULL,
      notes TEXT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_team_events_team_date (team_id, starts_at),
      CONSTRAINT fk_team_events_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_messages (
      id INT NOT NULL AUTO_INCREMENT,
      team_id INT NOT NULL,
      user_id INT NOT NULL,
      message TEXT NOT NULL,
      attachment_url VARCHAR(500) NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_team_messages_team (team_id, created_at),
      CONSTRAINT fk_team_messages_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tournament_messages (
      id INT NOT NULL AUTO_INCREMENT,
      tournament_id INT NOT NULL,
      team_id INT NOT NULL,
      user_id INT NOT NULL,
      message TEXT NOT NULL,
      attachment_url VARCHAR(500) NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_tournament_messages_context (tournament_id, team_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_blocks (
      id INT NOT NULL AUTO_INCREMENT,
      team_id INT NOT NULL,
      user_id INT NOT NULL,
      blocked_by INT NOT NULL,
      reason VARCHAR(255) NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_team_blocks_user (team_id, user_id),
      CONSTRAINT fk_team_blocks_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_documents (
      id INT NOT NULL AUTO_INCREMENT,
      team_id INT NOT NULL,
      uploaded_by INT NOT NULL,
      name VARCHAR(160) NOT NULL,
      type ENUM('regulamento','comprovante','evidencia','outro') NOT NULL DEFAULT 'outro',
      url VARCHAR(500) NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_team_documents_team (team_id),
      CONSTRAINT fk_team_documents_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id INT NOT NULL,
      language VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
      theme ENUM('dark','light','system') NOT NULL DEFAULT 'dark',
      email_notifications TINYINT(1) NOT NULL DEFAULT 1,
      discord_notifications TINYINT(1) NOT NULL DEFAULT 0,
      profile_public TINYINT(1) NOT NULL DEFAULT 1,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_event_attendance (
      event_id INT NOT NULL,
      user_id INT NOT NULL,
      status ENUM('confirmado','ausente','talvez') NOT NULL DEFAULT 'talvez',
      responded_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (event_id, user_id),
      KEY idx_team_event_attendance_user (user_id),
      CONSTRAINT fk_team_event_attendance_event FOREIGN KEY (event_id) REFERENCES team_events(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_competition_requests (
      id INT NOT NULL AUTO_INCREMENT,
      team_id INT NOT NULL,
      tournament_id INT NULL,
      match_id INT NULL,
      requested_by INT NOT NULL,
      type ENUM('substituicao','adiamento','reembolso','outro') NOT NULL,
      subject VARCHAR(160) NOT NULL,
      description TEXT NOT NULL,
      requested_for DATETIME NULL,
      outgoing_player_id INT NULL,
      incoming_player_id INT NULL,
      evidence_url VARCHAR(500) NULL,
      status ENUM('aberta','em_analise','aprovada','rejeitada','cancelada') NOT NULL DEFAULT 'aberta',
      admin_response TEXT NULL,
      resolved_by INT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_team_competition_requests_team (team_id, status, created_at),
      CONSTRAINT fk_team_competition_requests_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_member_history (
      id INT NOT NULL AUTO_INCREMENT,
      team_id INT NOT NULL,
      actor_user_id INT NOT NULL,
      subject_user_id INT NULL,
      action VARCHAR(60) NOT NULL,
      details JSON NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_team_member_history_team (team_id, created_at),
      CONSTRAINT fk_team_member_history_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function normalizeUserRoles() {
  await pool.query(`ALTER TABLE users MODIFY role ENUM('','admin','lider','capitao','jogador') NULL DEFAULT 'jogador'`);
  await pool.query(`
    UPDATE users u
    LEFT JOIN (
      SELECT user_id,
        MAX(CASE cargo WHEN 'leader' THEN 3 WHEN 'captain' THEN 2 ELSE 1 END) AS role_rank
      FROM team_members
      GROUP BY user_id
    ) memberships ON memberships.user_id = u.id
    SET u.role = CASE
      WHEN u.role = 'admin' THEN 'admin'
      WHEN memberships.role_rank = 3 THEN 'lider'
      WHEN memberships.role_rank = 2 THEN 'capitao'
      ELSE 'jogador'
    END
  `);
  await pool.query(`ALTER TABLE users MODIFY role ENUM('admin','lider','capitao','jogador') NOT NULL DEFAULT 'jogador'`);
  await pool.query(`ALTER TABLE team_members MODIFY cargo ENUM('leader','captain','manager','player') NOT NULL DEFAULT 'player'`);
}

async function backfillPlayerUsers() {
  const [teams] = await pool.query(`SELECT DISTINCT team_id FROM players WHERE user_id IS NULL`);

  for (const { team_id: teamId } of teams) {
    const [members] = await pool.query(
      `SELECT user_id FROM team_members WHERE team_id = ? ORDER BY FIELD(cargo, 'leader', 'captain', 'manager', 'player'), id`,
      [teamId]
    );
    const [players] = await pool.query(
      `SELECT id FROM players WHERE team_id = ? AND user_id IS NULL ORDER BY id`,
      [teamId]
    );

    for (let index = 0; index < Math.min(members.length, players.length); index += 1) {
      await pool.query(`UPDATE players SET user_id = ? WHERE id = ?`, [members[index].user_id, players[index].id]);
    }
  }
}

async function ensureColumn(table, column, definition) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (!rows.length) await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}

async function ensureIndex(table, name, definition) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, name]
  );
  if (!rows.length) await pool.query(`ALTER TABLE \`${table}\` ADD ${definition}`);
}
