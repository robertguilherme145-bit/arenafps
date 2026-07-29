import { findFinishedTournamentMatches, findTournamentByes } from "../models/match.model.js";

export async function getTournamentTeamRanking(tournamentId){

    const [matches, byes] = await Promise.all([findFinishedTournamentMatches(tournamentId), findTournamentByes(tournamentId)]);
    return calculateTournamentRanking(matches, byes);
}

export function calculateTournamentRanking(matches, byes = []){
    const ranking = new Map();

    for(const match of matches){

        ensureTeam(ranking, match.team_a_id, match.team_a_name);
        ensureTeam(ranking, match.team_b_id, match.team_b_name);

        applyTeamResult(
            ranking.get(match.team_a_id),
            match.score_team_a,
            match.score_team_b,
            Number(match.winner_team_id) === Number(match.team_a_id),
            Number(match.maps_played),
            Number(match.rounds_for_a),
            Number(match.rounds_for_b)
        );

        applyTeamResult(
            ranking.get(match.team_b_id),
            match.score_team_b,
            match.score_team_a,
            Number(match.winner_team_id) === Number(match.team_b_id),
            Number(match.maps_played),
            Number(match.rounds_for_b),
            Number(match.rounds_for_a)
        );

    }

    for(const bye of byes){
        ensureTeam(ranking, Number(bye.team_id));
        const team = ranking.get(Number(bye.team_id));
        team.matches += 1;
        team.wins += 1;
        team.byes += 1;
    }

    const rows = [...ranking.values()]
        .map(item => ({
            ...item,
            points: item.wins * 3,
            win_rate: percentage(item.wins, item.matches),
            round_balance_per_map: average(item.round_balance, item.maps_played),
            rounds_for_per_map: average(item.rounds_for, item.maps_played)
        }));

    const tiedGroups = new Map();
    for(const row of rows){
        const key = `${row.points}:${row.win_rate}`;
        if(!tiedGroups.has(key)) tiedGroups.set(key, []);
        tiedGroups.get(key).push(row.team_id);
    }

    for(const row of rows){
        const tied = new Set(tiedGroups.get(`${row.points}:${row.win_rate}`) ?? []);
        const direct = matches.filter(match =>
            tied.has(Number(match.team_a_id)) &&
            tied.has(Number(match.team_b_id)) &&
            (Number(match.team_a_id) === Number(row.team_id) || Number(match.team_b_id) === Number(row.team_id))
        );
        row.head_to_head_points = direct.reduce((points, match) =>
            points + (Number(match.winner_team_id) === Number(row.team_id) ? 3 : 0), 0);
    }

    return rows
        .sort((a, b) =>
            b.points - a.points ||
            b.head_to_head_points - a.head_to_head_points ||
            b.win_rate - a.win_rate ||
            b.round_balance_per_map - a.round_balance_per_map ||
            b.rounds_for_per_map - a.rounds_for_per_map ||
            a.team_id - b.team_id
        )
        .map((item, index) => ({
            position: index + 1,
            ...item
        }));

}

function ensureTeam(ranking, teamId, teamName = null){

    teamId = Number(teamId);

    if(ranking.has(teamId)){
        if(teamName && !ranking.get(teamId).team_name) ranking.get(teamId).team_name = teamName;
        return;
    }

    ranking.set(teamId, {
        team_id: teamId,
        team_name: teamName,
        matches: 0,
        wins: 0,
        losses: 0,
        score_for: 0,
        score_against: 0,
        score_balance: 0,
        maps_played: 0,
        rounds_for: 0,
        rounds_against: 0,
        round_balance: 0,
        byes: 0
    });

}

function applyTeamResult(team, scoreFor, scoreAgainst, won, mapsPlayed, roundsFor, roundsAgainst){

    team.matches += 1;
    team.wins += won ? 1 : 0;
    team.losses += won ? 0 : 1;
    team.score_for += Number(scoreFor ?? 0);
    team.score_against += Number(scoreAgainst ?? 0);
    team.score_balance = team.score_for - team.score_against;
    team.maps_played += Number(mapsPlayed ?? 0);
    team.rounds_for += Number(roundsFor ?? 0);
    team.rounds_against += Number(roundsAgainst ?? 0);
    team.round_balance = team.rounds_for - team.rounds_against;

}

function percentage(value, total){
    return total ? Number(((value / total) * 100).toFixed(2)) : 0;
}

function average(value, total){
    return total ? Number((value / total).toFixed(4)) : 0;
}
