import { createAuditLog } from "../models/auditLog.model.js";
import {
  createGameMap,
  createMatchMap,
  createOrOpenVetoSession,
  findGameMap,
  findGameMapBySlug,
  findMatchMap,
  getGameMaps,
  getGamesForAdmin,
  getMatchCompetitionRecord,
  getMatchMapPlayerStatistics,
  getMatchMaps,
  getMatchPlayerStatistics,
  getMatchRosters,
  getTournamentCompetitionRecord,
  getTournamentEligibleTeams,
  getTournamentMapPool,
  getVetoActions,
  getVetoSession,
  insertVetoAction,
  resetVetoData,
  saveMatchMapResult,
  saveTournamentCompetitionRecord,
  updateGameMap,
  updateMatchRoomSettings,
  updateVetoProgress,
  upsertGameSettings,
  upsertMatchCompetitionSettings
} from "../models/competitionSetup.model.js";
import { findGame } from "../models/game.model.js";
import { finishMatch, replaceMatchMapPlayerStats, replaceMatchPlayerStats } from "../models/match.model.js";
import { findMembershipByUserAndTeam } from "../models/team.model.js";
import { dispatchCompetitionEvent } from "./competitionEngine.service.js";
import COMPETITION_EVENTS from "../constants/competitionEvents.js";

const BEST_OF_VALUES = ["bo1", "bo3", "bo5"];
const FORMATS = [
  "single_elimination",
  "double_elimination",
  "swiss",
  "round_robin",
  "group_playoffs",
  "league",
  "custom"
];

export async function listCompetitionGames() {
  return await getGamesForAdmin();
}

export async function saveGameCompetitionSettings(adminUser, gameId, payload) {
  const game = await requireGame(gameId);
  const defaultBestOf = BEST_OF_VALUES.includes(payload.default_best_of)
    ? payload.default_best_of
    : "bo3";

  const data = {
    player_id_label: String(payload.player_id_label ?? "ID do jogador").trim() || "ID do jogador",
    player_id_required: payload.player_id_required === false ? 0 : 1,
    default_best_of: defaultBestOf
  };

  await upsertGameSettings(game.id, data);
  await audit(adminUser, "game.settings.updated", "game", game.id, data);
  return data;
}

export async function listGameMaps(gameId, includeInactive = true) {
  await requireGame(gameId);
  return await getGameMaps(gameId, includeInactive);
}

export async function addGameMap(adminUser, gameId, payload) {
  const game = await requireGame(gameId);
  const data = normalizeMapPayload(payload, { game_id: game.id });
  const duplicate = await findGameMapBySlug(game.id, data.slug);

  if (duplicate) {
    throw new Error("Este jogo ja possui um mapa com o mesmo slug.");
  }

  const created = await createGameMap(data);
  await audit(adminUser, "game.map.created", "game_map", created.id, data);
  return created;
}

export async function editGameMap(adminUser, mapId, payload) {
  const current = await requireMap(mapId);
  const data = normalizeMapPayload(payload, current);
  const duplicate = await findGameMapBySlug(current.game_id, data.slug);

  if (duplicate && Number(duplicate.id) !== Number(current.id)) {
    throw new Error("Este jogo ja possui um mapa com o mesmo slug.");
  }

  await updateGameMap(current.id, data);
  await audit(adminUser, "game.map.updated", "game_map", current.id, {
    previous: current,
    next: data
  });
  return { ...current, ...data };
}

export async function deactivateGameMap(adminUser, mapId) {
  return await editGameMap(adminUser, mapId, { ativo: false });
}

