import pool from "../config/database.js";

export async function findPublicPlayerBySlug(slug) {
  const normalized = String(slug ?? "").trim().toLowerCase();
  const [[row]] = await pool.query(
    `SELECT u.id FROM users u LEFT JOIN user_preferences up ON up.user_id = u.id WHERE (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id=u.id AND ur.role='jogador') OR EXISTS (SELECT 1 FROM players p WHERE p.user_id=u.id)) AND COALESCE(up.profile_public, 1) = 1 AND (LOWER(REPLACE(COALESCE(u.nickname, u.nome), ' ', '-')) = ? OR LOWER(COALESCE(u.nickname, '')) = ? OR CAST(u.id AS CHAR) = ?) LIMIT 1`,
    [normalized, normalized, normalized]
  );
  return row ?? null;
}

export async function findPlayerWorkspaceProfile(userId) {
  const [rows] = await pool.query(
    `
    SELECT u.id, u.nome, u.email, u.avatar, u.banner, u.nickname, u.bio, u.pais, u.estado, u.cidade,
      u.birth_date, u.languages, u.discord, u.phone, u.whatsapp_opt_in, u.pix_key, u.pix_key_type, u.created_at,
      pl.steam, pl.faceit, pl.discord AS linked_discord, pl.riot_id, pl.xbox, pl.playstation,
      pl.epic_games, pl.battlenet, pl.twitch, pl.youtube, pl.kick, pl.instagram, pl.x, pl.tiktok,
      up.language, up.theme, up.steam_profile, up.email_notifications, up.discord_notifications, up.profile_public
    FROM users u
    LEFT JOIN player_links pl ON pl.user_id = u.id
    LEFT JOIN user_preferences up ON up.user_id = u.id
    WHERE u.id = ? LIMIT 1
    `,
    [userId]
  );
  return rows[0] ?? null;
}

export async function findPlayerWorkspaceGames(userId) {
  const [rows] = await pool.query(
    `
    SELECT g.id AS game_id, g.nome, g.nome_curto, g.slug, g.logo, g.banner,
      pgp.id AS profile_id, pgp.nickname, pgp.game_player_id, pgp.rank_name, pgp.elo, pgp.level,
      (ug.user_id IS NOT NULL) AS selected, COALESCE(ug.is_primary,0) AS is_primary
    FROM games g
    LEFT JOIN user_games ug ON ug.game_id = g.id AND ug.user_id = ?
    LEFT JOIN player_game_profiles pgp ON pgp.game_id = g.id AND pgp.user_id = ?
    WHERE g.ativo = 1 ORDER BY g.nome
    `,
    [userId, userId]
  );
  return rows;
}

export async function findPlayerWorkspaceContexts(userId) {
  const [rows] = await pool.query(
    `
    SELECT tm.id AS membership_id, tm.team_id, tm.cargo, tm.lineup_status, tm.status, tm.joined_at,
      t.nome AS team_name, t.tag AS team_tag, t.slug AS team_slug, t.logo AS team_logo, t.banner AS team_banner,
      t.descricao AS team_description, t.regiao AS team_region, t.game_id, g.nome AS game_name,
      p.id AS player_id, p.nick, p.game_uid, p.foto
    FROM team_members tm
    INNER JOIN teams t ON t.id = tm.team_id
    INNER JOIN games g ON g.id = t.game_id
    LEFT JOIN players p ON p.team_id = tm.team_id AND p.user_id = tm.user_id
    WHERE tm.user_id = ? AND tm.status = 'ativo' AND t.ativo = 1
    ORDER BY tm.joined_at, tm.id
    `,
    [userId]
  );
  return rows;
}

export async function findPlayerRequests(userId) {
  const [rows] = await pool.query(
    `
    SELECT tr.*, t.nome AS team_name, t.tag AS team_tag, t.slug AS team_slug, t.logo AS team_logo,
      t.regiao AS team_region, g.nome AS game_name, inviter.nome AS invited_by_name
    FROM team_requests tr
    INNER JOIN teams t ON t.id = tr.team_id
    INNER JOIN games g ON g.id = t.game_id
    LEFT JOIN users inviter ON inviter.id = tr.created_by
    WHERE tr.user_id = ?
    ORDER BY FIELD(tr.status, 'pending','accepted','rejected','cancelled'), tr.created_at DESC
    `,
    [userId]
  );
  return rows;
}

