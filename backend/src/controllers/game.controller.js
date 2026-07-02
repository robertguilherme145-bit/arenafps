import {registerGame, listGames, getGame}

from "../services/game.service.js";

/**
 * Criar Game
 */
export async function create(req, res){

    try{

        const game = await registerGame(

            req.body

        );

        return res.status(201).json(game);

    }

    catch(err){

        return res.status(400).json({

            erro: err.message

        });

    }

}

/**
 * Listar Games
 */
export async function index(req, res){

    try{

        const games = await listGames();

        return res.json(games);

    }

    catch(err){

        return res.status(400).json({

            erro: err.message

        });

    }

}

/**
 * Buscar Game
 */
export async function show(req, res){

    try{

        const game = await getGame(

            req.params.id

        );

        return res.json(game);

    }

    catch(err){

        return res.status(404).json({

            erro: err.message

        });

    }

}