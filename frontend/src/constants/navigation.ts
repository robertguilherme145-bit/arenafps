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

// Painel da organizacao: 8 secoes (ver lib/adminSections.ts).
export const adminNavigation = [
  { label: "Hoje", href: "/admin", icon: LayoutDashboard },
  { label: "Torneios", href: "/admin/torneios", icon: Trophy },
  { label: "Partidas", href: "/admin/partidas", icon: Swords },
  { label: "Comunidade", href: "/admin/comunidade", icon: Users },
  { label: "Conteúdo", href: "/admin/conteudo", icon: Newspaper },
  { label: "Financeiro", href: "/admin/financeiro", icon: CreditCard },
  { label: "Acessos", href: "/admin/acessos", icon: KeyRound },
  { label: "Auditoria", href: "/admin/auditoria", icon: History }
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
