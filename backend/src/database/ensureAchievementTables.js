import pool from "../config/database.js";

export async function ensureAchievementTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS achievement_definitions (
      id INT NOT NULL AUTO_INCREMENT,
      game_id INT NULL,
      code VARCHAR(80) NOT NULL,
      title VARCHAR(120) NOT NULL,
      description VARCHAR(500) NOT NULL,
      icon VARCHAR(60) NOT NULL DEFAULT 'trophy',
      metric ENUM('wins','kills','mvps','win_streak','matches','global_rank','headshots','assists') NOT NULL,
      comparator ENUM('gte','lte') NOT NULL DEFAULT 'gte',
      target DECIMAL(12,2) NOT NULL,
      tier ENUM('bronze','prata','ouro','diamante','lendaria') NOT NULL DEFAULT 'bronze',
      xp_reward INT NOT NULL DEFAULT 100,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_by INT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_achievement_code (code),
      KEY idx_achievement_game_active (game_id, active),
      CONSTRAINT fk_achievement_game FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL,
      CONSTRAINT fk_achievement_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS player_achievements (
      id INT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      achievement_id INT NOT NULL,
      progress DECIMAL(12,2) NOT NULL DEFAULT 0,
      unlocked_at TIMESTAMP NULL,
      notified_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_player_achievement (user_id, achievement_id),
      KEY idx_player_achievements_unlocked (user_id, unlocked_at),
      CONSTRAINT fk_player_achievement_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_player_achievement_definition FOREIGN KEY (achievement_id) REFERENCES achievement_definitions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const defaults = [
    ["first_win", "Primeira vitoria", "Venca sua primeira partida oficial.", "wins", "gte", 1, "bronze", 100],
    ["kills_100", "100 eliminacoes", "Alcance 100 eliminacoes oficiais.", "kills", "gte", 100, "prata", 250],
    ["kills_500", "500 eliminacoes", "Alcance 500 eliminacoes oficiais.", "kills", "gte", 500, "ouro", 600],
    ["first_mvp", "Primeiro MVP", "Receba seu primeiro MVP oficial.", "mvps", "gte", 1, "bronze", 150],
    ["undefeated", "Invicto", "Conquiste cinco vitorias seguidas.", "win_streak", "gte", 5, "ouro", 500],
    ["veteran", "Veterano", "Dispute 50 partidas oficiais.", "matches", "gte", 50, "prata", 400],
    ["top_10", "Top 10", "Entre no Top 10 geral da plataforma.", "global_rank", "lte", 10, "diamante", 900],
    ["legend", "Lenda", "Alcance 1.000 eliminacoes oficiais.", "kills", "gte", 1000, "lendaria", 1500]
  ];
  await pool.query(
    `INSERT IGNORE INTO achievement_definitions
      (code, title, description, metric, comparator, target, tier, xp_reward)
     VALUES ?`,
    [defaults]
  );
}
