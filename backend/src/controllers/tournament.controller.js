import {

 createTournament,

 listTournaments

}

from "../models/tournament.model.js";

export const registerTournament=(req,res)=>{

 const {

  nome,

  valor,

  vagas

 }=req.body;

 if(
  !nome||
  !valor||
  !vagas
 ){

  return res.status(400).json({

   erro:"Dados inválidos"

  });

 }

 const novo=
 createTournament({

  id:Date.now(),

  nome,

  valor,

  vagas,

  inscritos:[]

 });

 return res.status(201).json({

  mensagem:"Torneio criado",

  torneio:novo

 });

};

export const getTournament=(req,res)=>{

 return res.json(
  listTournaments()
 );

};