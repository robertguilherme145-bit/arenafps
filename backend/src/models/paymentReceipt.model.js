import pool from "../config/database.js";

export async function createReceipt({ token, userId, mimeType, size, data }) {
  await pool.query("INSERT INTO payment_receipts (token, user_id, mime_type, file_size, file_data) VALUES (?, ?, ?, ?, ?)", [token, userId, mimeType, size, data]);
}

export async function findReceipt(token) {
  const [[row]] = await pool.query("SELECT token, user_id, mime_type, file_size, file_data FROM payment_receipts WHERE token = ? LIMIT 1", [token]);
  return row ?? null;
}

export async function findReceiptOwner(token) {
  const [[row]] = await pool.query("SELECT user_id FROM payment_receipts WHERE token = ? LIMIT 1", [token]);
  return row ? Number(row.user_id) : null;
}
