import {
  addGameMap,
  addManualMatchMap,
  deactivateGameMap,
  removeCompetitionGame,
  removeGameMap,
  editGameMap,
  getMatchOperations,
  getTournamentCompetition,
  listCompetitionGames,
  listGameMaps,
  listTournamentTeams,
  openMatchVeto,
  performMatchVetoAction,
  recordMatchMapResult,
  resetMatchVeto,
  saveMatchRoomSettings,
  saveGameCompetitionSettings,
  saveMatchMapPlayerStatistics,
  saveMatchPlayerStatistics,
  saveTournamentCompetition
} from "../services/competitionSetup.service.js";
import { generateTournamentStructure } from "../services/tournamentFormat.service.js";
import { closeMatchDiscordRooms, getDiscordServerStatus, setupDiscordServer } from "../services/discordIntegration.service.js";

export async function games(req, res) {
  try {
    return res.json(await listCompetitionGames());
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export async function gameSettings(req, res) {
  try {
    const data = await saveGameCompetitionSettings(req.user, Number(req.params.gameId), req.body);
    return res.json(data);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export async function maps(req, res) {
  try {
    const includeInactive = req.query.include_inactive !== "false";
    return res.json(await listGameMaps(Number(req.params.gameId), includeInactive));
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export async function createMap(req, res) {
  try {
    const data = await addGameMap(req.user, Number(req.params.gameId), req.body);
    return res.status(201).json(data);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export async function updateMap(req, res) {
  try {
    return res.json(await editGameMap(req.user, Number(req.params.mapId), req.body));
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export async function deleteMap(req, res) {
  try {
    return res.json(await removeGameMap(req.user, Number(req.params.mapId)));
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export async function deleteGame(req,res){try{return res.json(await removeCompetitionGame(req.user,Number(req.params.gameId)));}catch(error){return res.status(400).json({erro:error.message});}}

export async function tournamentCompetition(req, res) {
  try {
    return res.json(await getTournamentCompetition(Number(req.params.tournamentId)));
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export async function updateTournamentCompetition(req, res) {
  try {
    const data = await saveTournamentCompetition(req.user, Number(req.params.tournamentId), req.body);
    return res.json(data);
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export async function generateStructure(req, res) {
  try {
    return res.status(201).json(await generateTournamentStructure(req.user, Number(req.params.tournamentId)));
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export async function tournamentTeams(req, res) {
  try {
    return res.json(await listTournamentTeams(Number(req.params.tournamentId)));
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export async function matchOperations(req, res) {
  try {
    return res.json(await getMatchOperations(Number(req.params.matchId)));
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export async function matchRoom(req, res) {
  try {
    return res.json(await saveMatchRoomSettings(req.user, Number(req.params.matchId), req.body));
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export async function closeDiscordRoom(req, res) {
  try {
    return res.json(await closeMatchDiscordRooms(Number(req.params.matchId), { force:true }));
  } catch (error) {
    return res.status(400).json({ erro:error.message });
  }
}

export async function discordServerStatus(req,res){try{return res.json(await getDiscordServerStatus());}catch(error){return res.status(400).json({erro:error.message});}}
export async function syncDiscordServer(req,res){try{return res.json(await setupDiscordServer());}catch(error){return res.status(400).json({erro:error.message});}}

export async function openVeto(req, res) {
  try {
    return res.json(await openMatchVeto(req.user, Number(req.params.matchId)));
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export async function resetVeto(req, res) {
  try {
    return res.json(await resetMatchVeto(req.user, Number(req.params.matchId)));
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export async function vetoAction(req, res) {
  try {
    return res.json(await performMatchVetoAction(req.user, Number(req.params.matchId), req.body));
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export async function manualMatchMap(req, res) {
  try {
    return res.status(201).json(await addManualMatchMap(req.user, Number(req.params.matchId), req.body));
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export async function matchMapResult(req, res) {
  try {
    return res.json(await recordMatchMapResult(req.user, Number(req.params.matchMapId), req.body));
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export async function matchPlayerStatistics(req, res) {
  try {
    return res.json(await saveMatchPlayerStatistics(req.user, Number(req.params.matchId), req.body));
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}

export async function matchMapPlayerStatistics(req, res) {
  try {
    return res.json(await saveMatchMapPlayerStatistics(
      req.user,
      Number(req.params.matchId),
      Number(req.params.matchMapId),
      req.body
    ));
  } catch (error) {
    return res.status(400).json({ erro: error.message });
  }
}
