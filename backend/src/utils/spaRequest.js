// Algumas paginas do site tem o mesmo prefixo de rotas da API (ex.: /admin).
// Quando o navegador abre ou recarrega uma dessas paginas, entregamos o frontend
// em vez da API. Chamadas da API pedem JSON e continuam passando direto.
const BACKEND_PAGE_PREFIXES = ["/api/", "/auth/oauth/", "/media/", "/uploads/"];

export function isBrowserPageRequest(req) {
  if (req.method !== "GET") return false;
  if (!String(req.headers?.accept || "").includes("text/html")) return false;
  const path = String(req.path || "");
  if (/\.[a-z0-9]+$/i.test(path)) return false;
  return !BACKEND_PAGE_PREFIXES.some((prefix) => path === prefix.slice(0, -1) || path.startsWith(prefix));
}
