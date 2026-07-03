import pool from "../config/database.js";

/**
 * Criar equipe + líder
 */
export async function createTeam({

    game_id,
    creator_id,
    nome,
    tag = null,
    slug,
    logo = null,
    banner = null,
    descricao = null,
    discord = null,
    instagram = null,
    youtube = null,
    twitch = null,
    tiktok = null,
    website = null,
    recrutando = true,
    privada = false

}){

    const connection = await pool.getConnection();

    try{

        await connection.beginTransaction();

        const [team] = await connection.query(

            `
            INSERT INTO teams
            (

                game_id,
                creator_id,
                nome,
                tag,
                slug,
                logo,
                banner,
                descricao,
                discord,
                instagram,
                youtube,
                twitch,
                tiktok,
                website,
                recrutando,
                privada

            )

            VALUES

            (

                ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?

            )
            `,

            [

                game_id,
                creator_id,
                nome,
                tag,
                slug,
                logo,
                banner,
                descricao,
                discord,
                instagram,
                youtube,
                twitch,
                tiktok,
                website,
                recrutando,
                privada

            ]

        );

        await connection.query(

            `
            INSERT INTO team_members
            (

                team_id,
                user_id,
                cargo,
                status

            )

            VALUES

            (

                ?,?, 'leader', 'active'

            )
            `,

            [

                team.insertId,
                creator_id

            ]

        );

        await connection.commit();

        return {

            id: team.insertId,

            game_id,
            creator_id,
            nome,
            tag,
            slug

        };

    }

    catch(err){

        await connection.rollback();

        throw err;

    }

    finally{

        connection.release();

    }

}

/**
 * Buscar equipe
 */
export async function findTeam(id){

    const [rows] = await pool.query(

        `
        SELECT *
        FROM teams
        WHERE id = ?
        LIMIT 1
        `,

        [id]

    );

    return rows[0];

}

/**
 * Buscar equipe pelo slug
 */
export async function findTeamBySlug(slug){

    const [rows] = await pool.query(

        `
        SELECT *
        FROM teams
        WHERE slug = ?
        LIMIT 1
        `,

        [slug]

    );

    return rows[0];

}

/**
 * Verifica se já existe equipe com este nome no jogo
 */
export async function findTeamByGameAndName(game_id, nome){

    const [rows] = await pool.query(

        `
        SELECT *
        FROM teams
        WHERE game_id = ?
        AND nome = ?
        LIMIT 1
        `,

        [

            game_id,

            nome

        ]

    );

    return rows[0];

}

/**
 * Verifica se o usuário já lidera uma equipe neste jogo
 */
