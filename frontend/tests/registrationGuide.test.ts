import assert from "node:assert/strict";
import test from "node:test";
import { registrationGuide } from "../src/lib/registrationGuide.ts";

const open = { status:"aberto", format:"single_elimination", game_id:1 };
const base = { loggedIn:true, tournament:open, teams:[], entries:[], nextMatchId:null, paid:true };
const leader = [{ team_id:10, game_id:1, role:"lider" as const }];
const player = [{ team_id:10, game_id:1, role:"jogador" as const }];

test("visitante: criar conta", () => {
  const guide = registrationGuide({ ...base, loggedIn:false });
  assert.deepEqual(guide.action, { label:"Criar conta para participar", href:"/criar-conta", tone:"urgent" });
  assert.equal(guide.steps[0].state, "pendente");
});

test("torneio que ja comecou nao oferece inscricao", () => {
  const guide = registrationGuide({ ...base, tournament:{ ...open, status:"em_andamento" }, teams:leader });
  assert.equal(guide.action, null);
  assert.match(guide.note!, /inscrições estão encerradas/);
});

test("Mix: inscricao individual", () => {
  const guide = registrationGuide({ ...base, tournament:{ ...open, format:"mix_single_elimination" } });
  assert.deepEqual(guide.action, { label:"Inscrever-se no Mix", href:"/jogador?module=mix", tone:"urgent" });
});

test("sem equipe no jogo do torneio", () => {
  assert.deepEqual(registrationGuide(base).action, { label:"Criar ou entrar numa equipe", href:"/jogador?module=teams", tone:"primary" });
  const otherGame = registrationGuide({ ...base, teams:[{ team_id:11, game_id:2, role:"lider" }] });
  assert.equal(otherGame.action!.href, "/jogador?module=teams");
});

test("lider ainda sem inscricao", () => {
  assert.deepEqual(registrationGuide({ ...base, teams:leader }).action, { label:"Inscrever equipe", href:"/lider?module=tournaments", tone:"urgent" });
});

test("jogador sem cargo de lider", () => {
  const guide = registrationGuide({ ...base, teams:player });
  assert.equal(guide.action, null);
  assert.match(guide.note!, /Peça ao líder da sua equipe para inscrever/);
});

test("pagamento pendente: lider paga, os outros aguardam", () => {
  const entries = [{ team_id:10, status:"pendente", payment_status:"pendente" }];
  assert.deepEqual(registrationGuide({ ...base, teams:leader, entries, paid:false }).action, { label:"Pagar inscrição", href:"/lider?module=finance", tone:"urgent" });
  const waiting = registrationGuide({ ...base, teams:player, entries, paid:false });
  assert.equal(waiting.action, null);
  assert.match(waiting.note!, /Aguardando o líder pagar/);
});

test("inscricao confirmada com partida marcada", () => {
  const entries = [{ team_id:10, status:"confirmado", payment_status:"pago" }];
  assert.deepEqual(registrationGuide({ ...base, tournament:{ ...open, status:"em_andamento" }, teams:player, entries, nextMatchId:5 }).action, { label:"Ir para a partida", href:"/jogador?module=matches", tone:"primary" });
});

test("inscricao confirmada aguardando a chave", () => {
  const entries = [{ team_id:10, status:"confirmado", payment_status:"pago" }];
  const guide = registrationGuide({ ...base, teams:leader, entries });
  assert.equal(guide.action, null);
  assert.equal(guide.note, "Inscrição confirmada. A chave sai quando as inscrições encerrarem.");
  assert.deepEqual(guide.steps.map((step) => step.state), ["feito", "feito", "feito", "feito", "pendente"]);
});

test("torneio gratuito nao mostra o passo de pagamento", () => {
  const guide = registrationGuide({ ...base, tournament:{ ...open }, teams:leader, paid:false, free:true });
  assert.deepEqual(guide.steps.map((step) => step.label), ["Conta", "Equipe", "Inscrição", "Partida"]);
});
