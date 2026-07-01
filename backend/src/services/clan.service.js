import {

  createClan,

  findClanByName,

  findClanByTag,

  findClanByLeader,

  getClans

}

from "../models/clan.model.js";

/**
 * Criar clã
 */
export async function registerClan(data){

  if(!data.nome){

    throw new Error("Nome do clã é obrigatório.");

  }

  if(!data.tag){

    throw new Error("TAG do clã é obrigatória.");

  }

  // Verifica nome duplicado
  const clanNome = await findClanByName(data.nome);

  if(clanNome){

    throw new Error("Já existe um clã com este nome.");

  }

  const clanTag = await findClanByTag(data.tag);

  if(clanTag){
    throw new Error("Esta TAG já está sendo utilizada.")
  }

  // Verifica se o líder já possui um clã
  const clanLider = await findClanByLeader(data.lider_id);

  if(clanLider){

    throw new Error("Você já possui um clã cadastrado.");

  }

  return await createClan(data);

}

/**
 * Listar clãs
 */
export async function listClans(){

  return await getClans();

}