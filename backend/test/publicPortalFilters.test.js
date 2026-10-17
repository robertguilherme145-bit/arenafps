import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

// Checagem de regressao barata: as consultas publicas precisam continuar filtrando dados que nao sao publicos.
const source = fs.readFileSync(new URL("../src/models/publicPortal.model.js", import.meta.url), "utf8");
const snapshot = source.slice(source.indexOf("export async function findPortalSnapshot"), source.indexOf("export async function searchPortal"));
const search = source.slice(source.indexOf("export async function searchPortal"), source.indexOf("export async function findPublicTournamentCenter"));

test("lista de torneios do portal ignora rascunhos e cancelados", () => {
  const query = snapshot.split("\n").find((line) => line.includes("COUNT(DISTINCT e.id) entry_count"));
  assert.match(query, /t\.status NOT IN \('criado','cancelado'\)/);
});

test("jogadores do portal e da busca so de equipes ativas", () => {
  const players = snapshot.split("\n").find((line) => line.includes("p.id player_id"));
  assert.match(players, /t\.ativo=1/);
  const searchPlayers = search.split("\n").find((line) => line.includes("'jogador' type"));
  assert.match(searchPlayers, /t\.ativo=1/);
});

test("busca de torneios ignora rascunhos e cancelados", () => {
  const tournaments = search.split("\n").find((line) => line.includes("'torneio' type"));
  assert.match(tournaments, /t\.status NOT IN \('criado','cancelado'\)/);
});

test("perfil publico da equipe aceita slug ou id numerico", () => {
  assert.match(source, /WHERE \(t\.slug=\? OR t\.id=\?\)/);
});
