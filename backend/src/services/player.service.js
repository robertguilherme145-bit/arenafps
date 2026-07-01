import {

  createPlayer,

  getPlayersByClan,

  findPlayer,

  findPlayerByGameId

}

from "../models/player.model.js";

/**
 * Cadastro de jogador
 */
export async function registerPlayer(data){

  if(!data.nick){

    throw new Error("Nick é obrigatório.");

  }

  if(!data.game_id){

    throw new Error("ID do jogo é obrigatório.");

  }

  const existe = await findPlayerByGameId(data.game_id);

  if(existe){

    throw new Error("Este jogador já está cadastrado na plataforma.");

  }

  return await createPlayer(data);

}

/**
 * Lista jogadores do clã
 */
export async function listPlayers(clan_id){

  return await getPlayersByClan(clan_id);

}

/**
 * Busca jogador
 */
export async function getPlayer(id){

  const player = await findPlayer(id);

  if(!player){

    throw new Error("Jogador não encontrado.");

  }

  return player;

}