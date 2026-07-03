import { findProfile }

from "../models/profile.model.js";

import {findProfiles}

from "../models/playerGameProfile.model.js";

import {findUserTeams}

from "../models/team.model.js";

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

    return{profile, games, teams};

}