import {

  createEntry,

  findEntry,

  findEntryByClanAndTournament,

  getEntriesByClan,

  updateEntryStatus,

  updatePaymentStatus,

  findEntryByIdAndClan,
  getEntriesByTeam,
  findEntryByIdAndTeam

}

from "../models/entry.model.js";

import {

  findUserTeam

}

from "../models/clan.model.js";

import {

  findTournament

}

from "../models/tournament.model.js";

/**
 * Criar inscrição
 */
export async function registerEntry(

  userId,

  tournament_id

){

  // Descobre o clã do líder
  const team = await findUserTeam(userId);

  if(!team){

    throw new Error(

      "Você precisa possuir um equipe."

    );

  }

  // Verifica torneio
  const tournament = await findTournament(

    tournament_id

  );

  if(!tournament){

    throw new Error(

      "Torneio não encontrado."

    );

  }

  if(

    tournament.status !== "aberto"

  ){

    throw new Error(

      "As inscrições estão fechadas."

    );

  }

  // Verifica inscrição duplicada
  const existe =

  await findEntryByTeamAndTournament(

    tournament_id,

    team.id

  );

  if(existe){

    throw new Error(

      "Seu clã já está inscrito."

    );

  }

  return await createEntry({

    tournament_id,

    clan_id: team.id

  });

}

/**
 * Listar minhas inscrições
 */
export async function listEntries(

  userId

){

  const team = await findteamByLeader(

    userId

  );

  if(!team){

    throw new Error(

      "Equipe não encontrado."

    );

  }

  return await getEntriesByTeam(

    team.id

  );

}

/**
 * Buscar inscrição
 */
export async function getEntry(
  userId,
  id
){

  const team = await findTeamByLeader(userId);

  if(!team){

    throw new Error(
      "Equipe não encontrado."
    );

  }

  const entry = await findEntryByIdAndTeam(

    id,

    team.id

  );

  if(!entry){

    throw new Error(
      "Inscrição não encontrada."
    );

  }

  return entry;

}

/**
 * Confirmar inscrição
 */
export async function confirmEntry(id){

  await updateEntryStatus(

    id,

    "confirmado"

  );

}

/**
 * Confirmar pagamento
 */
export async function confirmPayment(id){

  await updatePaymentStatus(

    id,

    "pago"

  );

}