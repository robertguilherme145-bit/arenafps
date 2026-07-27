import pool from "../config/database.js";

export async function findAchievementDefinitions(gameId = null, includeInactive = false) {
  const params = [];
  const clauses = [];
  if (!includeInactive) clauses.push("a.active = 1");
  if (gameId) {
    clauses.push("(a.game_id IS NULL OR a.game_id = ?)");
    params.push(Number(gameId));
  }
  const [rows] = await pool.query(
    `SELECT a.*, g.nome AS game_name, g.nome_curto AS game_short_name,
      COUNT(pa.id) AS players_count,
      SUM(pa.unlocked_at IS NOT NULL) AS unlocked_count
     FROM achievement_definitions a
     LEFT JOIN games g ON g.id = a.game_id
     LEFT JOIN player_achievements pa ON pa.achievement_id = a.id
     ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
     GROUP BY a.id
     ORDER BY a.active DESC, a.game_id IS NULL DESC, a.target ASC, a.id ASC`,
    params
  );
  return rows;
}

export async function savePlayerAchievement(userId, achievementId, progress, unlocked) {
  await pool.query(
    `INSERT INTO player_achievements (user_id, achievement_id, progress, unlocked_at)
     VALUES (?, ?, ?, IF(?, NOW(), NULL))
     ON DUPLICATE KEY UPDATE progress = VALUES(progress),
       unlocked_at = IF(unlocked_at IS NOT NULL, unlocked_at, IF(?, NOW(), NULL))`,
    [userId, achievementId, progress, unlocked ? 1 : 0, unlocked ? 1 : 0]
  );
}

export async function createAchievementDefinition(input) {
  const [result] = await pool.query(
    `INSERT INTO achievement_definitions
      (game_id, code, title, description, icon, metric, comparator, target, tier, xp_reward, active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [input.game_id, input.code, input.title, input.description, input.icon, input.metric, input.comparator, input.target, input.tier, input.xp_reward, input.active ? 1 : 0, input.created_by]
  );
  return Number(result.insertId);
}

export async function updateAchievementDefinition(id, input) {
  const [result] = await pool.query(
    `UPDATE achievement_definitions SET game_id = ?, code = ?, title = ?, description = ?, icon = ?, metric = ?, comparator = ?, target = ?, tier = ?, xp_reward = ?, active = ? WHERE id = ?`,
    [input.game_id, input.code, input.title, input.description, input.icon, input.metric, input.comparator, input.target, input.tier, input.xp_reward, input.active ? 1 : 0, id]
  );
  return result.affectedRows > 0;
}

export async function findAchievementDefinition(id) {
  const [rows] = await pool.query(`SELECT * FROM achievement_definitions WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ?? null;
}
