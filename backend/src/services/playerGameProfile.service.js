import {
    createProfile,
    findProfileByGame,
    findProfiles
}

from "../models/playerGameProfile.model.js";

import { findGame }

from "../models/game.model.js";

/**
 * Listar meus jogos
 */
export async function getMyGames(userId){

    return await findProfiles(userId);

}

/**
 * Adicionar jogo ao perfil
 */
export async function addGameProfile(userId, dados){

    // Game existe?
    const game = await findGame(dados.game_id);

    if(!game){

        throw new Error("Jogo não encontrado.");}

    // Já possui cadastro?
    const existe = await findProfileByGame(userId, dados.game_id);

    if(existe){

        throw new Error("Você já cadastrou este jogo.");

    }

    // Nickname obrigatório
    if(!dados.nickname){

        throw new Error("Nickname é obrigatório.");

    }

    // ID obrigatório
    if(!dados.game_player_id){

        throw new Error("ID do jogador é obrigatório.");

    }

    return await createProfile({...dados, user_id: userId});

}