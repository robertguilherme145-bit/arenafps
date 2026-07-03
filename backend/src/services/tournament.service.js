import {

  createTournament,

  getTournaments,

  findTournament,

  updateTournament,

  changeTournamentStatus

}

from "../models/tournament.model.js";

/**
 * Criar torneio
 */
export async function registerTournament(data){

  if(!data.nome){

    throw new Error("Nome do torneio é obrigatório.");

  }

  if(!data.game){

    throw new Error("Jogo é obrigatório.");

  }

  if(data.valor < 0){

    throw new Error("Valor inválido.");

  }

  if(data.max_clans <= 0){

    throw new Error("Quantidade de Equipes inválida.");

  }

  if(data.titulares <= 0){

    throw new Error("Quantidade de titulares inválida.");

  }

  if(data.reservas < 0){

    throw new Error("Quantidade de reservas inválida.");

  }

  if(new Date(data.inicio) >= new Date(data.fim)){

    throw new Error("A data inicial deve ser menor que a final.");

  }

  return await createTournament(data);

}

/**
 * Listar torneios
 */
export async function listTournaments(){

  return await getTournaments();

}

/**
 * Buscar torneio
 */
export async function getTournament(id){

  const tournament = await findTournament(id);

  if(!tournament){

    throw new Error("Torneio não encontrado.");

  }

  return tournament;

}

/**
 * Editar torneio
 */
export async function editTournament(id,data){

  const tournament = await findTournament(id);

  if(!tournament){

    throw new Error("Torneio não encontrado.");

  }

  await updateTournament(id,data);

}

/**
 * Alterar status
 */
export async function updateTournamentStatus(

  id,

  status

){

  const tournament = await findTournament(id);

  if(!tournament){

    throw new Error("Torneio não encontrado.");

  }

  await changeTournamentStatus(

    id,

    status

  );

}