import assert from "node:assert/strict";
import test from "node:test";
import { createMicroCache } from "../src/utils/microCache.js";

function clock(start = 0) {
  let now = start;
  return { now:() => now, advance:(ms) => { now += ms; } };
}

test("reaproveita o resultado dentro do prazo e busca de novo depois", async () => {
  const time = clock();
  const cache = createMicroCache({ ttlMs:15000, now:time.now });
  let calls = 0;
  const load = async () => ++calls;
  assert.equal(await cache.get("portal", load), 1);
  time.advance(14000);
  assert.equal(await cache.get("portal", load), 1);
  time.advance(2000);
  assert.equal(await cache.get("portal", load), 2);
});

test("pedidos simultaneos fazem uma unica consulta", async () => {
  const cache = createMicroCache({ ttlMs:15000 });
  let calls = 0;
  const load = () => new Promise((resolve) => setTimeout(() => resolve(++calls), 20));
  const results = await Promise.all(Array.from({ length:10 }, () => cache.get("t:1", load)));
  assert.deepEqual(new Set(results), new Set([1]));
  assert.equal(calls, 1);
});

test("erro nao fica guardado", async () => {
  const cache = createMicroCache({ ttlMs:15000 });
  await assert.rejects(cache.get("x", async () => { throw new Error("banco fora"); }));
  assert.equal(await cache.get("x", async () => "ok"), "ok");
});

test("chaves diferentes nao se misturam e o limite de itens e respeitado", async () => {
  const cache = createMicroCache({ ttlMs:15000, maxEntries:2 });
  await cache.get("a", async () => "A");
  await cache.get("b", async () => "B");
  await cache.get("c", async () => "C");
  assert.equal(cache.size(), 2);
  assert.equal(await cache.get("c", async () => "novo"), "C");
});
