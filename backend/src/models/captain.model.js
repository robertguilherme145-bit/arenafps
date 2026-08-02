import pool from "../config/database.js";

export async function findCaptainContext(userId) {
  const [rows] = await pool.query(
    `
    SELECT tm.id AS membership_id, tm.team_id, tm.user_id, tm.cargo, tm.lineup_status, tm.status,
      tm.can_invite_players, tm.can_remove_players,
      t.nome AS team_name, t.tag AS team_tag, t.slug AS team_slug, t.logo AS team_logo,
      t.game_id, g.nome AS game_name,
      p.id AS player_id, p.nick, p.game_uid, p.foto
    FROM team_members tm
    INNER JOIN teams t ON t.id = tm.team_id
    INNER JOIN games g ON g.id = t.game_id
    LEFT JOIN user_context_preferences ucp ON ucp.user_id = tm.user_id
    LEFT JOIN players p ON p.team_id = tm.team_id AND p.user_id = tm.user_id
    WHERE tm.user_id = ? AND tm.cargo = 'captain' AND tm.status = 'ativo'
    ORDER BY (t.id = ucp.active_team_id) DESC, tm.joined_at LIMIT 1
    `,
    [userId]
  );
  return rows[0] ? normalizeContext(rows[0]) : null;
}

export async function getCaptainWorkspaceData(context) {
  const [members, lineups, matches, events, notifications, statistics, penalties, disputes, teamMessages, preferences, tournaments] = await Promise.all([
    queryMembers(context.team_id),
    queryOfficialLineups(context.team_id),
    queryMatches(context.team_id, context.user_id, context.player_id),
    queryEvents(context.team_id, context.user_id),
    queryNotifications(context.user_id),
    queryStatistics(context.team_id, context.player_id),
    queryPenalties(context.player_id),
    queryDisputes(context.team_id),
    queryTeamMessages(context.team_id),
    queryPreferences(context.user_id),
    queryTournaments(context.team_id)
  ]);

  return {
    captain: context,
    members,
    lineups: groupLineups(lineups),
    matches,
    events,
    notifications: notifications.map((item) => ({ ...item, lida: Boolean(item.lida) })),
    statistics,
    penalties,
    disputes,
    messages: { team: teamMessages },
    preferences: normalizePreferences(preferences, context.user_id),
    tournaments,
    permissions: {
      manage_identity: false,
      manage_entries: false,
      manage_payments: false,
      edit_results: false,
      operate_veto: true,
      confirm_attendance: true,
      confirm_result: true,
      invite_players: Boolean(context.can_invite_players),
      remove_players: Boolean(context.can_remove_players)
    }
  };
}

export async function findCaptainMatch(matchId, teamId) {
  const [rows] = await pool.query(
    `SELECT * FROM matches WHERE id = ? AND (team_a_id = ? OR team_b_id = ?) LIMIT 1`,
    [matchId, teamId, teamId]
  );
  return rows[0] ?? null;
}

export async function getCaptainMatchExtras(matchId, userId, teamId) {
  const [[attendance], [confirmation], messages] = await Promise.all([
    pool.query(`SELECT * FROM match_attendance WHERE match_id = ? AND user_id = ? LIMIT 1`, [matchId, userId]),
    pool.query(`SELECT * FROM match_result_confirmations WHERE match_id = ? AND team_id = ? LIMIT 1`, [matchId, teamId]),
    getMatchMessages(matchId)
  ]);
  return { attendance: attendance[0] ?? null, result_confirmation: confirmation[0] ?? null, messages };
}

export async function saveCaptainMatchAttendance(matchId, userId, status, note) {
  const [current] = await pool.query(`SELECT status FROM match_attendance WHERE match_id = ? AND user_id = ? LIMIT 1`, [matchId, userId]);
  await pool.query(
    `
    INSERT INTO match_attendance (match_id, user_id, status, note) VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE status = VALUES(status), note = VALUES(note)
    `,
    [matchId, userId, status, note]
  );
  return current[0]?.status ?? null;
}

export async function getMatchMessages(matchId) {
  const [rows] = await pool.query(
    `
    SELECT mm.*, u.nome, u.nickname, u.avatar, u.role
    FROM match_messages mm
    INNER JOIN users u ON u.id = mm.user_id
    WHERE mm.match_id = ? ORDER BY mm.created_at ASC LIMIT 150
    `,
    [matchId]
  );
  return rows;
}

