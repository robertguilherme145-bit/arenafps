// Sem dependencias: secoes da Minha Arena, abas por cargo no time e mapa dos paineis antigos.

export type ArenaSection = "inicio" | "partidas" | "torneios" | "time" | "carreira" | "suporte" | "configuracoes";
export type ArenaTeamRole = "lider" | "capitao" | "jogador" | "nenhum";
export type ArenaTab = { key: string; label: string };

export const ARENA_SECTIONS: Array<{ key: ArenaSection; label: string; href: string }> = [
  { key:"inicio", label:"Início", href:"/minha-arena" },
  { key:"partidas", label:"Partidas", href:"/minha-arena/partidas" },
  { key:"torneios", label:"Torneios", href:"/minha-arena/torneios" },
  { key:"time", label:"Meu time", href:"/minha-arena/time" },
  { key:"carreira", label:"Carreira", href:"/minha-arena/carreira" },
  { key:"suporte", label:"Suporte", href:"/minha-arena/suporte" },
  { key:"configuracoes", label:"Configurações", href:"/minha-arena/configuracoes" }
];

export function arenaSection(value: string | undefined | null): ArenaSection | null {
  if (!value) return "inicio";
  return ARENA_SECTIONS.some((item) => item.key === value) ? value as ArenaSection : null;
}

const TABS: Record<ArenaSection, Record<ArenaTeamRole, ArenaTab[]>> = {
  inicio: { lider:[], capitao:[], jogador:[], nenhum:[] },
  partidas: {
    lider:[{ key:"partidas", label:"Partidas" }, { key:"agenda", label:"Agenda" }],
    capitao:[{ key:"partidas", label:"Partidas" }, { key:"veto", label:"Veto de mapas" }, { key:"agenda", label:"Agenda" }],
    jogador:[{ key:"partidas", label:"Partidas" }, { key:"agenda", label:"Agenda" }],
    nenhum:[{ key:"partidas", label:"Partidas" }, { key:"agenda", label:"Agenda" }]
  },
  torneios: {
    lider:[{ key:"time", label:"Torneios do time" }, { key:"mix", label:"Torneios Mix" }],
    capitao:[{ key:"mix", label:"Torneios Mix" }],
    jogador:[{ key:"mix", label:"Torneios Mix" }],
    nenhum:[{ key:"mix", label:"Torneios Mix" }]
  },
  time: {
    lider:[
      { key:"visao", label:"Visão do time" }, { key:"elenco", label:"Elenco" }, { key:"escalacoes", label:"Escalações" },
      { key:"ranking", label:"Ranking" }, { key:"pagamentos", label:"Inscrições e pagamentos" },
      { key:"mensagens", label:"Mensagens" }, { key:"ajustes", label:"Ajustes do time" }
    ],
    capitao:[
      { key:"escalacao", label:"Escalação oficial" }, { key:"ranking", label:"Ranking" },
      { key:"mensagens", label:"Mensagens" }, { key:"ajustes", label:"Presença e saída" }
    ],
    jogador:[{ key:"visao", label:"Meus times" }, { key:"escalacao", label:"Escalação" }, { key:"mensagens", label:"Mensagens" }],
    nenhum:[{ key:"visao", label:"Encontrar um time" }]
  },
  carreira: {
    lider:[{ key:"estatisticas", label:"Estatísticas" }, { key:"conquistas", label:"Conquistas e XP" }, { key:"historico", label:"Histórico do time" }],
    capitao:[{ key:"estatisticas", label:"Estatísticas" }, { key:"conquistas", label:"Conquistas e XP" }, { key:"historico", label:"Histórico do time" }],
    jogador:[{ key:"estatisticas", label:"Estatísticas" }, { key:"conquistas", label:"Conquistas e XP" }],
    nenhum:[{ key:"estatisticas", label:"Estatísticas" }, { key:"conquistas", label:"Conquistas e XP" }]
  },
  suporte: { lider:[], capitao:[], jogador:[], nenhum:[] },
  configuracoes: {
    lider:[{ key:"perfil", label:"Perfil" }, { key:"conta", label:"Conta e segurança" }],
    capitao:[{ key:"perfil", label:"Perfil" }, { key:"conta", label:"Conta e segurança" }],
    jogador:[{ key:"perfil", label:"Perfil" }, { key:"conta", label:"Conta e segurança" }],
    nenhum:[{ key:"perfil", label:"Perfil" }, { key:"conta", label:"Conta e segurança" }]
  }
};

export function arenaTabs(section: ArenaSection, role: ArenaTeamRole): ArenaTab[] {
  return TABS[section][role];
}

// Aba pedida no endereco, ou a primeira da secao quando ela nao existe para esse cargo.
export function arenaTab(section: ArenaSection, role: ArenaTeamRole, requested: string | null): string | null {
  const tabs = arenaTabs(section, role);
  if (!tabs.length) return null;
  return tabs.find((tab) => tab.key === requested)?.key ?? tabs[0].key;
}

type TeamContextLike = { team_id: number; role: string };

// Cargo da pessoa no time ativo. Sem time ativo valido, vale o primeiro time da lista.
export function teamRoleOf(user: { active_team_id: number | null; team_contexts: TeamContextLike[] } | null): ArenaTeamRole {
  if (!user || !user.team_contexts.length) return "nenhum";
  const active = user.team_contexts.find((item) => Number(item.team_id) === Number(user.active_team_id)) ?? user.team_contexts[0];
  return active.role === "lider" || active.role === "capitao" ? active.role : "jogador";
}

const LEGACY: Record<"jogador" | "lider" | "capitao", Record<string, [ArenaSection, string?]>> = {
  jogador: {
    dashboard:["inicio"], profile:["configuracoes", "perfil"], settings:["configuracoes", "conta"],
    teams:["time"], convites:["time"], mix:["torneios", "mix"], lineup:["time", "escalacao"],
    matches:["partidas"], calendar:["partidas", "agenda"], statistics:["carreira"], ranking:["carreira"],
    career:["carreira", "conquistas"], messages:["time", "mensagens"], support:["suporte"]
  },
  lider: {
    dashboard:["inicio"], team:["time", "visao"], roster:["time", "elenco"], lineups:["time", "escalacoes"],
    ranking:["time", "ranking"], communication:["time", "mensagens"], settings:["time", "ajustes"],
    tournaments:["torneios", "time"], finance:["time", "pagamentos"], matches:["partidas"],
    calendar:["partidas", "agenda"], history:["carreira", "historico"]
  },
  capitao: {
    dashboard:["inicio"], matches:["partidas"], veto:["partidas", "veto"], lineup:["time", "escalacao"],
    ranking:["time", "ranking"], calendar:["partidas", "agenda"], communication:["time", "mensagens"],
    statistics:["carreira"], history:["carreira", "historico"], settings:["time", "ajustes"]
  }
};

// Endereco antigo de painel (/jogador, /lider, /capitao) -> Minha Arena. Os outros parametros
// (ex.: token e PayerID do retorno do PayPal) seguem junto.
export function legacyArenaPath(panel: "jogador" | "lider" | "capitao", search: string): string {
  const params = new URLSearchParams(search);
  const module = params.get("module");
  params.delete("module");
  const [section, tab] = (module && LEGACY[panel][module]) || ["inicio"];
  if (tab) params.set("aba", tab);
  const base = ARENA_SECTIONS.find((item) => item.key === section)!.href;
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

// Destino na Minha Arena de um modulo pedido de dentro de um painel embutido.
export function arenaPathForModule(panel: "jogador" | "lider" | "capitao", module: string): string {
  return legacyArenaPath(panel, `?module=${encodeURIComponent(module)}`);
}
