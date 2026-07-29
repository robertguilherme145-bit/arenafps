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

/**
 * Substituir estatisticas dos jogadores da partida
 */
export async function replaceMatchPlayerStats(match_id, playerStats = []){

    const connection = await pool.getConnection();

    try{

        await connection.beginTransaction();

        const [mapStats] = await connection.query(
            `SELECT id FROM match_map_player_stats WHERE match_id = ? LIMIT 1`,
            [match_id]
        );

        if(mapStats.length){
            throw new Error("Esta partida usa sumulas por mapa e nao aceita mais um total manual.");
        }

        await connection.query(
            `
            DELETE FROM match_player_stats
            WHERE match_id = ?
            `,
            [match_id]
        );

        for(const stat of playerStats){

            await connection.query(
                `
                INSERT INTO match_player_stats
                (
                    match_id,
                    player_id,
                    team_id,
                    kills,
                    deaths,
                    assists,
                    headshots,
                    mvp
                )
                VALUES
                (?,?,?,?,?,?,?,?)
                `,
                [
                    match_id,
                    stat.player_id,
                    stat.team_id,
                    stat.kills ?? 0,
                    stat.deaths ?? 0,
                    stat.assists ?? 0,
                    stat.headshots ?? 0,
                    stat.mvp ? 1 : 0
                ]
            );

        }

        await connection.commit();

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
 * Salvar a sumula de um mapa e recalcular os totais oficiais da partida.
 */
export async function replaceMatchMapPlayerStats(match_id, match_map_id, playerStats = []){

    const connection = await pool.getConnection();

    try{

        await connection.beginTransaction();

        const [maps] = await connection.query(
            `SELECT id FROM match_maps WHERE id = ? AND match_id = ? LIMIT 1`,
            [match_map_id, match_id]
        );

        if(!maps.length){
            throw new Error("O mapa informado nao pertence a esta partida.");
        }

        await connection.query(
            `DELETE FROM match_map_player_stats WHERE match_map_id = ?`,
            [match_map_id]
        );

        for(const stat of playerStats){

            await connection.query(
                `
                INSERT INTO match_map_player_stats
                (
                    match_map_id,
                    match_id,
                    player_id,
                    team_id,
                    kills,
                    deaths,
                    assists,
                    headshots,
                    mvp
                )
                VALUES (?,?,?,?,?,?,?,?,?)
                `,
                [
                    match_map_id,
                    match_id,
                    stat.player_id,
                    stat.team_id,
                    stat.kills ?? 0,
                    stat.deaths ?? 0,
                    stat.assists ?? 0,
                    stat.headshots ?? 0,
                    stat.mvp ? 1 : 0
                ]
            );

        }

        const [totals] = await connection.query(
            `
            SELECT
                player_id,
                team_id,
                SUM(kills) AS kills,
                SUM(deaths) AS deaths,
                SUM(assists) AS assists,
                SUM(headshots) AS headshots,
                SUM(mvp) AS mvp
            FROM match_map_player_stats
            WHERE match_id = ?
            GROUP BY player_id, team_id
            `,
            [match_id]
        );

        await connection.query(
            `DELETE FROM match_player_stats WHERE match_id = ?`,
            [match_id]
        );

        for(const stat of totals){

            await connection.query(
                `
                INSERT INTO match_player_stats
                (match_id, player_id, team_id, kills, deaths, assists, headshots, mvp)
                VALUES (?,?,?,?,?,?,?,?)
                `,
                [
                    match_id,
                    stat.player_id,
                    stat.team_id,
                    Number(stat.kills),
                    Number(stat.deaths),
                    Number(stat.assists),
                    Number(stat.headshots),
                    Number(stat.mvp)
                ]
            );

        }

        await connection.commit();

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
 * Buscar partidas finalizadas do torneio
 */
export async function findFinishedTournamentMatches(tournament_id){

    const [rows] = await pool.query(
        `
        SELECT
            m.*,
            ta.nome AS team_a_name,
            tb.nome AS team_b_name,
            COALESCE(mm.maps_played, 0) AS maps_played,
            COALESCE(mm.rounds_for_a, 0) AS rounds_for_a,
            COALESCE(mm.rounds_for_b, 0) AS rounds_for_b
        FROM matches m
        INNER JOIN teams ta ON ta.id = m.team_a_id
        INNER JOIN teams tb ON tb.id = m.team_b_id
        LEFT JOIN (
            SELECT
                match_id,
                COUNT(*) AS maps_played,
                SUM(score_team_a) AS rounds_for_a,
                SUM(score_team_b) AS rounds_for_b
            FROM match_maps
            WHERE status = 'finalizado'
            GROUP BY match_id
        ) mm ON mm.match_id = m.id
        WHERE m.tournament_id = ?
        AND m.status = 'finalizada'
        ORDER BY finished_at ASC, id ASC
        `,
        [tournament_id]
    );

    return rows;

}

export async function findTournamentByes(tournament_id){
    const [rows] = await pool.query(`
        SELECT tb.round,tb.team_id,t.nome AS team_name
        FROM tournament_byes tb
        INNER JOIN teams t ON t.id=tb.team_id
        WHERE tb.tournament_id=?
        ORDER BY tb.round
    `, [tournament_id]);
    return rows;
}

/**
 * Buscar estatisticas oficiais dos jogadores do torneio
 */
export async function findTournamentPlayerStats(tournament_id){

    const [rows] = await pool.query(
        `
        SELECT
            mps.*,
            m.tournament_id,
            m.winner_team_id,
            p.nick,
            t.nome AS team
        FROM match_player_stats mps
        INNER JOIN matches m
            ON m.id = mps.match_id
        INNER JOIN players p
            ON p.id = mps.player_id
        INNER JOIN teams t
            ON t.id = mps.team_id
        WHERE m.tournament_id = ?
        AND m.status = 'finalizada'
        ORDER BY p.nick ASC
        `,
        [tournament_id]
    );

    return rows;

}
