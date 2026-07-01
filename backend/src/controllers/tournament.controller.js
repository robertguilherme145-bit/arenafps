import {

 createTournament,

 listTournaments,

 registerClanTournament,

 approveSubscription

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

export const subscribeTournament=(req,res)=>{

 const {

  tournamentId,

  clan

 }=req.body;

 if(
  !tournamentId||
  !clan
 ){

  return res.status(400).json({

   erro:"Dados inválidos"

  });

 }

 const resultado=
 registerClanTournament(

  tournamentId,

  clan

 );

 if(!resultado){

  return res.status(404).json({

   erro:"Torneio não encontrado"

  });

 }

 return res.json({

  mensagem:"Inscrição realizada",

  torneio:resultado

 });

};

export const approveTournament=(req,res)=>{

 const {

  tournamentId,

  clan

 }=req.body;

 const aprovado=
 approveSubscription(

  tournamentId,

  clan

 );

 if(!aprovado){

  return res.status(404).json({

   erro:"Inscrição não encontrada"

  });

 }

 return res.json({

  mensagem:
  "Pagamento confirmado",

  aprovado

 });

};