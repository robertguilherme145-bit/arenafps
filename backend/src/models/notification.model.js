import pool from "../config/database.js";

/**
 * Criar notificação
 */
export async function createNotification({ user_id, titulo, mensagem, tipo, link = null, dedupe_key = null}){

    const [result] = await pool.query(

        `
        INSERT INTO notifications

        (

            user_id,
            titulo,
            mensagem,
            tipo,
            link,
            dedupe_key

        )

        VALUES

        (?,?,?,?,?,?)

        ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
        `,

        [

            user_id,
            titulo,
            mensagem,
            tipo,
            link,
            dedupe_key

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

export async function markNotificationRead(userId, notificationId) {
    const [result] = await pool.query(`UPDATE notifications SET lida=1 WHERE id=? AND user_id=?`, [notificationId, userId]);
    return result.affectedRows > 0;
}

export async function markAllNotificationsRead(userId) {
    await pool.query(`UPDATE notifications SET lida=1 WHERE user_id=?`, [userId]);
}

export async function deleteNotification(userId, notificationId) {
    const [result] = await pool.query(`DELETE FROM notifications WHERE id=? AND user_id=?`, [notificationId, userId]);
    return result.affectedRows > 0;
}

export async function clearNotifications(userId) {
    await pool.query(`DELETE FROM notifications WHERE user_id=?`, [userId]);
}
