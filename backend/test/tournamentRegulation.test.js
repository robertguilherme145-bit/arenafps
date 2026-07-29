import test from "node:test";
import assert from "node:assert/strict";
import { buildTournamentRegulationSummary } from "../src/services/tournamentRegulation.service.js";

test("resume o regulamento sem criar mapas ficticios", () => {
  const summary = buildTournamentRegulationSummary({ format: "round_robin", best_of: "bo3" });
  assert.match(summary, /Todos contra todos/);
  assert.match(summary, /serie BO3/);
  assert.match(summary, /mapas realmente jogados/);
});

test("traduz o formato de grupos na notificacao", () => {
  const summary = buildTournamentRegulationSummary({ format: "group_playoffs", best_of: "bo5" });
  assert.match(summary, /Grupos e eliminatorias/);
  assert.match(summary, /BO5/);
});