export async function getTournamentCompetition(tournamentId) {
  const record = await getTournamentCompetitionRecord(tournamentId);

  if (!record) {
    throw new Error("Torneio nao encontrado.");
  }

  const gameId = Number(record.game_id ?? record.legacy_game_id);
  const [allMaps, mapPool] = await Promise.all([
    gameId ? getGameMaps(gameId, false) : Promise.resolve([]),
    getTournamentMapPool(tournamentId)
  ]);
  const bestOf = record.best_of ?? "bo3";
  const vetoOrder = parseVetoOrder(record.veto_order) ?? buildDefaultVetoOrder(bestOf, mapPool.length || allMaps.length);

  return {
    tournament_id: Number(record.tournament_id),
    tournament_name: record.tournament_name,
    tournament_status: record.tournament_status,
    game_id: gameId || null,
    game_name: record.game_name ?? null,
    game_short_name: record.game_short_name ?? null,
    format: record.format ?? "single_elimination",
    best_of: bestOf,
    pick_ban_enabled: record.pick_ban_enabled === null || record.pick_ban_enabled === undefined
      ? true
      : Boolean(record.pick_ban_enabled),
    veto_order: vetoOrder,
    auto_decider: record.auto_decider === null || record.auto_decider === undefined
      ? true
      : Boolean(record.auto_decider),
    overtime_enabled: record.overtime_enabled === null || record.overtime_enabled === undefined
      ? true
      : Boolean(record.overtime_enabled),
    initial_side: record.initial_side ?? "knife",
    pause_minutes: Number(record.pause_minutes ?? 5),
    walkover_minutes: Number(record.walkover_minutes ?? 15),
    tiebreakers: record.tiebreakers ?? "Confronto direto, saldo de rounds, rounds vencidos",
    seed_mode: record.seed_mode ?? "automatic",
    registration_approval: record.registration_approval ?? "manual",
    map_ids: mapPool.map((map) => Number(map.id)),
    map_pool: mapPool,
    available_maps: allMaps
  };
}

export async function saveTournamentCompetition(adminUser, tournamentId, payload) {
  const tournament = await getTournamentCompetitionRecord(tournamentId);

  if (!tournament) {
    throw new Error("Torneio nao encontrado.");
  }

  const game = await requireGame(payload.game_id ?? tournament.game_id ?? tournament.legacy_game_id);
  const bestOf = BEST_OF_VALUES.includes(payload.best_of) ? payload.best_of : "bo3";
  const format = FORMATS.includes(payload.format) ? payload.format : "single_elimination";
  const allGameMaps = await getGameMaps(game.id, false);
  const mapIds = [...new Set((payload.map_ids ?? []).map(Number).filter(Number.isInteger))];
  const validMapIds = new Set(allGameMaps.map((map) => Number(map.id)));

  if (mapIds.some((mapId) => !validMapIds.has(mapId))) {
    throw new Error("O map pool contem mapas que nao pertencem ao jogo selecionado.");
  }

  const requiredMaps = bestOfNumber(bestOf);
  const pickBanEnabled = payload.pick_ban_enabled !== false;

  if (pickBanEnabled && mapIds.length < requiredMaps) {
    throw new Error(`Uma serie ${bestOf.toUpperCase()} exige ao menos ${requiredMaps} mapas no map pool.`);
  }

  const vetoOrder = normalizeVetoOrder(
    payload.veto_order?.length ? payload.veto_order : buildDefaultVetoOrder(bestOf, mapIds.length)
  );

  if (pickBanEnabled) {
    validateVetoOrder(vetoOrder, bestOf, mapIds.length);
  }

  const data = {
    game_id: game.id,
    format,
    best_of: bestOf,
    pick_ban_enabled: pickBanEnabled ? 1 : 0,
    veto_order: vetoOrder,
    auto_decider: payload.auto_decider === false ? 0 : 1,
    overtime_enabled: payload.overtime_enabled === false ? 0 : 1,
    initial_side: String(payload.initial_side ?? "knife").trim() || "knife",
    pause_minutes: nonNegativeInteger(payload.pause_minutes, 5),
    walkover_minutes: nonNegativeInteger(payload.walkover_minutes, 15),
    tiebreakers: String(payload.tiebreakers ?? "").trim() || null,
    seed_mode: payload.seed_mode === "manual" ? "manual" : "automatic",
    registration_approval: payload.registration_approval === "automatic" ? "automatic" : "manual"
  };

  await saveTournamentCompetitionRecord(Number(tournamentId), data, mapIds);
  await audit(adminUser, "tournament.competition.updated", "tournament", tournamentId, {
    ...data,
    map_ids: mapIds
  });
  return await getTournamentCompetition(tournamentId);
}

export async function listTournamentTeams(tournamentId) {
  const tournament = await getTournamentCompetitionRecord(tournamentId);
  if (!tournament) throw new Error("Torneio nao encontrado.");
  return await getTournamentEligibleTeams(tournamentId);
}

export async function initializeMatchCompetition(matchId, tournamentId) {
  const competition = await getTournamentCompetition(tournamentId);
  await upsertMatchCompetitionSettings(matchId, {
    best_of: competition.best_of,
    pick_ban_enabled: competition.pick_ban_enabled ? 1 : 0,
    server_address: null
  });
}

