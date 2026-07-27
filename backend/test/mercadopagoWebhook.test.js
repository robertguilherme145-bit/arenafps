import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPixDescription,
  resolveMercadoPagoWebhookUrl
} from "../src/services/mercadopago.service.js";

test("identifica equipe e torneio na descricao do PIX", () => {
  assert.equal(
    buildPixDescription("BREAKERS", "Primeiro camp"),
    "Arena Camp | Equipe: BREAKERS | Torneio: Primeiro camp"
  );
});

test("normaliza e limita descricoes extensas do PIX", () => {
  const description = buildPixDescription(`  Equipe   ${"A".repeat(100)} `, ` Torneio  ${"B".repeat(150)} `);
  assert.ok(description.length <= 255);
  assert.match(description, /^Arena Camp \| Equipe: Equipe A+ \| Torneio: Torneio B+$/);
});

test("monta webhook HTTPS a partir da URL publica da API", () => {
  assert.equal(
    resolveMercadoPagoWebhookUrl({ PUBLIC_API_URL: "https://api.arenacamp.test" }),
    "https://api.arenacamp.test/payment/webhook?source_news=webhooks"
  );
});

test("preserva query string e exige HTTPS no webhook", () => {
  assert.equal(
    resolveMercadoPagoWebhookUrl({ MP_WEBHOOK_URL: "https://api.arenacamp.test/payment/webhook?tenant=arena" }),
    "https://api.arenacamp.test/payment/webhook?tenant=arena&source_news=webhooks"
  );
  assert.throws(
    () => resolveMercadoPagoWebhookUrl({ MP_WEBHOOK_URL: "http://localhost:4000/payment/webhook" }),
    /HTTPS/
  );
});
