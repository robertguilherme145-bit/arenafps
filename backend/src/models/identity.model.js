import pool from "../config/database.js";

export async function findIdentityAccount(userId) {
  const [[account]] = await pool.query(`SELECT id,nome,email,nickname,avatar,role,email_verified_at,onboarding_completed_at FROM users WHERE id=? LIMIT 1`, [userId]);
  return account ?? null;
}

export async function findGlobalRoles(userId) {
  const [rows] = await pool.query(`SELECT role FROM user_roles WHERE user_id=? ORDER BY role`, [userId]);
  return rows.map((row) => row.role);
}

export async function findTeamContexts(userId) {
  const [rows] = await pool.query(`
    SELECT tm.team_id,tm.cargo,tm.lineup_status,t.nome AS team_name,t.slug AS team_slug,t.logo AS team_logo,
      t.game_id,g.nome AS game_name,g.nome_curto AS game_short_name
    FROM team_members tm INNER JOIN teams t ON t.id=tm.team_id INNER JOIN games g ON g.id=t.game_id
    WHERE tm.user_id=? AND tm.status='ativo' AND t.ativo=1
    ORDER BY g.nome,t.nome
  `, [userId]);
  return rows;
}

export async function findOrganizationContexts(userId) {
  const [rows] = await pool.query(`SELECT o.id AS organization_id,o.name AS organization_name,o.slug AS organization_slug,om.role FROM organization_members om INNER JOIN organizations o ON o.id=om.organization_id WHERE om.user_id=? AND om.status='ativo' AND o.active=1 ORDER BY o.name`, [userId]);
  return rows;
}

export async function findSelectedGames(userId) {
  const [rows] = await pool.query(`SELECT g.id,g.nome,g.nome_curto,g.slug,g.logo,g.cor_primaria,ug.is_primary,pgp.nickname,pgp.game_player_id,pgp.rank_name,pgp.elo,pgp.level FROM user_games ug INNER JOIN games g ON g.id=ug.game_id LEFT JOIN player_game_profiles pgp ON pgp.user_id=ug.user_id AND pgp.game_id=ug.game_id WHERE ug.user_id=? AND g.ativo=1 ORDER BY ug.is_primary DESC,g.nome`, [userId]);
  return rows;
}

export async function findContextPreference(userId) {
  const [[row]] = await pool.query(`SELECT * FROM user_context_preferences WHERE user_id=? LIMIT 1`, [userId]);
  return row ?? null;
}

export async function saveContextPreference(userId, context) {
  await pool.query(`INSERT INTO user_context_preferences (user_id,active_role,active_game_id,active_team_id) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE active_role=VALUES(active_role),active_game_id=VALUES(active_game_id),active_team_id=VALUES(active_team_id)`, [userId, context.active_role, context.active_game_id, context.active_team_id]);
}

export async function replaceSelectedGames(userId, gameIds, primaryGameId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`DELETE FROM user_games WHERE user_id=?`, [userId]);
    for (const gameId of gameIds) await connection.query(`INSERT INTO user_games (user_id,game_id,is_primary) SELECT ?,id,? FROM games WHERE id=? AND ativo=1`, [userId, Number(gameId) === Number(primaryGameId) ? 1 : 0, gameId]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

export async function grantUserRole(userId, role, grantedBy = null) {
  await pool.query(`INSERT IGNORE INTO user_roles (user_id,role,granted_by) VALUES (?,?,?)`, [userId, role, grantedBy]);
}

export async function revokeUserRole(userId, role) {
  await pool.query(`DELETE FROM user_roles WHERE user_id=? AND role=?`, [userId, role]);
}

export async function createOrganizationForUser(userId, input) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(`INSERT INTO organizations (owner_user_id,name,slug,description) VALUES (?,?,?,?)`, [userId, input.name, input.slug, input.description]);
    await connection.query(`INSERT INTO organization_members (organization_id,user_id,role) VALUES (?,?,'organizador')`, [result.insertId, userId]);
    await connection.query(`INSERT IGNORE INTO user_roles (user_id,role) VALUES (?,'organizador')`, [userId]);
    await connection.commit();
    return Number(result.insertId);
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

export async function listIdentityAccounts() {
  const [rows] = await pool.query(`
    SELECT u.id,u.nome,u.email,u.nickname,u.avatar,u.email_verified_at,u.onboarding_completed_at,
      GROUP_CONCAT(DISTINCT ur.role ORDER BY ur.role) roles,
      GROUP_CONCAT(DISTINCT ug.game_id ORDER BY ug.is_primary DESC,ug.game_id) game_ids,
      GROUP_CONCAT(DISTINCT CONCAT(tm.team_id,':',tm.cargo) ORDER BY tm.team_id) team_roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id=u.id
    LEFT JOIN user_games ug ON ug.user_id=u.id
    LEFT JOIN team_members tm ON tm.user_id=u.id AND tm.status='ativo'
    GROUP BY u.id ORDER BY u.created_at DESC,u.id DESC
  `);
  return rows;
}

export async function replaceUserRoles(userId, roles, grantedBy) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`DELETE FROM user_roles WHERE user_id=?`, [userId]);
    for (const role of roles) await connection.query(`INSERT INTO user_roles (user_id,role,granted_by) VALUES (?,?,?)`, [userId,role,grantedBy]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