export async function getMatchOperations(matchId) {
  const match = await getMatchCompetitionRecord(matchId);
  if (!match) throw new Error("Partida nao encontrada.");

  const [mapPool, maps, rosters, playerStats, mapPlayerStats, session] = await Promise.all([
    getTournamentMapPool(match.tournament_id),
    getMatchMaps(match.id),
    getMatchRosters(match.id),
    getMatchPlayerStatistics(match.id),
    getMatchMapPlayerStatistics(match.id),
    getVetoSession(match.id)
  ]);
  const actions = session ? await getVetoActions(session.id) : [];
  const vetoOrder = parseVetoOrder(match.veto_order) ?? buildDefaultVetoOrder(match.best_of, mapPool.length);

  return {
    match: normalizeMatchRecord(match),
    map_pool: mapPool,
    maps,
    rosters,
    player_stats: playerStats,
    map_player_stats: mapPlayerStats,
    veto: session ? {
      ...session,
      actions,
      expected_step: vetoOrder[Number(session.current_step)] ?? null,
      order: vetoOrder
    } : {
      status: "aguardando",
      current_step: 0,
      actions: [],
      expected_step: vetoOrder[0] ?? null,
      order: vetoOrder
    }
  };
}

export async function saveMatchRoomSettings(adminUser, matchId, payload) {
  const match = await requireMatchOperationsBase(matchId);
  await upsertMatchCompetitionSettings(match.id, {
    best_of: match.best_of,
    pick_ban_enabled: match.pick_ban_enabled ? 1 : 0,
    server_address: match.server_address
  });
  const seconds = Math.min(120, Math.max(10, Number(payload.veto_action_seconds ?? match.veto_action_seconds ?? 30)));
  await updateMatchRoomSettings(match.id, {
    server_address: optionalText(payload.server_address, 255),
    server_password: optionalText(payload.server_password, 120),
    responsible_admin_id: payload.responsible_admin_id ? Number(payload.responsible_admin_id) : adminUser.id,
    captain_confirmation_enabled: payload.captain_confirmation_enabled !== false,
    veto_action_seconds: Number.isFinite(seconds) ? Math.round(seconds) : 30
  });
  await audit(adminUser, "match.room.updated", "match", match.id, { server_address: optionalText(payload.server_address, 255), veto_action_seconds: seconds });
  return await getMatchOperations(match.id);
}

export async function openMatchVeto(adminUser, matchId) {
  const match = await requireMatchOperationsBase(matchId);

  if (!Boolean(match.pick_ban_enabled)) {
    throw new Error("O pick/ban esta desativado para esta partida.");
  }

  const pool = await getTournamentMapPool(match.tournament_id);
  if (!pool.length) throw new Error("Configure o map pool do torneio antes de liberar o pick/ban.");

  const existing = await getVetoSession(match.id);
  if (existing) {
    const actions = await getVetoActions(existing.id);
    if (actions.length) throw new Error("O pick/ban ja possui acoes. Use refazer para reiniciar.");
  }

  if (match.status === "finalizada") throw new Error("Uma partida finalizada nao pode iniciar um novo Pick & Ban.");
  await createOrOpenVetoSession(match.id, adminUser.id, match.veto_action_seconds);
  await audit(adminUser, "match.veto.opened", "match", match.id, null);
  return await getMatchOperations(match.id);
}

export async function resetMatchVeto(adminUser, matchId) {
  const match = await requireMatchOperationsBase(matchId);
  await resetVetoData(match.id);
  await audit(adminUser, "match.veto.reset", "match", match.id, null);
  return await getMatchOperations(match.id);
}

