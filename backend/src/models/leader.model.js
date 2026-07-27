import pool from "../config/database.js";

export async function findLeaderTeam(userId) {
  const [rows] = await pool.query(
    `
    SELECT t.*, tm.id AS membership_id, tm.cargo AS membership_role,
      g.nome AS game_name, g.nome_curto AS game_short_name,
      TIMESTAMPDIFF(DAY, t.created_at, NOW()) AS age_days
    FROM team_members tm
    INNER JOIN teams t ON t.id = tm.team_id
    INNER JOIN games g ON g.id = t.game_id
    LEFT JOIN user_context_preferences ucp ON ucp.user_id = tm.user_id
    WHERE tm.user_id = ? AND tm.cargo = 'leader' AND tm.status = 'ativo'
    ORDER BY (t.id = ucp.active_team_id) DESC, t.created_at ASC
    LIMIT 1
    `,
    [userId]
  );
  return rows[0] ?? null;
}

export async function getLeaderWorkspaceData(team, userId) {
  const [
    members,
    requests,
    lineups,
    lineupPlayers,
    tournaments,
    entries,
    payments,
    matches,
    statistics,
    events,
    notifications,
    disputes,
    tickets,
    teamMessages,
    tournamentMessages,
    documents,
    preferences,
    competitionRequests,
    memberHistory
  ] = await Promise.all([
    queryMembers(team.id),
    queryRequests(team.id),
    queryLineups(team.id),
    queryLineupPlayers(team.id),
    queryTournaments(team.id, team.game_id),
    queryEntries(team.id),
    queryPayments(team.id),
    queryMatches(team.id),
    queryStatistics(team.id),
    queryEvents(team.id, userId),
    queryNotifications(userId),
    queryDisputes(team.id),
    queryTickets(userId),
    queryTeamMessages(team.id),
    queryTournamentMessages(team.id),
    queryDocuments(team.id),
    queryPreferences(userId),
    queryCompetitionRequests(team.id),
    queryMemberHistory(team.id)
  ]);

  const playersByLineup = new Map();
  for (const player of lineupPlayers) {
    const list = playersByLineup.get(Number(player.lineup_id)) ?? [];
    list.push({ ...player, titular: Boolean(player.titular) });
    playersByLineup.set(Number(player.lineup_id), list);
  }

  return {
    team: normalizeTeam(team),
    members: members.map(normalizeMember),
    requests,
    lineups: lineups.map((lineup) => ({
      ...lineup,
      id: Number(lineup.id),
      players: playersByLineup.get(Number(lineup.id)) ?? []
    })),
    tournaments,
    entries,
    payments,
    matches,
    statistics,
    events,
    notifications: notifications.map((item) => ({ ...item, lida: Boolean(item.lida) })),
    disputes,
    tickets,
    messages: { team: teamMessages, tournaments: tournamentMessages },
    documents,
    preferences: normalizePreferences(preferences ?? defaultPreferences(userId)),
    competition_requests: competitionRequests,
    member_history: memberHistory
  };
}

export async function listLeaderGames() {
  const [rows] = await pool.query(`SELECT id, nome, nome_curto, slug FROM games WHERE ativo = 1 ORDER BY nome`);
  return rows;
}

export async function updateLeaderTeam(teamId, data) {
  await pool.query(
    `
    UPDATE teams SET nome = ?, tag = ?, logo = ?, banner = ?, descricao = ?, regiao = ?,
      discord = ?, steam = ?, instagram = ?, youtube = ?, twitch = ?, tiktok = ?, website = ?,
      recrutando = ?, privada = ?
    WHERE id = ?
    `,
    [
      data.nome, data.tag, data.logo, data.banner, data.descricao, data.regiao,
      data.discord, data.steam, data.instagram, data.youtube, data.twitch, data.tiktok, data.website,
      data.recrutando ? 1 : 0, data.privada ? 1 : 0, teamId
    ]
  );
}

export async function findRequestForLeader(requestId) {
  const [rows] = await pool.query(`SELECT * FROM team_requests WHERE id = ? LIMIT 1`, [requestId]);
  return rows[0] ?? null;
}

export async function findPendingTeamRequest(teamId, userId) {
  const [rows] = await pool.query(
    `SELECT * FROM team_requests WHERE team_id = ? AND user_id = ? AND status = 'pending' LIMIT 1`,
    [teamId, userId]
  );
  return rows[0] ?? null;
}

