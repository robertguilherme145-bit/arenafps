import pool from "../config/database.js";

export async function getAdminDashboardSnapshot() {
  const [[tournamentCounts]] = await pool.query(
    `
    SELECT
      SUM(CASE WHEN status IN ('criado', 'aberto') THEN 1 ELSE 0 END) AS upcoming_tournaments,
      SUM(CASE WHEN status = 'em_andamento' THEN 1 ELSE 0 END) AS live_tournaments,
      SUM(CASE WHEN status = 'finalizado' THEN 1 ELSE 0 END) AS finished_tournaments
    FROM tournaments
    `
  );

  const [[entryCounts]] = await pool.query(
    `
    SELECT
      SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) AS pending_entries,
      SUM(CASE WHEN status = 'confirmado' THEN 1 ELSE 0 END) AS confirmed_entries,
      SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END) AS cancelled_entries
    FROM entries
    `
  );

  const [[paymentCounts]] = await pool.query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN status = 'aprovado' THEN valor ELSE 0 END), 0) AS approved_revenue,
      SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) AS pending_payments,
      SUM(CASE WHEN status = 'aprovado' THEN 1 ELSE 0 END) AS approved_payments
    FROM payments
    `
  );

  const [[matchCounts]] = await pool.query(
    `
    SELECT
      SUM(CASE WHEN status <> 'finalizada' THEN 1 ELSE 0 END) AS matches_waiting_result,
      SUM(CASE WHEN status = 'finalizada' THEN 1 ELSE 0 END) AS finished_matches
    FROM matches
    `
  );

  const [[teamCounts]] = await pool.query(
    `
    SELECT
      SUM(CASE WHEN ativo = 1 THEN 1 ELSE 0 END) AS active_teams,
      SUM(CASE WHEN recrutando = 1 THEN 1 ELSE 0 END) AS recruiting_teams
    FROM teams
    `
  );

  const [[playerCounts]] = await pool.query(
    `
    SELECT
      SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) AS active_players,
      SUM(CASE WHEN status = 'banido' THEN 1 ELSE 0 END) AS banned_players
    FROM players
    `
  );

  const [[communityCounts]] = await pool.query(
    `
    SELECT
      (SELECT COUNT(*) FROM disputes WHERE status IN ('aberta', 'em_analise')) AS open_disputes,
      (SELECT COUNT(*) FROM support_tickets WHERE status IN ('aberto', 'em_analise')) AS open_tickets,
      (SELECT COUNT(*) FROM admin_penalties WHERE status = 'ativa') AS active_penalties
    `
  );

  const [[notificationCounts]] = await pool.query(
    `
    SELECT
      COUNT(*) AS total_notifications,
      SUM(CASE WHEN lida = 0 THEN 1 ELSE 0 END) AS unread_notifications
    FROM notifications
    `
  );

  const [latestPayments] = await pool.query(
    `
    SELECT
      p.id,
      p.status,
      p.valor,
      p.provider,
      p.created_at,
      p.paid_at,
      e.id AS entry_id,
      t.nome AS tournament_name,
      tm.nome AS team_name
    FROM payments p
    INNER JOIN entries e
      ON e.id = p.entry_id
    INNER JOIN tournaments t
      ON t.id = e.tournament_id
    INNER JOIN teams tm
      ON tm.id = e.team_id
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 8
    `
  );

  return {
    upcoming_tournaments: Number(tournamentCounts.upcoming_tournaments ?? 0),
    live_tournaments: Number(tournamentCounts.live_tournaments ?? 0),
    finished_tournaments: Number(tournamentCounts.finished_tournaments ?? 0),
    pending_entries: Number(entryCounts.pending_entries ?? 0),
    confirmed_entries: Number(entryCounts.confirmed_entries ?? 0),
    cancelled_entries: Number(entryCounts.cancelled_entries ?? 0),
    approved_revenue: Number(paymentCounts.approved_revenue ?? 0),
    pending_payments: Number(paymentCounts.pending_payments ?? 0),
    approved_payments: Number(paymentCounts.approved_payments ?? 0),
    matches_waiting_result: Number(matchCounts.matches_waiting_result ?? 0),
    finished_matches: Number(matchCounts.finished_matches ?? 0),
    active_teams: Number(teamCounts.active_teams ?? 0),
    recruiting_teams: Number(teamCounts.recruiting_teams ?? 0),
    active_players: Number(playerCounts.active_players ?? 0),
    banned_players: Number(playerCounts.banned_players ?? 0),
    open_disputes: Number(communityCounts.open_disputes ?? 0),
    open_tickets: Number(communityCounts.open_tickets ?? 0),
    active_penalties: Number(communityCounts.active_penalties ?? 0),
    total_notifications: Number(notificationCounts.total_notifications ?? 0),
    unread_notifications: Number(notificationCounts.unread_notifications ?? 0),
    latest_payments: latestPayments
  };
}

export async function getAdminEntries(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.tournamentId) {
    clauses.push("e.tournament_id = ?");
    params.push(filters.tournamentId);
  }

  if (filters.status) {
    clauses.push("e.status = ?");
    params.push(filters.status);
  }

  if (filters.paymentStatus) {
    clauses.push("e.payment_status = ?");
    params.push(filters.paymentStatus);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `
    SELECT
      e.*,
      t.nome AS tournament_name,
      t.status AS tournament_status,
      tm.nome AS team_name,
      tm.slug AS team_slug,
      g.nome AS game_name,
      COUNT(ep.id) AS lineup_size,
      SUM(CASE WHEN ep.titular = 1 THEN 1 ELSE 0 END) AS starters_count,
      p.id AS payment_id,
      p.status AS payment_gateway_status,
      p.valor AS payment_amount,
      p.created_at AS payment_created_at,
      p.paid_at AS payment_paid_at
    FROM entries e
    INNER JOIN tournaments t
      ON t.id = e.tournament_id
    INNER JOIN teams tm
      ON tm.id = e.team_id
    LEFT JOIN games g
      ON g.id = tm.game_id
    LEFT JOIN entry_players ep
      ON ep.entry_id = e.id
    LEFT JOIN payments p
      ON p.entry_id = e.id
    ${where}
    GROUP BY
      e.id,
      t.nome,
      t.status,
      tm.nome,
      tm.slug,
      g.nome,
      p.id,
      p.status,
      p.valor,
      p.created_at,
      p.paid_at
    ORDER BY e.created_at DESC, e.id DESC
    `,
    params
  );

  return rows.map(normalizeEntryRow);
}

export async function getAdminPayments(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.status) {
    clauses.push("p.status = ?");
    params.push(filters.status);
  }

  if (filters.tournamentId) {
    clauses.push("e.tournament_id = ?");
    params.push(filters.tournamentId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `
    SELECT
      p.*,
      e.status AS entry_status,
      e.payment_status AS entry_payment_status,
      e.team_id,
      e.tournament_id,
      t.nome AS tournament_name,
      tm.nome AS team_name
    FROM payments p
    INNER JOIN entries e
      ON e.id = p.entry_id
    INNER JOIN tournaments t
      ON t.id = e.tournament_id
    INNER JOIN teams tm
      ON tm.id = e.team_id
    ${where}
    ORDER BY p.created_at DESC, p.id DESC
    `,
    params
  );

  return rows;
}

export async function getAdminTeams() {
  const [rows] = await pool.query(
    `
    SELECT
      t.*,
      g.nome AS game_name,
      g.nome_curto AS game_short_name,
      u.nome AS creator_name,
      COUNT(DISTINCT tm.id) AS members_count,
      COUNT(DISTINCT p.id) AS players_count
    FROM teams t
    INNER JOIN games g
      ON g.id = t.game_id
    INNER JOIN users u
      ON u.id = t.creator_id
    LEFT JOIN team_members tm
      ON tm.team_id = t.id
    LEFT JOIN players p
      ON p.team_id = t.id
      AND p.status <> 'inativo'
    GROUP BY
      t.id,
      g.nome,
      g.nome_curto,
      u.nome
    ORDER BY t.created_at DESC, t.id DESC
    `
  );

  return rows;
}

export async function getAdminPlayers(filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.status) {
    clauses.push("p.status = ?");
    params.push(filters.status);
  }

  if (filters.teamId) {
    clauses.push("p.team_id = ?");
    params.push(filters.teamId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `
    SELECT
      p.*,
      t.game_id,
      t.nome AS team_name,
      t.slug AS team_slug,
      g.nome AS game_name
    FROM players p
    INNER JOIN teams t
      ON t.id = p.team_id
    LEFT JOIN games g
      ON g.id = t.game_id
    ${where}
    ORDER BY p.created_at DESC, p.id DESC
    `,
    params
  );

  return rows;
}

function normalizeEntryRow(row) {
  return {
    ...row,
    lineup_size: Number(row.lineup_size ?? 0),
    starters_count: Number(row.starters_count ?? 0),
    payment_amount: row.payment_amount !== null ? Number(row.payment_amount) : null
  };
}
