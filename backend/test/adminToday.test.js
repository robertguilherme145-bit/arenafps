import assert from "node:assert/strict";
import test from "node:test";
import { buildTodayQueue, tournamentStep } from "../src/services/adminToday.js";

const now = new Date("2026-10-17T20:00:00Z");

test("dia tranquilo: fila vazia e numeros zerados", () => {
  const today = buildTodayQueue({}, now);
  assert.deepEqual(today.items, []);
  assert.deepEqual(today.numbers, { matches_today:0, live_matches:0, registrations_today:0, revenue_today:0 });
});

test("disputa e partida atrasada vem antes do resto", () => {
  const today = buildTodayQueue({
    contacts:2,
    tournaments:[{ id:3, nome:"Copa", status:"criado" }],
    disputes:[{ id:9, title:"Placar errado", match_id:40, tournament_name:"Copa" }],
    matches:[{ id:41, team_a:"Lobos", team_b:"Raposas", tournament_name:"Copa", scheduled_at:"2026-10-17T19:00:00Z" }]
  }, now);
  assert.deepEqual(today.items.map((item) => item.kind), ["disputa", "partida", "torneio", "contato"]);
  assert.equal(today.items[1].severity, "alta");
  assert.equal(today.items[2].href, "/admin/torneios/3");
});

test("so conta PIX parado ha 30 minutos ou mais", () => {
  const today = buildTodayQueue({ payments:[
    { id:1, team_name:"Lobos", created_at:"2026-10-17T19:00:00Z" },
    { id:2, team_name:"Raposas", created_at:"2026-10-17T19:50:00Z" }
  ] }, now);
  assert.equal(today.items.length, 1);
  assert.match(today.items[0].title, /^1 PIX parado/);
  assert.equal(today.items[0].detail, "Lobos");
});

test("chamado com prioridade alta sobe na fila", () => {
  const calm = buildTodayQueue({ tickets:[{ priority:"baixa" }] }, now);
  const urgent = buildTodayQueue({ tickets:[{ priority:"critica" }, { priority:"media" }] }, now);
  assert.equal(calm.items[0].severity, "baixa");
  assert.equal(urgent.items[0].severity, "alta");
  assert.equal(urgent.items[0].title, "2 chamados abertos");
});

test("etapa parada de cada torneio", () => {
  assert.equal(tournamentStep({ status:"criado" }).action, "Abrir rascunho");
  assert.equal(tournamentStep({ status:"aberto", pending_entries:2 }).action, "Ver inscrições");
  assert.equal(tournamentStep({ status:"fechado", pending_entries:0, match_count:0 }).action, "Gerar chave");
  assert.equal(tournamentStep({ status:"fechado", pending_entries:0, match_count:4 }), null);
  assert.equal(tournamentStep({ status:"aberto", pending_entries:0 }), null);
  assert.equal(tournamentStep({ status:"em_andamento", pending_entries:3 }), null);
});

test("PIX proprio: falta de chave e pagamentos informados sobem para o topo", () => {
  const today = buildTodayQueue({ contacts:1, pixSetupMissing:true, manualToConfirm:2 }, now);
  assert.deepEqual(today.items.map((item) => item.key), ["pix-config", "pix-confirmar", "contato"]);
  assert.equal(today.items[1].title, "2 PIX para confirmar");
  assert.equal(today.items[0].href, "/admin/financeiro");
});
