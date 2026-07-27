import test from "node:test";
import assert from "node:assert/strict";
import { buildTeamPlayerRanking } from "../src/services/teamRanking.service.js";

test("classifica elenco por kills, kd e mvps usando apenas dados recebidos", () => {
  const ranking = buildTeamPlayerRanking(10, [
    { player_id: 1, user_id: 11, nick: "Alpha", cargo: "captain", lineup_status: "titular", status: "ativo", matches: 2, wins: 1, losses: 1, kills: 30, deaths: 20, assists: 10, headshots: 15, mvps: 2 },
    { player_id: 2, user_id: 12, nick: "Bravo", cargo: "player", lineup_status: "titular", status: "ativo", matches: 2, wins: 1, losses: 1, kills: 34, deaths: 30, assists: 8, headshots: 12, mvps: 1 },
    { player_id: 3, user_id: 13, nick: "Charlie", cargo: "player", lineup_status: "reserva", status: "ativo", matches: 0, wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0, headshots: 0, mvps: 0 }
  ], [
    { player_id: 1, map_id: 5, map_name: "Mirage", maps: 2, kills: 30, deaths: 20, assists: 10, headshots: 15, mvps: 2 },
    { player_id: 2, map_id: 5, map_name: "Mirage", maps: 2, kills: 34, deaths: 30, assists: 8, headshots: 12, mvps: 1 }
  ]);

  assert.equal(ranking.team_id, 10);
  assert.deepEqual(ranking.players.map((player) => player.player_id), [2, 1, 3]);
  assert.equal(ranking.players[0].position, 1);
  assert.equal(ranking.players[0].kills_per_map, 17);
  assert.equal(ranking.players[1].kd, 1.5);
  assert.equal(ranking.players[1].hs_percent, 50);
  assert.equal(ranking.players[2].matches, 0);
});

test("escolhe o melhor mapa pela media de kills e preserva o detalhamento", () => {
  const ranking = buildTeamPlayerRanking(10, [
    { player_id: 1, user_id: 11, nick: "Alpha", cargo: "player", lineup_status: "titular", status: "ativo", matches: 3, wins: 2, losses: 1, kills: 42, deaths: 30, assists: 12, headshots: 20, mvps: 3 }
  ], [
    { player_id: 1, map_id: 1, map_name: "Dust 2", maps: 2, kills: 22, deaths: 18, assists: 5, headshots: 10, mvps: 1 },
    { player_id: 1, map_id: 2, map_name: "Mirage", maps: 1, kills: 20, deaths: 12, assists: 7, headshots: 10, mvps: 2 }
  ]);

  assert.equal(ranking.players[0].maps, 3);
  assert.equal(ranking.players[0].best_map.map_name, "Mirage");
  assert.equal(ranking.players[0].map_statistics.length, 2);
  assert.equal(ranking.players[0].win_rate, 66.7);
});
