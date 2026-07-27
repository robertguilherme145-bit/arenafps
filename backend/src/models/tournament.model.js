import pool from "../config/database.js";

import TOURNAMENT_STATUS from "../constants/tournamentStatus.js";

/**
 * Criar torneio
 */
export async function createTournament({

  nome,

  descricao,

  game,

  valor,

  max_teams,

  titulares,

  reservas,

  premiacao,

  banner = null,

  status = TOURNAMENT_STATUS.CREATED,

  inicio,

  fim

}){

  const [result] = await pool.query(

    `
    INSERT INTO tournaments
    (

      nome,

      descricao,

      game,

      valor,

      max_teams,

      titulares,

      reservas,

      premiacao,

      banner,

      status,

      inicio,

      fim

    )

    VALUES

    (

      ?,?,?,?,?,?,?,?,?,?,?,?

    )

    `,

    [

      nome,

      descricao,

      game,

      valor,

      max_teams,

      titulares,

      reservas,

      premiacao,

      banner,

      status,

      inicio,

      fim

    ]

  );

  return {

    id: result.insertId,

    nome,

    descricao,

    game,

    valor,

    max_teams,

    titulares,

    reservas,

    premiacao,

    banner,

    status,

    inicio,

    fim

  };

}

/**
 * Lista torneios
 */
export async function getTournaments(){

  const [rows] = await pool.query(

    `
    SELECT
      t.*,
      COALESCE(tcs.game_id, NULLIF(CAST(t.game AS UNSIGNED), 0)) AS game_id,
      g.nome AS game_name,
      g.nome_curto AS game_short_name,
      g.slug AS game_slug
    FROM tournaments t
    LEFT JOIN tournament_competition_settings tcs ON tcs.tournament_id = t.id
    LEFT JOIN games g ON g.id = COALESCE(tcs.game_id, NULLIF(CAST(t.game AS UNSIGNED), 0))
    ORDER BY t.inicio ASC
    `

  );

  return rows.map((row) => ({
    ...row,
    game_id: row.game_id ? Number(row.game_id) : null
  }));

}

/**
 * Buscar torneio
 */
export async function findTournament(id){

  const [rows] = await pool.query(

    `
    SELECT *
    FROM tournaments
    WHERE id = ?
    LIMIT 1
    `,

    [id]

  );

  return rows[0];

}

/**
 * Atualizar torneio
 */
export async function updateTournament(id,data){

  await pool.query(

    `
    UPDATE tournaments

    SET

      nome = ?,

      descricao = ?,

      game = ?,

      valor = ?,

      max_teams = ?,

      titulares = ?,

      reservas = ?,

      premiacao = ?,

      banner = ?,

      inicio = ?,

      fim = ?

    WHERE id = ?
    `,

    [

      data.nome,

      data.descricao,

      data.game,

      data.valor,

      data.max_teams,

      data.titulares,

      data.reservas,

      data.premiacao,

      data.banner,

      data.inicio,

      data.fim,

      id

    ]

  );

}

/**
 * Alterar status
 */
export async function changeTournamentStatus(

  id,

  status

){

  await pool.query(

    `
    UPDATE tournaments

    SET status = ?

    WHERE id = ?
    `,

    [

      status,

      id

    ]

  );

}
