import assert from "node:assert/strict";
import test from "node:test";
import { isBrowserPageRequest } from "../src/utils/spaRequest.js";

const page = (path, accept = "text/html,application/xhtml+xml,*/*;q=0.8", method = "GET") => ({ method, path, headers:{ accept } });

test("recarregar paginas do site que tem o mesmo nome de rotas da API entrega a pagina", () => {
  for (const path of ["/admin", "/admin/torneios/novo", "/admin/mix/3", "/team/minha-equipe"]) assert.equal(isBrowserPageRequest(page(path)), true, path);
});

test("chamadas da API continuam indo para a API", () => {
  assert.equal(isBrowserPageRequest(page("/admin/dashboard", "application/json, text/plain, */*")), false);
  assert.equal(isBrowserPageRequest(page("/admin", "text/html", "POST")), false);
});

test("rotas que o navegador precisa abrir direto no backend nao sao desviadas", () => {
  for (const path of ["/auth/oauth/google", "/auth/oauth/google/callback", "/api/health", "/media/files/3/logo.png", "/uploads/a.png", "/assets/index.js", "/favicon.svg"]) {
    assert.equal(isBrowserPageRequest(page(path)), false, path);
  }
});