export async function performMatchVetoAction(adminUser, matchId, payload) {
  const match = await requireMatchOperationsBase(matchId);
  const session = await getVetoSession(match.id);

  if (!session || session.status !== "liberado") {
    throw new Error("Libere o pick/ban antes de registrar a acao.");
  }

  const mapPool = await getTournamentMapPool(match.tournament_id);
  const order = parseVetoOrder(match.veto_order) ?? buildDefaultVetoOrder(match.best_of, mapPool.length);
  const actions = await getVetoActions(session.id);
  const expected = order[actions.length];

  if (!expected) throw new Error("O pick/ban ja foi concluido.");

  const expectedTeamId = resolveStepTeamId(expected.team, match);
  const requestedAction = String(payload.action ?? expected.action);
  const mapId = Number(payload.game_map_id);

  if (requestedAction !== expected.action) {
    throw new Error(`A proxima acao obrigatoria e ${expected.action}.`);
  }

  if (expectedTeamId && Number(payload.team_id ?? expectedTeamId) !== expectedTeamId) {
    throw new Error("A acao foi enviada para a equipe errada na ordem do veto.");
  }

  await validateAvailableVetoMap(mapId, mapPool, actions);
  await persistVetoAction({
    adminUser,
    match,
    session,
    action: requestedAction,
    mapId,
    teamId: expectedTeamId,
    sequenceNumber: actions.length + 1,
    orderLength: order.length
  });

  await completeAutomaticDecider(adminUser, match, session, order, mapPool);
  await audit(adminUser, "match.veto.action", "match", match.id, {
    action: requestedAction,
    game_map_id: mapId,
    team_id: expectedTeamId
  });
  return await getMatchOperations(match.id);
}

export async function performParticipantVetoAction(user, matchId, payload) {
  await resolveExpiredVetoAction(matchId);
  const match = await requireMatchOperationsBase(matchId);
  if (match.status === "finalizada") throw new Error("A partida ja foi finalizada.");
  const session = await getVetoSession(match.id);

  if (!session || session.status !== "liberado") {
    throw new Error("O administrador ainda nao liberou o Pick & Ban.");
  }

  const mapPool = await getTournamentMapPool(match.tournament_id);
  const order = parseVetoOrder(match.veto_order) ?? buildDefaultVetoOrder(match.best_of, mapPool.length);
  const actions = await getVetoActions(session.id);
  const expected = order[actions.length];

  if (!expected) throw new Error("O Pick & Ban ja foi concluido.");
  const expectedTeamId = resolveStepTeamId(expected.team, match);
  if (!expectedTeamId) throw new Error("A proxima etapa e automatica.");

  const membership = await findMembershipByUserAndTeam(user.id, expectedTeamId);
  if (!membership || !["leader", "captain"].includes(membership.cargo) || membership.status === "inativo") {
    throw new Error("A vez pertence a outra equipe ou sua conta nao pode operar o veto.");
  }

  const requestedAction = String(payload.action ?? expected.action);
  const mapId = Number(payload.game_map_id);
  if (requestedAction !== expected.action) throw new Error(`A proxima acao obrigatoria e ${expected.action}.`);

  await validateAvailableVetoMap(mapId, mapPool, actions);
  await persistVetoAction({
    adminUser: user,
    match,
    session,
    action: requestedAction,
    mapId,
    teamId: expectedTeamId,
    sequenceNumber: actions.length + 1,
    orderLength: order.length,
    adminForced: false
  });
  await completeAutomaticDecider(user, match, session, order, mapPool, false);
  await audit(user, "match.veto.participant_action", "match", match.id, {
    action: requestedAction,
    game_map_id: mapId,
    team_id: expectedTeamId
  });
  return await getMatchOperations(match.id);
}

export async function resolveExpiredVetoAction(matchId) {
  const match = await requireMatchOperationsBase(matchId);
  const session = await getVetoSession(match.id);
  if (!session || session.status !== "liberado" || !session.action_deadline || !Boolean(session.deadline_expired)) return null;
  if (match.status === "finalizada") return null;

  const [mapPool, actions] = await Promise.all([getTournamentMapPool(match.tournament_id), getVetoActions(session.id)]);
  const order = parseVetoOrder(match.veto_order) ?? buildDefaultVetoOrder(match.best_of, mapPool.length);
  const expected = order[actions.length];
  if (!expected) return null;
  const used = new Set(actions.map((action) => Number(action.game_map_id)));
  const selected = mapPool.find((map) => Boolean(map.ativo) && !used.has(Number(map.id)));
  if (!selected) return null;

  try {
    await persistVetoAction({
      adminUser: { id: null },
      match,
      session,
      action: expected.action,
      mapId: Number(selected.id),
      teamId: resolveStepTeamId(expected.team, match),
      sequenceNumber: actions.length + 1,
      orderLength: order.length,
      adminForced: true
    });
    await completeAutomaticDecider({ id: null }, match, session, order, mapPool, true);
  } catch (error) {
    if (error?.code !== "ER_DUP_ENTRY") throw error;
  }
  return await getMatchOperations(match.id);
}

