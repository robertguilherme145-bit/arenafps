import pool from "../config/database.js";

export async function createUser({

 nome,

 email,

 senha,

 role="lider"

}){

 const [result]=await pool.query(

 `

 INSERT INTO users

 (

 nome,

 email,

 senha_hash,

 role

 )

 VALUES

 (

 ?,

 ?,

 ?,

 ?

 )

 `,

 [

 nome,

 email,

 senha,

 role

 ]

 );

 return {

  id:result.insertId,

  nome,

  email,

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

 [

  email

 ]

 );

 return rows[0];

}