import {
  findTeamPlayerMapStatisticRows,
  findTeamPlayerStatisticRows
} from "../models/teamStatistics.model.js";

export async function getTeamPlayerRanking(teamId) {
  const [players, maps] = await Promise.all([
    findTeamPlayerStatisticRows(teamId),
    findTeamPlayerMapStatisticRows(teamId)
  ]);

  return buildTeamPlayerRanking(teamId, players, maps);
}

export function buildTeamPlayerRanking(teamId, playerRows, mapRows) {
  const mapsByPlayer = new Map();

  for (const row of mapRows) {
    const list = mapsByPlayer.get(Number(row.player_id)) ?? [];
    list.push(normalizeMapStatistics(row));
    mapsByPlayer.set(Number(row.player_id), list);
  }

  const players = playerRows
    .map((row) => {
      const mapStatistics = mapsByPlayer.get(Number(row.player_id)) ?? [];
      const stats = normalizeTotals(row);
      const maps = mapStatistics.reduce((total, item) => total + item.maps, 0);
      const bestMap = [...mapStatistics].sort(compareMaps)[0] ?? null;

      return {
        player_id: Number(row.player_id),
        user_id: Number(row.user_id),
        nick: row.nick || row.nickname || row.nome,
        game_uid: row.game_uid ?? null,
        photo: row.foto || row.avatar || null,
        role: row.cargo,
        lineup_status: row.lineup_status,
        status: row.status,
        ...stats,
        maps,
        kd: ratio(stats.kills, stats.deaths),
        kda: ratio(stats.kills + stats.assists, stats.deaths),
        hs_percent: percent(stats.headshots, stats.kills),
        win_rate: percent(stats.wins, stats.wins + stats.losses),
        kills_per_map: ratio(stats.kills, maps || stats.matches),
        best_map: bestMap ? {
          map_id: bestMap.map_id,
          map_name: bestMap.map_name,
          kills_per_map: bestMap.kills_per_map,
          kd: bestMap.kd
        } : null,
        map_statistics: mapStatistics.sort(compareMaps)
      };
    })
    .sort(comparePlayers)
    .map((player, index) => ({ ...player, position: index + 1 }));

  return {
    team_id: Number(teamId),
    generated_at: new Date().toISOString(),
    players
  };
}

function normalizeTotals(row) {
  return {
    matches: number(row.matches),
    wins: number(row.wins),
    losses: number(row.losses),
    kills: number(row.kills),
    deaths: number(row.deaths),
    assists: number(row.assists),
    headshots: number(row.headshots),
    mvps: number(row.mvps)
  };
}

function normalizeMapStatistics(row) {
  const maps = number(row.maps);
  const kills = number(row.kills);
  const deaths = number(row.deaths);
  const assists = number(row.assists);
  const headshots = number(row.headshots);

  return {
    map_id: Number(row.map_id),
    map_name: row.map_name,
    map_image: row.map_image ?? null,
    maps,
    kills,
    deaths,
    assists,
    headshots,
    mvps: number(row.mvps),
    kd: ratio(kills, deaths),
    kda: ratio(kills + assists, deaths),
    hs_percent: percent(headshots, kills),
    kills_per_map: ratio(kills, maps)
  };
}

function comparePlayers(a, b) {
  return b.kills - a.kills ||
    b.kd - a.kd ||
    b.mvps - a.mvps ||
    b.assists - a.assists ||
    a.nick.localeCompare(b.nick, "pt-BR");
}

function compareMaps(a, b) {
  return b.kills_per_map - a.kills_per_map ||
    b.kd - a.kd ||
    b.maps - a.maps ||
    a.map_name.localeCompare(b.map_name, "pt-BR");
}

function number(value) {
  return Number(value ?? 0);
}

function ratio(numerator, denominator) {
  if (!denominator) return Number(numerator ? numerator : 0);
  return Number((Number(numerator) / Number(denominator)).toFixed(2));
}

function percent(value, total) {
  if (!total) return 0;
  return Number(((Number(value) / Number(total)) * 100).toFixed(1));
}
