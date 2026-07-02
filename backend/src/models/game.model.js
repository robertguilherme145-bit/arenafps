import pool from "../config/database.js";

/**
 * Criar Game
 */
export async function createGame({

    nome,
    nome_curto,
    slug,
    descricao = null,
    logo = null,
    banner = null,
    cor_primaria = null

}){

    const [result] = await pool.query(

        `
        INSERT INTO games
        (

            nome,
            nome_curto,
            slug,
            descricao,
            logo,
            banner,
            cor_primaria

        )

        VALUES

        (

            ?,?,?,?,?,?,?

        )
        `,

        [

            nome,
            nome_curto,
            slug,
            descricao,
            logo,
            banner,
            cor_primaria

        ]

    );

    return {

        id: result.insertId,

        nome,
        nome_curto,
        slug,
        descricao,
        logo,
        banner,
        cor_primaria,
        ativo: true

    };

}

/**
 * Listar Games
 */
export async function getGames(){

    const [rows] = await pool.query(

        `
        SELECT *
        FROM games
        ORDER BY nome ASC
        `

    );

    return rows;

}

/**
 * Buscar Game
 */
export async function findGame(id){

    const [rows] = await pool.query(

        `
        SELECT *
        FROM games
        WHERE id = ?
        LIMIT 1
        `,

        [id]

    );

    return rows[0];

}

/**
 * Buscar por Slug
 */
export async function findGameBySlug(slug){

    const [rows] = await pool.query(

        `
        SELECT *
        FROM games
        WHERE slug = ?
        LIMIT 1
        `,

        [slug]

    );

    return rows[0];

}