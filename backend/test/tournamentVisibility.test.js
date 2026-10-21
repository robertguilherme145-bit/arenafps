import assert from "node:assert/strict";
import test from "node:test";
import { isHiddenTournament, visibleTournaments } from "../src/utils/tournamentVisibility.js";

const list = [{ id:1, status:"criado" }, { id:2, status:"aberto" }, { id:3, status:"cancelado" }, { id:4, status:"finalizado" }];

test("visitante e jogador nao veem rascunho nem cancelado", () => {
  assert.deepEqual(visibleTournaments(list, null).map((t) => t.id), [2, 4]);
  assert.deepEqual(visibleTournaments(list, { roles:["jogador", "lider"] }).map((t) => t.id), [2, 4]);
});

test("admin ve tudo", () => {
  assert.deepEqual(visibleTournaments(list, { roles:["jogador", "admin"] }).map((t) => t.id), [1, 2, 3, 4]);
});

test("status escondidos", () => {
  assert.equal(isHiddenTournament("criado"), true);
  assert.equal(isHiddenTournament("cancelado"), true);
  assert.equal(isHiddenTournament("em_andamento"), false);
  assert.equal(isHiddenTournament(undefined), false);
});
