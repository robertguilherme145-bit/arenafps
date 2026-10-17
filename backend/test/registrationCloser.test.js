import assert from "node:assert/strict";
import test from "node:test";
import { closeExpiredRegistrations } from "../src/services/registrationCloser.service.js";

test("fecha as inscricoes vencidas e avisa os admins com as pendencias", async () => {
  const closed = [];
  const notices = [];
  const result = await closeExpiredRegistrations({
    findDue:async () => [{ id:1, nome:"Series #2", pending:3 }, { id:2, nome:"Copa", pending:0 }],
    close:async (id) => { closed.push(id); },
    notify:async (tournament) => { notices.push([tournament.id, tournament.pending]); }
  });
  assert.deepEqual(closed, [1, 2]);
  assert.deepEqual(notices, [[1, 3], [2, 0]]);
  assert.deepEqual(result, { closed:2, failed:0 });
});

test("erro em um torneio nao impede os outros", async () => {
  const closed = [];
  const result = await closeExpiredRegistrations({
    findDue:async () => [{ id:1, nome:"A", pending:0 }, { id:2, nome:"B", pending:0 }],
    close:async (id) => { if (id === 1) throw new Error("transicao invalida"); closed.push(id); },
    notify:async () => {}
  });
  assert.deepEqual(closed, [2]);
  assert.deepEqual(result, { closed:1, failed:1 });
});

test("sem torneios vencidos nada acontece", async () => {
  const result = await closeExpiredRegistrations({ findDue:async () => [], close:async () => { throw new Error("nao deveria"); }, notify:async () => {} });
  assert.deepEqual(result, { closed:0, failed:0 });
});
