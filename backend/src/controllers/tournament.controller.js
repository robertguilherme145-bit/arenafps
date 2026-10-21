import { canSeeHiddenTournaments, isHiddenTournament, visibleTournaments } from "../utils/tournamentVisibility.js";
import { findTournament } from "../models/tournament.model.js";
import {registerTournament, listTournaments, getTournament, editTournament, updateTournamentStatus}

from "../services/tournament.service.js";

import { getTournamentTeamRanking }

from "../services/ranking.service.js";

import { getTournamentPlayerStatistics }

from "../services/statistics.service.js";

/**
 * Criar torneio
 */
export async function create(req,res){

  try{

    const tournament = await registerTournament(

      req.body

    );

    return res.status(201).json(tournament);

  }

  catch(err){

    return res.status(400).json({

      erro: err.message

    });

  }

}

/**
 * Listar torneios
 */
export async function index(req,res){

  try{

    const tournaments = await listTournaments();

    return res.json(visibleTournaments(tournaments, req.user));

  }

  catch(err){

    return res.status(500).json({

      erro: err.message

    });

  }

}

/**
 * Buscar torneio
 */
export async function show(req,res){

  try{

    const tournament = await getTournament(

      req.params.id

    );

    if (isHiddenTournament(tournament?.status) && !canSeeHiddenTournaments(req.user)) return res.status(404).json({ erro:"Torneio nao encontrado." });

    return res.json(tournament);

  }

  catch(err){

    return res.status(404).json({

      erro: err.message

    });

  }

}

/**
 * Editar torneio
 */
export async function update(req,res){

  try{

    await editTournament(

      req.params.id,

      req.body

    );

    return res.json({

      mensagem:"Torneio atualizado."

    });

  }

  catch(err){

    return res.status(400).json({

      erro: err.message

    });

  }

}

/**
 * Alterar status
 */
export async function changeStatus(req,res){

  try{

    await updateTournamentStatus(

      req.params.id,

      req.body.status

    );

    return res.json({

      mensagem:"Status atualizado."

    });

  }

  catch(err){

    return res.status(400).json({

      erro: err.message

    });

  }

}

/**
 * Ranking calculado do torneio
 */
export async function ranking(req,res){

  try{

    if (await hiddenFor(req)) return res.status(404).json({ erro:"Torneio nao encontrado." });
    const resultado = await getTournamentTeamRanking(req.params.id);

    return res.json(resultado);

  }
  catch(err){

    return res.status(400).json({

      erro: err.message

    });

  }

}

/**
 * Estatisticas calculadas do torneio
 */
export async function statistics(req,res){

  try{

    if (await hiddenFor(req)) return res.status(404).json({ erro:"Torneio nao encontrado." });
    const resultado = await getTournamentPlayerStatistics(req.params.id);

    return res.json(resultado);

  }
  catch(err){

    return res.status(400).json({

      erro: err.message

    });

  }

}

// Ranking e estatisticas de rascunho/cancelado so para o admin.
async function hiddenFor(req) {
  const tournament = await findTournament(Number(req.params.id));
  return isHiddenTournament(tournament?.status) && !canSeeHiddenTournaments(req.user);
}
