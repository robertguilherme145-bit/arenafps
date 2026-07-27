import { findProfile }

from "../models/profile.model.js";

import {findProfiles}

from "../models/playerGameProfile.model.js";

import {findUserTeams}

from "../models/team.model.js";

import { getTeamPlayerRanking } from "./teamRanking.service.js";

/**
 * Dashboard do jogador
 */
export async function getDashboard(userId){

    const [profile, games, teams

    ] = await Promise.all([

        findProfile(userId),

        findProfiles(userId),

        findUserTeams(userId)

    ]);

    const teamRankings = await Promise.all(teams.map(async (team) => ({

        team_id: Number(team.id),

        team_name: team.nome,

        team_tag: team.tag,

        game: team.game,

        ...(await getTeamPlayerRanking(team.id))

    })));

    return{profile, games, teams, team_rankings: teamRankings};

}
