import assert from "node:assert/strict";
import test from "node:test";
import { pickFeaturedMatch } from "../src/services/featuredMatch.js";

const now = new Date("2026-09-05T20:00:00Z");

function row(overrides) {
  return {
    id:1, tournament_id:7, tournament_name:"Arena CAMP FPS Series #1", tournament_status:"em_andamento",
    status:"agendada", scheduled_at:null, score_team_a:0, score_team_b:0, best_of:"bo3",
    current_map_name:null, current_map_number:null,
    team_a:"GameOver", team_a_tag:"GO", team_a_logo:null, team_b:"BREAkers", team_b_tag:"BK", team_b_logo:null,
    ...overrides
  };
}

test("prefere a partida ao vivo", () => {
  const featured = pickFeaturedMatch([
    row({ id:2, status:"agendada", scheduled_at:"2026-09-05T21:00:00Z" }),
    row({ id:3, status:"andamento", score_team_a:9, score_team_b:7, current_map_name:"Third Sub", current_map_number:2 })
  ], now);
  assert.equal(featured.id, 3);
  assert.equal(featured.status, "ao_vivo");
  assert.equal(featured.score_a, 9);
  assert.equal(featured.map_name, "Third Sub");
  assert.deepEqual(featured.team_a, { name:"GameOver", tag:"GO", logo:null });
});

test("entre ao vivo, escolhe a mais recente pelo id", () => {
  const featured = pickFeaturedMatch([row({ id:5, status:"andamento" }), row({ id:4, status:"andamento" })], now);
  assert.equal(featured.id, 5);
});

test("agendada atrasada ha menos de 2 horas continua no placar", () => {
  const featured = pickFeaturedMatch([
    row({ id:20, scheduled_at:"2026-09-05T19:01:00Z" }),
    row({ id:21, scheduled_at:"2026-09-06T20:00:00Z" })
  ], now);
  assert.equal(featured.id, 20);
  assert.equal(pickFeaturedMatch([row({ id:22, scheduled_at:"2026-09-05T17:30:00Z", tournament_status:"aberto" })], now), null);
});

test("sem ao vivo, escolhe a agendada futura mais proxima", () => {
  const featured = pickFeaturedMatch([
    row({ id:6, scheduled_at:"2026-09-06T20:00:00Z" }),
    row({ id:7, scheduled_at:"2026-09-05T22:00:00Z" }),
    row({ id:8, scheduled_at:"2026-09-04T20:00:00Z" })
  ], now);
  assert.equal(featured.id, 7);
  assert.equal(featured.status, "agendada");
  assert.equal(featured.scheduled_at, "2026-09-05T22:00:00.000Z");
});

test("sem data so vale em torneio em andamento", () => {
  const undated = pickFeaturedMatch([row({ id:9, scheduled_at:null, tournament_status:"em_andamento" })], now);
  assert.equal(undated.id, 9);
  assert.equal(undated.scheduled_at, null);
  assert.equal(pickFeaturedMatch([row({ id:10, scheduled_at:null, tournament_status:"aberto" })], now), null);
});

test("partida com data vence a sem data", () => {
  const featured = pickFeaturedMatch([
    row({ id:11, scheduled_at:null }),
    row({ id:12, scheduled_at:"2026-09-07T20:00:00Z" })
  ], now);
  assert.equal(featured.id, 12);
});

test("placar nulo vira zero", () => {
  const featured = pickFeaturedMatch([row({ status:"andamento", score_team_a:null, score_team_b:null })], now);
  assert.equal(featured.score_a, 0);
  assert.equal(featured.score_b, 0);
});

test("lista vazia devolve null", () => {
  assert.equal(pickFeaturedMatch([], now), null);
});