export async function addManualMatchMap(adminUser, matchId, payload) {
  const match = await requireMatchOperationsBase(matchId);
  const mapPool = await getTournamentMapPool(match.tournament_id);
  const maps = await getMatchMaps(match.id);
  const mapId = Number(payload.game_map_id);

  await validateAvailableVetoMap(mapId, mapPool, maps.map((map) => ({ game_map_id: map.game_map_id })));

  const limit = bestOfNumber(match.best_of);
  if (maps.length >= limit) throw new Error(`A serie ${match.best_of.toUpperCase()} ja possui todos os mapas.`);

  await createMatchMap({
    match_id: match.id,
    game_map_id: mapId,
    map_number: maps.length + 1,
    selected_by_team_id: payload.team_id ? Number(payload.team_id) : null,
    selection_type: "manual"
  });
  await audit(adminUser, "match.map.manual", "match", match.id, { game_map_id: mapId });
  return await getMatchOperations(match.id);
}

export async function recordMatchMapResult(adminUser, matchMapId, payload) {
  const matchMap = await findMatchMap(matchMapId);
  if (!matchMap) throw new Error("Mapa da partida nao encontrado.");
  if (matchMap.status === "finalizado") throw new Error("Este mapa ja foi finalizado.");

  const match = await requireMatchOperationsBase(matchMap.match_id);
  const scoreA = nonNegativeInteger(payload.score_team_a, 0);
  const scoreB = nonNegativeInteger(payload.score_team_b, 0);
  if (scoreA === scoreB) throw new Error("O mapa precisa ter um vencedor.");

  const winner = scoreA > scoreB ? Number(match.team_a_id) : Number(match.team_b_id);
  await saveMatchMapResult(matchMap.id, {
    score_team_a: scoreA,
    score_team_b: scoreB,
    winner_team_id: winner
  });

  const maps = await getMatchMaps(match.id);
  const winsA = maps.filter((map) => Number(map.winner_team_id) === Number(match.team_a_id)).length;
  const winsB = maps.filter((map) => Number(map.winner_team_id) === Number(match.team_b_id)).length;
  const winsNeeded = Math.floor(bestOfNumber(match.best_of) / 2) + 1;

  if (winsA >= winsNeeded || winsB >= winsNeeded) {
    const seriesWinner = winsA > winsB ? match.team_a_id : match.team_b_id;
    await finishMatch(match.id, seriesWinner, winsA, winsB);
    await dispatchCompetitionEvent(COMPETITION_EVENTS.MATCH_RESULT_SAVED, {
      match_id: match.id,
      tournament_id: match.tournament_id,
      winner_team_id: seriesWinner
    });
  }

  await audit(adminUser, "match.map.result", "match_map", matchMap.id, {
    score_team_a: scoreA,
    score_team_b: scoreB,
    winner_team_id: winner,
    series_score: [winsA, winsB]
  });
  return await getMatchOperations(match.id);
}

export async function saveMatchPlayerStatistics(adminUser, matchId, payload) {
  const match = await requireMatchOperationsBase(matchId);
  const detailedStats = await getMatchMapPlayerStatistics(match.id);

  if (detailedStats.length) {
    throw new Error("Esta partida usa sumulas por mapa. Edite as estatisticas no mapa correspondente.");
  }

  const normalized = await normalizePlayerStatistics(match, payload, "partida");

  await replaceMatchPlayerStats(match.id, normalized);
  await dispatchCompetitionEvent(COMPETITION_EVENTS.MATCH_RESULT_SAVED, {
    match_id: match.id,
    tournament_id: match.tournament_id,
    winner_team_id: match.winner_team_id
  });
  await audit(adminUser, "match.player_stats.saved", "match", match.id, {
    players: normalized.map((item) => item.player_id),
    legacy_total: true
  });
  return await getMatchOperations(match.id);
}