export async function searchPlayerTeams(userId, filters = {}) {
  const query = String(filters.query ?? "").trim();
  const gameId = Number(filters.game_id) || null;
  const region = String(filters.region ?? "").trim();
  const recruitingOnly = filters.recruiting !== false;
  const [rows] = await pool.query(
    `
    SELECT t.id, t.nome, t.tag, t.slug, t.logo, t.banner, t.descricao, t.regiao, t.recrutando, t.privada,
      g.id AS game_id, g.nome AS game_name, g.nome_curto AS game_short_name,
      COUNT(DISTINCT CASE WHEN tm.status = 'ativo' THEN tm.id END) AS member_count,
      MAX(CASE WHEN tr.user_id = ? AND tr.status = 'pending' THEN tr.id END) AS pending_request_id
    FROM teams t
    INNER JOIN games g ON g.id = t.game_id
    LEFT JOIN team_members tm ON tm.team_id = t.id
    LEFT JOIN team_requests tr ON tr.team_id = t.id
    WHERE t.ativo = 1
      AND (? = '' OR t.nome LIKE CONCAT('%', ?, '%') OR COALESCE(t.tag, '') LIKE CONCAT('%', ?, '%'))
      AND (? IS NULL OR t.game_id = ?)
      AND (? = '' OR COALESCE(t.regiao, '') = ?)
      AND (? = 0 OR t.recrutando = 1)
      AND NOT EXISTS (SELECT 1 FROM team_blocks tb WHERE tb.team_id = t.id AND tb.user_id = ?)
      AND NOT EXISTS (SELECT 1 FROM team_members mine WHERE mine.team_id = t.id AND mine.user_id = ? AND mine.status = 'ativo')
    GROUP BY t.id, g.id
    ORDER BY t.recrutando DESC, member_count DESC, t.nome
    LIMIT 100
    `,
    [userId, query, query, query, gameId, gameId, region, region, recruitingOnly ? 1 : 0, userId, userId]
  );
  return rows;
}

export async function findPlayerTeamMembers(teamId) {
  const [rows] = await pool.query(
    `
    SELECT tm.id, tm.user_id, tm.cargo, tm.lineup_status, tm.status, tm.joined_at, tm.last_seen_at,
      u.nome, u.nickname, u.avatar, p.id AS player_id, p.nick, p.game_uid, p.foto
    FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    LEFT JOIN players p ON p.team_id = tm.team_id AND p.user_id = tm.user_id
    WHERE tm.team_id = ? AND tm.status = 'ativo'
    ORDER BY FIELD(tm.cargo, 'leader','captain','manager','player'), FIELD(tm.lineup_status,'titular','reserva'), u.nome
    `,
    [teamId]
  );
  return rows;
}

export async function findPlayerLineups(teamId, playerId) {
  const [rows] = await pool.query(
    `
    SELECT e.id AS entry_id, e.tournament_id, e.status AS entry_status, t.nome AS tournament_name,
      tl.id AS lineup_id, COALESCE(tl.name, 'Lineup oficial') AS lineup_name,
      ep.player_id, ep.titular, ep.ordem, ep.confirmado, p.nick, p.game_uid, p.foto,
      ep.player_id = ? AS is_me
    FROM entries e
    INNER JOIN tournaments t ON t.id = e.tournament_id
    LEFT JOIN team_lineups tl ON tl.id = e.lineup_id
    INNER JOIN entry_players ep ON ep.entry_id = e.id
    INNER JOIN players p ON p.id = ep.player_id
    WHERE e.team_id = ? AND e.status <> 'cancelado'
    ORDER BY e.created_at DESC, ep.titular DESC, ep.ordem
    `,
    [playerId ?? 0, teamId]
  );
  return rows;
}

