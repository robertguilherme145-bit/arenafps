import pool from "../config/database.js";

/**
 * Criar partida
 */
export async function createMatch({tournament_id, round, team_a_id, team_b_id, scheduled_at = null}){

    const [result] = await pool.query(

        `
        INSERT INTO matches
        (

            tournament_id,
            round,
            team_a_id,
            team_b_id,
            scheduled_at

        )

        VALUES

        (?,?,?,?,?)
        `,

        [

            tournament_id,
            round,
            team_a_id,
            team_b_id,
            scheduled_at

        ]

    );

    return{id: result.insertId, tournament_id, round};

}

/**
 * Buscar partida
 */
export async function findMatch(id){

    const [rows] = await pool.query(

        `
        SELECT *

        FROM matches

        WHERE id = ?

        LIMIT 1
        `,

        [

            id

        ]

    );

    return rows[0];

}

/**
 * Listar partidas do torneio
 */
export async function findTournamentMatches(tournament_id){

    const [rows] = await pool.query(

        `
        SELECT

            m.*,

            ta.nome AS team_a,

            tb.nome AS team_b,

            tw.nome AS winner

        FROM matches m

        INNER JOIN teams ta

            ON ta.id = m.team_a_id

        INNER JOIN teams tb

            ON tb.id = m.team_b_id

        LEFT JOIN teams tw

            ON tw.id = m.winner_team_id

        WHERE m.tournament_id = ?

        ORDER BY

            round ASC,

            id ASC
        `,

        [

            tournament_id

        ]

    );

    return rows;

}

/**
 * Finalizar partida
 */
export async function finishMatch( id, winner_team_id, score_team_a, score_team_b){

    await pool.query(

        `
        UPDATE matches

        SET

            winner_team_id = ?,

            score_team_a = ?,

            score_team_b = ?,

            status = 'finalizada',

            finished_at = NOW()

        WHERE id = ?
        `,

        [

            winner_team_id,

            score_team_a,

            score_team_b,

            id

        ]

    );

}