import pool from "../config/database.js";

import {

  addPlayerToEntry,
  addPlayerTransaction,
  clearEntryPlayers,
  getEntryPlayers,
  removeEntryPlayer

}

from "../models/entryPlayer.model.js";

import { findEntry }

from "../models/entry.model.js";

import {
    findPlayerByIdAndTeam,
    findPlayersByIds
} from "../models/player.model.js";

import { findUserTeam } from "../models/team.model.js";

import { findTournament }

from "../models/tournament.model.js";

/**
 * Adicionar jogador
 */
export async function registerEntryPlayer(

  userId,

  data

){

  const {

    entry_id,

    player_id,

    titular,

    ordem

  } = data;

  // Descobre a Equipe do líder
  const team = await findUserTeam(userId);

  if(!team){

    throw new Error(

      "Equipe não encontrada."

    );

  }

  if (
      team.cargo !== "leader" &&
      team.cargo !== "captain"
  ) {
      throw new Error(
          "Somente o líder ou capitão podem gerenciar a lineup da equipe."
      );
  }

  // Busca inscrição
  const entry = await findEntry(entry_id);

  if(!entry){

    throw new Error(

      "Inscrição não encontrada."

    );

  }

  // Segurança
  if(entry.team_id !== team.id){

    throw new Error(

      "Esta inscrição não pertence à sua equipe."

    );

  }

  // Busca jogador
  const player = await findPlayerByIdAndTeam(

    player_id,

    team.id

  );

  if(!player){

    throw new Error(

      "Jogador inválido."

    );

  }

  // Busca torneio
  const tournament = await findTournament(

    entry.tournament_id

  );

  if(!tournament){

    throw new Error(

      "Torneio não encontrado."

    );

  }

  // Lista jogadores já adicionados
  const players = await getEntryPlayers(

    entry.id

  );

  // Evita duplicidade
  const duplicate = players.find(

    p => p.player_id === player_id

  );

  if(duplicate){

    throw new Error(

      "Jogador já adicionado."

    );

  }

  // Conta titulares
  const titulares = players.filter(

    p => p.titular

  ).length;

  // Conta reservas
  const reservas = players.filter(

    p => !p.titular

  ).length;

  if(titular){

    if(titulares >= tournament.titulares){

      throw new Error(

        "Limite de titulares atingido."

      );

    }

  }

  else{

    if(reservas >= tournament.reservas){

      throw new Error(

        "Limite de reservas atingido."

      );

    }

  }

  return await addPlayerToEntry({

    entry_id,

    player_id,

    titular,

    ordem

  });

}

/**
 * Lista jogadores da inscrição
 */
export async function listEntryPlayers(

  entry_id

){

  return await getEntryPlayers(

    entry_id

  );

}

/**
 * Remove jogador
 */
export async function deleteEntryPlayer(

  userId,

  entry_id,

  player_id

){

  const team = await findUserTeam(userId);

  if(!team){

    throw new Error("Equipe não encontrada.");

  }

  if (
      team.cargo !== "leader" &&
      team.cargo !== "captain"
  ) {
      throw new Error(
          "Somente o líder ou capitão podem gerenciar a lineup da equipe."
      );
  }

  const entry = await findEntry(

    entry_id

  );

  if(!entry){

    throw new Error(

      "Inscrição não encontrada."

    );

  }

  if(entry.team_id !== team.id){

    throw new Error(

      "Sem permissão."

    );

  }

  await removeEntryPlayer(

    entry_id,

    player_id

  );

}

/**
 * Salvar elenco completo
 */
export async function saveLineup(
  userId,
  entry_id,
  titulares,
  reservas
){

  const team = await findUserTeam(userId);

  if(!team){

    throw new Error("Equipe não encontrada.");

  }

  if (
      team.cargo !== "leader" &&
      team.cargo !== "captain"
  ) {
      throw new Error(
          "Somente o líder ou capitão podem gerenciar a lineup da equipe."
      );
  }

  const entry = await findEntry(entry_id);

  if(!entry){

    throw new Error("Inscrição não encontrada.");

  }

  if(entry.team_id !== team.id){

    throw new Error("Esta inscrição não pertence à sua equipe.");

  }

  const tournament = await findTournament(entry.tournament_id);

  if(!tournament){

    throw new Error("Torneio não encontrado.");

  }

  if(titulares.length !== tournament.titulares){

    throw new Error(

      `O torneio exige exatamente ${tournament.titulares} titulares.`

    );

  }

  if(reservas.length > tournament.reservas){

    throw new Error(

      `O torneio permite no máximo ${tournament.reservas} reservas.`

    );

  }

  // Junta todos os jogadores
  const allPlayers = [

    ...titulares,

    ...reservas

  ];

  // Verifica repetidos
  const uniquePlayers = [...new Set(allPlayers)];

  if(uniquePlayers.length !== allPlayers.length){

    throw new Error(

      "Há jogadores repetidos."

    );

  }

  // Busca todos
  const players = await findPlayersByIds(uniquePlayers);

  // Todos precisam existir
  if(players.length !== uniquePlayers.length){

    throw new Error(

      "Existem jogadores inválidos."

    );

  }

  // Todos precisam pertencer a Equipe
  for(const player of players){

    if(player.team_id !== team.id){

      throw new Error(

        `O jogador ${player.nick} não pertence á Equipe.`

      );

    }

    if(player.status !== "ativo"){

      throw new Error(

        `O jogador ${player.nick} está inativo.`

      );

    }

  }
  // Abre conexão
  const connection = await pool.getConnection();

  try{

      await connection.beginTransaction();

      // Remove elenco anterior
      await clearEntryPlayers(

          entry.id,

          connection

      );

      // Titulares
      let ordem = 1;

      for(const playerId of titulares){

          await addPlayerTransaction(

              connection,

              {

                  entry_id: entry.id,

                  player_id: playerId,

                  titular: true,

                  ordem

              }

          );

          ordem++;

      }

      // Reservas
      for(const playerId of reservas){

          await addPlayerTransaction(

              connection,

              {

                  entry_id: entry.id,

                  player_id: playerId,

                  titular: false,

                  ordem

              }

          );

          ordem++;

      }

      await connection.commit();

  }
  catch(err){

      await connection.rollback();

      throw err;

  }
  finally{

      connection.release();

  }

  return await getEntryPlayers(

      entry.id

  );
}