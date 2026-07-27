import pool from "../config/database.js";

export async function createAuditLog({
  actor_user_id,
  action,
  entity_type,
  entity_id = null,
  details = null
}) {
  const [result] = await pool.query(
    `
    INSERT INTO audit_logs
    (
      actor_user_id,
      action,
      entity_type,
      entity_id,
      details
    )
    VALUES
    (
      ?,?,?,?,?
    )
    `,
    [
      actor_user_id,
      action,
      entity_type,
      entity_id,
      details ? JSON.stringify(details) : null
    ]
  );

  return {
    id: result.insertId,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    details
  };
}

export async function findAuditLogs(limit = 50) {
  const [rows] = await pool.query(
    `
    SELECT
      al.*,
      u.nome AS actor_name,
      u.email AS actor_email
    FROM audit_logs al
    LEFT JOIN users u
      ON u.id = al.actor_user_id
    ORDER BY al.created_at DESC, al.id DESC
    LIMIT ?
    `,
    [limit]
  );

  return rows.map((row) => ({
    ...row,
    details: row.details ? safeJsonParse(row.details) : null
  }));
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
