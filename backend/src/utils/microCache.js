// Cache em memoria de poucos segundos para paginas publicas muito acessadas.
// Pedidos simultaneos pela mesma chave compartilham a mesma consulta; erros nao ficam guardados.
export function createMicroCache({ ttlMs, maxEntries = 200, now = () => Date.now() }) {
  const entries = new Map();

  async function get(key, load) {
    const current = entries.get(key);
    if (current && current.expiresAt > now()) return current.promise;

    const promise = Promise.resolve().then(load);
    entries.set(key, { promise, expiresAt:now() + ttlMs });
    if (entries.size > maxEntries) entries.delete(entries.keys().next().value);
    promise.catch(() => { if (entries.get(key)?.promise === promise) entries.delete(key); });
    return promise;
  }

  return { get, size:() => entries.size, clear:() => entries.clear() };
}
