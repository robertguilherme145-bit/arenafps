import {
    getMyGames,
    addGameProfile
}

from "../services/playerGameProfile.service.js";

/**
 * Listar meus jogos
 */
export async function myGames(req, res){

    try{

        const games = await getMyGames(req.user.id);

        return res.json(games);

    }

    catch(err){

        return res.status(400).json({erro: err.message});}

}

/**
 * Adicionar jogo
 */
export async function create(req, res){

    try{

        const game = await addGameProfile(req.user.id, req.body);

        return res.status(201).json(game);

    }

    catch(err){

        return res.status(400).json({erro: err.message});}

}