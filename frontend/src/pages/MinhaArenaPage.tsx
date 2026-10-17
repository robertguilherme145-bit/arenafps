import { ExternalLink, LogIn, Shield } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, NavLink, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Select } from "../components/ui/Form";
import { PageHeader } from "../components/ui/PageHeader";
import { PageTabs } from "../components/ui/PageTabs";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuth } from "../contexts/AuthContext";
import { CaptainArena, type CaptainModule } from "../features/arena/CaptainArena";
import { LeaderArena, type LeaderModule } from "../features/arena/LeaderArena";
import { PlayerArena, type PlayerModule } from "../features/arena/PlayerArena";
import { PlayerMixModule } from "../features/player/PlayerMixModule";
import { useToast } from "../hooks/useToast";
import { ARENA_SECTIONS, arenaSection, arenaTab, arenaTabs, teamRoleOf, type ArenaSection, type ArenaTeamRole } from "../lib/minhaArena";
import { NotFoundPage } from "./NotFoundPage";
import { useSessionStore } from "../stores/sessionStore";
import { cn } from "../utils/cn";

const ROLE_LABEL: Record<ArenaTeamRole, string> = { lider:"Líder", capitao:"Capitão", jogador:"Jogador", nenhum:"Sem time" };

// Area unica da pessoa: secoes no menu, abas por cargo no time ativo.
export function MinhaArenaPage() {
  const { token, user, loading, switchContext } = useAuth();
  const setAuthModalOpen = useSessionStore((state) => state.setAuthModalOpen);
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const [switching, setSwitching] = useState(false);
  const section = arenaSection(params.secao);

  if (loading) return <ArenaLoading />;
  if (!token || !user) {
    return <section className="mx-auto max-w-[1200px] px-4 py-16 lg:px-8"><EmptyState title="Entre para abrir a Minha Arena" description="Aqui ficam suas partidas, seu time, sua carreira e suas configurações." action={<Button icon={<LogIn className="h-4 w-4" />} onClick={() => setAuthModalOpen(true)}>Entrar</Button>} /></section>;
  }
  if (!section) return <NotFoundPage />;

  const role = teamRoleOf(user);
  const isPlayer = user.roles.includes("jogador");
  const tabs = arenaTabs(section, role);
  const tab = arenaTab(section, role, searchParams.get("aba"));
  const activeTeam = user.team_contexts.find((item) => item.team_id === user.active_team_id) ?? user.team_contexts[0] ?? null;
  const title = ARENA_SECTIONS.find((item) => item.key === section)!.label;

  async function changeTeam(teamId: number) {
    const target = user!.team_contexts.find((item) => item.team_id === teamId);
    if (!target) return;
    setSwitching(true);
    try {
      await switchContext({ role:target.role, team_id:teamId });
    } catch (reason) {
      toast.error("Não foi possível trocar de time", reason instanceof Error ? reason.message : "Tente novamente.");
    } finally {
      setSwitching(false);
    }
  }

  function openTab(value: string) {
    const next = new URLSearchParams();
    next.set("aba", value);
    setSearchParams(next);
  }

  const teamPicker = user.team_contexts.length > 1 ? (
    <Select aria-label="Time" className="min-w-56" disabled={switching} value={activeTeam?.team_id ?? ""} onChange={(event) => void changeTeam(Number(event.target.value))}>
      {user.team_contexts.map((item) => <option key={item.team_id} value={item.team_id}>{item.team_name} · {item.game_name} · {ROLE_LABEL[item.role]}</option>)}
    </Select>
  ) : null;

  return (
    <section className="mx-auto max-w-[1200px] px-4 pb-12 lg:px-8">
      <nav aria-label="Seções da Minha Arena" className="-mx-4 mb-2 flex gap-1 overflow-x-auto border-b border-arena-line px-4 scrollbar-thin lg:hidden">
        {ARENA_SECTIONS.map((item) => (
          <NavLink className={({ isActive }) => cn("shrink-0 px-3 py-3 text-sm font-semibold", isActive ? "text-arena-text shadow-[inset_0_-3px_0_#ffb020]" : "text-arena-muted")} end key={item.key} to={item.href}>{item.label}</NavLink>
        ))}
      </nav>
      <PageHeader
        title={section === "inicio" ? `Olá, ${user.nickname || user.nome}` : title}
        description={activeTeam ? `${activeTeam.team_name} · ${activeTeam.game_name} · ${ROLE_LABEL[role]}` : "Você ainda não faz parte de um time."}
        action={<>
          {section === "time" || section === "inicio" ? teamPicker : null}
          {section === "time" && activeTeam ? <Link to={`/equipe/${activeTeam.team_slug}`}><Button icon={<Shield className="h-4 w-4" />} variant="secondary">Página do time</Button></Link> : null}
          {section === "configuracoes" && user.nickname ? <Link to={`/jogador/${encodeURIComponent(user.nickname)}`}><Button icon={<ExternalLink className="h-4 w-4" />} variant="secondary">Meu perfil público</Button></Link> : null}
        </>}
      />
      {tabs.length > 1 && tab ? <div className="mb-6"><PageTabs items={tabs.map((item) => ({ value:item.key, label:item.label }))} label={`Abas de ${title}`} value={tab} onChange={openTab} /></div> : null}
      {switching ? <ArenaLoading /> : (
        <div key={`${section}-${tab}-${user.active_team_id ?? 0}`}>
          {isPlayer || user.roles.includes("lider") ? <SectionContent section={section} tab={tab} role={role} canLead={user.roles.includes("lider")} teamId={user.active_team_id} /> : <NoPlayerProfile />}
        </div>
      )}
    </section>
  );
}

