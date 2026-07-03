import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
import {

 createUser,

 findUserByEmail

}

from "../models/user.model.js";

export async function register({

 name,

 email,

 cpf,

 password,

 role

}){

 const existe=

 await findUserByEmail(

  email

 );

 if(existe){

  throw new Error(

   "Email já cadastrado"

  );

 }

 if(!cpf){
    throw new Error(
       "CPF é obrigatório" 
    )
 }

 const senhaHash=

 await bcrypt.hash(password, 10);

 return await createUser({

  nome: name,

  email,
  
  cpf,

  senhaHash,

  role

 });

}

export async function login({

 email,

 password

}){

 const usuario=

 await findUserByEmail(

  email

 );

 if(!usuario){

  throw new Error(

   "Usuário não encontrado"

  );

 }

 const ok=

 await bcrypt.compare(

  password,

  usuario.senha_hash

 );

 if(!ok){

  throw new Error(

   "Senha inválida"

  );

 }

 const token=

 jwt.sign(

 {

  id:usuario.id,

  role:usuario.role

 },

 process.env.JWT_SECRET,

 {

  expiresIn:"7d"

 }

 );

 return{

  token,

  usuario:{

   id:usuario.id,

   nome:usuario.nome,

   email:usuario.email,

   role:usuario.role

  }

 };

}