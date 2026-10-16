import assert from "node:assert/strict";
import test from "node:test";
import { buildBracketColumns } from "../src/lib/bracket.ts";

function match(id: number, round: number, extra: Record<string, unknown> = {}) {
  return { id, round, stage:"bracket", status:"agendada", team_a:"A", team_b:"B", team_a_id:1, team_b_id:2, winner_team_id:null, score_team_a:null, score_team_b:null, scheduled_at:null, ...extra };
}

const slotsOf = (column: { slots: Array<object> }) => column.slots.map((slot) => ("placeholder" in slot ? "vaga" : "partida"));

test("eliminacao simples com 8 equipes completa as rodadas futuras", () => {
  const columns = buildBracketColumns({ format:"single_elimination", teamCount:8, matches:[1, 2, 3, 4].map((id) => match(id, 1)) });
  assert.deepEqual(columns.map((column) => column.title), ["Quartas de final", "Semifinal", "Final"]);
  assert.deepEqual(columns.map(slotsOf), [["partida", "partida", "partida", "partida"], ["vaga", "vaga"], ["vaga"]]);
});

test("6 equipes arredondam para 3 rodadas", () => {
  const columns = buildBracketColumns({ format:"single_elimination", teamCount:6, matches:[1, 2, 3].map((id) => match(id, 1)) });
  assert.equal(columns.length, 3);
  assert.deepEqual(columns.slice(1).map((column) => column.slots.length), [2, 1]);
  assert.deepEqual(slotsOf(columns[0]), ["partida", "partida", "partida", "vaga"]);
});

test("rodada criada pela metade mistura partida e vaga", () => {
  const columns = buildBracketColumns({ format:"single_elimination", teamCount:8, matches:[...[1, 2, 3, 4].map((id) => match(id, 1)), match(5, 2)] });
  assert.deepEqual(slotsOf(columns[1]), ["partida", "vaga"]);
});

test("16 equipes nomeiam oitavas", () => {
  const columns = buildBracketColumns({ format:"single_elimination", teamCount:16, matches:[] });
  assert.deepEqual(columns.map((column) => column.title), ["Oitavas de final", "Quartas de final", "Semifinal", "Final"]);
});

test("eliminacao dupla mostra so as rodadas existentes", () => {
  const columns = buildBracketColumns({ format:"double_elimination", teamCount:8, matches:[match(1, 1), match(2, 1), match(3, 2)] });
  assert.deepEqual(columns.map((column) => column.title), ["Rodada 1", "Rodada 2"]);
  assert.ok(columns.every((column) => column.slots.every((slot) => !("placeholder" in slot))));
});

test("grupos e playoffs separam por fase", () => {
  const columns = buildBracketColumns({ format:"group_playoffs", teamCount:8, matches:[match(1, 1, { stage:"group" }), match(2, 2, { stage:"group" }), match(3, 1, { stage:"playoff" })] });
  assert.deepEqual(columns.map((column) => column.key), ["group-1", "group-2", "playoff-1"]);
  assert.deepEqual(columns.map((column) => column.title), ["Grupos · Rodada 1", "Grupos · Rodada 2", "Playoffs · Rodada 1"]);
});

test("sem equipes e sem partidas nao gera colunas", () => {
  assert.deepEqual(buildBracketColumns({ format:"single_elimination", teamCount:0, matches:[] }), []);
});
