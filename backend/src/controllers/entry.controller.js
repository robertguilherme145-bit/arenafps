import {

  registerEntry,

  listEntries,

  getEntry,

  confirmEntry,

  confirmPayment

}

from "../services/entry.service.js";

/**
 * Criar inscrição
 */
export async function create(req,res){

  try{

    const entry = await registerEntry(

      req.user.id,

      req.body.tournament_id

    );

    return res.status(201).json(entry);

  }

  catch(err){

    return res.status(400).json({

      erro: err.message

    });

  }

}

/**
 * Listar minhas inscrições
 */
export async function index(req,res){

  try{

    const entries = await listEntries(

      req.user.id

    );

    return res.json(entries);

  }

  catch(err){

    return res.status(400).json({

      erro: err.message

    });

  }

}

/**
 * Buscar inscrição
 */
export async function show(req,res){

  try{

    const entry = await getEntry(

      req.user.id,

      req.params.id

    );

    return res.json(entry);

  }

  catch(err){

    return res.status(404).json({

      erro: err.message

    });

  }

}

/**
 * Confirmar inscrição
 */
export async function approve(req,res){

  try{

    await confirmEntry(

      req.params.id

    );

    return res.json({

      mensagem:"Inscrição confirmada."

    });

  }

  catch(err){

    return res.status(400).json({

      erro: err.message

    });

  }

}

/**
 * Confirmar pagamento
 */
export async function payment(req,res){

  try{

    await confirmPayment(

      req.params.id

    );

    return res.json({

      mensagem:"Pagamento confirmado."

    });

  }

  catch(err){

    return res.status(400).json({

      erro: err.message

    });

  }

}