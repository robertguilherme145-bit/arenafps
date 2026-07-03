import pool from "../config/database.js";

/**
 * Criar jogador
 */
export async function createPlayer({
  team_id,
  nick,
  game,
  game_uid,
  foto = null
}) {

  const [result] = await pool.query(
    `
    INSERT INTO players
    (
      team_id,
      nick,
      game,
      game_uid,
      foto
    )
    VALUES
    (
      ?,?,?,?,?
    )
    `,
    [
      team_id,
      nick,
      game,
      game_uid,
      foto
    ]
  );

  return {
    id: result.insertId,
    team_id,
    nick,
    game,
    game_uid,
    foto
  };

}

/**
 * Buscar jogador por ID
 */
export async function findPlayer(id){

  const [rows] = await pool.query(

    `
    SELECT *
    FROM players
    WHERE id = ?
    LIMIT 1
    `,

    [id]

  );

  return rows[0];

}

/**
 * Buscar jogador pelo jogo + UID
 */
export async function findPlayerByGame(game, game_uid){

  const [rows] = await pool.query(

    `
    SELECT *
    FROM players
    WHERE game = ?
    AND game_uid = ?
    LIMIT 1
    `,

    [
      game,
      game_uid
    ]

  );

  return rows[0];

}

/**
 * Buscar jogadores do clã
 */
export async function ggetPlayersByTeam(team_id){

  const [rows] = await pool.query(

    `
    SELECT *
    FROM players
    WHERE team_id = ?
    AND status = 'ativo'
    ORDER BY nick
    `,

    [team_id]

  );

  return rows;

}

/**
 * Atualizar jogador
 */
export async function updatePlayer(id, data){

  await pool.query(

    `
    UPDATE players
    SET

      nick = ?,

      game = ?,

      game_uid = ?,

      foto = ?

    WHERE id = ?
    `,

    [

      data.nick,

      data.game,

      data.game_uid,

      data.foto,

      id

    ]

  );

}

/**
 * Inativar jogador
 */
export async function deactivatePlayer(id){

  await pool.query(

    `
    UPDATE players
    SET status = 'inativo'
    WHERE id = ?
    `,

    [id]

  );

}

/**
 * Busca jogador pelo ID e pelo clã
 */
export async function findPlayerByIdAndTeam(id, team_id){

  const [rows] = await pool.query(

    `
    SELECT *
    FROM players
    WHERE id = ?
    AND team_id = ?
    LIMIT 1
    `,

    [
      id,
      team_id
    ]

  );

  return rows[0];

}

/**
 * Busca vários jogadores por IDs
 */
export async function findPlayersByIds(ids){

  if(ids.length === 0){

    return [];

  }

  const placeholders = ids.map(() => "?").join(",");

  const [rows] = await pool.query(

    `
    SELECT *
    FROM players
    WHERE id IN (${placeholders})
    `,

    ids

  );

  return rows;

}