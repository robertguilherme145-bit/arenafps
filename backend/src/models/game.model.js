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
        WHERE ativo = 1
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

export async function findActiveGameMaps(gameId){
    const [rows] = await pool.query(
        `SELECT id,game_id,nome,slug,imagem,ordem FROM game_maps WHERE game_id = ? AND ativo = 1 ORDER BY ordem ASC,nome ASC,id ASC`,
        [gameId]
    );
    return rows;
}

export async function countActiveGames(){
    const [[row]] = await pool.query(`SELECT COUNT(*) AS total FROM games WHERE ativo = 1`);
    return Number(row.total);
}

export async function updateGame(id, data){

    await pool.query(
        `
        UPDATE games
        SET
            nome = ?,
            nome_curto = ?,
            slug = ?,
            descricao = ?,
            logo = ?,
            banner = ?,
            cor_primaria = ?,
            ativo = ?
        WHERE id = ?
        `,
        [
            data.nome,
            data.nome_curto,
            data.slug,
            data.descricao,
            data.logo,
            data.banner,
            data.cor_primaria,
            data.ativo,
            id
        ]
    );

}
