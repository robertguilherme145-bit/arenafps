import {
    createMatch,
    findMatch,
    findTournamentMatches,
    finishMatch,
    replaceMatchPlayerStats
}

from "../models/match.model.js";

import { findTournament }

from "../models/tournament.model.js";

import TOURNAMENT_STATUS from "../constants/tournamentStatus.js";

import COMPETITION_EVENTS from "../constants/competitionEvents.js";

import { dispatchCompetitionEvent }

from "./competitionEngine.service.js";

import {
    initializeMatchCompetition,
    listTournamentTeams
} from "./competitionSetup.service.js";

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

    if(![TOURNAMENT_STATUS.CLOSED, TOURNAMENT_STATUS.IN_PROGRESS, "andamento"].includes(tournament.status)){

        throw new Error("O torneio não está em andamento.");

    }

    if(data.team_a_id === data.team_b_id){

        throw new Error("Uma equipe não pode jogar contra ela mesma.");

    }

    const eligibleTeams = await listTournamentTeams(tournament.id);
    const eligibleIds = new Set(
        eligibleTeams
            .filter((entry) =>
                ["confirmado", "pago"].includes(entry.entry_status) &&
                Number(entry.lineup_size) >= Number(tournament.titulares)
            )
            .map((entry) => Number(entry.team_id))
    );

    if(!eligibleIds.has(Number(data.team_a_id)) || !eligibleIds.has(Number(data.team_b_id))){
        throw new Error(`Selecione duas equipes confirmadas com ao menos ${tournament.titulares} jogadores na lineup.`);
    }

    const match = await createMatch({
        ...data,
        tournament_id: Number(data.tournament_id),
        round: Number(data.round),
        team_a_id: Number(data.team_a_id),
        team_b_id: Number(data.team_b_id)
    });

    await initializeMatchCompetition(match.id, tournament.id);
    return match;

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

    if(Array.isArray(data.player_stats)){

        validatePlayerStats(data.player_stats, match);

        await replaceMatchPlayerStats(

            match.id,

            data.player_stats

        );

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

    await dispatchCompetitionEvent(

        COMPETITION_EVENTS.MATCH_RESULT_SAVED,

        {
            match_id: match.id,
            tournament_id: match.tournament_id,
            winner_team_id: winner
        }

    );

    return{

        mensagem:"Resultado registrado com sucesso.",

        event: COMPETITION_EVENTS.MATCH_RESULT_SAVED

    };

}

function validatePlayerStats(playerStats, match){

    for(const stat of playerStats){

        if(!stat.player_id){

            throw new Error("Jogador e obrigatorio nas estatisticas.");

        }

        if(![match.team_a_id, match.team_b_id].includes(stat.team_id)){

            throw new Error("Equipe invalida nas estatisticas da partida.");

        }

        for(const field of ["kills", "deaths", "assists", "headshots"]){

            if(stat[field] !== undefined && Number(stat[field]) < 0){

                throw new Error(`${field} nao pode ser negativo.`);

            }

        }

        if(Number(stat.headshots ?? 0) > Number(stat.kills ?? 0)){

            throw new Error("Headshots nao pode ser maior que kills.");

        }

    }

}
