import {
 createUser,
 findUserByEmail
}
from "../models/user.model.js";

export const register=(req,res)=>{

 const {
  nome,
  email,
  senha
 }=req.body;

 if(!nome||!email||!senha){

  return res.status(400).json({

   erro:"Campos obrigatórios"

  });

 }

 const existe=
 findUserByEmail(email);

 if(existe){

  return res.status(400).json({

   erro:"Email já existe"

  });

 }

 const novo=
 createUser({

  nome,
  email,
  senha

 });

 return res.status(201).json({

  mensagem:"Usuário criado",

  usuario:novo

 });

};

export const login=(req,res)=>{

 const {
  email,
  senha
 }=req.body;

 const usuario=
 findUserByEmail(email);

 if(!usuario){

  return res.status(401).json({

   erro:"Usuário não encontrado"

  });

 }

 if(usuario.senha!==senha){

  return res.status(401).json({

   erro:"Senha inválida"

  });

 }

 return res.json({

  mensagem:"Login OK",

  usuario:{

   nome:usuario.nome,

   email:usuario.email

  }

 });

};