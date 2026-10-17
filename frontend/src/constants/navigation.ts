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
  RadioTower,
  Medal,
  Newspaper,
  KeyRound,
  Settings2,
  Shield,
  Shuffle,
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
  { label: "Calendário", href: "/calendario", icon: CalendarDays },
  { label: "Resultados", href: "/resultados", icon: Swords },
  { label: "Circuito oficial", href: "/circuito-oficial", icon: RadioTower },
  { label: "Jogos", href: "/jogos", icon: Gamepad2 }
];

export const footerNavigation = [
  { label: "Sobre", href: "/sobre", icon: Newspaper },
  { label: "Contato", href: "/contato", icon: Contact },
  { label: "FAQ", href: "/faq", icon: CircleHelp }
];

export const adminNavigation = [
  { label: "Visão geral", href: "/admin?module=dashboard", icon: LayoutDashboard, module: "dashboard" },
  { label: "Torneios e inscrições", href: "/admin?module=competitions", icon: Trophy, module: "competitions" },
  { label: "Central de partidas", href: "/admin?module=operations", icon: Swords, module: "operations" }
];

export const adminControlNavigation = [
  { label: "Equipes e jogadores", href: "/admin?module=community", icon: Users, module: "community" },
  { label: "Contas e permissões", href: "/admin?module=access", icon: KeyRound, module: "access" },
  { label: "Conquistas e XP", href: "/admin?module=progression", icon: Medal, module: "progression" },
  { label: "Conteúdo do portal", href: "/admin?module=content", icon: Newspaper, module: "content" },
  { label: "Circuito oficial", href: "/admin?module=official", icon: RadioTower, module: "official" },
  { label: "Financeiro", href: "/admin?module=finance", icon: CreditCard, module: "finance" },
  { label: "Auditoria", href: "/admin?module=audit", icon: History, module: "audit" }
];

export const adminActionNavigation = [
  { label: "Novo torneio", href: "/admin/torneios/novo", icon: Wand2 }
];

// Menu da Minha Arena (as abas de cada secao mudam conforme o cargo no time).
export const arenaNavigation = [
  { label: "Início", href: "/minha-arena", icon: LayoutDashboard },
  { label: "Partidas", href: "/minha-arena/partidas", icon: Swords },
  { label: "Torneios", href: "/minha-arena/torneios", icon: Trophy },
  { label: "Meu time", href: "/minha-arena/time", icon: Shield },
  { label: "Carreira", href: "/minha-arena/carreira", icon: Medal },
  { label: "Suporte", href: "/minha-arena/suporte", icon: CircleHelp },
  { label: "Configurações", href: "/minha-arena/configuracoes", icon: Settings2 }
];
