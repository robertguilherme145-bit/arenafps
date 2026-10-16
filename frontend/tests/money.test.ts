import assert from "node:assert/strict";
import test from "node:test";
import { formatPrize } from "../src/lib/money.ts";

test("numero sem moeda ganha R$", () => {
  assert.equal(formatPrize("200,00"), "R$ 200,00");
  assert.equal(formatPrize("1.500"), "R$ 1.500");
});

test("texto que ja tem moeda ou descricao fica como esta", () => {
  assert.equal(formatPrize("R$ 200"), "R$ 200");
  assert.equal(formatPrize("r$200"), "r$200");
  assert.equal(formatPrize("Skins + R$ 100"), "Skins + R$ 100");
});

test("vazio vira A definir", () => {
  assert.equal(formatPrize(""), "A definir");
  assert.equal(formatPrize(null), "A definir");
});