export async function findPlayerMatches(teamId, userId, playerId) {
  const [rows] = await pool.query(
    `
    SELECT m.*, t.nome AS tournament_name, ta.nome AS team_a, tb.nome AS team_b,
      CASE WHEN m.team_a_id = ? THEN tb.nome ELSE ta.nome END AS opponent,
      COALESCE(mcs.best_of, tcs.best_of, 'bo3') AS best_of,
      mcs.server_address, mcs.server_password, responsible.nome AS responsible_admin_name,
      mvs.status AS veto_status, mvs.current_step,
      ma.status AS attendance_status, ma.note AS attendance_note,
      GROUP_CONCAT(DISTINCT gm.nome ORDER BY mm.map_number SEPARATOR ', ') AS maps,
      MAX(CASE WHEN ep.player_id = ? THEN 1 ELSE 0 END) AS in_official_lineup,
      own.kills, own.deaths, own.assists, own.headshots, own.mvp
    FROM matches m
    INNER JOIN tournaments t ON t.id = m.tournament_id
    INNER JOIN teams ta ON ta.id = m.team_a_id
    INNER JOIN teams tb ON tb.id = m.team_b_id
    LEFT JOIN tournament_competition_settings tcs ON tcs.tournament_id = m.tournament_id
    LEFT JOIN match_competition_settings mcs ON mcs.match_id = m.id
    LEFT JOIN users responsible ON responsible.id = mcs.responsible_admin_id
    LEFT JOIN match_veto_sessions mvs ON mvs.match_id = m.id
    LEFT JOIN match_attendance ma ON ma.match_id = m.id AND ma.user_id = ?
    LEFT JOIN match_maps mm ON mm.match_id = m.id
    LEFT JOIN game_maps gm ON gm.id = mm.game_map_id
    LEFT JOIN entries e ON e.tournament_id = m.tournament_id AND e.team_id = ?
    LEFT JOIN entry_players ep ON ep.entry_id = e.id
    LEFT JOIN match_player_stats own ON own.match_id = m.id AND own.player_id = ?
    WHERE m.team_a_id = ? OR m.team_b_id = ?
    GROUP BY m.id, t.id, ta.id, tb.id, mcs.match_id, responsible.id, mvs.id, ma.match_id, own.id
    ORDER BY FIELD(m.status, 'andamento','agendada','finalizada'), COALESCE(m.scheduled_at, m.finished_at, m.created_at) DESC
    `,
    [teamId, playerId ?? 0, userId, teamId, playerId ?? 0, teamId, teamId]
  );
  return rows;
}

export async function findPlayerEvents(teamId, userId) {
  const [rows] = await pool.query(
    `SELECT te.*, tea.status AS attendance_status FROM team_events te LEFT JOIN team_event_attendance tea ON tea.event_id = te.id AND tea.user_id = ? WHERE te.team_id = ? ORDER BY te.starts_at`,
    [userId, teamId]
  );
  return rows;
}

export async function findPlayerTeamMessages(teamId) {
  const [rows] = await pool.query(
    `SELECT tm.*, u.nome, u.nickname, u.avatar, u.role FROM team_messages tm INNER JOIN users u ON u.id = tm.user_id WHERE tm.team_id = ? ORDER BY tm.created_at DESC LIMIT 100`,
    [teamId]
  );
  return rows.reverse();
}

export async function findPlayerTickets(userId) {
  const [tickets] = await pool.query(`SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC`, [userId]);
  if (!tickets.length) return [];
  const [messages] = await pool.query(
    `SELECT stm.*, u.nome, u.role FROM support_ticket_messages stm INNER JOIN users u ON u.id = stm.user_id WHERE stm.ticket_id IN (?) ORDER BY stm.created_at`,
    [tickets.map((ticket) => ticket.id)]
  );
  return tickets.map((ticket) => ({ ...ticket, messages: messages.filter((message) => Number(message.ticket_id) === Number(ticket.id)) }));
}

