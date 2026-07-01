import {

  createPlayer,

  getPlayersByClan,

  findPlayer,

  findPlayerByGame,

  updatePlayer,

  deactivatePlayer

}

from "../models/player.model.js";

import {

  findClanByLeader

}

from "../models/clan.model.js";

/**
 * Cadastrar jogador
 */
export async function registerPlayer(userId, data){

  if(!data.nick){

    throw new Error("Nick é obrigatório.");

  }

  if(!data.game){

    throw new Error("Jogo é obrigatório.");

  }

  if(!data.game_uid){

    throw new Error("ID do jogo é obrigatório.");

  }

  // Descobre o clã do líder
  const clan = await findClanByLeader(userId);

  if(!clan){

    throw new Error("Você precisa criar um clã primeiro.");

  }

  // Verifica se já existe jogador
  const existe = await findPlayerByGame(

    data.game,

    data.game_uid

  );

  if(existe){

    throw new Error("Este jogador já está cadastrado.");

  }

  return await createPlayer({

    clan_id: clan.id,

    nick: data.nick,

    game: data.game,

    game_uid: data.game_uid,

    foto: data.foto

  });

}

/**
 * Lista jogadores do líder
 */
export async function listPlayers(userId){

  const clan = await findClanByLeader(userId);

  if(!clan){

    throw new Error("Clã não encontrado.");

  }

  return await getPlayersByClan(clan.id);

}

/**
 * Buscar jogador
 */
export async function getPlayer(id){

  const player = await findPlayer(id);

  if(!player){

    throw new Error("Jogador não encontrado.");

  }

  return player;

}

/**
 * Editar jogador
 */
export async function editPlayer(id,data){

  await updatePlayer(id,data);

}

/**
 * Inativar jogador
 */
export async function removePlayer(id){

  await deactivatePlayer(id);

}