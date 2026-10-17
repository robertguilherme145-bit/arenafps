import assert from "node:assert/strict";
import test from "node:test";
import { buildMonthGrid } from "../src/lib/calendar.ts";

const t = (id: number, inicio: string, fim: string, nome = `T${id}`) => ({ id, nome, inicio, fim });

test("grade do mes comeca no domingo e completa as semanas", () => {
  const grid = buildMonthGrid(2026, 9, []); // outubro de 2026 (mes 0-based)
  assert.equal(grid.length % 7, 0);
  assert.equal(grid[0].inMonth, false);
  assert.equal(grid.find((day) => day.inMonth)?.day, 1);
  assert.equal(grid.filter((day) => day.inMonth).length, 31);
});

test("inicio e final aparecem no dia certo pela data local", () => {
  const grid = buildMonthGrid(2026, 9, [t(1, "2026-10-05T23:00:00", "2026-10-12T20:00:00", "Series #2")]);
  const day5 = grid.find((day) => day.inMonth && day.day === 5)!;
  const day12 = grid.find((day) => day.inMonth && day.day === 12)!;
  assert.deepEqual(day5.events, [{ id:1, kind:"inicio", label:"Início: Series #2" }]);
  assert.deepEqual(day12.events, [{ id:1, kind:"final", label:"Final: Series #2" }]);
});

test("torneio de um dia so mostra um evento", () => {
  const grid = buildMonthGrid(2026, 9, [t(2, "2026-10-20T18:00:00", "2026-10-20T23:00:00", "Copa")]);
  assert.deepEqual(grid.find((day) => day.inMonth && day.day === 20)!.events, [{ id:2, kind:"inicio", label:"Copa" }]);
});

test("datas invalidas e de outros meses sao ignoradas", () => {
  const grid = buildMonthGrid(2026, 9, [t(3, "", "lixo"), t(4, "2026-11-01T10:00:00", "2026-11-02T10:00:00")]);
  assert.equal(grid.some((day) => day.events.length), false);
});
