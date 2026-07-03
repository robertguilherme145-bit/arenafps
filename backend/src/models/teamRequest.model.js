import pool from "../config/database.js";

/**
 * Criar solicitação
 */
export async function createRequest({team_id, user_id, tipo, created_by = null}){

    const [result] = await pool.query(

        `
        INSERT INTO team_requests
        (

            team_id,
            user_id,
            tipo,
            created_by

        )

        VALUES

        (

            ?,?,?,?

        )
        `,

        [

            team_id,
            user_id,
            tipo,
            created_by

        ]

    );

    return {

        id: result.insertId,

        team_id,
        user_id,
        tipo,
        status: "pending",
        created_by

    };

}

/**
 * Buscar solicitação pendente
 */
export async function findPendingRequest(team_id, user_id, tipo){

    const [rows] = await pool.query(

        `
        SELECT *

        FROM team_requests

        WHERE team_id = ?

        AND user_id = ?

        AND tipo = ?

        AND status = 'pending'

        LIMIT 1
        `,

        [

            team_id,

            user_id,

            tipo

        ]

    );

    return rows[0];

}

/**
 * Listar solicitações pendentes
 */
export async function getPendingRequests(team_id){

    const [rows] = await pool.query(

        `
        SELECT

            tr.id,
            tr.team_id,
            tr.user_id,
            tr.tipo,
            tr.status,
            tr.created_at,

            u.nome,
            u.email

        FROM team_requests tr

        INNER JOIN users u
            ON u.id = tr.user_id

        WHERE tr.team_id = ?

        AND tr.status = 'pending'

        ORDER BY tr.created_at ASC
        `,

        [

            team_id

        ]

    );

    return rows;

}

/**
 * Buscar solicitação
 */
export async function findRequest(id){

    const [rows] = await pool.query(

        `
        SELECT *
        FROM team_requests
        WHERE id = ?
        LIMIT 1
        `,

        [id]

    );

    return rows[0];

}

/**
 * Atualizar status da solicitação
 */
export async function updateRequestStatus(id, status, connection = pool){

    await connection.query(
        `
        UPDATE team_requests
        SET status = ?
        WHERE id = ?`, [status, id]);

}