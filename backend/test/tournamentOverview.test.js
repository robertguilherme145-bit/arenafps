import assert from "node:assert/strict";
import test from "node:test";
import { buildTournamentOverview } from "../src/services/tournamentOverview.js";

const tournament = { id:7, nome:"Series #2", status:"criado", inicio:"2026-11-01T20:00:00Z", fim:"2026-11-08T23:00:00Z", max_teams:8, titulares:5, premiacao:"R$ 300", banner:null };
const settings = { format:"single_elimination", best_of:"bo3", pick_ban_enabled:1, registration_closes_at:"2026-10-31T20:00:00Z" };
const entries = { total:0, confirmed:0, pending_payment:0 };
const build = (overrides = {}) => buildTournamentOverview({ tournament, settings, mapCount:5, entries, matchCount:0, ...overrides });
const item = (overview, key) => overview.checklist.find((entry) => entry.key === key);

test("rascunho completo pode ser publicado", () => {
  const overview = build();
  assert.equal(overview.ready, true);
  assert.deepEqual(overview.nextAction, { key:"publish", label:"Publicar e abrir inscrições", status:"aberto" });
  assert.equal(overview.stages[0].state, "atual");
  assert.equal(item(overview, "premiacao").required, false);
});

test("rascunho sem mapas nao fica pronto", () => {
  const overview = build({ mapCount:0 });
  assert.equal(overview.ready, false);
  assert.equal(item(overview, "mapas").done, false);
  assert.equal(overview.nextAction.key, "publish");
});

test("veto exige mapas suficientes para a serie", () => {
  assert.equal(item(build({ mapCount:2 }), "mapas").done, false);
  assert.equal(item(build({ mapCount:2, settings:{ ...settings, pick_ban_enabled:0 } }), "mapas").done, true);
});

test("cada etapa tem uma unica proxima acao", () => {
  assert.deepEqual(build({ tournament:{ ...tournament, status:"aberto" } }).nextAction, { key:"close", label:"Encerrar inscrições", status:"fechado" });
  assert.deepEqual(build({ tournament:{ ...tournament, status:"fechado" } }).nextAction, { key:"structure", label:"Gerar chave" });
  const bracket = build({ tournament:{ ...tournament, status:"fechado" }, matchCount:4 });
  assert.deepEqual(bracket.nextAction, { key:"start", label:"Iniciar torneio", status:"em_andamento" });
  assert.equal(bracket.stages.find((stage) => stage.state === "atual").key, "chave");
  const running = build({ tournament:{ ...tournament, status:"em_andamento" }, matchCount:4 });
  assert.equal(running.nextAction, null);
  assert.match(running.note, /final encerra o torneio sozinha/);
});

test("Mix: sorteio no lugar da chave", () => {
  const mix = { ...settings, format:"mix_single_elimination" };
  const open = build({ settings:mix, tournament:{ ...tournament, status:"aberto" } });
  assert.equal(open.kind, "mix");
  assert.deepEqual(open.nextAction, { key:"draw", label:"Sortear equipes" });
  assert.deepEqual(open.stages.map((stage) => stage.key), ["rascunho", "inscricoes", "sorteio", "andamento", "finalizado"]);
  assert.equal(build({ settings:mix, tournament:{ ...tournament, status:"em_andamento" } }).nextAction, null);
});

test("formato manual: criar partidas", () => {
  const custom = build({ settings:{ ...settings, format:"custom" }, tournament:{ ...tournament, status:"fechado" } });
  assert.equal(custom.kind, "custom");
  assert.deepEqual(custom.nextAction, { key:"manual", label:"Criar partidas", href:"/admin/partidas" });
});

test("torneio antigo sem configuracoes mostra o que falta", () => {
  const overview = build({ settings:null, mapCount:0 });
  assert.equal(overview.kind, "equipes");
  assert.equal(item(overview, "formato").done, false);
  assert.equal(overview.ready, false);
});

test("cancelado nao tem acao", () => {
  const overview = build({ tournament:{ ...tournament, status:"cancelado" } });
  assert.equal(overview.nextAction, null);
  assert.equal(overview.note, "Torneio cancelado.");
});

test("datas invertidas nao passam no checklist", () => {
  assert.equal(item(build({ tournament:{ ...tournament, inicio:"2026-11-08T00:00:00Z", fim:"2026-11-01T00:00:00Z" } }), "informacoes").done, false);
});
