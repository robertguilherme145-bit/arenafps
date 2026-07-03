import pool from "../config/database.js";

/**
 * Criar notificação
 */
export async function createNotification({ user_id, titulo, mensagem, tipo, link = null}){

    const [result] = await pool.query(

        `
        INSERT INTO notifications

        (

            user_id,
            titulo,
            mensagem,
            tipo,
            link

        )

        VALUES

        (?,?,?,?,?)
        `,

        [

            user_id,
            titulo,
            mensagem,
            tipo,
            link

        ]

    );

    return {

        id: result.insertId

    };

}

/**
 * Listar notificações
 */
export async function findNotifications(user_id){

    const [rows] = await pool.query(

        `
        SELECT *

        FROM notifications

        WHERE user_id = ?

        ORDER BY created_at DESC
        `,

        [user_id]

    );

    return rows;

}

/**
 * Contar notificações
 */
export async function countNotifications(user_id){

    const [rows] = await pool.query(

        `
        SELECT

            COUNT(*) AS total,

            SUM(
                CASE
                    WHEN lida = 0
                    THEN 1
                    ELSE 0
                END
            ) AS unread

        FROM notifications

        WHERE user_id = ?
        `,

        [user_id]);

    return rows[0];

}