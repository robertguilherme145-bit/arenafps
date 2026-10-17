// Sem dependencias: enderecos antigos do site publico -> enderecos novos. Links antigos nunca dao 404.
export function legacyPublicRedirect(pathname: string, search: string): string | null {
  const params = new URLSearchParams(search);
  if (pathname === "/calendario") return "/torneios?aba=calendario";
  if (pathname === "/resultados") return "/torneios?aba=encerrados";
  if (pathname === "/circuito-oficial") return "/circuito";
  if (pathname === "/equipes" || pathname === "/jogadores") {
    const next = new URLSearchParams({ aba:pathname === "/equipes" ? "equipes" : "jogadores" });
    const query = params.get("q");
    if (query) next.set("q", query);
    return `/comunidade?${next.toString()}`;
  }
  const team = pathname.match(/^\/team\/(.+)$/);
  if (team) return `/equipe/${team[1]}`;
  const player = pathname.match(/^\/player\/(.+)$/);
  if (player) return `/jogador/${player[1]}`;
  return null;
}
