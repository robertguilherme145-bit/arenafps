import {

  registerTournament,

  listTournaments,

  getTournament,

  editTournament,

  updateTournamentStatus

}

from "../services/tournament.service.js";

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

    return res.json(tournaments);

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