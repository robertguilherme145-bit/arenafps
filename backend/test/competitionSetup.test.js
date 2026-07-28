import test from "node:test";
import assert from "node:assert/strict";

import { buildDefaultVetoOrder, completeVetoOrder } from "../src/services/competitionSetup.service.js";

test("jogo sem mapas nao cria um decider fantasma", () => {
  assert.deepEqual(buildDefaultVetoOrder("bo3", 0), []);
});

test("MD1 de sete mapas bane seis e define um decider", () => {
  const order = buildDefaultVetoOrder("bo1", 7);

  assert.equal(order.length, 7);
  assert.equal(order.filter((step) => step.action === "ban").length, 6);
  assert.deepEqual(order.at(-1), { action: "decider", team: "SYSTEM" });
});

test("MD3 de sete mapas seleciona exatamente tres mapas", () => {
  const order = buildDefaultVetoOrder("bo3", 7);
  const selected = order.filter((step) => step.action === "pick" || step.action === "decider");

  assert.equal(order.length, 7);
  assert.equal(selected.length, 3);
  assert.equal(order.filter((step) => step.action === "pick").length, 2);
});

test("MD5 de sete mapas seleciona exatamente cinco mapas", () => {
  const order = buildDefaultVetoOrder("bo5", 7);
  const selected = order.filter((step) => step.action !== "ban");

  assert.equal(order.length, 7);
  assert.equal(selected.length, 5);
  assert.equal(order.filter((step) => step.action === "ban").length, 2);
});

test("decider automatico completa MD1 configurada somente com bans", () => {
  const order = completeVetoOrder([
    { action: "ban", team: "A" },
    { action: "ban", team: "B" }
  ], "bo1", 7, true);

  assert.equal(order.filter((step) => step.action === "decider").length, 1);
  assert.deepEqual(order.at(-1), { action: "decider", team: "SYSTEM" });
});

test("decider automatico completa o terceiro mapa da MD3 apos dois picks", () => {
  const order = completeVetoOrder([
    { action: "pick", team: "A" },
    { action: "pick", team: "B" }
  ], "bo3", 7, true);

  assert.equal(order.length, 3);
  assert.deepEqual(order.at(-1), { action: "decider", team: "SYSTEM" });
});

test("decider automatico completa todos os cinco mapas da MD5 sem picks", () => {
  const order = completeVetoOrder([], "bo5", 7, true);

  assert.equal(order.length, 5);
  assert.ok(order.every((step) => step.action === "decider" && step.team === "SYSTEM"));
});

test("sem decider automatico continua exigindo todos os mapas da serie", () => {
  assert.throws(
    () => completeVetoOrder([{ action: "pick", team: "A" }], "bo3", 7, false),
    /selecionar exatamente 3 mapas/
  );
});