export async function findPlayerCareerData(userId, playerId, gameId = null) {
  const [history, monthly, tournaments, teamHistory, globalRanking] = await Promise.all([
    pool.query(
      `SELECT mps.*, m.finished_at, m.winner_team_id, m.score_team_a, m.score_team_b, t.nome AS tournament_name, own_team.nome AS team_name, CASE WHEN m.team_a_id = mps.team_id THEN tb.nome ELSE ta.nome END AS opponent, GROUP_CONCAT(DISTINCT gm.nome ORDER BY mm.map_number SEPARATOR ', ') AS maps FROM match_player_stats mps INNER JOIN matches m ON m.id = mps.match_id AND m.status = 'finalizada' INNER JOIN tournaments t ON t.id = m.tournament_id LEFT JOIN tournament_competition_settings tcs ON tcs.tournament_id = t.id INNER JOIN teams ta ON ta.id = m.team_a_id INNER JOIN teams tb ON tb.id = m.team_b_id INNER JOIN teams own_team ON own_team.id = mps.team_id LEFT JOIN match_maps mm ON mm.match_id = m.id LEFT JOIN game_maps gm ON gm.id = mm.game_map_id WHERE mps.player_id IN (SELECT id FROM players WHERE user_id = ?) AND (? IS NULL OR COALESCE(tcs.game_id, CAST(t.game AS UNSIGNED)) = ?) GROUP BY mps.id, m.id, t.id, ta.id, tb.id, own_team.id ORDER BY m.finished_at DESC`,
      [userId, gameId, gameId]
    ),
    pool.query(
      `SELECT DATE_FORMAT(m.finished_at, '%Y-%m') AS month, SUM(mps.kills) kills, SUM(mps.deaths) deaths, SUM(mps.assists) assists, SUM(mps.headshots) headshots, SUM(mps.mvp) mvps, COUNT(DISTINCT m.id) matches, SUM(m.winner_team_id = mps.team_id) wins FROM match_player_stats mps INNER JOIN matches m ON m.id = mps.match_id AND m.status = 'finalizada' INNER JOIN tournaments t ON t.id = m.tournament_id LEFT JOIN tournament_competition_settings tcs ON tcs.tournament_id = t.id WHERE mps.player_id IN (SELECT id FROM players WHERE user_id = ?) AND (? IS NULL OR COALESCE(tcs.game_id, CAST(t.game AS UNSIGNED)) = ?) GROUP BY month ORDER BY month`,
      [userId, gameId, gameId]
    ),
    pool.query(
      `SELECT t.id AS tournament_id, t.nome AS tournament_name, COUNT(DISTINCT m.id) matches, SUM(m.winner_team_id = mps.team_id) wins, SUM(mps.kills) kills, SUM(mps.deaths) deaths, SUM(mps.assists) assists, SUM(mps.mvp) mvps FROM match_player_stats mps INNER JOIN matches m ON m.id = mps.match_id AND m.status = 'finalizada' INNER JOIN tournaments t ON t.id = m.tournament_id LEFT JOIN tournament_competition_settings tcs ON tcs.tournament_id = t.id WHERE mps.player_id IN (SELECT id FROM players WHERE user_id = ?) AND (? IS NULL OR COALESCE(tcs.game_id, CAST(t.game AS UNSIGNED)) = ?) GROUP BY t.id ORDER BY MAX(m.finished_at) DESC`,
      [userId, gameId, gameId]
    ),
    pool.query(
      `SELECT tmh.*, actor.nome AS actor_name, teams.nome AS team_name FROM team_member_history tmh INNER JOIN teams ON teams.id = tmh.team_id INNER JOIN users actor ON actor.id = tmh.actor_user_id WHERE tmh.subject_user_id = ? ORDER BY tmh.created_at DESC LIMIT 100`,
      [userId]
    ),
    pool.query(
      `SELECT p.user_id, SUM(mps.kills) AS kills, SUM(mps.deaths) AS deaths, SUM(mps.mvp) AS mvps FROM match_player_stats mps INNER JOIN players p ON p.id = mps.player_id INNER JOIN matches m ON m.id = mps.match_id AND m.status = 'finalizada' INNER JOIN tournaments t ON t.id = m.tournament_id LEFT JOIN tournament_competition_settings tcs ON tcs.tournament_id = t.id WHERE p.user_id IS NOT NULL AND (? IS NULL OR COALESCE(tcs.game_id, CAST(t.game AS UNSIGNED)) = ?) GROUP BY p.user_id ORDER BY SUM(mps.kills) DESC, (SUM(mps.kills) / GREATEST(SUM(mps.deaths), 1)) DESC, SUM(mps.mvp) DESC`,
      [gameId, gameId]
    )
  ]);
  return { history: history[0], monthly: monthly[0], tournaments: tournaments[0], team_history: teamHistory[0], global_ranking: globalRanking[0] };
}

