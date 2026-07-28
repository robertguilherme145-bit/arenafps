import COMPETITION_EVENTS from "../constants/competitionEvents.js";
import TOURNAMENT_STATUS from "../constants/tournamentStatus.js";
import pool from "../config/database.js";

import {
    countConfirmedEntries,
    findEntry,
    updateEntryStatus,
    updatePaymentStatus
} from "../models/entry.model.js";

import {
    changeTournamentStatus,
    findTournament
} from "../models/tournament.model.js";

import { getTournamentTeamRanking } from "./ranking.service.js";
import { getTournamentPlayerStatistics } from "./statistics.service.js";
import { getTournamentOutcomeContext, saveTournamentOutcome } from "../models/tournamentOutcome.model.js";
import { notify } from "./notification.service.js";

export async function dispatchCompetitionEvent(event, payload = {}) {

    switch(event){

        case COMPETITION_EVENTS.PAYMENT_APPROVED:
            return await handlePaymentApproved(payload);

        case COMPETITION_EVENTS.MATCH_RESULT_SAVED:
            return await handleMatchResultSaved(payload);

        default:
            throw new Error(`Evento nao suportado pelo Competition Engine: ${event}`);

    }

}

export async function getNextTournamentAction(tournament) {

    const action = resolveNextTournamentAction(tournament);

    return {
        action,
        message: action ? "Acao definida pelo Competition Engine." : "Nenhuma acao pendente."
    };

}

export function resolveNextTournamentAction(tournament) {

    if(!tournament){
        return null;
    }

    if(tournament.status === TOURNAMENT_STATUS.CREATED){
        return "open_registrations";
    }

    if(
        tournament.status === TOURNAMENT_STATUS.OPEN &&
        Number(tournament.confirmed_entries ?? 0) >= Number(tournament.max_teams ?? 0)
    ){
        return "close_registrations";
    }

    if(tournament.status === TOURNAMENT_STATUS.CLOSED){
        return "start_competition";
    }

    if(
        tournament.status === TOURNAMENT_STATUS.IN_PROGRESS &&
        Number(tournament.pending_matches ?? 0) === 0 &&
        Number(tournament.finished_matches ?? 0) > 0
    ){
        return "finish_tournament";
    }

    return null;

}

async function handlePaymentApproved({ entry_id }) {

    const entry = await findEntry(entry_id);

    if(!entry){
        throw new Error("Inscricao nao encontrada para o evento de pagamento.");
    }

    await updatePaymentStatus(entry.id, "pago");
    await updateEntryStatus(entry.id, "confirmado");

    const tournament = await findTournament(entry.tournament_id);

    if(!tournament){
        throw new Error("Torneio nao encontrado para o evento de pagamento.");
    }

    const confirmedEntries = await countConfirmedEntries(tournament.id);
    const actions = ["entry_confirmed"];

    if(
        tournament.status === TOURNAMENT_STATUS.OPEN &&
        confirmedEntries >= tournament.max_teams
    ){
        await changeTournamentStatus(tournament.id, TOURNAMENT_STATUS.CLOSED);
        actions.push("registrations_closed");
    }

    return {
        event: COMPETITION_EVENTS.PAYMENT_APPROVED,
        actions,
        tournament_id: tournament.id,
        confirmed_entries: confirmedEntries
    };

}

async function handleMatchResultSaved({ tournament_id }) {

    const [ranking, statistics] = await Promise.all([
        getTournamentTeamRanking(tournament_id),
        getTournamentPlayerStatistics(tournament_id)
    ]);

    const outcome = await reconcileTournamentOutcome(tournament_id, ranking);
    return {
        event: COMPETITION_EVENTS.MATCH_RESULT_SAVED,
        actions: [
            "team_ranking_calculated",
            "player_statistics_calculated",
            "history_available_from_matches",
            ...(outcome ? ["tournament_champion_declared"] : [])
        ],
        tournament_id,
        ranking,
        statistics,
        outcome
    };

}

export async function reconcileTournamentOutcome(tournamentId, calculatedRanking = null) {
    const context = await getTournamentOutcomeContext(tournamentId);
    if (!context?.matches.length) return null;
    const pending = context.matches.filter((match) => match.status !== "finalizada");
    if (pending.length) return null;

    const eliminationFormats = new Set(["single_elimination", "double_elimination", "group_playoffs", "mix_single_elimination"]);
    let championTeamId;
    let runnerUpTeamId = null;
    let finalMatchId = null;
    if (eliminationFormats.has(context.tournament.format)) {
        const expectedMinimum = Math.max(1, context.confirmed_entries - 1);
        if (context.matches.length < expectedMinimum) return null;
        const finalMatch = [...context.matches].sort((a,b) => Number(b.round)-Number(a.round) || Number(b.id)-Number(a.id))[0];
        if (!finalMatch.winner_team_id) return null;
        championTeamId = Number(finalMatch.winner_team_id);
        runnerUpTeamId = championTeamId === Number(finalMatch.team_a_id) ? Number(finalMatch.team_b_id) : Number(finalMatch.team_a_id);
        finalMatchId = Number(finalMatch.id);
    } else {
        const ranking = calculatedRanking ?? await getTournamentTeamRanking(tournamentId);
        if (!ranking?.length) return null;
        championTeamId = Number(ranking[0].team_id);
        runnerUpTeamId = ranking[1] ? Number(ranking[1].team_id) : null;
    }

    await saveTournamentOutcome({ tournament_id:tournamentId, champion_team_id:championTeamId, runner_up_team_id:runnerUpTeamId, final_match_id:finalMatchId });
    const [members] = await pool.query(`SELECT DISTINCT user_id FROM team_members WHERE team_id=? AND status='ativo' UNION SELECT user_id FROM mix_registrations WHERE assigned_team_id=? AND status='assigned'`, [championTeamId,championTeamId]);
    await Promise.all(members.map((member) => notify({ user_id:member.user_id, titulo:"Campeoes do torneio", mensagem:`Sua equipe venceu ${context.tournament.nome}.`, tipo:"tournament_champion", link:`/torneios/${tournamentId}`, dedupe_key:`tournament:${tournamentId}:champion:${member.user_id}` })));
    return { champion_team_id:championTeamId, runner_up_team_id:runnerUpTeamId, final_match_id:finalMatchId };
}
