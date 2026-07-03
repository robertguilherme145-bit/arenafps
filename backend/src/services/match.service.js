import {
    createMatch,
    findMatch,
    findTournamentMatches,
    finishMatch
}

from "../models/match.model.js";

import { findTournament }

from "../models/tournament.model.js";

/**
 * Listar partidas do torneio
 */
export async function getTournamentMatches(tournamentId){

    const tournament = await findTournament(

        tournamentId

    );

    if(!tournament){

        throw new Error(

            "Torneio não encontrado."

        );

    }

    return await findTournamentMatches(

        tournamentId

    );

}

/**
 * Criar partida
 */
export async function registerMatch(data){

    const tournament = await findTournament(data.tournament_id);

    if(!tournament){

        throw new Error("Torneio não encontrado.");

    }

    if(tournament.status !== "andamento"){

        throw new Error("O torneio não está em andamento.");

    }

    if(data.team_a_id === data.team_b_id){

        throw new Error("Uma equipe não pode jogar contra ela mesma.");

    }

    return await createMatch(data);

}

/**
 * Finalizar partida
 */
export async function finishMatchResult(matchId, data){

    const match = await findMatch(matchId);

    if(!match){

        throw new Error("Partida não encontrada.");

    }

    if(match.status === "finalizada"){

        throw new Error("Esta partida já foi finalizada.");

    }

    if(data.score_team_a === data.score_team_b){

        throw new Error("Empates não são permitidos.");

    }

    let winner;

    if(data.score_team_a > data.score_team_b){

        winner = match.team_a_id;

    }else{

        winner = match.team_b_id;

    }

    await finishMatch(

        match.id,

        winner,

        data.score_team_a,

        data.score_team_b

    );

    return{

        mensagem:"Resultado registrado com sucesso."

    };

}