export async function isUserBlockedByTeam(teamId, userId) {
  const [rows] = await pool.query(`SELECT id FROM team_blocks WHERE team_id = ? AND user_id = ? LIMIT 1`, [teamId, userId]);
  return Boolean(rows.length);
}

export async function createTeamInvitation(teamId, userId, createdBy) {
  const [result] = await pool.query(
    `INSERT INTO team_requests (team_id, user_id, tipo, status, created_by) VALUES (?, ?, 'invite', 'pending', ?)`,
    [teamId, userId, createdBy]
  );
  return { id: result.insertId, team_id: teamId, user_id: userId, tipo: "invite", status: "pending" };
}

export async function decideTeamRequest(request, action, actorId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const status = action === "accept" ? "accepted" : action === "cancel" ? "cancelled" : "rejected";
    await connection.query(`UPDATE team_requests SET status = ? WHERE id = ?`, [status, request.id]);

    if (action === "block") {
      await connection.query(
        `INSERT INTO team_blocks (team_id, user_id, blocked_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE blocked_by = VALUES(blocked_by), created_at = NOW()`,
        [request.team_id, request.user_id, actorId]
      );
    }

    if (action === "accept") {
      const [[existing]] = await connection.query(
        `SELECT id FROM team_members WHERE team_id = ? AND user_id = ? LIMIT 1`,
        [request.team_id, request.user_id]
      );
      if (!existing) {
        await connection.query(
          `INSERT INTO team_members (team_id, user_id, cargo, lineup_status, status) VALUES (?, ?, 'player', 'reserva', 'ativo')`,
          [request.team_id, request.user_id]
        );
      }

      const [[team]] = await connection.query(`SELECT game_id FROM teams WHERE id = ? LIMIT 1`, [request.team_id]);
      const [[user]] = await connection.query(`SELECT nome, nickname FROM users WHERE id = ? LIMIT 1`, [request.user_id]);
      const [[player]] = await connection.query(
        `SELECT id FROM players WHERE team_id = ? AND user_id = ? LIMIT 1`,
        [request.team_id, request.user_id]
      );
      if (!player) {
        const nick = String(user?.nickname || user?.nome || `Player${request.user_id}`).trim().slice(0, 50);
        await connection.query(
          `INSERT INTO players (team_id, user_id, nick, game, status) VALUES (?, ?, ?, ?, 'ativo')`,
          [request.team_id, request.user_id, nick, String(team.game_id)]
        );
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function resendTeamInvitation(requestId) {
  await pool.query(`UPDATE team_requests SET status = 'pending', created_at = NOW() WHERE id = ? AND tipo = 'invite'`, [requestId]);
}

export async function findLeaderMember(memberId) {
  const [rows] = await pool.query(
    `SELECT tm.*, p.id AS player_id, p.status AS player_status FROM team_members tm LEFT JOIN players p ON p.team_id = tm.team_id AND p.user_id = tm.user_id WHERE tm.id = ? LIMIT 1`,
    [memberId]
  );
  return rows[0] ?? null;
}

export async function updateLeaderMember(member, data) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `UPDATE team_members SET cargo = ?, lineup_status = ?, status = ?, can_invite_players = ?, can_remove_players = ? WHERE id = ?`,
      [data.cargo, data.lineup_status, data.status, data.can_invite_players ? 1 : 0, data.can_remove_players ? 1 : 0, member.id]
    );
    if (member.player_id) {
      const playerStatus = data.status === "inativo" ? "inativo" : data.lineup_status === "reserva" ? "reserva" : "ativo";
      await connection.query(`UPDATE players SET status = ? WHERE id = ?`, [playerStatus, member.player_id]);
    }
    await connection.query(
      `UPDATE users SET role = ? WHERE id = ? AND role <> 'admin'`,
      [data.cargo === "captain" || data.cargo === "manager" ? "capitao" : "jogador", member.user_id]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function demoteTeamCaptains(teamId, exceptMemberId) {
  await pool.query(`UPDATE team_members SET cargo = 'player', can_invite_players = 0, can_remove_players = 0 WHERE team_id = ? AND cargo = 'captain' AND id <> ?`, [teamId, exceptMemberId]);
}

export async function transferLeaderMembership(teamId, currentLeaderId, member) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`UPDATE team_members SET cargo = 'captain' WHERE team_id = ? AND user_id = ?`, [teamId, currentLeaderId]);
    await connection.query(`UPDATE team_members SET cargo = 'leader', status = 'ativo' WHERE id = ?`, [member.id]);
    await connection.query(`UPDATE users SET role = 'capitao' WHERE id = ? AND role <> 'admin'`, [currentLeaderId]);
    await connection.query(`UPDATE users SET role = 'lider' WHERE id = ? AND role <> 'admin'`, [member.user_id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function removeLeaderMember(member) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    if (member.player_id) await connection.query(`UPDATE players SET status = 'inativo' WHERE id = ?`, [member.player_id]);
    await connection.query(`DELETE FROM team_members WHERE id = ?`, [member.id]);
    await connection.query(`UPDATE users SET role = 'jogador' WHERE id = ? AND role <> 'admin'`, [member.user_id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function findLineup(lineupId) {
  const [rows] = await pool.query(`SELECT * FROM team_lineups WHERE id = ? LIMIT 1`, [lineupId]);
  return rows[0] ?? null;
}

export async function saveLeaderLineup({ id = null, teamId, userId, name, status, titulares, reservas }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    let lineupId = id;
    if (lineupId) {
      await connection.query(`UPDATE team_lineups SET name = ?, status = ? WHERE id = ? AND team_id = ?`, [name, status, lineupId, teamId]);
      await connection.query(`DELETE FROM team_lineup_players WHERE lineup_id = ?`, [lineupId]);
    } else {
      const [result] = await connection.query(
        `INSERT INTO team_lineups (team_id, name, status, created_by) VALUES (?, ?, ?, ?)`,
        [teamId, name, status, userId]
      );
      lineupId = result.insertId;
    }

    let order = 1;
    for (const playerId of titulares) {
      await connection.query(`INSERT INTO team_lineup_players (lineup_id, player_id, titular, ordem) VALUES (?, ?, 1, ?)`, [lineupId, playerId, order++]);
    }
    for (const playerId of reservas) {
      await connection.query(`INSERT INTO team_lineup_players (lineup_id, player_id, titular, ordem) VALUES (?, ?, 0, ?)`, [lineupId, playerId, order++]);
    }
    await connection.commit();
    return lineupId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function setLineupStatus(lineupId, status) {
  await pool.query(`UPDATE team_lineups SET status = ? WHERE id = ?`, [status, lineupId]);
}

export async function getLineupPlayers(lineupId) {
  const [rows] = await pool.query(`SELECT * FROM team_lineup_players WHERE lineup_id = ? ORDER BY titular DESC, ordem`, [lineupId]);
  return rows;
}

export async function getActiveTeamPlayers(teamId) {
  const [rows] = await pool.query(`SELECT id, user_id, nick, status FROM players WHERE team_id = ? AND status <> 'inativo' ORDER BY id`, [teamId]);
  return rows;
}

export async function createEntryFromLineup({ teamId, tournamentId, lineupId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO entries (tournament_id, team_id, lineup_id, rules_accepted_at) VALUES (?, ?, ?, NOW())`,
      [tournamentId, teamId, lineupId]
    );
    await connection.query(
      `
      INSERT INTO entry_players (entry_id, player_id, titular, ordem, confirmado)
      SELECT ?, player_id, titular, ordem, 1 FROM team_lineup_players WHERE lineup_id = ?
      `,
      [result.insertId, lineupId]
    );
    await connection.commit();
    return result.insertId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function findTeamMatch(matchId, teamId) {
  const [rows] = await pool.query(`SELECT * FROM matches WHERE id = ? AND (team_a_id = ? OR team_b_id = ?) LIMIT 1`, [matchId, teamId, teamId]);
  return rows[0] ?? null;
}

export async function getLeaderTournamentCenterData(tournamentId, teamId) {
  const [[tournament], [mapPool], [participants], [matches], [lineup]] = await Promise.all([
    pool.query(
      `
      SELECT t.*, g.nome AS game_name, tcs.format, tcs.best_of, tcs.pick_ban_enabled,
        tcs.veto_order, tcs.overtime_enabled, tcs.initial_side, tcs.pause_minutes,
        tcs.walkover_minutes, tcs.tiebreakers, tcs.seed_mode, tcs.registration_approval
      FROM tournaments t
      LEFT JOIN tournament_competition_settings tcs ON tcs.tournament_id = t.id
      LEFT JOIN games g ON g.id = COALESCE(tcs.game_id, CAST(t.game AS UNSIGNED))
      WHERE t.id = ? LIMIT 1
      `,
      [tournamentId]
    ),
    pool.query(
      `SELECT gm.id, gm.nome, gm.slug AS nome_curto, gm.imagem, gm.ordem FROM tournament_map_pool tmp INNER JOIN game_maps gm ON gm.id = tmp.game_map_id WHERE tmp.tournament_id = ? ORDER BY gm.ordem, gm.nome`,
      [tournamentId]
    ),
    pool.query(
      `
      SELECT e.id AS entry_id, e.team_id, e.status, e.payment_status, e.lineup_id,
        tm.nome AS team_name, tm.tag, tm.logo, tl.name AS lineup_name, COUNT(ep.id) AS player_count
      FROM entries e
      INNER JOIN teams tm ON tm.id = e.team_id
      LEFT JOIN team_lineups tl ON tl.id = e.lineup_id
      LEFT JOIN entry_players ep ON ep.entry_id = e.id
      WHERE e.tournament_id = ? AND e.status <> 'cancelado'
      GROUP BY e.id, tm.id, tl.id ORDER BY e.created_at
      `,
      [tournamentId]
    ),
    pool.query(
      `
      SELECT m.*, ta.nome AS team_a, tb.nome AS team_b, tw.nome AS winner,
        mcs.best_of, mcs.server_address, mvs.status AS veto_status
      FROM matches m
      INNER JOIN teams ta ON ta.id = m.team_a_id
      INNER JOIN teams tb ON tb.id = m.team_b_id
      LEFT JOIN teams tw ON tw.id = m.winner_team_id
      LEFT JOIN match_competition_settings mcs ON mcs.match_id = m.id
      LEFT JOIN match_veto_sessions mvs ON mvs.match_id = m.id
      WHERE m.tournament_id = ?
      ORDER BY m.round, COALESCE(m.scheduled_at, m.created_at), m.id
      `,
      [tournamentId]
    ),
    pool.query(
      `
      SELECT ep.id, ep.player_id, ep.titular, ep.ordem, ep.confirmado,
        p.nick, p.game_uid, p.foto
      FROM entries e
      INNER JOIN entry_players ep ON ep.entry_id = e.id
      INNER JOIN players p ON p.id = ep.player_id
      WHERE e.tournament_id = ? AND e.team_id = ?
      ORDER BY ep.titular DESC, ep.ordem
      `,
      [tournamentId, teamId]
    )
  ]);

  if (!tournament.length) return null;
  const standings = calculateStandings(participants, matches);
  return {
    tournament: tournament[0],
    map_pool: mapPool,
    participants,
    matches,
    lineup: lineup.map((player) => ({ ...player, titular: Boolean(player.titular), confirmado: Boolean(player.confirmado) })),
    standings
  };
}

export async function setLeaderTeamArchived(teamId, archived) {
  await pool.query(`UPDATE teams SET ativo = ?, archived_at = ? WHERE id = ?`, [archived ? 0 : 1, archived ? new Date() : null, teamId]);
}

export async function setLeaderEventAttendance(eventId, userId, status) {
  await pool.query(
    `INSERT INTO team_event_attendance (event_id, user_id, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status)`,
    [eventId, userId, status]
  );
}

export async function createLeaderCompetitionRequest(teamId, userId, data) {
  const [result] = await pool.query(
    `
    INSERT INTO team_competition_requests
      (team_id, tournament_id, match_id, requested_by, type, subject, description, requested_for,
       outgoing_player_id, incoming_player_id, evidence_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [teamId, data.tournament_id, data.match_id, userId, data.type, data.subject, data.description,
      data.requested_for, data.outgoing_player_id, data.incoming_player_id, data.evidence_url]
  );
  return result.insertId;
}

export async function logLeaderMemberHistory(teamId, actorUserId, subjectUserId, action, details = null) {
  await pool.query(
    `INSERT INTO team_member_history (team_id, actor_user_id, subject_user_id, action, details) VALUES (?, ?, ?, ?, ?)`,
    [teamId, actorUserId, subjectUserId, action, details ? JSON.stringify(details) : null]
  );
}

export async function createLeaderEvent(teamId, userId, data) {
  const [result] = await pool.query(
    `INSERT INTO team_events (team_id, created_by, title, type, starts_at, ends_at, location, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [teamId, userId, data.title, data.type, data.starts_at, data.ends_at, data.location, data.notes]
  );
  return result.insertId;
}

export async function findLeaderEvent(eventId, teamId) {
  const [rows] = await pool.query(`SELECT * FROM team_events WHERE id = ? AND team_id = ? LIMIT 1`, [eventId, teamId]);
  return rows[0] ?? null;
}

export async function deleteLeaderEvent(teamId, eventId) {
  await pool.query(`DELETE FROM team_events WHERE id = ? AND team_id = ?`, [eventId, teamId]);
}

export async function createLeaderMessage(table, context, userId, data) {
  if (table === "team_messages") {
    const [result] = await pool.query(
      `INSERT INTO team_messages (team_id, user_id, message, attachment_url) VALUES (?, ?, ?, ?)`,
      [context.teamId, userId, data.message, data.attachment_url]
    );
    return result.insertId;
  }
  const [result] = await pool.query(
    `INSERT INTO tournament_messages (tournament_id, team_id, user_id, message, attachment_url) VALUES (?, ?, ?, ?, ?)`,
    [context.tournamentId, context.teamId, userId, data.message, data.attachment_url]
  );
  return result.insertId;
}

export async function createLeaderDispute(teamId, userId, data) {
  const [result] = await pool.query(
    `INSERT INTO disputes (match_id, tournament_id, team_id, created_by, title, description, evidence) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.match_id, data.tournament_id, teamId, userId, data.title, data.description, data.evidence]
  );
  return result.insertId;
}

export async function createLeaderTicket(userId, data) {
  const [result] = await pool.query(
    `INSERT INTO support_tickets (user_id, category, priority, subject, message) VALUES (?, ?, ?, ?, ?)`,
    [userId, data.category, data.priority, data.subject, data.message]
  );
  return result.insertId;
}

export async function createLeaderDocument(teamId, userId, data) {
  const [result] = await pool.query(
    `INSERT INTO team_documents (team_id, uploaded_by, name, type, url) VALUES (?, ?, ?, ?, ?)`,
    [teamId, userId, data.name, data.type, data.url]
  );
  return result.insertId;
}

export async function saveLeaderPreferences(userId, data) {
  await pool.query(
    `
    INSERT INTO user_preferences (user_id, language, theme, steam_profile, email_notifications, discord_notifications, profile_public)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE language = VALUES(language), theme = VALUES(theme), steam_profile = VALUES(steam_profile),
      email_notifications = VALUES(email_notifications), discord_notifications = VALUES(discord_notifications),
      profile_public = VALUES(profile_public)
    `,
    [userId, data.language, data.theme, data.steam_profile ?? null, data.email_notifications ? 1 : 0, data.discord_notifications ? 1 : 0, data.profile_public ? 1 : 0]
  );
}

async function queryMembers(teamId) {
  const [rows] = await pool.query(
    `
    SELECT tm.id, tm.user_id, tm.cargo, tm.lineup_status, tm.status, tm.joined_at, tm.last_seen_at,
      tm.can_invite_players, tm.can_remove_players,
      u.nome, u.email, u.avatar, u.nickname, p.id AS player_id, p.nick, p.game_uid, p.foto, p.status AS player_status
    FROM team_members tm
    INNER JOIN users u ON u.id = tm.user_id
    LEFT JOIN players p ON p.team_id = tm.team_id AND p.user_id = tm.user_id
    WHERE tm.team_id = ?
    ORDER BY FIELD(tm.cargo, 'leader', 'captain', 'manager', 'player'), FIELD(tm.lineup_status, 'titular', 'reserva'), u.nome
    `,
    [teamId]
  );
  return rows;
}

async function queryRequests(teamId) {
  const [rows] = await pool.query(
    `SELECT tr.*, u.nome, u.email, u.avatar, u.nickname FROM team_requests tr INNER JOIN users u ON u.id = tr.user_id WHERE tr.team_id = ? ORDER BY FIELD(tr.status, 'pending', 'accepted', 'rejected', 'cancelled'), tr.created_at DESC`,
    [teamId]
  );
  return rows;
}

async function queryLineups(teamId) {
  const [rows] = await pool.query(`SELECT * FROM team_lineups WHERE team_id = ? AND status <> 'arquivada' ORDER BY updated_at DESC`, [teamId]);
  return rows;
}

async function queryLineupPlayers(teamId) {
  const [rows] = await pool.query(
    `SELECT tlp.*, p.nick, p.game_uid, p.foto, p.status FROM team_lineup_players tlp INNER JOIN team_lineups tl ON tl.id = tlp.lineup_id INNER JOIN players p ON p.id = tlp.player_id WHERE tl.team_id = ? ORDER BY tlp.lineup_id, tlp.titular DESC, tlp.ordem`,
    [teamId]
  );
  return rows;
}

async function queryTournaments(teamId, gameId) {
  const [rows] = await pool.query(
    `
    SELECT t.*, g.nome AS game_name, tcs.format, tcs.best_of, e.id AS entry_id,
      e.status AS entry_status, e.payment_status, e.lineup_id,
      (SELECT COUNT(*) FROM entries capacity WHERE capacity.tournament_id = t.id AND capacity.status <> 'cancelado') AS registered_teams
    FROM tournaments t
    LEFT JOIN tournament_competition_settings tcs ON tcs.tournament_id = t.id
    LEFT JOIN games g ON g.id = COALESCE(tcs.game_id, CAST(t.game AS UNSIGNED))
    LEFT JOIN entries e ON e.tournament_id = t.id AND e.team_id = ?
    WHERE (COALESCE(tcs.game_id, CAST(t.game AS UNSIGNED)) = ? AND t.status <> 'cancelado') OR EXISTS (
      SELECT 1 FROM entries owned_entry WHERE owned_entry.tournament_id = t.id AND owned_entry.team_id = ?
    )
    ORDER BY FIELD(t.status, 'aberto', 'criado', 'fechado', 'em_andamento', 'finalizado'), t.inicio DESC
    `,
    [teamId, gameId, teamId]
  );
  return rows;
}

async function queryEntries(teamId) {
  const [rows] = await pool.query(
    `SELECT e.*, t.nome AS tournament_name, t.banner, t.inicio, t.fim, t.valor, t.premiacao, tl.name AS lineup_name, COUNT(ep.id) AS lineup_size FROM entries e INNER JOIN tournaments t ON t.id = e.tournament_id LEFT JOIN team_lineups tl ON tl.id = e.lineup_id LEFT JOIN entry_players ep ON ep.entry_id = e.id WHERE e.team_id = ? GROUP BY e.id, t.id, tl.id ORDER BY e.created_at DESC`,
    [teamId]
  );
  return rows;
}

async function queryPayments(teamId) {
  const [rows] = await pool.query(
    `SELECT p.*, e.tournament_id, t.nome AS tournament_name FROM payments p INNER JOIN entries e ON e.id = p.entry_id INNER JOIN tournaments t ON t.id = e.tournament_id WHERE e.team_id = ? ORDER BY p.created_at DESC`,
    [teamId]
  );
  return rows;
}

async function queryMatches(teamId) {
  const [rows] = await pool.query(
    `
    SELECT m.*, t.nome AS tournament_name, ta.nome AS team_a, tb.nome AS team_b, tw.nome AS winner,
      CASE WHEN m.team_a_id = ? THEN tb.nome ELSE ta.nome END AS opponent,
      mcs.best_of, mcs.server_address, mvs.status AS veto_status, mvs.current_step
    FROM matches m
    INNER JOIN tournaments t ON t.id = m.tournament_id
    INNER JOIN teams ta ON ta.id = m.team_a_id
    INNER JOIN teams tb ON tb.id = m.team_b_id
    LEFT JOIN teams tw ON tw.id = m.winner_team_id
    LEFT JOIN match_competition_settings mcs ON mcs.match_id = m.id
    LEFT JOIN match_veto_sessions mvs ON mvs.match_id = m.id
    WHERE m.team_a_id = ? OR m.team_b_id = ?
    ORDER BY FIELD(m.status, 'andamento', 'agendada', 'finalizada'), COALESCE(m.scheduled_at, m.created_at) DESC
    `,
    [teamId, teamId, teamId]
  );
  return rows;
}

async function queryStatistics(teamId) {
  const [[matchStats]] = await pool.query(
    `SELECT COUNT(*) AS matches, SUM(status = 'finalizada' AND winner_team_id = ?) AS wins, SUM(status = 'finalizada' AND winner_team_id IS NOT NULL AND winner_team_id <> ?) AS losses FROM matches WHERE team_a_id = ? OR team_b_id = ?`,
    [teamId, teamId, teamId, teamId]
  );
  const [[playerStats]] = await pool.query(
    `SELECT COALESCE(SUM(kills), 0) AS kills, COALESCE(SUM(deaths), 0) AS deaths, COALESCE(SUM(assists), 0) AS assists, COALESCE(SUM(headshots), 0) AS headshots, COALESCE(SUM(mvp), 0) AS mvps FROM match_player_stats WHERE team_id = ?`,
    [teamId]
  );
  const [allResults] = await pool.query(`SELECT team_a_id, team_b_id, winner_team_id, finished_at FROM matches WHERE status = 'finalizada'`);
  const wins = Number(matchStats.wins ?? 0);
  const losses = Number(matchStats.losses ?? 0);
  const decided = wins + losses;
  const kills = Number(playerStats.kills ?? 0);
  const winsByTeam = new Map();
  const seasonsByYear = new Map();
  for (const match of allResults) {
    if (match.winner_team_id) winsByTeam.set(Number(match.winner_team_id), (winsByTeam.get(Number(match.winner_team_id)) ?? 0) + 1);
    if (Number(match.team_a_id) === Number(teamId) || Number(match.team_b_id) === Number(teamId)) {
      const year = match.finished_at ? new Date(match.finished_at).getFullYear() : new Date().getFullYear();
      const season = seasonsByYear.get(year) ?? { season: String(year), matches: 0, wins: 0, losses: 0 };
      season.matches += 1;
      if (Number(match.winner_team_id) === Number(teamId)) season.wins += 1;
      else if (match.winner_team_id) season.losses += 1;
      seasonsByYear.set(year, season);
    }
  }
  const platformRank = [...winsByTeam.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .findIndex(([id]) => id === Number(teamId)) + 1;
  const achievements = [];
  if (wins >= 1) achievements.push({ code: "first_win", title: "Primeira vitoria", description: "A equipe venceu seu primeiro confronto oficial." });
  if (wins >= 5) achievements.push({ code: "five_wins", title: "Cinco vitorias", description: "Marca de cinco vitorias oficiais alcancada." });
  if (Number(matchStats.matches ?? 0) >= 10) achievements.push({ code: "veteran", title: "Equipe veterana", description: "Dez partidas oficiais disputadas." });
  return {
    matches: Number(matchStats.matches ?? 0), wins, losses,
    win_rate: decided ? Math.round((wins / decided) * 100) : 0,
    kills, deaths: Number(playerStats.deaths ?? 0), assists: Number(playerStats.assists ?? 0),
    headshots: Number(playerStats.headshots ?? 0), hs_percent: kills ? Math.round((Number(playerStats.headshots ?? 0) / kills) * 100) : 0,
    mvps: Number(playerStats.mvps ?? 0),
    platform_rank: platformRank || null,
    seasons: [...seasonsByYear.values()].sort((a, b) => Number(b.season) - Number(a.season)),
    achievements
  };
}

async function queryEvents(teamId, userId) {
  const [rows] = await pool.query(
    `
    SELECT te.*,
      SUM(tea.status = 'confirmado') AS confirmed_count,
      SUM(tea.status = 'ausente') AS declined_count,
      MAX(CASE WHEN tea.user_id = ? THEN tea.status END) AS my_attendance
    FROM team_events te
    LEFT JOIN team_event_attendance tea ON tea.event_id = te.id
    WHERE te.team_id = ?
    GROUP BY te.id ORDER BY te.starts_at
    `,
    [userId, teamId]
  );
  return rows;
}
async function queryNotifications(userId) { const [rows] = await pool.query(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`, [userId]); return rows; }
async function queryDisputes(teamId) { const [rows] = await pool.query(`SELECT d.*, t.nome AS tournament_name FROM disputes d LEFT JOIN tournaments t ON t.id = d.tournament_id WHERE d.team_id = ? ORDER BY d.created_at DESC`, [teamId]); return rows; }
async function queryTickets(userId) { const [rows] = await pool.query(`SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC`, [userId]); return rows; }
async function queryTeamMessages(teamId) { const [rows] = await pool.query(`SELECT tm.*, u.nome, u.nickname, u.avatar FROM team_messages tm INNER JOIN users u ON u.id = tm.user_id WHERE tm.team_id = ? ORDER BY tm.created_at DESC LIMIT 50`, [teamId]); return rows.reverse(); }
async function queryTournamentMessages(teamId) { const [rows] = await pool.query(`SELECT tm.*, u.nome, u.nickname, u.avatar, t.nome AS tournament_name FROM tournament_messages tm INNER JOIN users u ON u.id = tm.user_id INNER JOIN tournaments t ON t.id = tm.tournament_id WHERE tm.team_id = ? ORDER BY tm.created_at DESC LIMIT 50`, [teamId]); return rows.reverse(); }
async function queryDocuments(teamId) { const [rows] = await pool.query(`SELECT * FROM team_documents WHERE team_id = ? ORDER BY created_at DESC`, [teamId]); return rows; }
async function queryPreferences(userId) { const [rows] = await pool.query(`SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1`, [userId]); return rows[0] ?? null; }
async function queryCompetitionRequests(teamId) {
  const [rows] = await pool.query(
    `
    SELECT tcr.*, t.nome AS tournament_name,
      CONCAT('Partida #', tcr.match_id) AS match_name,
      outgoing.nick AS outgoing_player, incoming.nick AS incoming_player
    FROM team_competition_requests tcr
    LEFT JOIN tournaments t ON t.id = tcr.tournament_id
    LEFT JOIN players outgoing ON outgoing.id = tcr.outgoing_player_id
    LEFT JOIN players incoming ON incoming.id = tcr.incoming_player_id
    WHERE tcr.team_id = ? ORDER BY tcr.created_at DESC
    `,
    [teamId]
  );
  return rows;
}
async function queryMemberHistory(teamId) {
  const [rows] = await pool.query(
    `
    SELECT tmh.*, actor.nome AS actor_name, subject.nome AS subject_name
    FROM team_member_history tmh
    INNER JOIN users actor ON actor.id = tmh.actor_user_id
    LEFT JOIN users subject ON subject.id = tmh.subject_user_id
    WHERE tmh.team_id = ? ORDER BY tmh.created_at DESC LIMIT 100
    `,
    [teamId]
  );
  return rows;
}

function normalizeTeam(team) {
  return { ...team, id: Number(team.id), game_id: Number(team.game_id), recrutando: Boolean(team.recrutando), privada: Boolean(team.privada), ativo: Boolean(team.ativo) };
}

function normalizeMember(member) {
  return { ...member, id: Number(member.id), user_id: Number(member.user_id), player_id: member.player_id ? Number(member.player_id) : null, can_invite_players: Boolean(member.can_invite_players), can_remove_players: Boolean(member.can_remove_players) };
}

function normalizePreferences(preferences) {
  return {
    ...preferences,
    email_notifications: Boolean(preferences.email_notifications),
    discord_notifications: Boolean(preferences.discord_notifications),
    profile_public: Boolean(preferences.profile_public)
  };
}

function calculateStandings(participants, matches) {
  const table = new Map(participants.map((entry) => [Number(entry.team_id), {
    team_id: Number(entry.team_id), team_name: entry.team_name, played: 0, wins: 0, losses: 0, score_for: 0, score_against: 0, points: 0
  }]));
  for (const match of matches.filter((item) => item.status === "finalizada")) {
    const teamA = table.get(Number(match.team_a_id));
    const teamB = table.get(Number(match.team_b_id));
    if (!teamA || !teamB) continue;
    teamA.played += 1; teamB.played += 1;
    teamA.score_for += Number(match.score_team_a ?? 0); teamA.score_against += Number(match.score_team_b ?? 0);
    teamB.score_for += Number(match.score_team_b ?? 0); teamB.score_against += Number(match.score_team_a ?? 0);
    if (Number(match.winner_team_id) === teamA.team_id) { teamA.wins += 1; teamA.points += 3; teamB.losses += 1; }
    else if (Number(match.winner_team_id) === teamB.team_id) { teamB.wins += 1; teamB.points += 3; teamA.losses += 1; }
  }
  return [...table.values()].sort((a, b) => b.points - a.points || (b.score_for - b.score_against) - (a.score_for - a.score_against) || a.team_name.localeCompare(b.team_name));
}

function defaultPreferences(userId) {
  return { user_id: userId, language: "pt-BR", theme: "dark", steam_profile: null, email_notifications: true, discord_notifications: false, profile_public: true };
}
