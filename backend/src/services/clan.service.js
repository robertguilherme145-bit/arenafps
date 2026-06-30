import {
 createClan,
 findClan
}
from "../models/clan.model.js";

export const createClanService=(data)=>{

 if(
  findClan(
   data.nome
  )
 ){

  throw new Error(
   "Clã já existe"
  );

 }

 return createClan(data);

};