import pool from "../config/database.js";

export async function ensureCompetitionTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tournament_results (
      tournament_id INT NOT NULL,
      champion_team_id INT NOT NULL,
      runner_up_team_id INT DEFAULT NULL,
      final_match_id INT DEFAULT NULL,
      decided_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (tournament_id),
      KEY idx_tournament_results_champion (champion_team_id),
      CONSTRAINT fk_tournament_results_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      CONSTRAINT fk_tournament_results_champion FOREIGN KEY (champion_team_id) REFERENCES teams(id),
      CONSTRAINT fk_tournament_results_runner_up FOREIGN KEY (runner_up_team_id) REFERENCES teams(id) ON DELETE SET NULL,
      CONSTRAINT fk_tournament_results_final_match FOREIGN KEY (final_match_id) REFERENCES matches(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS team_tournament_titles (
      id INT NOT NULL AUTO_INCREMENT,
      team_id INT NOT NULL,
      tournament_id INT NOT NULL,
      game_id INT NOT NULL,
      title_type ENUM('champion') NOT NULL DEFAULT 'champion',
      awarded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_team_tournament_title (team_id,tournament_id,title_type),
      KEY idx_team_titles_team (team_id,awarded_at),
      CONSTRAINT fk_team_titles_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      CONSTRAINT fk_team_titles_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      CONSTRAINT fk_team_titles_game FOREIGN KEY (game_id) REFERENCES games(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_settings (
      game_id INT NOT NULL,
      player_id_label VARCHAR(80) NOT NULL DEFAULT 'ID do jogador',
      player_id_required TINYINT(1) NOT NULL DEFAULT 1,
      default_best_of ENUM('bo1', 'bo3', 'bo5') NOT NULL DEFAULT 'bo3',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (game_id),
      CONSTRAINT fk_game_settings_game
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS game_maps (
      id INT NOT NULL AUTO_INCREMENT,
      game_id INT NOT NULL,
      nome VARCHAR(100) NOT NULL,
      slug VARCHAR(120) NOT NULL,
      imagem VARCHAR(255) DEFAULT NULL,
      ativo TINYINT(1) NOT NULL DEFAULT 1,
      ordem INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_game_map_slug (game_id, slug),
      KEY idx_game_maps_active (game_id, ativo, ordem),
      CONSTRAINT fk_game_maps_game
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tournament_competition_settings (
      tournament_id INT NOT NULL,
      game_id INT NOT NULL,
      format VARCHAR(50) NOT NULL DEFAULT 'single_elimination',
      best_of ENUM('bo1', 'bo3', 'bo5') NOT NULL DEFAULT 'bo3',
      pick_ban_enabled TINYINT(1) NOT NULL DEFAULT 1,
      veto_order JSON DEFAULT NULL,
      auto_decider TINYINT(1) NOT NULL DEFAULT 1,
      overtime_enabled TINYINT(1) NOT NULL DEFAULT 1,
      initial_side VARCHAR(40) NOT NULL DEFAULT 'knife',
      pause_minutes INT NOT NULL DEFAULT 5,
      walkover_minutes INT NOT NULL DEFAULT 15,
      tiebreakers TEXT DEFAULT NULL,
      seed_mode ENUM('automatic', 'manual') NOT NULL DEFAULT 'automatic',
      registration_approval ENUM('automatic', 'manual') NOT NULL DEFAULT 'manual',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (tournament_id),
      KEY idx_tournament_competition_game (game_id),
      CONSTRAINT fk_tournament_competition_tournament
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      CONSTRAINT fk_tournament_competition_game
        FOREIGN KEY (game_id) REFERENCES games(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tournament_map_pool (
      id INT NOT NULL AUTO_INCREMENT,
      tournament_id INT NOT NULL,
      game_map_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_tournament_map (tournament_id, game_map_id),
      KEY idx_tournament_map_pool_map (game_map_id),
      CONSTRAINT fk_tournament_map_pool_tournament
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      CONSTRAINT fk_tournament_map_pool_map
        FOREIGN KEY (game_map_id) REFERENCES game_maps(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS match_competition_settings (
      match_id INT NOT NULL,
      best_of ENUM('bo1', 'bo3', 'bo5') NOT NULL DEFAULT 'bo3',
      pick_ban_enabled TINYINT(1) NOT NULL DEFAULT 1,
      server_address VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (match_id),
      CONSTRAINT fk_match_competition_match
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS match_player_stats (
      id INT NOT NULL AUTO_INCREMENT,
      match_id INT NOT NULL,
      player_id INT NOT NULL,
      team_id INT NOT NULL,
      kills INT NOT NULL DEFAULT 0,
      deaths INT NOT NULL DEFAULT 0,
      assists INT NOT NULL DEFAULT 0,
      headshots INT NOT NULL DEFAULT 0,
      mvp TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_match_player_stats_player (match_id, player_id),
      KEY idx_match_player_stats_player (player_id),
      KEY idx_match_player_stats_team (team_id),
      CONSTRAINT fk_match_player_stats_match
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      CONSTRAINT fk_match_player_stats_player
        FOREIGN KEY (player_id) REFERENCES players(id),
      CONSTRAINT fk_match_player_stats_team
        FOREIGN KEY (team_id) REFERENCES teams(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS match_veto_sessions (
      id INT NOT NULL AUTO_INCREMENT,
      match_id INT NOT NULL,
      status ENUM('aguardando', 'liberado', 'finalizado', 'cancelado') NOT NULL DEFAULT 'aguardando',
      current_step INT NOT NULL DEFAULT 0,
      opened_by INT DEFAULT NULL,
      opened_at DATETIME DEFAULT NULL,
      finished_at DATETIME DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_match_veto_session (match_id),
      CONSTRAINT fk_match_veto_session_match
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      CONSTRAINT fk_match_veto_session_user
        FOREIGN KEY (opened_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS match_veto_actions (
      id INT NOT NULL AUTO_INCREMENT,
      session_id INT NOT NULL,
      sequence_number INT NOT NULL,
      team_id INT DEFAULT NULL,
      game_map_id INT NOT NULL,
      action ENUM('ban', 'pick', 'decider', 'manual') NOT NULL,
      performed_by_user_id INT DEFAULT NULL,
      admin_forced TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_veto_action_sequence (session_id, sequence_number),
      UNIQUE KEY uk_veto_action_map (session_id, game_map_id),
      KEY idx_veto_action_team (team_id),
      KEY idx_veto_action_map (game_map_id),
      CONSTRAINT fk_veto_action_session
        FOREIGN KEY (session_id) REFERENCES match_veto_sessions(id) ON DELETE CASCADE,
      CONSTRAINT fk_veto_action_team
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
      CONSTRAINT fk_veto_action_map
        FOREIGN KEY (game_map_id) REFERENCES game_maps(id),
      CONSTRAINT fk_veto_action_user
        FOREIGN KEY (performed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS match_maps (
      id INT NOT NULL AUTO_INCREMENT,
      match_id INT NOT NULL,
      game_map_id INT NOT NULL,
      map_number INT NOT NULL,
      selected_by_team_id INT DEFAULT NULL,
      selection_type ENUM('pick', 'decider', 'manual') NOT NULL,
      status ENUM('pendente', 'andamento', 'finalizado', 'cancelado') NOT NULL DEFAULT 'pendente',
      score_team_a INT NOT NULL DEFAULT 0,
      score_team_b INT NOT NULL DEFAULT 0,
      winner_team_id INT DEFAULT NULL,
      started_at DATETIME DEFAULT NULL,
      finished_at DATETIME DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_match_map_number (match_id, map_number),
      UNIQUE KEY uk_match_map (match_id, game_map_id),
      KEY idx_match_map_game_map (game_map_id),
      CONSTRAINT fk_match_maps_match
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      CONSTRAINT fk_match_maps_game_map
        FOREIGN KEY (game_map_id) REFERENCES game_maps(id),
      CONSTRAINT fk_match_maps_selected_team
        FOREIGN KEY (selected_by_team_id) REFERENCES teams(id) ON DELETE SET NULL,
      CONSTRAINT fk_match_maps_winner
        FOREIGN KEY (winner_team_id) REFERENCES teams(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS match_map_player_stats (
      id INT NOT NULL AUTO_INCREMENT,
      match_map_id INT NOT NULL,
      match_id INT NOT NULL,
      player_id INT NOT NULL,
      team_id INT NOT NULL,
      kills INT NOT NULL DEFAULT 0,
      deaths INT NOT NULL DEFAULT 0,
      assists INT NOT NULL DEFAULT 0,
      headshots INT NOT NULL DEFAULT 0,
      mvp TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_match_map_player_stats_player (match_map_id, player_id),
      KEY idx_match_map_player_stats_match (match_id),
      KEY idx_match_map_player_stats_player (player_id),
      KEY idx_match_map_player_stats_team (team_id),
      CONSTRAINT fk_match_map_player_stats_map
        FOREIGN KEY (match_map_id) REFERENCES match_maps(id) ON DELETE CASCADE,
      CONSTRAINT fk_match_map_player_stats_match
        FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      CONSTRAINT fk_match_map_player_stats_player
        FOREIGN KEY (player_id) REFERENCES players(id),
      CONSTRAINT fk_match_map_player_stats_team
        FOREIGN KEY (team_id) REFERENCES teams(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureColumn("matches", "stage", "VARCHAR(30) NOT NULL DEFAULT 'main'");
  await ensureColumn("matches", "group_code", "VARCHAR(20) NULL");
  await ensureColumn("matches", "leg", "TINYINT NOT NULL DEFAULT 1");
  await pool.query(`CREATE TABLE IF NOT EXISTS tournament_byes (
    tournament_id INT NOT NULL,
    round INT NOT NULL,
    team_id INT NOT NULL,
    reason VARCHAR(30) NOT NULL DEFAULT 'odd_teams',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tournament_id, round),
    UNIQUE KEY uq_tournament_bye_team (tournament_id, team_id),
    CONSTRAINT fk_tournament_bye_tournament FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    CONSTRAINT fk_tournament_bye_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

async function ensureColumn(table, column, definition) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?`,
    [table, column]
  );
  if (!rows.length) await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}
