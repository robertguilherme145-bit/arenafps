import assert from "node:assert/strict";
import test from "node:test";
import { ADMIN_SECTIONS, adminModuleFor, adminPathForModule, adminSection } from "../src/lib/adminSections.ts";

test("o painel tem 8 secoes na ordem combinada", () => {
  assert.deepEqual(ADMIN_SECTIONS.map((item) => item.label), ["Hoje", "Torneios", "Partidas", "Comunidade", "Conteúdo", "Financeiro", "Acessos", "Auditoria"]);
});

test("todo modulo antigo tem lugar em alguma secao", () => {
  for (const module of ["dashboard", "competitions", "official", "operations", "community", "progression", "content", "finance", "access", "audit"]) {
    assert.ok(ADMIN_SECTIONS.some((section) => section.tabs.some((tab) => tab.module === module)), module);
  }
});

test("secao e aba viram o modulo certo", () => {
  assert.equal(adminSection(undefined)?.key, "hoje");
  assert.equal(adminSection("nada"), null);
  assert.deepEqual(adminModuleFor(adminSection("torneios")!, "circuito"), { module:"official", tab:"circuito" });
  assert.deepEqual(adminModuleFor(adminSection("torneios")!, "xyz"), { module:"competitions", tab:"lista" });
  assert.equal(adminModuleFor(adminSection("comunidade")!, "conquistas").module, "progression");
});

test("links antigos ?module= levam para a secao nova e mantem os filtros", () => {
  assert.equal(adminPathForModule(null), "/admin");
  assert.equal(adminPathForModule("dashboard"), "/admin");
  assert.equal(adminPathForModule("finance"), "/admin/financeiro");
  assert.equal(adminPathForModule("official"), "/admin/torneios?aba=circuito");
  assert.equal(adminPathForModule("competitions", "?module=competitions&torneio=7"), "/admin/torneios?torneio=7&aba=lista");
  assert.equal(adminPathForModule("operations", "?module=operations&game=2"), "/admin/partidas?game=2");
  assert.equal(adminPathForModule("progression"), "/admin/comunidade?aba=conquistas");
});
