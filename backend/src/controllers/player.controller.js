import {

  registerPlayer,

  listPlayers,

  getPlayer,

  editPlayer,

  removePlayer

}

from "../services/player.service.js";

/**
 * Criar jogador
 */
export async function create(req, res){

  try{

    const player = await registerPlayer(

      req.user.id,

      req.body

    );

    return res.status(201).json(player);

  }

  catch(err){

    return res.status(400).json({

      erro: err.message

    });

  }

}

/**
 * Listar jogadores
 */
export async function index(req,res){

  try{

    const players = await listPlayers(

      req.user.id

    );

    return res.json(players);

  }

  catch(err){

    return res.status(400).json({

      erro: err.message

    });

  }

}

/**
 * Buscar jogador
 */
export async function show(req,res){

  try{

    const player = await getPlayer(

      req.user.id,

      req.params.id

    );

    return res.json(player);

  }

  catch(err){

    return res.status(404).json({

      erro: err.message

    });

  }

}

/**
 * Editar jogador
 */
export async function update(req,res){

  try{

    if(!data.nick){
      throw new Error("Nick é obrigatório.")
    }
    if(!data.game){
      throw new Error("Jogo é obrigatório.")
    }
    if(!data.game_uid){
      throw new Error("ID do jogo é obrigatório.")
    }
    await editPlayer(

      req.user.id,

      req.params.id,

      req.body

    );

    return res.json({

      mensagem:"Jogador atualizado."

    });

  }

  catch(err){

    return res.status(400).json({

      erro: err.message

    });

  }

}

/**
 * Inativar jogador
 */
export async function destroy(req,res){

  try{

    await removePlayer(

      req.user.id,

      req.params.id

    );

    return res.json({

      mensagem:"Jogador inativado."

    });

  }

  catch(err){

    return res.status(400).json({

      erro: err.message

    });

  }

}