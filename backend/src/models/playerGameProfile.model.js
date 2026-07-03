import pool from "../config/database.js";

/**
 * Buscar todos os jogos do jogador
 */
export async function findProfiles(user_id){

    const [rows] = await pool.query(

        `
        SELECT

            pgp.id,
            pgp.game_id,
            pgp.nickname,
            pgp.game_player_id,
            pgp.rank_name,
            pgp.elo,
            pgp.level,

            g.nome,
            g.nome_curto

        FROM player_game_profiles pgp

        INNER JOIN games g

            ON g.id = pgp.game_id

        WHERE pgp.user_id = ?

        ORDER BY g.nome ASC
        `,

        [

            user_id

        ]

    );

    return rows;

}

/**
 * Buscar perfil por jogo
 */
export async function findProfileByGame(user_id, game_id){

    const [rows] = await pool.query(

        `
        SELECT *

        FROM player_game_profiles

        WHERE user_id = ?

        AND game_id = ?

        LIMIT 1
        `,

        [

            user_id,

            game_id

        ]

    );

    return rows[0];

}

/**
 * Criar perfil do jogo
 */
export async function createProfile({

    user_id,
    game_id,
    nickname,
    game_player_id,
    rank_name = null,
    elo = null,
    level = null
}){

    const [result] = await pool.query(

        `
        INSERT INTO player_game_profiles

        (

            user_id,
            game_id,
            nickname,
            game_player_id,
            rank_name,
            elo,
            level

        )

        VALUES

        (?,?,?,?,?,?,?)
        `,

        [

            user_id,
            game_id,
            nickname,
            game_player_id,
            rank_name,
            elo,
            level

        ]

    );

    return{

        id: result.insertId,

        user_id,

        game_id

    };

}