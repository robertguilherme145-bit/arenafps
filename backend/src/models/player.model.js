import pool from "../config/database.js";

/**
 * Criar jogador
 */
export async function createPlayer({
  clan_id,
  nick,
  game,
  game_uid,
  foto = null
}) {

  const [result] = await pool.query(
    `
    INSERT INTO players
    (
      clan_id,
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
      clan_id,
      nick,
      game,
      game_uid,
      foto
    ]
  );

  return {
    id: result.insertId,
    clan_id,
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
export async function getPlayersByClan(clan_id){

  const [rows] = await pool.query(

    `
    SELECT *
    FROM players
    WHERE clan_id = ?
    AND status = 'ativo'
    ORDER BY nick
    `,

    [clan_id]

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