export async function saveMatchMapPlayerStatistics(adminUser, matchId, matchMapId, payload) {
  const match = await requireMatchOperationsBase(matchId);
  const matchMap = await findMatchMap(matchMapId);

  if (!matchMap || Number(matchMap.match_id) !== Number(match.id)) {
    throw new Error("O mapa informado nao pertence a esta partida.");
  }

  if (matchMap.status !== "finalizado") {
    throw new Error("Salve o resultado do mapa antes de registrar a sumula dos jogadores.");
  }

  const normalized = await normalizePlayerStatistics(match, payload, "mapa");

  await replaceMatchMapPlayerStats(match.id, matchMap.id, normalized);
  await dispatchCompetitionEvent(COMPETITION_EVENTS.MATCH_RESULT_SAVED, {
    match_id: match.id,
    match_map_id: matchMap.id,
    tournament_id: match.tournament_id,
    winner_team_id: match.winner_team_id
  });
  await audit(adminUser, "match.map_player_stats.saved", "match_map", matchMap.id, {
    match_id: match.id,
    map_number: matchMap.map_number,
    players: normalized.map((item) => item.player_id)
  });
  return await getMatchOperations(match.id);
}

async function normalizePlayerStatistics(match, payload, mvpScope) {
  const rosters = await getMatchRosters(match.id);
  const eligiblePlayers = new Map(rosters.map((player) => [Number(player.id), player]));
  const stats = Array.isArray(payload.player_stats) ? payload.player_stats : [];

  if (!stats.length) throw new Error("Informe as estatisticas de ao menos um jogador.");

  const uniqueIds = new Set(stats.map((item) => Number(item.player_id)));
  if (uniqueIds.size !== stats.length) throw new Error("Ha jogadores repetidos na sumula.");
  if (stats.filter((item) => Boolean(item.mvp)).length > 1) throw new Error(`Selecione no maximo um MVP por ${mvpScope}.`);

  return stats.map((item) => {
    const player = eligiblePlayers.get(Number(item.player_id));
    if (!player) throw new Error(`Jogador #${item.player_id} nao pertence as equipes desta partida.`);
    if (!player.in_lineup) throw new Error(`Jogador #${item.player_id} nao pertence a lineup oficial desta partida.`);

    const stat = {
      player_id: Number(player.id),
      team_id: Number(player.team_id),
      kills: nonNegativeInteger(item.kills, 0),
      deaths: nonNegativeInteger(item.deaths, 0),
      assists: nonNegativeInteger(item.assists, 0),
      headshots: nonNegativeInteger(item.headshots, 0),
      mvp: Boolean(item.mvp)
    };

    if (stat.headshots > stat.kills) throw new Error(`Headshots de ${player.nick} nao pode superar as kills.`);
    return stat;
  });
}

function normalizeMapPayload(payload = {}, current = {}) {
  const nome = String(payload.nome ?? current.nome ?? "").trim();
  const slug = slugify(payload.slug ?? current.slug ?? nome);
  if (nome.length < 2) throw new Error("Informe o nome do mapa.");
  if (!slug) throw new Error("Informe um slug valido para o mapa.");

  return {
    game_id: Number(current.game_id ?? payload.game_id),
    nome,
    slug,
    imagem: payload.imagem !== undefined ? payload.imagem || null : current.imagem ?? null,
    ativo: payload.ativo !== undefined ? (payload.ativo ? 1 : 0) : Number(current.ativo ?? 1),
    ordem: nonNegativeInteger(payload.ordem ?? current.ordem, 0)
  };
}

function normalizeVetoOrder(order) {
  return order.map((step) => ({
    action: ["ban", "pick", "decider"].includes(step.action) ? step.action : "ban",
    team: step.action === "decider" ? "SYSTEM" : step.team === "B" ? "B" : "A"
  }));
}

function validateVetoOrder(order, bestOf, mapCount) {
  if (!order.length) throw new Error("Defina ao menos uma etapa para o pick/ban.");
  if (order.length > mapCount) throw new Error("O veto possui mais etapas do que mapas no map pool.");

  const selectedMaps = order.filter((step) => step.action === "pick" || step.action === "decider").length;
  if (selectedMaps !== bestOfNumber(bestOf)) {
    throw new Error(`A ordem do veto deve selecionar exatamente ${bestOfNumber(bestOf)} mapas para ${bestOf.toUpperCase()}.`);
  }
}