export async function createMatchMessage(matchId, userId, data) {
  const [result] = await pool.query(
    `INSERT INTO match_messages (match_id, user_id, message, attachment_url, type) VALUES (?, ?, ?, ?, ?)`,
    [matchId, userId, data.message, data.attachment_url, data.type ?? "message"]
  );
  return result.insertId;
}

export async function saveCaptainResultConfirmation(matchId, teamId, userId, status, comments) {
  await pool.query(
    `
    INSERT INTO match_result_confirmations (match_id, team_id, confirmed_by, status, comments)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE confirmed_by = VALUES(confirmed_by), status = VALUES(status), comments = VALUES(comments)
    `,
    [matchId, teamId, userId, status, comments]
  );
}

export async function findTeamLeaderUser(teamId) {
  const [rows] = await pool.query(`SELECT user_id FROM team_members WHERE team_id = ? AND cargo = 'leader' AND status = 'ativo' LIMIT 1`, [teamId]);
  return rows[0]?.user_id ?? null;
}

async function queryMembers(teamId) {
  const [rows] = await pool.query(
    `
    SELECT tm.id, tm.user_id, tm.cargo, tm.lineup_status, tm.status, tm.last_seen_at,
      u.nome, u.avatar, u.nickname, p.id AS player_id, p.nick, p.game_uid, p.foto
    FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    LEFT JOIN players p ON p.team_id = tm.team_id AND p.user_id = tm.user_id
    WHERE tm.team_id = ? ORDER BY FIELD(tm.cargo, 'leader','captain','manager','player'), FIELD(tm.lineup_status,'titular','reserva')
    `,
    [teamId]
  );
  return rows.map((row) => ({ ...row, player_id: row.player_id ? Number(row.player_id) : null }));
}

async function queryOfficialLineups(teamId) {
  const [rows] = await pool.query(
    `
    SELECT e.id AS entry_id, e.tournament_id, e.status AS entry_status, t.nome AS tournament_name,
      tl.id AS lineup_id, COALESCE(tl.name, 'Lineup oficial') AS lineup_name,
      ep.player_id, ep.titular, ep.ordem, ep.confirmado, p.nick, p.game_uid, p.foto
    FROM entries e
    INNER JOIN tournaments t ON t.id = e.tournament_id
    LEFT JOIN team_lineups tl ON tl.id = e.lineup_id
    INNER JOIN entry_players ep ON ep.entry_id = e.id
    INNER JOIN players p ON p.id = ep.player_id
    WHERE e.team_id = ? AND e.status <> 'cancelado'
    ORDER BY e.created_at DESC, ep.titular DESC, ep.ordem
    `,
    [teamId]
  );
  return rows;
}

async function queryMatches(teamId, userId, playerId) {
  const [rows] = await pool.query(
    `
    SELECT m.*, t.nome AS tournament_name, ta.nome AS team_a, tb.nome AS team_b,
      CASE WHEN m.team_a_id = ? THEN tb.nome ELSE ta.nome END AS opponent,
      COALESCE(mcs.best_of, tcs.best_of, 'bo3') AS best_of,
      mcs.server_address, mcs.server_password, mcs.responsible_admin_id,
      responsible.nome AS responsible_admin_name,
      COALESCE(mcs.captain_confirmation_enabled, 1) AS captain_confirmation_enabled,
      COALESCE(mcs.veto_action_seconds, 30) AS veto_action_seconds,
      mvs.status AS veto_status, mvs.current_step, mvs.action_deadline,
      ma.status AS attendance_status, ma.note AS attendance_note,
      mrc.status AS result_confirmation_status,
      GROUP_CONCAT(DISTINCT gm.nome ORDER BY mm.map_number SEPARATOR ', ') AS maps,
      MAX(CASE WHEN ep.player_id = ? THEN 1 ELSE 0 END) AS in_official_lineup
    FROM matches m
    INNER JOIN tournaments t ON t.id = m.tournament_id
    INNER JOIN teams ta ON ta.id = m.team_a_id
    INNER JOIN teams tb ON tb.id = m.team_b_id
    LEFT JOIN tournament_competition_settings tcs ON tcs.tournament_id = m.tournament_id
    LEFT JOIN match_competition_settings mcs ON mcs.match_id = m.id
    LEFT JOIN users responsible ON responsible.id = mcs.responsible_admin_id
    LEFT JOIN match_veto_sessions mvs ON mvs.match_id = m.id
    LEFT JOIN match_attendance ma ON ma.match_id = m.id AND ma.user_id = ?
    LEFT JOIN match_result_confirmations mrc ON mrc.match_id = m.id AND mrc.team_id = ?
    LEFT JOIN match_maps mm ON mm.match_id = m.id
    LEFT JOIN game_maps gm ON gm.id = mm.game_map_id
    LEFT JOIN entries e ON e.tournament_id = m.tournament_id AND e.team_id = ?
    LEFT JOIN entry_players ep ON ep.entry_id = e.id
    WHERE m.team_a_id = ? OR m.team_b_id = ?
    GROUP BY m.id, t.id, ta.id, tb.id, mcs.match_id, responsible.id, mvs.id, ma.match_id, mrc.match_id
    ORDER BY FIELD(m.status, 'andamento','agendada','finalizada'), COALESCE(m.scheduled_at, m.finished_at, m.created_at) DESC
    `,
    [teamId, playerId, userId, teamId, teamId, teamId, teamId]
  );
  return rows.map((row) => ({
    ...row,
    captain_confirmation_enabled: Boolean(row.captain_confirmation_enabled),
    in_official_lineup: Boolean(row.in_official_lineup)
  }));
}

