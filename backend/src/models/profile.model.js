import pool from "../config/database.js";

/**
 * Buscar perfil
 */
export async function findProfile(user_id){

    const [rows] = await pool.query(

        `
        SELECT

            id,
            nome,
            email,
            nickname,
            avatar,
            bio,
            pais,
            estado,
            cidade,
            discord,
            role,
            created_at

        FROM users

        WHERE id = ?

        LIMIT 1
        `,

        [

            user_id

        ]

    );

    return rows[0];

}

/**
 * Atualizar perfil
 */
export async function updateProfile(user_id, dados){

    await pool.query(

        `
        UPDATE users

        SET

            nickname = ?,
            avatar = ?,
            bio = ?,
            pais = ?,
            estado = ?,
            cidade = ?,
            discord = ?

        WHERE id = ?
        `,

        [

            dados.nickname,
            dados.avatar,
            dados.bio,
            dados.pais,
            dados.estado,
            dados.cidade,
            dados.discord,

            user_id

        ]

    );

}