import { findFinishedTournamentMatches } from "../models/match.model.js";

export async function getTournamentTeamRanking(tournamentId){

    const matches = await findFinishedTournamentMatches(tournamentId);
    const ranking = new Map();

    for(const match of matches){

        ensureTeam(ranking, match.team_a_id);
        ensureTeam(ranking, match.team_b_id);

        applyTeamResult(
            ranking.get(match.team_a_id),
            match.score_team_a,
            match.score_team_b,
            match.winner_team_id === match.team_a_id
        );

        applyTeamResult(
            ranking.get(match.team_b_id),
            match.score_team_b,
            match.score_team_a,
            match.winner_team_id === match.team_b_id
        );

    }

    return [...ranking.values()]
        .map(item => ({
            ...item,
            win_rate: item.matches ? Number(((item.wins / item.matches) * 100).toFixed(2)) : 0
        }))
        .sort((a, b) =>
            b.wins - a.wins ||
            b.score_balance - a.score_balance ||
            b.score_for - a.score_for ||
            a.team_id - b.team_id
        )
        .map((item, index) => ({
            position: index + 1,
            ...item
        }));

}

function ensureTeam(ranking, teamId){

    if(ranking.has(teamId)){
        return;
    }

    ranking.set(teamId, {
        team_id: teamId,
        matches: 0,
        wins: 0,
        losses: 0,
        score_for: 0,
        score_against: 0,
        score_balance: 0
    });

}

function applyTeamResult(team, scoreFor, scoreAgainst, won){

    team.matches += 1;
    team.wins += won ? 1 : 0;
    team.losses += won ? 0 : 1;
    team.score_for += Number(scoreFor ?? 0);
    team.score_against += Number(scoreAgainst ?? 0);
    team.score_balance = team.score_for - team.score_against;

}
