import {registerEntryPlayer, listEntryPlayers, deleteEntryPlayer, saveLineup}

from "../services/entryPlayer.service.js";

/**
 * Adicionar jogador
 */
export async function create(req,res){

  try{

    const resultado = await registerEntryPlayer(

      req.user.id,

      req.body

    );

    return res.status(201).json(resultado);

  }

  catch(err){

    return res.status(400).json({

      erro: err.message

    });

  }

}

/**
 * Listar jogadores da inscrição
 */
export async function index(req,res){

  try{

    const jogadores = await listEntryPlayers(

      req.params.entryId

    );

    return res.json(jogadores);

  }

  catch(err){

    return res.status(400).json({

      erro: err.message

    });

  }

}

/**
 * Remover jogador
 */
export async function remove(req,res){

  try{

    await deleteEntryPlayer(

      req.user.id,

      req.params.entryId,

      req.params.playerId

    );

    return res.json({

      mensagem:"Jogador removido."

    });

  }

  catch(err){

    return res.status(400).json({

      erro: err.message

    });

  }

}

/**
 * Salvar elenco completo
 */
export async function save(req,res){

  try{

    const resultado = await saveLineup(

      req.user.id,

      req.params.entryId,

      req.body.titulares || [],

      req.body.reservas || []

    );

    return res.json({

      mensagem:"Elenco salvo com sucesso.",

      jogadores:resultado

    });

  }

  catch(err){

    return res.status(400).json({

      erro:err.message

    });

  }

}