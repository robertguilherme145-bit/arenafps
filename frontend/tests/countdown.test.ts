import assert from "node:assert/strict";
import test from "node:test";
import { formatCountdown } from "../src/lib/countdown.ts";

const now = new Date("2026-09-05T20:00:00Z");

test("menos de um dia vira relogio", () => {
  assert.equal(formatCountdown(new Date("2026-09-05T21:42:10Z"), now), "01:42:10");
});

test("um dia ou mais vira dias e horas", () => {
  assert.equal(formatCountdown(new Date("2026-09-08T00:00:00Z"), now), "2d 04h");
});

test("horario ja passado vira Agora", () => {
  assert.equal(formatCountdown(new Date("2026-09-05T19:59:00Z"), now), "Agora");
  assert.equal(formatCountdown(now, now), "Agora");
});
