import assert from "node:assert/strict";
import test from "node:test";
import { createTournamentDraftWith } from "../src/services/adminTournament.service.js";

const admin = { id:1 };
const payload = {
  tournament:{ nome:"Series #2", game:1, valor:10, max_teams:8, titulares:5, reservas:2, inicio:"2026-11-01T20:00", fim:"2026-11-08T23:00" },
  competition:{ game_id:1, format:"single_elimination", best_of:"bo3", map_ids:[1, 2, 3], registration_closes_at:"2026-10-31T20:00" }
};

function deps(overrides = {}) {
  const calls = [];
  return {
    calls,
    registerTournament:async (data) => { calls.push(["register", data.nome]); return { id:42 }; },
    saveTournamentCompetition:async (user, id) => { calls.push(["competition", id]); },
    setRegistrationClosesAt:async (id, date) => { calls.push(["closes", id, date]); },
    configureMixTournament:async (id) => { calls.push(["mix", id]); },
    deleteDraftTournament:async (id) => { calls.push(["delete", id]); },
    ...overrides
  };
}

test("cria rascunho com configuracoes e prazo das inscricoes", async () => {
  const d = deps();
  assert.deepEqual(await createTournamentDraftWith(d, admin, payload), { id:42 });
  assert.deepEqual(d.calls.map((call) => call[0]), ["register", "competition", "closes"]);
});

test("falha nas configuracoes desfaz o rascunho e repassa o erro", async () => {
  const d = deps({ saveTournamentCompetition:async () => { throw new Error("O map pool contem mapas que nao pertencem ao jogo selecionado."); } });
  await assert.rejects(createTournamentDraftWith(d, admin, payload), /map pool contem mapas/);
  assert.deepEqual(d.calls.at(-1), ["delete", 42]);
});

test("prazo das inscricoes depois do inicio e recusado antes de criar", async () => {
  const d = deps();
  await assert.rejects(createTournamentDraftWith(d, admin, { ...payload, competition:{ ...payload.competition, registration_closes_at:"2026-11-02T00:00" } }), /Inscrições até/);
  assert.equal(d.calls.length, 0);
});

test("Mix configura o sorteio", async () => {
  const d = deps();
  await createTournamentDraftWith(d, admin, { ...payload, mix:{ payment_mode:"paid", price_per_player:5, team_count:4, players_per_team:5 } });
  assert.ok(d.calls.some((call) => call[0] === "mix"));
});
