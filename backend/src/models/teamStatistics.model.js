import pool from "../config/database.js";

export async function findTeamPlayerStatisticRows(teamId) {
  const [rows] = await pool.query(
    `
    SELECT
      p.id AS player_id,
      p.user_id,
      p.nick,
      p.game_uid,
      p.foto,
      tm.cargo,
      tm.lineup_status,
      tm.status,
      u.nome,
      u.nickname,
      u.avatar,
      COUNT(DISTINCT official.match_id) AS matches,
      COALESCE(SUM(official.winner_team_id = official.team_id), 0) AS wins,
      COALESCE(SUM(official.winner_team_id IS NOT NULL AND official.winner_team_id <> official.team_id), 0) AS losses,
      COALESCE(SUM(official.kills), 0) AS kills,
      COALESCE(SUM(official.deaths), 0) AS deaths,
      COALESCE(SUM(official.assists), 0) AS assists,
      COALESCE(SUM(official.headshots), 0) AS headshots,
      COALESCE(SUM(official.mvp), 0) AS mvps
    FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    INNER JOIN players p ON p.team_id = tm.team_id AND p.user_id = tm.user_id
    LEFT JOIN (
      SELECT mps.*, m.winner_team_id
      FROM match_player_stats mps
      INNER JOIN matches m ON m.id = mps.match_id
      WHERE m.status = 'finalizada'
    ) official ON official.player_id = p.id AND official.team_id = tm.team_id
    WHERE tm.team_id = ? AND tm.status = 'ativo'
    GROUP BY
      p.id, p.user_id, p.nick, p.game_uid, p.foto,
      tm.cargo, tm.lineup_status, tm.status,
      u.nome, u.nickname, u.avatar
    ORDER BY p.nick
    `,
    [teamId]
  );

  return rows;
}

export async function findTeamPlayerMapStatisticRows(teamId) {
  const [rows] = await pool.query(
    `
    SELECT
      mmps.player_id,
      gm.id AS map_id,
      gm.nome AS map_name,
      gm.imagem AS map_image,
      COUNT(DISTINCT mmps.match_map_id) AS maps,
      COALESCE(SUM(mmps.kills), 0) AS kills,
      COALESCE(SUM(mmps.deaths), 0) AS deaths,
      COALESCE(SUM(mmps.assists), 0) AS assists,
      COALESCE(SUM(mmps.headshots), 0) AS headshots,
      COALESCE(SUM(mmps.mvp), 0) AS mvps
    FROM match_map_player_stats mmps
    INNER JOIN match_maps mm ON mm.id = mmps.match_map_id AND mm.status = 'finalizado'
    INNER JOIN matches m ON m.id = mmps.match_id AND m.status = 'finalizada'
    INNER JOIN game_maps gm ON gm.id = mm.game_map_id
    WHERE mmps.team_id = ?
    GROUP BY mmps.player_id, gm.id, gm.nome, gm.imagem
    ORDER BY gm.nome
    `,
    [teamId]
  );

  return rows;
}
