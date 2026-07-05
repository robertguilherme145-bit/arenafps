import {

  createTournament,

  getTournaments,

  findTournament,

  updateTournament,

  changeTournamentStatus

}

from "../models/tournament.model.js";

import { findGame } from "../models/game.model.js";

import TOURNAMENT_STATUS from "../constants/tournamentStatus.js";

import { canChangeTournamentStatus } from "./tournamentStatus.service.js";

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

  const game = await findGame(data.game);

  if (!game) {
      throw new Error("Jogo não encontrado.");
  }

  if(data.valor < 0){

    throw new Error("Valor inválido.");

  }

  if(data.max_teams <= 0){

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

    // Define o status inicial do torneio
  data.status = TOURNAMENT_STATUS.CREATED;

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
export async function updateTournamentStatus(id, status) {

    const tournament = await findTournament(id);

    if (!tournament) {
        throw new Error("Torneio não encontrado.");
    }

    const valid = canChangeTournamentStatus(
        tournament.status,
        status
    );

    if (!valid) {
        throw new Error(
            `Não é permitido alterar o status de "${tournament.status}" para "${status}".`
        );
    }

    await changeTournamentStatus(id, status);
}