export async function findLeaderByGame(user_id, game_id){

    const [rows] = await pool.query(

        `
        SELECT tm.*

        FROM team_members tm

        INNER JOIN teams t
            ON t.id = tm.team_id

        WHERE tm.user_id = ?

        AND tm.cargo = 'leader'

        AND tm.status = 'active'

        AND t.game_id = ?

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
 * Verifica se o usuário é líder da equipe
 */
export async function isLeader(user_id, team_id){

    const [rows] = await pool.query(

        `
        SELECT id

        FROM team_members

        WHERE user_id = ?

        AND team_id = ?

        AND cargo = 'leader'

        LIMIT 1
        `,

        [

            user_id,

            team_id

        ]

    );

    return !!rows.length;

}

/**
 * Adicionar membro na equipe
 */
export async function addMember({team_id, user_id, cargo = "player"}, connection = pool){

    const [result] = await connection.query(

        `
        INSERT INTO team_members
        (team_id, user_id, cargo)

        VALUES

        (?,?,?)`,

        [team_id, user_id, cargo]

    );

    return {id: result.insertId,team_id, user_id, cargo};

}

/**
 * Verifica se o usuário já é membro da equipe
 */
export async function isMember(user_id, team_id){

    const [rows] = await pool.query(

        `
        SELECT id

        FROM team_members

        WHERE user_id = ?

        AND team_id = ?

        LIMIT 1`,[user_id, team_id]);

    return !!rows.length;

}

/**
 * Listar membros da equipe
 */
export async function getMembers(team_id){

    const [rows] = await pool.query(

        `
        SELECT

            tm.id,
            tm.user_id,
            tm.cargo,

            u.nome,
            u.email

        FROM team_members tm

        INNER JOIN users u

            ON u.id = tm.user_id

        WHERE tm.team_id = ?

        ORDER BY

            FIELD(

                tm.cargo,

                'leader',

                'captain',

                'player'

            ),

            u.nome ASC
        `,

        [

            team_id

        ]

    );

    return rows;

}

/**
 * Buscar equipe do usuário
 */
export async function findUserTeam(user_id){

    const [rows] = await pool.query(

        `
        SELECT

            t.id,
            t.game_id,
            t.nome,
            t.tag,
            t.slug,

            tm.cargo,

            g.nome_curto AS game

        FROM team_members tm

        INNER JOIN teams t
            ON t.id = tm.team_id

        INNER JOIN games g
            ON g.id = t.game_id

        WHERE tm.user_id = ?

        LIMIT 1
        `,

        [

            user_id

        ]

    );

    return rows[0];

}

/**
 * Buscar equipes do usuário
 */
export async function findUserTeams(user_id){

    const [rows] = await pool.query(

        `
        SELECT

            t.id,
            t.game_id,
            t.nome,
            t.tag,
            t.slug,

            tm.cargo,

            g.nome_curto AS game

        FROM team_members tm

        INNER JOIN teams t

            ON t.id = tm.team_id

        INNER JOIN games g

            ON g.id = t.game_id

        WHERE tm.user_id = ?

        ORDER BY g.nome_curto ASC
        `,

        [

            user_id

        ]

    );

    return rows;

}

/**
 * Buscar detalhes da equipe
 */
export async function getTeamDetails(id){

    const [rows] = await pool.query(

        `
        SELECT

            t.*,

            g.nome AS game,

            COUNT(tm.id) AS total_membros

        FROM teams t

        INNER JOIN games g

            ON g.id = t.game_id

        LEFT JOIN team_members tm

            ON tm.team_id = t.id

        WHERE t.id = ?

        GROUP BY t.id
        `,

        [

            id

        ]

    );

    return rows[0];

}

/**
 * Atualizar cargo do membro
 */
export async function updateMemberRole( id, cargo, connection = pool){

    await connection.query(

        `
        UPDATE team_members
        SET cargo = ?
        WHERE id = ?
        `,

        [

            cargo,

            id

        ]

    );

}

/**
 * Buscar membro da equipe
 */
export async function findMember(id){

    const [rows] = await pool.query(

        `
        SELECT *

        FROM team_members

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
 * Buscar capitão da equipe
 */
export async function findCaptain(team_id){

    const [rows] = await pool.query(

        `
        SELECT *

        FROM team_members

        WHERE team_id = ?

        AND cargo = 'captain'

        LIMIT 1
        `,

        [

            team_id

        ]

    );

    return rows[0];

}

/**
 * Buscar líder da equipe
 */
export async function findLeader(team_id){

    const [rows] = await pool.query(

        `
        SELECT *

        FROM team_members

        WHERE team_id = ?

        AND cargo = 'leader'

        LIMIT 1
        `,

        [

            team_id

        ]

    );

    return rows[0];

}

/**
 * Atualizar cargo pelo usuário
 */
export async function updateMemberRoleByUser( team_id, user_id, cargo, connection = pool){

    await connection.query(

        `
        UPDATE team_members

        SET cargo = ?

        WHERE team_id = ?

        AND user_id = ?
        `,

        [

            cargo,

            team_id,

            user_id

        ]

    );

}

/**
 * Remover membro
 */
export async function removeMember(id, connection = pool){

    await connection.query(

        `
        DELETE FROM team_members

        WHERE id = ?
        `,

        [

            id

        ]

    );

}