export function buildDefaultVetoOrder(bestOf, mapCount) {
  if (Number(mapCount) <= 0) return [];
  const seriesMaps = Math.min(bestOfNumber(bestOf), Math.max(1, mapCount));
  const totalBans = Math.max(0, mapCount - seriesMaps);
  const preBans = bestOf === "bo1" ? totalBans : Math.min(2, totalBans);
  const order = [];

  for (let index = 0; index < preBans; index += 1) {
    order.push({ action: "ban", team: index % 2 === 0 ? "A" : "B" });
  }

  for (let index = 0; index < Math.max(0, seriesMaps - 1); index += 1) {
    order.push({ action: "pick", team: index % 2 === 0 ? "A" : "B" });
  }

  for (let index = preBans; index < totalBans; index += 1) {
    order.push({ action: "ban", team: index % 2 === 0 ? "A" : "B" });
  }

  order.push({ action: "decider", team: "SYSTEM" });
  return order;
}

async function persistVetoAction({ adminUser, match, session, action, mapId, teamId, sequenceNumber, orderLength, adminForced = true }) {
  await insertVetoAction({
    session_id: session.id,
    sequence_number: sequenceNumber,
    team_id: teamId,
    game_map_id: mapId,
    action,
    performed_by_user_id: adminUser.id,
    admin_forced: adminForced ? 1 : 0
  });

  if (action === "pick" || action === "decider") {
    const maps = await getMatchMaps(match.id);
    await createMatchMap({
      match_id: match.id,
      game_map_id: mapId,
      map_number: maps.length + 1,
      selected_by_team_id: action === "pick" ? teamId : null,
      selection_type: action
    });
  }

  await updateVetoProgress(session.id, sequenceNumber, sequenceNumber >= orderLength);
}

async function completeAutomaticDecider(adminUser, match, session, order, mapPool, adminForced = true) {
  if (!Boolean(match.auto_decider)) return;
  const actions = await getVetoActions(session.id);
  const expected = order[actions.length];
  if (!expected || expected.action !== "decider") return;

  const used = new Set(actions.map((action) => Number(action.game_map_id)));
  const remaining = mapPool.filter((map) => !used.has(Number(map.id)));
  if (remaining.length !== 1) return;

  await persistVetoAction({
    adminUser,
    match,
    session,
    action: "decider",
    mapId: Number(remaining[0].id),
    teamId: null,
    sequenceNumber: actions.length + 1,
    orderLength: order.length,
    adminForced
  });
}

async function validateAvailableVetoMap(mapId, mapPool, usedItems) {
  const allowed = mapPool.some((map) => Number(map.id) === mapId && Boolean(map.ativo));
  if (!allowed) throw new Error("O mapa selecionado nao pertence ao map pool ativo do torneio.");

  const alreadyUsed = usedItems.some((item) => Number(item.game_map_id) === mapId);
  if (alreadyUsed) throw new Error("Este mapa ja foi usado no pick/ban.");
}

function resolveStepTeamId(team, match) {
  if (team === "A") return Number(match.team_a_id);
  if (team === "B") return Number(match.team_b_id);
  return null;
}

async function requireGame(gameId) {
  const game = await findGame(Number(gameId));
  if (!game) throw new Error("Jogo nao encontrado.");
  return game;
}

async function requireMap(mapId) {
  const map = await findGameMap(Number(mapId));
  if (!map) throw new Error("Mapa nao encontrado.");
  return map;
}

async function requireMatchOperationsBase(matchId) {
  const match = await getMatchCompetitionRecord(Number(matchId));
  if (!match) throw new Error("Partida nao encontrada.");
  return normalizeMatchRecord(match);
}

function normalizeMatchRecord(match) {
  return {
    ...match,
    id: Number(match.id),
    tournament_id: Number(match.tournament_id),
    team_a_id: Number(match.team_a_id),
    team_b_id: Number(match.team_b_id),
    game_id: match.game_id ? Number(match.game_id) : null,
    pick_ban_enabled: Boolean(match.pick_ban_enabled),
    auto_decider: Boolean(match.auto_decider),
    captain_confirmation_enabled: Boolean(match.captain_confirmation_enabled),
    veto_action_seconds: Number(match.veto_action_seconds ?? 30)
  };
}

function parseVetoOrder(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function bestOfNumber(value) {
  return Number(String(value ?? "bo3").replace("bo", "")) || 3;
}

function nonNegativeInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function optionalText(value, maxLength) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, maxLength) : null;
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function audit(adminUser, action, entityType, entityId, details) {
  await createAuditLog({
    actor_user_id: adminUser.id,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    details
  });
}
