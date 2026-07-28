import pool from "../config/database.js";

export async function getGamesForAdmin() {
  const [rows] = await pool.query(`
    SELECT
      g.*,
      COALESCE(gs.player_id_label, 'ID do jogador') AS player_id_label,
      COALESCE(gs.player_id_required, 1) AS player_id_required,
      COALESCE(gs.default_best_of, 'bo3') AS default_best_of,
      COUNT(gm.id) AS maps_count,
      SUM(CASE WHEN gm.ativo = 1 THEN 1 ELSE 0 END) AS active_maps_count
    FROM games g
    LEFT JOIN game_settings gs ON gs.game_id = g.id
    LEFT JOIN game_maps gm ON gm.game_id = g.id
    GROUP BY g.id, gs.game_id
    ORDER BY g.ativo DESC, g.nome ASC
  `);

  return rows.map((row) => ({
    ...row,
    player_id_required: Boolean(row.player_id_required),
    maps_count: Number(row.maps_count ?? 0),
    active_maps_count: Number(row.active_maps_count ?? 0)
  }));
}

export async function upsertGameSettings(gameId, data) {
  await pool.query(
    `
    INSERT INTO game_settings
      (game_id, player_id_label, player_id_required, default_best_of)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      player_id_label = VALUES(player_id_label),
      player_id_required = VALUES(player_id_required),
      default_best_of = VALUES(default_best_of)
    `,
    [gameId, data.player_id_label, data.player_id_required, data.default_best_of]
  );
}

export async function getGameMaps(gameId, includeInactive = true) {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM game_maps
    WHERE game_id = ?
      ${includeInactive ? "" : "AND ativo = 1"}
    ORDER BY ordem ASC, nome ASC, id ASC
    `,
    [gameId]
  );

  return rows.map((row) => ({ ...row, ativo: Boolean(row.ativo) }));
}

export async function findGameMap(mapId) {
  const [rows] = await pool.query(
    `SELECT * FROM game_maps WHERE id = ? LIMIT 1`,
    [mapId]
  );
  return rows[0];
}

export async function findGameMapBySlug(gameId, slug) {
  const [rows] = await pool.query(
    `SELECT * FROM game_maps WHERE game_id = ? AND slug = ? LIMIT 1`,
    [gameId, slug]
  );
  return rows[0];
}

export async function createGameMap(data) {
  const [result] = await pool.query(
    `
    INSERT INTO game_maps (game_id, nome, slug, imagem, ativo, ordem)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [data.game_id, data.nome, data.slug, data.imagem, data.ativo, data.ordem]
  );
  return { id: result.insertId, ...data };
}

export async function updateGameMap(mapId, data) {
  await pool.query(
    `
    UPDATE game_maps
    SET nome = ?, slug = ?, imagem = ?, ativo = ?, ordem = ?
    WHERE id = ?
    `,
    [data.nome, data.slug, data.imagem, data.ativo, data.ordem, mapId]
  );
}

export async function deleteGameMapRecord(mapId) {
  const [result] = await pool.query(`DELETE FROM game_maps WHERE id=?`, [mapId]);
  return result.affectedRows > 0;
}

export async function gameUsage(gameId) {
  const [[row]] = await pool.query(`SELECT
    (SELECT COUNT(*) FROM teams WHERE game_id=?) teams,
    (SELECT COUNT(*) FROM tournament_competition_settings WHERE game_id=?) tournaments,
    (SELECT COUNT(*) FROM user_games WHERE game_id=?) users`, [gameId,gameId,gameId]);
  return { teams:Number(row.teams),tournaments:Number(row.tournaments),users:Number(row.users) };
}

export async function deleteGameRecord(gameId) {
  const [result] = await pool.query(`DELETE FROM games WHERE id=?`, [gameId]);
  return result.affectedRows > 0;
}

export async function getTournamentCompetitionRecord(tournamentId) {
  const [rows] = await pool.query(
    `
    SELECT
      t.id AS tournament_id,
      t.nome AS tournament_name,
      t.game AS legacy_game_id,
      t.status AS tournament_status,
      tcs.game_id,
      tcs.format,
      tcs.best_of,
      tcs.pick_ban_enabled,
      tcs.veto_order,
      tcs.auto_decider,
      tcs.overtime_enabled,
      tcs.initial_side,
      tcs.pause_minutes,
      tcs.walkover_minutes,
      tcs.tiebreakers,
      tcs.seed_mode,
      tcs.registration_approval,
      g.nome AS game_name,
      g.nome_curto AS game_short_name
    FROM tournaments t
    LEFT JOIN tournament_competition_settings tcs ON tcs.tournament_id = t.id
    LEFT JOIN games g ON g.id = COALESCE(tcs.game_id, CAST(t.game AS UNSIGNED))
    WHERE t.id = ?
    LIMIT 1
    `,
    [tournamentId]
  );
  return rows[0];
}

