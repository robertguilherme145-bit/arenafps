import pool from "../config/database.js";

/**
 * Criar inscrição
 */
export async function createEntry({
  tournament_id,
  clan_id
}) {

  const [result] = await pool.query(

    `
    INSERT INTO entries
    (
      tournament_id,
      clan_id
    )
    VALUES
    (
      ?,?
    )
    `,

    [
      tournament_id,
      clan_id
    ]

  );

  return {

    id: result.insertId,

    tournament_id,

    clan_id,

    status: "pendente",

    payment_status: "aguardando"

  };

}

/**
 * Verifica se o clã já está inscrito
 */
export async function findEntryByClanAndTournament(

  tournament_id,

  clan_id

){

  const [rows] = await pool.query(

    `
    SELECT *
    FROM entries
    WHERE tournament_id = ?
    AND clan_id = ?
    LIMIT 1
    `,

    [

      tournament_id,

      clan_id

    ]

  );

  return rows[0];

}

/**
 * Buscar inscrição
 */
export async function findEntry(id){

  const [rows] = await pool.query(

    `
    SELECT *
    FROM entries
    WHERE id = ?
    LIMIT 1
    `,

    [id]

  );

  return rows[0];

}

/**
 * Listar inscrições do clã
 */
export async function getEntriesByClan(clan_id){

  const [rows] = await pool.query(

    `
    SELECT *
    FROM entries
    WHERE clan_id = ?
    ORDER BY created_at DESC
    `,

    [clan_id]

  );

  return rows;

}

/**
 * Alterar status
 */
export async function updateEntryStatus(

  id,

  status

){

  await pool.query(

    `
    UPDATE entries
    SET status = ?
    WHERE id = ?
    `,

    [

      status,

      id

    ]

  );

}

/**
 * Alterar status do pagamento
 */
export async function updatePaymentStatus(

  id,

  payment_status

){

  await pool.query(

    `
    UPDATE entries
    SET payment_status = ?
    WHERE id = ?
    `,

    [

      payment_status,

      id

    ]

  );

}

/**
 * Buscar inscrição pelo ID e pelo clã
 */
export async function findEntryByIdAndClan(
  id,
  clan_id
){

  const [rows] = await pool.query(

    `
    SELECT *
    FROM entries
    WHERE id = ?
    AND clan_id = ?
    LIMIT 1
    `,

    [
      id,
      clan_id
    ]

  );

  return rows[0];

}