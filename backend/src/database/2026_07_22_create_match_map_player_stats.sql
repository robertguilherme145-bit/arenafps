CREATE TABLE IF NOT EXISTS `match_map_player_stats` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `match_map_id` INT NOT NULL,
  `match_id` INT NOT NULL,
  `player_id` INT NOT NULL,
  `team_id` INT NOT NULL,
  `kills` INT NOT NULL DEFAULT 0,
  `deaths` INT NOT NULL DEFAULT 0,
  `assists` INT NOT NULL DEFAULT 0,
  `headshots` INT NOT NULL DEFAULT 0,
  `mvp` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_match_map_player_stats_player` (`match_map_id`,`player_id`),
  KEY `idx_match_map_player_stats_match` (`match_id`),
  KEY `idx_match_map_player_stats_player` (`player_id`),
  KEY `idx_match_map_player_stats_team` (`team_id`),
  CONSTRAINT `fk_match_map_player_stats_map`
    FOREIGN KEY (`match_map_id`) REFERENCES `match_maps` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_match_map_player_stats_match`
    FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_match_map_player_stats_player`
    FOREIGN KEY (`player_id`) REFERENCES `players` (`id`),
  CONSTRAINT `fk_match_map_player_stats_team`
    FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
