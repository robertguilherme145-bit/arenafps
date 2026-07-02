import pool from "../config/database.js";

export async function createUser({

 nome,

 email,

 cpf,

 senhaHash,

 role="lider"

}){

 const [result]=await pool.query(

 `
 INSERT INTO users
 (
  nome,
  email,
  cpf,
  senha_hash,
  role
 )
 VALUES
 (
  ?,
  ?,
  ?,
  ?,
  ?
 )
 `,

 [

  nome,

  email,

  cpf,

  senhaHash,

  role

 ]

 );

 return {

  id:result.insertId,

  nome,

  email,

  cpf,

  role

 };

}

export async function findUserByEmail(

 email

){

 const [rows]=await pool.query(

 `
 SELECT *
 FROM users
 WHERE email=?
 LIMIT 1
 `,

 [email]

 );

 return rows[0];

}

/**
 * Buscar usuário pelo ID
 */
export async function findUserById(id){

  const [rows] = await pool.query(

    `
    SELECT *
    FROM users
    WHERE id = ?
    LIMIT 1
    `,

    [id]

  );

  return rows[0];

}