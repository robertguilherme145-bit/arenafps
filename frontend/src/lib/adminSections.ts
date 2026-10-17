// Sem dependencias: as 8 secoes do Painel da organizacao e o mapa dos modulos antigos (?module=).

export type AdminSection = "hoje" | "torneios" | "partidas" | "comunidade" | "conteudo" | "financeiro" | "acessos" | "auditoria";
export type AdminModule = "dashboard" | "competitions" | "official" | "operations" | "community" | "progression" | "content" | "finance" | "access" | "audit";

type SectionInfo = { key: AdminSection; label: string; href: string; description: string; tabs: Array<{ key: string; label: string; module: AdminModule }> };

export const ADMIN_SECTIONS: SectionInfo[] = [
  { key:"hoje", label:"Hoje", href:"/admin", description:"O que precisa da sua atenção agora e os números do dia.", tabs:[{ key:"hoje", label:"Hoje", module:"dashboard" }] },
  { key:"torneios", label:"Torneios", href:"/admin/torneios", description:"Torneios, inscrições e o Circuito oficial.", tabs:[
    { key:"lista", label:"Torneios e inscrições", module:"competitions" },
    { key:"circuito", label:"Circuito oficial", module:"official" }
  ] },
  { key:"partidas", label:"Partidas", href:"/admin/partidas", description:"Salas, veto, placar, súmula, transmissão e o catálogo de jogos e mapas.", tabs:[{ key:"central", label:"Central de partidas", module:"operations" }] },
  { key:"comunidade", label:"Comunidade", href:"/admin/comunidade", description:"Equipes, jogadores, punições, disputas, chamados e conquistas.", tabs:[
    { key:"equipes", label:"Equipes, jogadores e chamados", module:"community" },
    { key:"conquistas", label:"Conquistas e XP", module:"progression" }
  ] },
  { key:"conteudo", label:"Conteúdo", href:"/admin/conteudo", description:"Notícias, FAQ, parceiros e mensagens de contato.", tabs:[{ key:"portal", label:"Conteúdo", module:"content" }] },
  { key:"financeiro", label:"Financeiro", href:"/admin/financeiro", description:"Pagamentos e conciliação.", tabs:[{ key:"pagamentos", label:"Pagamentos", module:"finance" }] },
  { key:"acessos", label:"Acessos", href:"/admin/acessos", description:"Contas, papéis e permissões.", tabs:[{ key:"contas", label:"Contas", module:"access" }] },
  { key:"auditoria", label:"Auditoria", href:"/admin/auditoria", description:"Histórico de alterações feitas no painel.", tabs:[{ key:"historico", label:"Histórico", module:"audit" }] }
];

export function adminSection(value: string | undefined | null): SectionInfo | null {
  if (!value) return ADMIN_SECTIONS[0];
  return ADMIN_SECTIONS.find((item) => item.key === value) ?? null;
}

// Modulo antigo que a secao e a aba pedidas mostram. Aba desconhecida vira a primeira.
export function adminModuleFor(section: SectionInfo, tab: string | null): { module: AdminModule; tab: string } {
  const found = section.tabs.find((item) => item.key === tab) ?? section.tabs[0];
  return { module:found.module, tab:found.key };
}

// Endereco novo de um modulo antigo; os outros parametros (torneio, game, status) seguem junto.
export function adminPathForModule(module: string | null, search = ""): string {
  const params = new URLSearchParams(search);
  params.delete("module");
  const section = ADMIN_SECTIONS.find((item) => item.tabs.some((tab) => tab.module === module)) ?? ADMIN_SECTIONS[0];
  const tab = section.tabs.find((item) => item.module === module);
  if (tab && section.tabs.length > 1) params.set("aba", tab.key);
  const query = params.toString();
  return query ? `${section.href}?${query}` : section.href;
}
