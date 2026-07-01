import {

  registerClan,

  listClans

}

from "../services/clan.service.js";

/**
 * Criar clã
 */
export async function create(req,res){

  try{

    const resultado = await registerClan({

      ...req.body,

      lider_id: req.user.id

    });

    return res.status(201).json(resultado);

  }

  catch(err){

    return res.status(400).json({

      erro: err.message

    });

  }

}

/**
 * Listar clãs
 */
export async function index(req,res){

  try{

    const resultado = await listClans();

    return res.json(resultado);

  }

  catch(err){

    return res.status(500).json({

      erro: err.message

    });

  }

}