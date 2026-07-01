import pool from "../config/database.js";

/**
 * Cria um jogador
 */
export async function createPlayer({
  clan_id,
  nick,
  game_id,
  foto = null
}) {

  const [result] = await pool.query(
    `
    INSERT INTO players
    (
      clan_id,
      nick,
      game_id,
      foto
    )
    VALUES
    (
      ?,?,?,?
    )
    `,
    [
      clan_id,
      nick,
      game_id,
      foto
    ]
  );

  return {
    id: result.insertId,
    clan_id,
    nick,
    game_id,
    foto
  };

}

/**
 * Lista jogadores de um clã
 */
export async function getPlayersByClan(clan_id){

  const [rows] = await pool.query(

    `
    SELECT *
    FROM players
    WHERE clan_id = ?
    ORDER BY nick
    `,

    [clan_id]

  );

  return rows;

}

/**
 * Busca jogador
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
 * Procura jogador pelo ID do jogo
 */
export async function findPlayerByGameId(game_id){

  const [rows] = await pool.query(

    `
    SELECT *
    FROM players
    WHERE game_id = ?
    LIMIT 1
    `,

    [game_id]

  );

  return rows[0];

}