function SectionContent({ section, tab, role, canLead, teamId }: { section: ArenaSection; tab: string | null; role: ArenaTeamRole; canLead: boolean; teamId: number | null }) {
  const player = (module: PlayerModule) => <PlayerArena module={module} teamId={teamId} />;
  const leader = (module: LeaderModule) => <LeaderArena module={module} />;
  const captain = (module: CaptainModule) => <CaptainArena module={module} />;

  const map: Record<ArenaSection, () => ReactNode> = {
    inicio: () => role === "lider" ? leader("dashboard") : role === "capitao" ? captain("dashboard") : player("dashboard"),
    partidas: () => {
      if (role === "lider") return leader(tab === "agenda" ? "calendar" : "matches");
      if (role === "capitao") return captain(tab === "agenda" ? "calendar" : tab === "veto" ? "veto" : "matches");
      return player(tab === "agenda" ? "calendar" : "matches");
    },
    torneios: () => role === "lider" && tab === "time" ? leader("tournaments") : <PlayerMixModule />,
    time: () => {
      if (role === "lider") {
        const modules: Record<string, LeaderModule> = { visao:"team", elenco:"roster", escalacoes:"lineups", ranking:"ranking", pagamentos:"finance", mensagens:"communication", ajustes:"settings" };
        return leader(modules[tab ?? "visao"] ?? "team");
      }
      if (role === "capitao") {
        const modules: Record<string, CaptainModule> = { escalacao:"lineup", ranking:"ranking", mensagens:"communication", ajustes:"settings" };
        return captain(modules[tab ?? "escalacao"] ?? "lineup");
      }
      if (role === "jogador") return player(tab === "escalacao" ? "lineup" : tab === "mensagens" ? "messages" : "teams");
      return <div className="space-y-6">{canLead ? leader("team") : null}{player("teams")}</div>;
    },
    carreira: () => {
      if (tab === "historico") return role === "lider" ? leader("history") : captain("history");
      return player(tab === "conquistas" ? "career" : "statistics");
    },
    suporte: () => player("support"),
    configuracoes: () => player(tab === "conta" ? "settings" : "profile")
  };
  return <>{map[section]()}</>;
}

function NoPlayerProfile() {
  return <EmptyState title="Conta da organização" description="Esta conta não tem perfil de jogador. Use o Painel da organização para gerenciar a plataforma." action={<Link to="/admin"><Button variant="secondary">Abrir o Painel da organização</Button></Link>} />;
}

function ArenaLoading() {
  return <section className="mx-auto max-w-[1200px] space-y-4 px-4 py-10 lg:px-8"><Skeleton className="h-12 w-72" /><Skeleton className="h-10" /><Skeleton className="h-96" /></section>;
}
