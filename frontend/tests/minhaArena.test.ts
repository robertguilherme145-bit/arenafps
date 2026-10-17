import assert from "node:assert/strict";
import test from "node:test";
import { arenaSection, arenaTab, arenaTabs, legacyArenaPath, teamRoleOf } from "../src/lib/minhaArena.ts";

test("secao vazia e Inicio; secao desconhecida e nula", () => {
  assert.equal(arenaSection(undefined), "inicio");
  assert.equal(arenaSection("time"), "time");
  assert.equal(arenaSection("xyz"), null);
});

test("abas de Meu time mudam conforme o cargo", () => {
  assert.ok(arenaTabs("time", "lider").some((tab) => tab.key === "pagamentos"));
  assert.ok(!arenaTabs("time", "capitao").some((tab) => tab.key === "pagamentos"));
  assert.ok(!arenaTabs("time", "jogador").some((tab) => tab.key === "elenco"));
  assert.deepEqual(arenaTabs("time", "nenhum").map((tab) => tab.key), ["visao"]);
});

test("aba invalida para o cargo cai na primeira", () => {
  assert.equal(arenaTab("time", "jogador", "pagamentos"), "visao");
  assert.equal(arenaTab("partidas", "capitao", "veto"), "veto");
  assert.equal(arenaTab("partidas", "jogador", "veto"), "partidas");
  assert.equal(arenaTab("suporte", "jogador", "x"), null);
});

test("cargo vem do time ativo", () => {
  const contexts = [{ team_id:1, role:"jogador" }, { team_id:2, role:"lider" }];
  assert.equal(teamRoleOf({ active_team_id:2, team_contexts:contexts }), "lider");
  assert.equal(teamRoleOf({ active_team_id:1, team_contexts:contexts }), "jogador");
  assert.equal(teamRoleOf({ active_team_id:99, team_contexts:contexts }), "jogador");
  assert.equal(teamRoleOf({ active_team_id:null, team_contexts:[] }), "nenhum");
  assert.equal(teamRoleOf(null), "nenhum");
});

test("links antigos dos paineis levam para a Minha Arena", () => {
  assert.equal(legacyArenaPath("jogador", ""), "/minha-arena");
  assert.equal(legacyArenaPath("jogador", "?module=convites"), "/minha-arena/time");
  assert.equal(legacyArenaPath("jogador", "?module=support"), "/minha-arena/suporte");
  assert.equal(legacyArenaPath("jogador", "?module=mix"), "/minha-arena/torneios?aba=mix");
  assert.equal(legacyArenaPath("lider", "?module=roster"), "/minha-arena/time?aba=elenco");
  assert.equal(legacyArenaPath("lider", "?module=history"), "/minha-arena/carreira?aba=historico");
  assert.equal(legacyArenaPath("capitao", "?module=veto"), "/minha-arena/partidas?aba=veto");
  assert.equal(legacyArenaPath("capitao", "?module=desconhecido"), "/minha-arena");
});

test("retorno do PayPal mantem token e PayerID", () => {
  assert.equal(
    legacyArenaPath("lider", "?module=finance&token=ABC&PayerID=X1&paypal=success"),
    "/minha-arena/time?token=ABC&PayerID=X1&paypal=success&aba=pagamentos"
  );
  assert.equal(legacyArenaPath("lider", "?token=ABC"), "/minha-arena?token=ABC");
});
