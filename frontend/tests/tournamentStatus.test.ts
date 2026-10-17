import assert from "node:assert/strict";
import test from "node:test";
import { isPublicTournament, tournamentStatusLabel, tournamentTab } from "../src/lib/tournamentStatus.ts";

test("cada status tem rotulo e cor fixos", () => {
  assert.deepEqual(tournamentStatusLabel("criado"), { label:"Rascunho", tone:"neutral" });
  assert.deepEqual(tournamentStatusLabel("aberto"), { label:"Inscrições abertas", tone:"warning" });
  assert.deepEqual(tournamentStatusLabel("fechado"), { label:"Inscrições encerradas", tone:"neutral" });
  assert.deepEqual(tournamentStatusLabel("em_andamento"), { label:"Ao vivo", tone:"live" });
  assert.deepEqual(tournamentStatusLabel("finalizado"), { label:"Encerrado", tone:"success" });
  assert.deepEqual(tournamentStatusLabel("cancelado"), { label:"Cancelado", tone:"danger" });
});

test("status desconhecido aparece com o proprio texto e sem quebrar", () => {
  assert.deepEqual(tournamentStatusLabel("pausado"), { label:"pausado", tone:"neutral" });
  assert.equal(tournamentTab("pausado"), "encerrados");
});

test("rascunho e cancelado nao aparecem no site publico", () => {
  assert.equal(isPublicTournament("criado"), false);
  assert.equal(isPublicTournament("cancelado"), false);
  for (const status of ["aberto", "fechado", "em_andamento", "finalizado"]) assert.equal(isPublicTournament(status), true, status);
});

test("abas de torneios", () => {
  assert.equal(tournamentTab("aberto"), "abertos");
  assert.equal(tournamentTab("fechado"), "andamento");
  assert.equal(tournamentTab("em_andamento"), "andamento");
  assert.equal(tournamentTab("finalizado"), "encerrados");
});
