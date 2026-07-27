import fs from "node:fs/promises";
import path from "node:path";
import pool from "../src/config/database.js";

const adminId = Number(process.env.PRESERVE_ADMIN_ID || 1);
const preservedTables = new Set(["games", "game_maps", "game_settings", "achievement_definitions", "public_content", "platform_migrations"]);
const preservedAdminTables = new Set(["users", "user_roles", "user_context_preferences", "user_games", "user_preferences", "player_links", "user_two_factor"]);
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDirectory = path.resolve("backups", `before-test-reset-${timestamp}`);
const connection = await pool.getConnection();

try {
  const [[admin]] = await connection.query(`SELECT id,email,nome FROM users WHERE id=? AND (role='admin' OR EXISTS (SELECT 1 FROM user_roles WHERE user_id=users.id AND role='admin'))`, [adminId]);
  if (!admin) throw new Error(`Administrador #${adminId} nao encontrado. Limpeza cancelada.`);

  const [tables] = await connection.query(`SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME`);
  await fs.mkdir(backupDirectory, { recursive:true });
  const manifest = { created_at:new Date().toISOString(), database:process.env.DB_NAME, preserved_admin:{ id:admin.id, email:admin.email }, tables:{} };
  for (const { TABLE_NAME:table } of tables) {
    const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
    manifest.tables[table] = rows.length;
    await fs.writeFile(path.join(backupDirectory, `${table}.json`), JSON.stringify(rows, jsonReplacer, 2));
  }
  await fs.writeFile(path.join(backupDirectory, "manifest.json"), JSON.stringify(manifest, null, 2));

  await connection.beginTransaction();
  await connection.query(`SET FOREIGN_KEY_CHECKS=0`);
  for (const { TABLE_NAME:table } of tables) {
    if (preservedTables.has(table)) continue;
    if (preservedAdminTables.has(table)) {
      await connection.query(`DELETE FROM \`${table}\` WHERE user_id<>? OR user_id IS NULL`, [adminId]).catch(async (error) => {
        if (error.code !== "ER_BAD_FIELD_ERROR") throw error;
        await connection.query(`DELETE FROM \`${table}\` WHERE id<>?`, [adminId]);
      });
      continue;
    }
    await connection.query(`DELETE FROM \`${table}\``);
  }
  await connection.query(`DELETE FROM users WHERE id<>?`, [adminId]);
  await connection.query(`INSERT IGNORE INTO user_roles (user_id,role) VALUES (?,'admin')`, [adminId]);
  await connection.query(`UPDATE users SET role='admin',email_verified_at=COALESCE(email_verified_at,NOW()),onboarding_completed_at=COALESCE(onboarding_completed_at,NOW()) WHERE id=?`, [adminId]);
  await connection.query(`UPDATE user_context_preferences SET active_role='admin',active_team_id=NULL WHERE user_id=?`, [adminId]);
  await connection.query(`SET FOREIGN_KEY_CHECKS=1`);
  await connection.commit();

  for (const { TABLE_NAME:table } of tables) {
    if (preservedTables.has(table) || preservedAdminTables.has(table)) continue;
    await connection.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT=1`).catch(() => undefined);
  }
  await connection.query(`ALTER TABLE users AUTO_INCREMENT=?`, [adminId + 1]).catch(() => undefined);

  const summary = {};
  for (const table of ["users", "teams", "tournaments", "entries", "payments", "matches", "notifications", "audit_logs", "games", "game_maps", "achievement_definitions", "public_content"]) {
    const [[row]] = await connection.query(`SELECT COUNT(*) total FROM \`${table}\``);
    summary[table] = Number(row.total);
  }
  console.log(JSON.stringify({ backup:backupDirectory, preserved_admin:{ id:admin.id, email:admin.email }, summary }, null, 2));
} catch (error) {
  await connection.rollback().catch(() => undefined);
  throw error;
} finally {
  connection.release();
  await pool.end();
}

function jsonReplacer(_key, value) {
  if (typeof value === "bigint") return value.toString();
  if (Buffer.isBuffer(value)) return { type:"Buffer", data:value.toString("base64") };
  return value;
}
