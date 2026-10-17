import assert from "node:assert/strict";
import test from "node:test";
import { legacyPublicRedirect } from "../src/lib/legacyRedirects.ts";

test("paginas que viraram abas de Torneios", () => {
  assert.equal(legacyPublicRedirect("/calendario", ""), "/torneios?aba=calendario");
  assert.equal(legacyPublicRedirect("/resultados", ""), "/torneios?aba=encerrados");
  assert.equal(legacyPublicRedirect("/calendario", "?x=1"), "/torneios?aba=calendario");
});

test("circuito oficial ganhou endereco curto", () => {
  assert.equal(legacyPublicRedirect("/circuito-oficial", ""), "/circuito");
});

test("equipes e jogadores viraram abas de Comunidade, preservando a busca", () => {
  assert.equal(legacyPublicRedirect("/equipes", "?q=go"), "/comunidade?aba=equipes&q=go");
  assert.equal(legacyPublicRedirect("/jogadores", ""), "/comunidade?aba=jogadores");
});

test("perfis em ingles redirecionam para os em portugues", () => {
  assert.equal(legacyPublicRedirect("/team/abc", ""), "/equipe/abc");
  assert.equal(legacyPublicRedirect("/player/LYKROK", ""), "/jogador/LYKROK");
  assert.equal(legacyPublicRedirect("/team/minha%20equipe", ""), "/equipe/minha%20equipe");
});

test("paginas atuais nao sao redirecionadas", () => {
  for (const path of ["/torneios", "/comunidade", "/equipe/abc", "/jogador/LYKROK", "/jogador", "/"]) assert.equal(legacyPublicRedirect(path, ""), null, path);
});
