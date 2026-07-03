import { createTeam, findLeaderByGame,findTeamByGameAndName, findTeamBySlug, findTeam, getMembers, isLeader} 
from "../models/team.model.js";

import { findGame} 
from "../models/game.model.js";

import { findUserById } 
from "../models/user.model.js";


/**
 * Criar equipe
 */
export async function registerTeam(userId, dados){

    // Usuário existe?
    const usuario = await findUserById(userId);

    if(!usuario){

        throw new Error(
            "Usuário não encontrado."
        );

    }

    // Game existe?
    const game = await findGame(

        dados.game_id

    );

    if(!game){

        throw new Error(
            "Jogo não encontrado."
        );

    }

    // Já lidera equipe neste jogo?
    const lider = await findLeaderByGame(

        userId,

        dados.game_id

    );

    if(lider){

        throw new Error(
            "Você já lidera uma equipe neste jogo."
        );

    }

    // Nome repetido?
    const nomeExiste = await findTeamByGameAndName(

        dados.game_id,

        dados.nome

    );

    if(nomeExiste){

        throw new Error(
            "Já existe uma equipe com este nome neste jogo."
        );

    }

    // Slug repetido?
    const slugExiste = await findTeamBySlug(

        dados.slug

    );

    if(slugExiste){

        throw new Error(
            "Slug já utilizado."
        );

    }

    return await createTeam({

        ...dados,

        creator_id: userId

    });

}

/**
 * Listar membros da equipe
 */
export async function listMembers(userId, teamId){

    console.log("teamId recebido:", teamId);
    // Equipe existe?
    const team = await findTeam(teamId);

    console.log("Equipe encontrada:", team);

    if(!team){
        throw new Error("Equipe não encontrada.");}

    return await getMembers(teamId);

}