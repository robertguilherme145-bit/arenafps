import {

    registerMatch,
    getTournamentMatches,
    finishMatchResult

}

from "../services/match.service.js";

/**
 * Criar partida
 */
export async function create(req, res){

    try{

        const match = await registerMatch(

            req.body

        );

        return res.status(201).json(match);

    }

    catch(err){

        return res.status(400).json({

            erro: err.message

        });

    }

}

/**
 * Listar partidas do torneio
 */
export async function index(req, res){

    try{

        const matches = await getTournamentMatches(

            req.params.id

        );

        return res.json(matches);

    }

    catch(err){

        return res.status(404).json({

            erro: err.message

        });

    }

}

/**
 * Finalizar partida
 */
export async function result(req, res){

    try{

        const resultado = await finishMatchResult(

            req.params.id,

            req.body

        );

        return res.json(resultado);

    }

    catch(err){

        return res.status(400).json({

            erro: err.message

        });

    }

}