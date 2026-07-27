import {
  CalendarDays,
  BarChart3,
  ClipboardList,
  CircleHelp,
  Contact,
  CreditCard,
  Crosshair,
  Gamepad2,
  History,
  Home,
  LayoutDashboard,
  MessageSquare,
  Medal,
  Newspaper,
  Settings2,
  Shield,
  Swords,
  Trophy,
  UserRound,
  Users,
  Wand2
} from "lucide-react";

export const publicNavigation = [
  { label: "Home", href: "/", icon: Home },
  { label: "Torneios", href: "/torneios", icon: Trophy },
  { label: "Ranking", href: "/ranking", icon: Medal },
  { label: "Calendario", href: "/calendario", icon: CalendarDays },
  { label: "Resultados", href: "/resultados", icon: Swords },
  { label: "Jogos", href: "/jogos", icon: Gamepad2 }
];

export const footerNavigation = [
  { label: "Sobre", href: "/sobre", icon: Newspaper },
  { label: "Contato", href: "/contato", icon: Contact },
  { label: "FAQ", href: "/faq", icon: CircleHelp }
];

export const adminNavigation = [
  { label: "Visao geral", href: "/admin?module=dashboard", icon: LayoutDashboard, module: "dashboard" },
  { label: "Competicoes", href: "/admin?module=competitions", icon: Trophy, module: "competitions" },
  { label: "Operacoes", href: "/admin?module=operations", icon: Swords, module: "operations" },
  { label: "Comunidade", href: "/admin?module=community", icon: Users, module: "community" }
];

export const adminControlNavigation = [
  { label: "Financeiro", href: "/admin?module=finance", icon: CreditCard, module: "finance" },
  { label: "Auditoria", href: "/admin?module=audit", icon: History, module: "audit" }
];

export const adminActionNavigation = [
  { label: "Novo torneio", href: "/admin/torneios/novo", icon: Wand2 }
];

export const leaderNavigation = [
  { label: "Visao geral", href: "/lider?module=dashboard", icon: LayoutDashboard, module: "dashboard" },
  { label: "Minha equipe", href: "/lider?module=team", icon: Shield, module: "team" },
  { label: "Elenco", href: "/lider?module=roster", icon: Users, module: "roster" },
  { label: "Lineups", href: "/lider?module=lineups", icon: ClipboardList, module: "lineups" },
  { label: "Ranking da equipe", href: "/lider?module=ranking", icon: Medal, module: "ranking" }
];

export const leaderCompetitionNavigation = [
  { label: "Torneios", href: "/lider?module=tournaments", icon: Trophy, module: "tournaments" },
  { label: "Partidas", href: "/lider?module=matches", icon: Swords, module: "matches" },
  { label: "Calendario", href: "/lider?module=calendar", icon: CalendarDays, module: "calendar" }
];

export const leaderControlNavigation = [
  { label: "Financeiro", href: "/lider?module=finance", icon: CreditCard, module: "finance" },
  { label: "Comunicacao", href: "/lider?module=communication", icon: MessageSquare, module: "communication" },
  { label: "Historico", href: "/lider?module=history", icon: History, module: "history" },
  { label: "Configuracoes", href: "/lider?module=settings", icon: Settings2, module: "settings" }
];

export const captainNavigation = [
  { label: "Visao geral", href: "/capitao?module=dashboard", icon: LayoutDashboard, module: "dashboard" },
  { label: "Partidas", href: "/capitao?module=matches", icon: Swords, module: "matches" },
  { label: "Pick & Ban", href: "/capitao?module=veto", icon: Crosshair, module: "veto" }
];

export const captainTeamNavigation = [
  { label: "Lineup oficial", href: "/capitao?module=lineup", icon: ClipboardList, module: "lineup" },
  { label: "Ranking da equipe", href: "/capitao?module=ranking", icon: Medal, module: "ranking" },
  { label: "Calendario", href: "/capitao?module=calendar", icon: CalendarDays, module: "calendar" },
  { label: "Comunicacao", href: "/capitao?module=communication", icon: MessageSquare, module: "communication" }
];

export const captainControlNavigation = [
  { label: "Estatisticas", href: "/capitao?module=statistics", icon: BarChart3, module: "statistics" },
  { label: "Historico", href: "/capitao?module=history", icon: History, module: "history" },
  { label: "Configuracoes", href: "/capitao?module=settings", icon: Settings2, module: "settings" }
];

export const playerNavigation = [
  { label: "Visao geral", href: "/jogador?module=dashboard", icon: LayoutDashboard, module: "dashboard" },
  { label: "Meu perfil", href: "/jogador?module=profile", icon: UserRound, module: "profile" },
  { label: "Equipes e convites", href: "/jogador?module=teams", icon: Users, module: "teams" },
  { label: "Lineup", href: "/jogador?module=lineup", icon: ClipboardList, module: "lineup" },
  { label: "Partidas", href: "/jogador?module=matches", icon: Swords, module: "matches" },
  { label: "Calendario", href: "/jogador?module=calendar", icon: CalendarDays, module: "calendar" },
  { label: "Estatisticas", href: "/jogador?module=statistics", icon: BarChart3, module: "statistics" },
  { label: "Carreira", href: "/jogador?module=career", icon: Medal, module: "career" },
  { label: "Mensagens", href: "/jogador?module=messages", icon: MessageSquare, module: "messages" },
  { label: "Suporte", href: "/jogador?module=support", icon: CircleHelp, module: "support" },
  { label: "Configuracoes", href: "/jogador?module=settings", icon: Settings2, module: "settings" }
];
