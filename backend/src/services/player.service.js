import {
  createPlayer,
  getPlayersByTeam,
  findPlayer,
  findPlayerByGame,
  findPlayerByIdAndTeam,
  updatePlayer,
  deactivatePlayer
} from "../models/player.model.js";

import { findUserTeam } from "../models/team.model.js";

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

  // Descobre a Equipe do líder
  const team = await findUserTeam(userId);

  if(!team){

    throw new Error("Você precisa criar uma Equipe primeiro.");

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

    team_id: team.id,

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

  const team = await findUserTeam(userId);

  if(!team){

    throw new Error("Equipe não encontrada.");

  }

  return await getPlayersByTeam(team.id);

}

/**
 * Buscar jogador
 */
export async function getPlayer(userId, id){

  const team = await findUserTeam(userId);

  if(!team){

    throw new Error("Equipe não encontrada.");

  }

  const player = await findPlayerByIdAndTeam(id, team.id);

  if(!player){

    throw new Error("Você não tem permissão para visualizar este jogador.");

  }

  return player;

}

/**
 * Editar jogador
 */
export async function editPlayer(userId, id, data){

  const team = await findUserTeam(userId);

  if(!team){

    throw new Error("Equipe não encontrada.");

  }

  const player = await findPlayerByIdAndTeam(id, team.id);

  if(!player){

    throw new Error("Você não tem permissão para editar este jogador.");

  }

  await updatePlayer(id,data);

}

/**
 * Inativar jogador
 */
export async function removePlayer(userId,id){

  const team = await findUserTeam(userId);

  if(!team){

    throw new Error("Equipe não encontrada.");

  }

  const player = await findPlayerByIdAndTeam(id, team.id);

  if(!player){

    throw new Error("Você não tem permissão para remover este jogador.");

  }

  await deactivatePlayer(id);

}