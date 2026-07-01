import pool from "../config/database.js";

/**
 * Cria um clã
 */
export async function createClan({
  nome,
  tag,
  logo = null,
  descricao = null,
  lider_id
}) {

  const [result] = await pool.query(
    `
    INSERT INTO clans
    (
      nome,
      tag,
      logo,
      descricao,
      lider_id
    )
    VALUES
    (
      ?,?,?,?,?
    )
    `,
    [
      nome,
      tag,
      logo,
      descricao,
      lider_id
    ]
  );

  return {
    id: result.insertId,
    nome,
    tag,
    logo,
    descricao,
    lider_id
  };

}

/**
 * Procura um clã pelo nome
 */
export async function findClanByName(nome){

  const [rows] = await pool.query(

    `
    SELECT *
    FROM clans
    WHERE nome = ?
    LIMIT 1
    `,

    [nome]

  );

  return rows[0];

}

/**
 * Procura o clã do líder
 */
export async function findClanByLeader(lider_id){

  const [rows] = await pool.query(

    `
    SELECT *
    FROM clans
    WHERE lider_id = ?
    LIMIT 1
    `,

    [lider_id]

  );

  return rows[0];

}

/**
 * Lista todos os clãs
 */
export async function getClans(){

  const [rows] = await pool.query(

    `
    SELECT *
    FROM clans
    ORDER BY nome
    `

  );

  return rows;

}

/**
 * Procura um clã pela TAG
 */
export async function findClanByTag(tag){

  const [rows] = await pool.query(

    `
    SELECT *
    FROM clans
    WHERE tag = ?
    LIMIT 1
    `,

    [tag]

  );

  return rows[0];

}