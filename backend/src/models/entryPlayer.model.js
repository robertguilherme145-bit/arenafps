import pool from "../config/database.js";

/**
 * Adiciona um jogador à inscrição
 */
export async function addPlayerToEntry({

  entry_id,

  player_id,

  titular,

  ordem,

  confirmado = true

}){

  const [result] = await pool.query(

    `
    INSERT INTO entry_players
    (

      entry_id,

      player_id,

      titular,

      ordem,

      confirmado

    )

    VALUES

    (

      ?,?,?,?,?

    )
    `,

    [

      entry_id,

      player_id,

      titular,

      ordem,

      confirmado

    ]

  );

  return {

    id: result.insertId,

    entry_id,

    player_id,

    titular,

    ordem,

    confirmado

  };

}

/**
 * Lista jogadores da inscrição
 */
export async function getEntryPlayers(entry_id){

  const [rows] = await pool.query(

    `
    SELECT

      ep.*,

      p.nick,

      p.game,

      p.game_uid

    FROM entry_players ep

    INNER JOIN players p

      ON p.id = ep.player_id

    WHERE ep.entry_id = ?

    ORDER BY

      ep.titular DESC,

      ep.ordem ASC

    `,

    [

      entry_id

    ]

  );

  return rows;

}

/**
 * Remove jogador da inscrição
 */
export async function removeEntryPlayer(

  entry_id,

  player_id

){

  await pool.query(

    `
    DELETE

    FROM entry_players

    WHERE entry_id = ?

    AND player_id = ?

    `,

    [

      entry_id,

      player_id

    ]

  );

}

/**
 * Remove todos os jogadores da inscrição
 */
export async function clearEntryPlayers(
    entry_id,
    connection
){

    await connection.query(

        `
        DELETE
        FROM entry_players
        WHERE entry_id = ?
        `,

        [

            entry_id

        ]

    );

}

/**
 * Adiciona jogador utilizando transação
 */
export async function addPlayerTransaction(

    connection,

    {

        entry_id,

        player_id,

        titular,

        ordem,

        confirmado=true

    }

){

    await connection.query(

        `
        INSERT INTO entry_players
        (

            entry_id,

            player_id,

            titular,

            ordem,

            confirmado

        )

        VALUES

        (

            ?,?,?,?,?

        )
        `,

        [

            entry_id,

            player_id,

            titular,

            ordem,

            confirmado

        ]

    );

}