export async function getTournamentMapPool(tournamentId) {
  const [rows] = await pool.query(
    `
    SELECT gm.*
    FROM tournament_map_pool tmp
    INNER JOIN game_maps gm ON gm.id = tmp.game_map_id
    WHERE tmp.tournament_id = ?
    ORDER BY gm.ordem ASC, gm.nome ASC
    `,
    [tournamentId]
  );
  return rows.map((row) => ({ ...row, ativo: Boolean(row.ativo) }));
}

export async function saveTournamentCompetitionRecord(tournamentId, data, mapIds) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query(
      `
      INSERT INTO tournament_competition_settings (
        tournament_id, game_id, format, best_of, pick_ban_enabled,
        veto_order, auto_decider, overtime_enabled, initial_side,
        pause_minutes, walkover_minutes, tiebreakers, seed_mode,
        registration_approval
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        game_id = VALUES(game_id),
        format = VALUES(format),
        best_of = VALUES(best_of),
        pick_ban_enabled = VALUES(pick_ban_enabled),
        veto_order = VALUES(veto_order),
        auto_decider = VALUES(auto_decider),
        overtime_enabled = VALUES(overtime_enabled),
        initial_side = VALUES(initial_side),
        pause_minutes = VALUES(pause_minutes),
        walkover_minutes = VALUES(walkover_minutes),
        tiebreakers = VALUES(tiebreakers),
        seed_mode = VALUES(seed_mode),
        registration_approval = VALUES(registration_approval)
      `,
      [
        tournamentId,
        data.game_id,
        data.format,
        data.best_of,
        data.pick_ban_enabled,
        JSON.stringify(data.veto_order),
        data.auto_decider,
        data.overtime_enabled,
        data.initial_side,
        data.pause_minutes,
        data.walkover_minutes,
        data.tiebreakers,
        data.seed_mode,
        data.registration_approval
      ]
    );

    await connection.query(`DELETE FROM tournament_map_pool WHERE tournament_id = ?`, [tournamentId]);

    for (const mapId of mapIds) {
      await connection.query(
        `INSERT INTO tournament_map_pool (tournament_id, game_map_id) VALUES (?, ?)`,
        [tournamentId, mapId]
      );
    }

    await connection.query(`UPDATE tournaments SET game = ? WHERE id = ?`, [String(data.game_id), tournamentId]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getTournamentEligibleTeams(tournamentId) {
  const [rows] = await pool.query(
    `
    SELECT
      e.id AS entry_id,
      e.team_id,
      e.status AS entry_status,
      e.payment_status,
      t.nome AS team_name,
      t.tag AS team_tag,
      t.game_id,
      COUNT(ep.id) AS lineup_size
    FROM entries e
    INNER JOIN teams t ON t.id = e.team_id
    LEFT JOIN entry_players ep ON ep.entry_id = e.id
    WHERE e.tournament_id = ?
    GROUP BY e.id, t.id
    ORDER BY t.nome ASC
    `,
    [tournamentId]
  );
  return rows.map((row) => ({ ...row, lineup_size: Number(row.lineup_size ?? 0) }));
}

export async function upsertMatchCompetitionSettings(matchId, data) {
  await pool.query(
    `
    INSERT INTO match_competition_settings (match_id, best_of, pick_ban_enabled, server_address)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      best_of = VALUES(best_of),
      pick_ban_enabled = VALUES(pick_ban_enabled),
      server_address = VALUES(server_address)
    `,
    [matchId, data.best_of, data.pick_ban_enabled, data.server_address ?? null]
  );
}

export async function getMatchCompetitionRecord(matchId) {
  const [rows] = await pool.query(
    `
    SELECT
      m.*,
      ta.nome AS team_a,
      ta.tag AS team_a_tag,
      tb.nome AS team_b,
      tb.tag AS team_b_tag,
      COALESCE(mcs.best_of, tcs.best_of, 'bo3') AS best_of,
      COALESCE(mcs.pick_ban_enabled, tcs.pick_ban_enabled, 1) AS pick_ban_enabled,
      mcs.server_address,
      mcs.server_password,
      mcs.responsible_admin_id,
      responsible.nome AS responsible_admin_name,
      COALESCE(mcs.captain_confirmation_enabled, 1) AS captain_confirmation_enabled,
      COALESCE(mcs.veto_action_seconds, 30) AS veto_action_seconds,
      COALESCE(tcs.game_id, CAST(t.game AS UNSIGNED)) AS game_id,
      tcs.veto_order,
      COALESCE(tcs.auto_decider, 1) AS auto_decider,
      t.nome AS tournament_name
    FROM matches m
    INNER JOIN teams ta ON ta.id = m.team_a_id
    INNER JOIN teams tb ON tb.id = m.team_b_id
    INNER JOIN tournaments t ON t.id = m.tournament_id
    LEFT JOIN tournament_competition_settings tcs ON tcs.tournament_id = m.tournament_id
    LEFT JOIN match_competition_settings mcs ON mcs.match_id = m.id
    LEFT JOIN users responsible ON responsible.id = mcs.responsible_admin_id
    WHERE m.id = ?
    LIMIT 1
    `,
    [matchId]
  );
  return rows[0];
}

export async function updateMatchRoomSettings(matchId, data) {
  await pool.query(
    `
    UPDATE match_competition_settings
    SET server_address = ?, server_password = ?, responsible_admin_id = ?,
      captain_confirmation_enabled = ?, veto_action_seconds = ?
    WHERE match_id = ?
    `,
    [data.server_address, data.server_password, data.responsible_admin_id,
      data.captain_confirmation_enabled ? 1 : 0, data.veto_action_seconds, matchId]
  );
}

export async function getMatchRosters(matchId) {
  const match = await getMatchCompetitionRecord(matchId);
  if (!match) return [];

  const [rows] = await pool.query(
    `
    SELECT
      p.id,
      p.team_id,
      p.nick,
      p.game_uid,
      p.status,
      tm.nome AS team_name,
      CASE WHEN ep.id IS NULL THEN 0 ELSE 1 END AS in_lineup,
      COALESCE(ep.titular, 0) AS titular
    FROM players p
    INNER JOIN teams tm ON tm.id = p.team_id
    LEFT JOIN entries e
      ON e.tournament_id = ? AND e.team_id = p.team_id
    LEFT JOIN entry_players ep
      ON ep.entry_id = e.id AND ep.player_id = p.id
    WHERE p.team_id IN (?, ?)
      AND p.status <> 'inativo'
    ORDER BY p.team_id, ep.titular DESC, p.nick ASC
    `,
    [match.tournament_id, match.team_a_id, match.team_b_id]
  );

  return rows.map((row) => ({
    ...row,
    in_lineup: Boolean(row.in_lineup),
    titular: Boolean(row.titular)
  }));
}

export async function getMatchPlayerStatistics(matchId) {
  const [rows] = await pool.query(
    `
    SELECT
      mps.*,
      p.nick,
      p.game_uid,
      t.nome AS team_name
    FROM match_player_stats mps
    INNER JOIN players p ON p.id = mps.player_id
    INNER JOIN teams t ON t.id = mps.team_id
    WHERE mps.match_id = ?
    ORDER BY mps.team_id, p.nick ASC
    `,
    [matchId]
  );
  return rows.map((row) => ({ ...row, mvp: Boolean(row.mvp) }));
}

export async function getMatchMapPlayerStatistics(matchId) {
  const [rows] = await pool.query(
    `
    SELECT
      mmps.*,
      mm.map_number,
      gm.nome AS map_name,
      p.nick,
      p.game_uid,
      t.nome AS team_name
    FROM match_map_player_stats mmps
    INNER JOIN match_maps mm ON mm.id = mmps.match_map_id
    INNER JOIN game_maps gm ON gm.id = mm.game_map_id
    INNER JOIN players p ON p.id = mmps.player_id
    INNER JOIN teams t ON t.id = mmps.team_id
    WHERE mmps.match_id = ?
    ORDER BY mm.map_number, mmps.team_id, p.nick ASC
    `,
    [matchId]
  );
  return rows.map((row) => ({ ...row, mvp: Boolean(row.mvp) }));
}

export async function getMatchMaps(matchId) {
  const [rows] = await pool.query(
    `
    SELECT mm.*, gm.nome AS map_name, gm.slug AS map_slug, gm.imagem AS map_image,
      st.nome AS selected_by_team, wt.nome AS winner_team
    FROM match_maps mm
    INNER JOIN game_maps gm ON gm.id = mm.game_map_id
    LEFT JOIN teams st ON st.id = mm.selected_by_team_id
    LEFT JOIN teams wt ON wt.id = mm.winner_team_id
    WHERE mm.match_id = ?
    ORDER BY mm.map_number ASC
    `,
    [matchId]
  );
  return rows;
}

export async function findMatchMap(matchMapId) {
  const [rows] = await pool.query(
    `SELECT * FROM match_maps WHERE id = ? LIMIT 1`,
    [matchMapId]
  );
  return rows[0];
}

export async function createMatchMap(data) {
  const [result] = await pool.query(
    `
    INSERT INTO match_maps
      (match_id, game_map_id, map_number, selected_by_team_id, selection_type)
    VALUES (?, ?, ?, ?, ?)
    `,
    [data.match_id, data.game_map_id, data.map_number, data.selected_by_team_id, data.selection_type]
  );
  return { id: result.insertId, ...data };
}

export async function saveMatchMapResult(matchMapId, data) {
  await pool.query(
    `
    UPDATE match_maps
    SET score_team_a = ?, score_team_b = ?, winner_team_id = ?,
        status = 'finalizado', finished_at = NOW()
    WHERE id = ?
    `,
    [data.score_team_a, data.score_team_b, data.winner_team_id, matchMapId]
  );
}

export async function cancelPendingMatchMaps(matchId) {
  await pool.query(
    `UPDATE match_maps SET status='cancelado' WHERE match_id=? AND status IN ('pendente','andamento')`,
    [matchId]
  );
}

export async function getVetoSession(matchId) {
  const [rows] = await pool.query(
    `
    SELECT
      id,
      match_id,
      status,
      current_step,
      action_seconds,
      CASE
        WHEN action_deadline IS NULL THEN NULL
        ELSE CONCAT(DATE_FORMAT(action_deadline, '%Y-%m-%dT%H:%i:%s'), 'Z')
      END AS action_deadline,
      CASE
        WHEN action_deadline IS NOT NULL AND action_deadline <= NOW() THEN 1
        ELSE 0
      END AS deadline_expired,
      opened_by,
      opened_at,
      finished_at,
      created_at,
      updated_at
    FROM match_veto_sessions
    WHERE match_id = ?
    LIMIT 1
    `,
    [matchId]
  );
  return rows[0];
}

export async function createOrOpenVetoSession(matchId, userId, actionSeconds = 30) {
  await pool.query(
    `
    INSERT INTO match_veto_sessions (match_id, status, current_step, action_seconds, action_deadline, opened_by, opened_at)
    VALUES (?, 'liberado', 0, ?, DATE_ADD(NOW(), INTERVAL ? SECOND), ?, NOW())
    ON DUPLICATE KEY UPDATE
      status = 'liberado', current_step = 0, action_seconds = VALUES(action_seconds),
      action_deadline = VALUES(action_deadline), opened_by = VALUES(opened_by), opened_at = NOW(), finished_at = NULL
    `,
    [matchId, actionSeconds, actionSeconds, userId]
  );
  return await getVetoSession(matchId);
}

export async function getVetoActions(sessionId) {
  const [rows] = await pool.query(
    `
    SELECT mva.*, gm.nome AS map_name, t.nome AS team_name, u.nome AS performed_by_name
    FROM match_veto_actions mva
    INNER JOIN game_maps gm ON gm.id = mva.game_map_id
    LEFT JOIN teams t ON t.id = mva.team_id
    LEFT JOIN users u ON u.id = mva.performed_by_user_id
    WHERE mva.session_id = ?
    ORDER BY mva.sequence_number ASC
    `,
    [sessionId]
  );
  return rows;
}

export async function insertVetoAction(data) {
  const [result] = await pool.query(
    `
    INSERT INTO match_veto_actions
      (session_id, sequence_number, team_id, game_map_id, action, performed_by_user_id, admin_forced)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.session_id,
      data.sequence_number,
      data.team_id,
      data.game_map_id,
      data.action,
      data.performed_by_user_id,
      data.admin_forced
    ]
  );
  return { id: result.insertId, ...data };
}

export async function updateVetoProgress(sessionId, currentStep, finished) {
  await pool.query(
    `
    UPDATE match_veto_sessions
    SET current_step = ?, status = ?, finished_at = ?,
      action_deadline = CASE WHEN ? THEN NULL ELSE DATE_ADD(NOW(), INTERVAL action_seconds SECOND) END
    WHERE id = ?
    `,
    [currentStep, finished ? "finalizado" : "liberado", finished ? new Date() : null, finished ? 1 : 0, sessionId]
  );
}

export async function resetVetoData(matchId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [sessions] = await connection.query(
      `SELECT id FROM match_veto_sessions WHERE match_id = ? LIMIT 1`,
      [matchId]
    );
    if (sessions[0]) {
      await connection.query(`DELETE FROM match_veto_actions WHERE session_id = ?`, [sessions[0].id]);
    }
    await connection.query(`DELETE FROM match_maps WHERE match_id = ?`, [matchId]);
    await connection.query(
      `UPDATE match_veto_sessions SET status = 'aguardando', current_step = 0, action_deadline = NULL, finished_at = NULL WHERE match_id = ?`,
      [matchId]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
