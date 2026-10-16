import assert from "node:assert/strict";
import test from "node:test";
import { buildActivityFeed } from "../src/lib/activityFeed.ts";

const empty = { results:[], tournaments:[], champions:[] };

test("resultado mostra vencedor, perdedor e placar", () => {
  const [item] = buildActivityFeed({ ...empty, results:[{ id:3, tournament_id:7, team_a:"Nevius", team_b:"Bravo 6", score_team_a:13, score_team_b:8, winner:"Nevius", finished_at:"2026-09-05T21:00:00Z" }] });
  assert.deepEqual(item, { key:"result-3", kind:"result", highlight:"Nevius", text:"venceu Bravo 6 por 13–8", href:"/torneios/7" });
});

test("vencedor do lado B inverte o placar", () => {
  const [item] = buildActivityFeed({ ...empty, results:[{ id:4, tournament_id:7, team_a:"Nevius", team_b:"Bravo 6", score_team_a:5, score_team_b:13, winner:"Bravo 6", finished_at:"2026-09-05T21:00:00Z" }] });
  assert.equal(item.highlight, "Bravo 6");
  assert.equal(item.text, "venceu Nevius por 13–5");
});

test("torneio aberto e campeao entram no feed", () => {
  const items = buildActivityFeed({
    results:[],
    tournaments:[{ id:8, nome:"Series #2", status:"aberto", inicio:"2026-09-19T20:00:00Z", created_at:"2026-09-01T10:00:00Z" }, { id:9, nome:"Series antiga", status:"finalizado", inicio:null, created_at:"2026-01-01T10:00:00Z" }],
    champions:[{ tournament_id:1, tournament_name:"Series #0", team_name:"GameOver", fim:"2026-08-30T22:00:00Z" }]
  });
  assert.deepEqual(items.map((item) => item.kind), ["open", "champion"]);
  assert.equal(items[0].highlight, "Series #2");
  assert.equal(items[0].text, "está com inscrições abertas");
  assert.equal(items[1].text, "é campeã de Series #0");
});

test("respeita o limite e ordena do mais recente", () => {
  const results = Array.from({ length:10 }, (_, index) => ({ id:index, tournament_id:1, team_a:"A", team_b:"B", score_team_a:13, score_team_b:index, winner:"A", finished_at:new Date(Date.UTC(2026, 8, 1 + index)).toISOString() }));
  const items = buildActivityFeed({ ...empty, results }, 4);
  assert.equal(items.length, 4);
  assert.equal(items[0].key, "result-9");
});

test("portal vazio devolve lista vazia", () => {
  assert.deepEqual(buildActivityFeed(empty), []);
});
