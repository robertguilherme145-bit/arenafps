import {

  createEntry,

  findEntry,

  findEntryByClanAndTournament,

  getEntriesByClan,

  updateEntryStatus,

  updatePaymentStatus,

  findEntryByIdAndClan

}

from "../models/entry.model.js";

import {

  findClanByLeader

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
  const clan = await findClanByLeader(userId);

  if(!clan){

    throw new Error(

      "Você precisa possuir um clã."

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

  await findEntryByClanAndTournament(

    tournament_id,

    clan.id

  );

  if(existe){

    throw new Error(

      "Seu clã já está inscrito."

    );

  }

  return await createEntry({

    tournament_id,

    clan_id: clan.id

  });

}

/**
 * Listar minhas inscrições
 */
export async function listEntries(

  userId

){

  const clan = await findClanByLeader(

    userId

  );

  if(!clan){

    throw new Error(

      "Clã não encontrado."

    );

  }

  return await getEntriesByClan(

    clan.id

  );

}

/**
 * Buscar inscrição
 */
export async function getEntry(
  userId,
  id
){

  const clan = await findClanByLeader(userId);

  if(!clan){

    throw new Error(
      "Clã não encontrado."
    );

  }

  const entry = await findEntryByIdAndClan(

    id,

    clan.id

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