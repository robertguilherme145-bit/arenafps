import {
 createClan,
 findClan,
 getClans,
 addPlayer
}
from "../models/clan.model.js";

export const registerClan=(req,res)=>{

 const {
  nome,
  lider
 }=req.body;

 if(!nome||!lider){

  return res.status(400).json({

   erro:"Informe nome e líder"

  });

 }

 if(findClan(nome)){

  return res.status(400).json({

   erro:"Clã já existe"

  });

 }

 const novo=
 createClan({

  id:Date.now(),

  nome,

  lider,

  jogadores:[]

 });

 return res.status(201).json({

  mensagem:"Clã criado",

  clan:novo

 });

};

export const listClans=(req,res)=>{

 return res.json(
  getClans()
 );
};

export const registerPlayer=(req,res)=>{

 const {
  clan,
  nick,
  cargo
 }=req.body;

 if(
  !clan||
  !nick
 ){

  return res.status(400).json({

   erro:"Dados inválidos"

  });

 }

 const resultado=
 addPlayer(

  clan,

  {

   id:Date.now(),

   nick,

   cargo:
   cargo||"player"

  }

 );

 if(!resultado){

  return res.status(404).json({

   erro:"Clã não encontrado"

  });

 }

 return res.json({

  mensagem:"Jogador cadastrado",

  clan:resultado

 });

};