import pool from "../config/database.js";

export async function getAdminPenalties() {
  const [rows] = await pool.query(
    `
    SELECT
      ap.*,
      p.nick AS player_nick,
      t.nome AS team_name,
      tr.nome AS tournament_name,
      u.nome AS created_by_name,
      ru.nome AS resolved_by_name
    FROM admin_penalties ap
    INNER JOIN players p
      ON p.id = ap.player_id
    INNER JOIN teams t
      ON t.id = p.team_id
    LEFT JOIN tournaments tr
      ON tr.id = ap.tournament_id
    INNER JOIN users u
      ON u.id = ap.created_by
    LEFT JOIN users ru
      ON ru.id = ap.resolved_by
    ORDER BY ap.created_at DESC, ap.id DESC
    `
  );

  return rows;
}

export async function createPenalty(data) {
  const [result] = await pool.query(
    `
    INSERT INTO admin_penalties
    (
      player_id,
      tournament_id,
      type,
      scope,
      status,
      reason,
      evidence,
      duration_days,
      notes,
      created_by
    )
    VALUES
    (
      ?,?,?,?,?,?,?,?,?,?
    )
    `,
    [
      data.player_id,
      data.tournament_id,
      data.type,
      data.scope,
      data.status ?? "ativa",
      data.reason,
      data.evidence ?? null,
      data.duration_days ?? null,
      data.notes ?? null,
      data.created_by
    ]
  );

  return { id: result.insertId, ...data };
}

export async function findPenalty(id) {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM admin_penalties
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0];
}

export async function updatePenalty(id, data) {
  await pool.query(
    `
    UPDATE admin_penalties
    SET
      status = ?,
      notes = ?,
      resolved_by = ?,
      resolved_at = ?
    WHERE id = ?
    `,
    [
      data.status,
      data.notes,
      data.resolved_by,
      data.resolved_at,
      id
    ]
  );
}

export async function getSupportTickets() {
  const [rows] = await pool.query(
    `
    SELECT
      st.*,
      u.nome AS user_name,
      u.email AS user_email,
      au.nome AS assigned_admin_name
    FROM support_tickets st
    LEFT JOIN users u
      ON u.id = st.user_id
    LEFT JOIN users au
      ON au.id = st.assigned_admin_id
    ORDER BY st.created_at DESC, st.id DESC
    `
  );

  if (!rows.length) return [];

  const [messages] = await pool.query(
    `
    SELECT
      stm.*,
      u.nome,
      u.role
    FROM support_ticket_messages stm
    INNER JOIN users u
      ON u.id = stm.user_id
    WHERE stm.ticket_id IN (?)
    ORDER BY stm.created_at ASC, stm.id ASC
    `,
    [rows.map((ticket) => ticket.id)]
  );

  return rows.map((ticket) => ({
    ...ticket,
    messages: messages.filter((message) => Number(message.ticket_id) === Number(ticket.id))
  }));
}

export async function createSupportTicketMessage(ticketId, userId, message) {
  const [result] = await pool.query(
    `INSERT INTO support_ticket_messages (ticket_id, user_id, message) VALUES (?, ?, ?)`,
    [ticketId, userId, message]
  );
  return result.insertId;
}

export async function createSupportTicket(data) {
  const [result] = await pool.query(
    `
    INSERT INTO support_tickets
    (
      user_id,
      category,
      priority,
      status,
      subject,
      message,
      assigned_admin_id
    )
    VALUES
    (
      ?,?,?,?,?,?,?
    )
    `,
    [
      data.user_id ?? null,
      data.category ?? "geral",
      data.priority ?? "media",
      data.status ?? "aberto",
      data.subject,
      data.message,
      data.assigned_admin_id ?? null
    ]
  );

  return { id: result.insertId, ...data };
}

export async function findSupportTicket(id) {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM support_tickets
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0];
}

export async function updateSupportTicket(id, data) {
  await pool.query(
    `
    UPDATE support_tickets
    SET
      status = ?,
      priority = ?,
      response = ?,
      assigned_admin_id = ?
    WHERE id = ?
    `,
    [
      data.status,
      data.priority,
      data.response,
      data.assigned_admin_id,
      id
    ]
  );
}

export async function getDisputes() {
  const [rows] = await pool.query(
    `
    SELECT
      d.*,
      tm.nome AS team_name,
      tr.nome AS tournament_name,
      m.round AS match_round,
      cu.nome AS created_by_name,
      ru.nome AS resolved_by_name
    FROM disputes d
    LEFT JOIN teams tm
      ON tm.id = d.team_id
    LEFT JOIN tournaments tr
      ON tr.id = d.tournament_id
    LEFT JOIN matches m
      ON m.id = d.match_id
    LEFT JOIN users cu
      ON cu.id = d.created_by
    LEFT JOIN users ru
      ON ru.id = d.resolved_by
    ORDER BY d.created_at DESC, d.id DESC
    `
  );

  return rows;
}

export async function createDispute(data) {
  const [result] = await pool.query(
    `
    INSERT INTO disputes
    (
      match_id,
      tournament_id,
      team_id,
      created_by,
      title,
      description,
      evidence,
      status
    )
    VALUES
    (
      ?,?,?,?,?,?,?,?
    )
    `,
    [
      data.match_id ?? null,
      data.tournament_id ?? null,
      data.team_id ?? null,
      data.created_by ?? null,
      data.title,
      data.description,
      data.evidence ?? null,
      data.status ?? "aberta"
    ]
  );

  return { id: result.insertId, ...data };
}

export async function findDispute(id) {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM disputes
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0];
}

export async function updateDispute(id, data) {
  await pool.query(
    `
    UPDATE disputes
    SET
      status = ?,
      resolution_notes = ?,
      resolved_by = ?
    WHERE id = ?
    `,
    [
      data.status,
      data.resolution_notes,
      data.resolved_by,
      id
    ]
  );
}
