import test from "node:test";
import assert from "node:assert/strict";

import { calculateTournamentRanking } from "../src/services/ranking.service.js";

function match(id, a, b, winner, mapsA, mapsB, roundsA, roundsB, mapsPlayed){
  return { id, team_a_id:a, team_b_id:b, winner_team_id:winner, score_team_a:mapsA, score_team_b:mapsB, rounds_for_a:roundsA, rounds_for_b:roundsB, maps_played:mapsPlayed };
}

test("uma MD3 vencida por 2 a 0 nao ganha mapa ficticio", () => {
  const [winner] = calculateTournamentRanking([match(1, 1, 2, 1, 2, 0, 20, 9, 2)]);
  assert.equal(winner.score_for, 2);
  assert.equal(winner.maps_played, 2);
  assert.equal(winner.points, 3);
});

test("desempate direto prevalece entre equipes com os mesmos pontos", () => {
  const ranking = calculateTournamentRanking([
    match(1, 1, 2, 1, 2, 1, 25, 22, 3),
    match(2, 3, 1, 3, 2, 0, 20, 6, 2),
    match(3, 2, 4, 2, 2, 0, 20, 5, 2)
  ]);
  const tiedTeams = ranking.filter(item => item.team_id === 1 || item.team_id === 2);
  assert.deepEqual(tiedTeams.map(item => item.team_id), [1, 2]);
});

test("saldo de rounds e normalizado por mapa realmente jogado", () => {
  const ranking = calculateTournamentRanking([
    match(1, 1, 4, 1, 2, 0, 20, 10, 2),
    match(2, 2, 5, 2, 2, 1, 30, 15, 3)
  ]);
  assert.equal(ranking[0].team_id, 1);
  assert.equal(ranking[0].round_balance_per_map, 5);
  assert.equal(ranking[1].round_balance_per_map, 5);
});

test("bye suico vale pontos sem inventar mapa ou saldo", () => {
  const [team] = calculateTournamentRanking([], [{ round:1, team_id:7 }]);
  assert.equal(team.points, 3);
  assert.equal(team.maps_played, 0);
  assert.equal(team.score_for, 0);
  assert.equal(team.byes, 1);
});
