import assert from "node:assert/strict";
import test from "node:test";
import routes from "../src/routes/index.js";

function listRoutes(router, prefix = "") {
  const found = [];
  for (const layer of router.stack) {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods)) found.push(`${method.toUpperCase()} ${prefix}${layer.route.path}`);
    } else if (layer.handle?.stack) {
      const mount = layer.matchers?.[0] ? mountPath(layer) : "";
      found.push(...listRoutes(layer.handle, prefix + mount));
    }
  }
  return found;
}

function mountPath(layer) {
  for (const candidate of ["/team", "/player", "/entry", "/entry-player", "/team-request", "/payment", "/player-game-profile", "/auth", "/admin", "/leader", "/captain", "/public", "/media", "/mix", "/identity", "/notifications", "/match", "/game", "/tournament", "/profile", "/dashboard"]) {
    if (layer.matchers[0](candidate)) return candidate;
  }
  return "";
}

const routeList = listRoutes(routes);

test("nao expoe a listagem antiga de membros com email", () => {
  assert.ok(!routeList.includes("GET /team/:id/members"));
});

test("remove rotas antigas que ignoram o cargo na equipe", () => {
  for (const legacy of ["POST /entry/create", "PUT /player/:id", "DELETE /player/:id", "POST /entry-player/lineup/:entryId", "PATCH /team-request/:id/accept", "PATCH /team/member/:id", "DELETE /team/member/:id", "POST /payment/create/:entryId"]) {
    assert.ok(!routeList.includes(legacy), legacy);
  }
});

test("mantem as rotas usadas pelo frontend e pelo Mercado Pago", () => {
  for (const kept of ["POST /team/", "POST /payment/webhook", "GET /player/public/:slug", "GET /player/workspace", "POST /leader/entries"]) {
    assert.ok(routeList.includes(kept), kept);
  }
});