export async function findUpcomingPlayerTournaments(userId, gameId) {
  const [rows] = await pool.query(
    `
    SELECT t.*, g.nome AS game_name, tcs.best_of, tcs.format
    FROM tournaments t
    LEFT JOIN tournament_competition_settings tcs ON tcs.tournament_id = t.id
    LEFT JOIN games g ON g.id = COALESCE(tcs.game_id, CAST(t.game AS UNSIGNED))
    WHERE t.status IN ('criado','aberto')
      AND (COALESCE(tcs.game_id, CAST(t.game AS UNSIGNED)) = ? OR EXISTS (SELECT 1 FROM player_game_profiles pgp WHERE pgp.user_id = ? AND pgp.game_id = COALESCE(tcs.game_id, CAST(t.game AS UNSIGNED))))
    ORDER BY t.inicio LIMIT 20
    `,
    [gameId ?? 0, userId]
  );
  return rows;
}

export async function savePlayerProfile(userId, data) {
  await pool.query(
    `UPDATE users SET nome = ?, nickname = ?, avatar = ?, banner = ?, bio = ?, cidade = ?, estado = ?, pais = ?, birth_date = ?, languages = ?, discord = ?, phone = ?, whatsapp_opt_in = ?, pix_key = ?, pix_key_type = ? WHERE id = ?`,
    [data.nome, data.nickname, data.avatar, data.banner, data.bio, data.cidade, data.estado, data.pais, data.birth_date, JSON.stringify(data.languages), data.links.discord, data.phone, data.whatsapp_opt_in ? 1 : 0, data.pix_key, data.pix_key_type, userId]
  );
  await pool.query(
    `INSERT INTO player_links (user_id, steam, faceit, discord, riot_id, xbox, playstation, epic_games, battlenet, twitch, youtube, kick, instagram, x, tiktok) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE steam=VALUES(steam), faceit=VALUES(faceit), discord=VALUES(discord), riot_id=VALUES(riot_id), xbox=VALUES(xbox), playstation=VALUES(playstation), epic_games=VALUES(epic_games), battlenet=VALUES(battlenet), twitch=VALUES(twitch), youtube=VALUES(youtube), kick=VALUES(kick), instagram=VALUES(instagram), x=VALUES(x), tiktok=VALUES(tiktok)`,
    [userId, data.links.steam, data.links.faceit, data.links.discord, data.links.riot_id, data.links.xbox, data.links.playstation, data.links.epic_games, data.links.battlenet, data.links.twitch, data.links.youtube, data.links.kick, data.links.instagram, data.links.x, data.links.tiktok]
  );
}

export async function savePlayerGameProfile(userId, data) {
  await pool.query(`INSERT IGNORE INTO user_games (user_id, game_id, is_primary) VALUES (?, ?, 0)`, [userId, data.game_id]);
  await pool.query(
    `INSERT INTO player_game_profiles (user_id, game_id, nickname, game_player_id, rank_name, elo, level) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nickname=VALUES(nickname), game_player_id=VALUES(game_player_id), rank_name=VALUES(rank_name), elo=VALUES(elo), level=VALUES(level)`,
    [userId, data.game_id, data.nickname, data.game_player_id, data.rank_name, data.elo, data.level]
  );
}

export async function savePlayerMatchAttendance(matchId, userId, status, note) {
  const [current] = await pool.query(`SELECT status FROM match_attendance WHERE match_id = ? AND user_id = ? LIMIT 1`, [matchId, userId]);
  await pool.query(`INSERT INTO match_attendance (match_id, user_id, status, note) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE status=VALUES(status), note=VALUES(note)`, [matchId, userId, status, note]);
  return current[0]?.status ?? null;
}

export async function savePlayerEventAttendance(eventId, userId, status) {
  await pool.query(`INSERT INTO team_event_attendance (event_id, user_id, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status=VALUES(status)`, [eventId, userId, status]);
}

