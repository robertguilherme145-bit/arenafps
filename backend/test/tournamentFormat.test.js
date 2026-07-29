import test from "node:test";
import assert from "node:assert/strict";

import { roundRobinPairings, seededPairings } from "../src/services/tournamentFormat.service.js";

test("todos contra todos gera cada confronto uma unica vez", () => {
  const rounds = roundRobinPairings([1,2,3,4,5]);
  const pairs = rounds.flat().map(pair => [...pair].sort((a,b)=>a-b).join("-"));
  assert.equal(rounds.length, 5);
  assert.equal(pairs.length, 10);
  assert.equal(new Set(pairs).size, 10);
});

test("liga gera turno e returno invertendo o mando", () => {
  const rounds = roundRobinPairings([1,2,3,4], true);
  assert.equal(rounds.length, 6);
  assert.equal(rounds.flat().length, 12);
});

test("chave com numero impar preserva uma equipe de folga", () => {
  const structure = seededPairings([1,2,3,4,5]);
  assert.equal(structure.pairs.length, 2);
  assert.deepEqual(structure.byes, [3]);
});
