import {createGame, getGames, findGame, findGameBySlug}

from "../models/game.model.js";

/**
 * Criar Game
 */
export async function registerGame(dados){

    const existe = await findGameBySlug(

        dados.slug

    );

    if(existe){

        throw new Error(

            "Já existe um jogo com este slug."

        );

    }

    return await createGame(dados);

}

/**
 * Listar Games
 */
export async function listGames(){

    return await getGames();

}

/**
 * Buscar Game
 */
export async function getGame(id){

    const game = await findGame(id);

    if(!game){

        throw new Error(

            "Jogo não encontrado."

        );

    }

    return game;

}