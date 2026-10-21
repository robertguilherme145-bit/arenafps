import pool from "../config/database.js";

export async function findSetting(key) {
  const [[row]] = await pool.query("SELECT setting_value, updated_at FROM platform_settings WHERE setting_key = ? LIMIT 1", [key]);
  if (!row) return null;
  try { return { value:JSON.parse(row.setting_value), updated_at:row.updated_at }; }
  catch { return null; }
}

export async function saveSetting(key, value, userId) {
  await pool.query(
    `INSERT INTO platform_settings (setting_key, setting_value, updated_by) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
    [key, JSON.stringify(value), userId ?? null]
  );
}
