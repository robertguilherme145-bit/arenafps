import { findTournamentPlayerStats } from "../models/match.model.js";

export async function getTournamentPlayerStatistics(tournamentId){

    const rows = await safeFindTournamentPlayerStats(tournamentId);
    const statistics = new Map();

    for(const row of rows){

        if(!statistics.has(row.player_id)){

            statistics.set(row.player_id, {
                player_id: row.player_id,
                nick: row.nick,
                team_id: row.team_id,
                team: row.team,
                matches: 0,
                wins: 0,
                losses: 0,
                kills: 0,
                deaths: 0,
                assists: 0,
                headshots: 0,
                mvps: 0
            });

        }

        const player = statistics.get(row.player_id);

        player.matches += 1;
        player.wins += row.winner_team_id === row.team_id ? 1 : 0;
        player.losses += row.winner_team_id === row.team_id ? 0 : 1;
        player.kills += Number(row.kills ?? 0);
        player.deaths += Number(row.deaths ?? 0);
        player.assists += Number(row.assists ?? 0);
        player.headshots += Number(row.headshots ?? 0);
        player.mvps += row.mvp ? 1 : 0;

    }

    return [...statistics.values()]
        .map(player => ({
            ...player,
            kd: player.deaths ? Number((player.kills / player.deaths).toFixed(2)) : player.kills,
            hs_percent: player.kills ? Number(((player.headshots / player.kills) * 100).toFixed(2)) : 0,
            win_rate: player.matches ? Number(((player.wins / player.matches) * 100).toFixed(2)) : 0
        }))
        .sort((a, b) =>
            b.kills - a.kills ||
            b.kd - a.kd ||
            b.mvps - a.mvps ||
            a.nick.localeCompare(b.nick)
        );

}

async function safeFindTournamentPlayerStats(tournamentId){

    try{

        return await findTournamentPlayerStats(tournamentId);

    }
    catch(err){

        if(err.code === "ER_NO_SUCH_TABLE"){
            return [];
        }

        throw err;

    }

}
