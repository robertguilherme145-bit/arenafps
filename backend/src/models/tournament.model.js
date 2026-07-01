import pool from "../config/database.js";

/**
 * Criar torneio
 */
export async function createTournament({

  nome,

  descricao,

  game,

  valor,

  max_clans,

  titulares,

  reservas,

  premiacao,

  banner = null,

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

      max_clans,

      titulares,

      reservas,

      premiacao,

      banner,

      inicio,

      fim

    )

    VALUES

    (

      ?,?,?,?,?,?,?,?,?,?,?

    )

    `,

    [

      nome,

      descricao,

      game,

      valor,

      max_clans,

      titulares,

      reservas,

      premiacao,

      banner,

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

    max_clans,

    titulares,

    reservas,

    premiacao,

    banner,

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
    SELECT *
    FROM tournaments
    ORDER BY inicio ASC
    `

  );

  return rows;

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

      max_clans = ?,

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

      data.max_clans,

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