export async function createPlayerTeamMessage(teamId, userId, message) {
  const [result] = await pool.query(`INSERT INTO team_messages (team_id, user_id, message, attachment_url) VALUES (?, ?, ?, ?)`, [teamId, userId, message.message, message.attachment_url]);
  return result.insertId;
}

export async function createPlayerTicket(userId, data) {
  const [result] = await pool.query(`INSERT INTO support_tickets (user_id, category, priority, subject, message) VALUES (?, ?, ?, ?, ?)`, [userId, data.category, data.priority, data.subject, data.message]);
  return result.insertId;
}

export async function replyPlayerTicket(ticketId, userId, message) {
  const [[ticket]] = await pool.query(`SELECT * FROM support_tickets WHERE id = ? AND user_id = ? LIMIT 1`, [ticketId, userId]);
  if (!ticket) return false;
  await pool.query(`INSERT INTO support_ticket_messages (ticket_id, user_id, message) VALUES (?, ?, ?)`, [ticketId, userId, message]);
  await pool.query(`UPDATE support_tickets SET status = 'aberto' WHERE id = ?`, [ticketId]);
  return true;
}

export async function updatePlayerPassword(userId, passwordHash) {
  await pool.query(`UPDATE users SET senha_hash = ? WHERE id = ?`, [passwordHash, userId]);
}

export async function createPlayerRequest(teamId, userId, message) {
  const [result] = await pool.query(`INSERT INTO team_requests (team_id, user_id, tipo, status, message) VALUES (?, ?, 'request', 'pending', ?)`, [teamId, userId, message]);
  return result.insertId;
}

export async function cancelPlayerRequest(requestId, userId) {
  const [result] = await pool.query(`UPDATE team_requests SET status = 'cancelled' WHERE id = ? AND user_id = ? AND tipo = 'request' AND status = 'pending'`, [requestId, userId]);
  return result.affectedRows > 0;
}

export async function respondPlayerInvite(requestId, userId, action) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[request]] = await connection.query(`SELECT tr.*, t.game_id, t.nome AS team_name FROM team_requests tr INNER JOIN teams t ON t.id = tr.team_id WHERE tr.id = ? AND tr.user_id = ? AND tr.tipo = 'invite' LIMIT 1 FOR UPDATE`, [requestId, userId]);
    if (!request || request.status !== 'pending') throw new Error("Convite pendente nao encontrado.");
    if (action === "accept") {
      const [[membership]] = await connection.query(`SELECT tm.id FROM team_members tm INNER JOIN teams t ON t.id = tm.team_id WHERE tm.user_id = ? AND tm.status = 'ativo' AND t.game_id = ? LIMIT 1`, [userId, request.game_id]);
      if (membership) throw new Error("Voce ja pertence a uma equipe deste jogo.");
      await connection.query(`INSERT INTO team_members (team_id, user_id, cargo, lineup_status, status) VALUES (?, ?, 'player', 'reserva', 'ativo')`, [request.team_id, userId]);
      const [[user]] = await connection.query(`SELECT nome, nickname FROM users WHERE id = ?`, [userId]);
      const [[player]] = await connection.query(`SELECT id FROM players WHERE team_id = ? AND user_id = ?`, [request.team_id, userId]);
      if (player) await connection.query(`UPDATE players SET status = 'reserva' WHERE id = ?`, [player.id]);
      else await connection.query(`INSERT INTO players (team_id, user_id, nick, game, status) VALUES (?, ?, ?, ?, 'reserva')`, [request.team_id, userId, String(user.nickname || user.nome).slice(0, 50), String(request.game_id)]);
      await connection.query(`UPDATE team_requests SET status = 'accepted' WHERE id = ?`, [request.id]);
    } else {
      await connection.query(`UPDATE team_requests SET status = 'rejected' WHERE id = ?`, [request.id]);
      if (action === "block") await connection.query(`INSERT INTO team_blocks (team_id, user_id, blocked_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE blocked_by=VALUES(blocked_by)`, [request.team_id, userId, userId]);
    }
    await connection.commit();
    return request;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