async function queryEvents(teamId, userId) {
  const [rows] = await pool.query(
    `
    SELECT te.*, tea.status AS attendance_status
    FROM team_events te LEFT JOIN team_event_attendance tea ON tea.event_id = te.id AND tea.user_id = ?
    WHERE te.team_id = ? ORDER BY te.starts_at
    `,
    [userId, teamId]
  );
  return rows;
}

async function queryNotifications(userId) { const [rows] = await pool.query(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 60`, [userId]); return rows; }
async function queryPenalties(playerId) { if (!playerId) return []; const [rows] = await pool.query(`SELECT ap.*, t.nome AS tournament_name FROM admin_penalties ap LEFT JOIN tournaments t ON t.id = ap.tournament_id WHERE ap.player_id = ? ORDER BY ap.created_at DESC`, [playerId]); return rows; }
async function queryDisputes(teamId) { const [rows] = await pool.query(`SELECT d.*, t.nome AS tournament_name FROM disputes d LEFT JOIN tournaments t ON t.id = d.tournament_id WHERE d.team_id = ? ORDER BY d.created_at DESC`, [teamId]); return rows; }
async function queryTeamMessages(teamId) { const [rows] = await pool.query(`SELECT tm.*, u.nome, u.nickname, u.avatar, u.role FROM team_messages tm INNER JOIN users u ON u.id = tm.user_id WHERE tm.team_id = ? ORDER BY tm.created_at DESC LIMIT 100`, [teamId]); return rows.reverse(); }
async function queryPreferences(userId) { const [rows] = await pool.query(`SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1`, [userId]); return rows[0] ?? null; }

async function queryTournaments(teamId) {
  const [rows] = await pool.query(
    `
    SELECT t.*, e.id AS entry_id, e.status AS entry_status, e.payment_status,
      tcs.format, tcs.best_of, tcs.pick_ban_enabled
    FROM entries e INNER JOIN tournaments t ON t.id = e.tournament_id
    LEFT JOIN tournament_competition_settings tcs ON tcs.tournament_id = t.id
    WHERE e.team_id = ? AND e.status <> 'cancelado' ORDER BY t.inicio DESC
    `,
    [teamId]
  );
  return rows;
}

async function queryStatistics(teamId, playerId) {
  const [[player], [allPlayers], [teamMatches], [history], [playerHistory]] = await Promise.all([
    pool.query(`SELECT COALESCE(SUM(kills),0) kills, COALESCE(SUM(deaths),0) deaths, COALESCE(SUM(assists),0) assists, COALESCE(SUM(headshots),0) headshots, COALESCE(SUM(mvp),0) mvps, COUNT(DISTINCT match_id) matches FROM match_player_stats WHERE player_id = ?`, [playerId ?? 0]),
    pool.query(`SELECT player_id, SUM(kills) kills, SUM(deaths) deaths FROM match_player_stats GROUP BY player_id ORDER BY SUM(kills) DESC, (SUM(kills) / GREATEST(SUM(deaths),1)) DESC`),
    pool.query(`SELECT COUNT(*) matches, SUM(status='finalizada' AND winner_team_id=?) wins, SUM(status='finalizada' AND winner_team_id IS NOT NULL AND winner_team_id<>?) losses FROM matches WHERE team_a_id=? OR team_b_id=?`, [teamId, teamId, teamId, teamId]),
    pool.query(`SELECT finished_at, winner_team_id FROM matches WHERE status='finalizada' AND (team_a_id=? OR team_b_id=?) ORDER BY finished_at`, [teamId, teamId]),
    pool.query(`
      SELECT mps.*, m.finished_at, m.score_team_a, m.score_team_b, m.winner_team_id,
        t.nome AS tournament_name, CASE WHEN m.team_a_id = ? THEN tb.nome ELSE ta.nome END AS opponent,
        GROUP_CONCAT(DISTINCT gm.nome ORDER BY mm.map_number SEPARATOR ', ') AS maps
      FROM match_player_stats mps
      INNER JOIN matches m ON m.id = mps.match_id
      INNER JOIN tournaments t ON t.id = m.tournament_id
      INNER JOIN teams ta ON ta.id = m.team_a_id INNER JOIN teams tb ON tb.id = m.team_b_id
      LEFT JOIN match_maps mm ON mm.match_id = m.id LEFT JOIN game_maps gm ON gm.id = mm.game_map_id
      WHERE mps.player_id = ? GROUP BY mps.id, m.id, t.id, ta.id, tb.id ORDER BY m.finished_at DESC
    `, [teamId, playerId ?? 0])
  ]);
  const stats = player[0] ?? {};
  const kills = Number(stats.kills ?? 0); const deaths = Number(stats.deaths ?? 0); const headshots = Number(stats.headshots ?? 0);
  const rankIndex = allPlayers.findIndex((item) => Number(item.player_id) === Number(playerId));
  const seasons = new Map();
  for (const match of history) {
    const season = String(match.finished_at ? new Date(match.finished_at).getFullYear() : new Date().getFullYear());
    const value = seasons.get(season) ?? { season, matches: 0, wins: 0, losses: 0 };
    value.matches += 1;
    if (Number(match.winner_team_id) === Number(teamId)) value.wins += 1; else value.losses += 1;
    seasons.set(season, value);
  }
  return {
    player: { kills, deaths, assists: Number(stats.assists ?? 0), headshots, mvps: Number(stats.mvps ?? 0), matches: Number(stats.matches ?? 0), kd: deaths ? Number((kills / deaths).toFixed(2)) : kills, hs_percent: kills ? Math.round((headshots / kills) * 100) : 0, ranking: rankIndex >= 0 ? rankIndex + 1 : null },
    team: { matches: Number(teamMatches[0]?.matches ?? 0), wins: Number(teamMatches[0]?.wins ?? 0), losses: Number(teamMatches[0]?.losses ?? 0) },
    seasons: [...seasons.values()].sort((a, b) => Number(b.season) - Number(a.season)),
    history: playerHistory.map((item) => ({ ...item, mvp: Boolean(item.mvp), kd: Number(item.deaths) ? Number((Number(item.kills) / Number(item.deaths)).toFixed(2)) : Number(item.kills) }))
  };
}

function groupLineups(rows) {
  const result = new Map();
  for (const row of rows) {
    const lineup = result.get(Number(row.entry_id)) ?? { entry_id: Number(row.entry_id), tournament_id: Number(row.tournament_id), tournament_name: row.tournament_name, entry_status: row.entry_status, lineup_id: row.lineup_id ? Number(row.lineup_id) : null, lineup_name: row.lineup_name, players: [] };
    lineup.players.push({ player_id: Number(row.player_id), titular: Boolean(row.titular), confirmado: Boolean(row.confirmado), ordem: Number(row.ordem), nick: row.nick, game_uid: row.game_uid, foto: row.foto });
    result.set(Number(row.entry_id), lineup);
  }
  return [...result.values()];
}

function normalizeContext(context) {
  return { ...context, membership_id: Number(context.membership_id), team_id: Number(context.team_id), user_id: Number(context.user_id), game_id: Number(context.game_id), player_id: context.player_id ? Number(context.player_id) : null, can_invite_players: Boolean(context.can_invite_players), can_remove_players: Boolean(context.can_remove_players) };
}

function normalizePreferences(preferences, userId) {
  const value = preferences ?? { user_id: userId, language: "pt-BR", theme: "dark", steam_profile: null, email_notifications: 1, discord_notifications: 0, profile_public: 1 };
  return { ...value, email_notifications: Boolean(value.email_notifications), discord_notifications: Boolean(value.discord_notifications), profile_public: Boolean(value.profile_public) };
}
