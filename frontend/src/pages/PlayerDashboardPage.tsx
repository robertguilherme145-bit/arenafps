import { Bell, CalendarDays, ExternalLink, Medal, RefreshCw, Shield, Swords } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  PlayerCalendarModule,
  PlayerCareerModule,
  PlayerDashboardModule,
  PlayerLineupModule,
  PlayerMatchesModule,
  PlayerMessagesModule,
  PlayerProfileModule,
  PlayerSettingsModule,
  PlayerStatisticsModule,
  PlayerSupportModule,
  PlayerTeamsModule,
  type PlayerRunner
} from "../features/player/PlayerWorkspaceModules";
import { Button } from "../components/ui/Button";
import { Select } from "../components/ui/Form";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { useToast } from "../hooks/useToast";
import { getPlayerWorkspace } from "../services/api";
import type { PlayerWorkspace } from "../types/api";
import { PlayerMixModule } from "../features/player/PlayerMixModule";

const modules = ["dashboard", "profile", "teams", "mix", "lineup", "matches", "calendar", "statistics", "career", "messages", "support", "settings"] as const;
type PlayerModule = typeof modules[number];

export function PlayerDashboardPage() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("module");
  const normalized = requested === "convites" || requested === "ranking" ? (requested === "convites" ? "teams" : "statistics") : requested;
  const activeModule: PlayerModule = modules.includes(normalized as PlayerModule) ? normalized as PlayerModule : "dashboard";
  const [workspace, setWorkspace] = useState<PlayerWorkspace | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (teamId?: number | null) => {
    try {
      const data = await getPlayerWorkspace(teamId ?? selectedTeamId);
      setWorkspace(data);
      setSelectedTeamId(data.current_team?.team_id ?? null);
    } catch (error) {
      toast.error("Falha ao abrir o painel", messageOf(error));
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId]);

  useEffect(() => { void load(); }, []);

  const run: PlayerRunner = async (key, action, success, refresh = true) => {
    setBusy(key);
    try {
      await action();
      toast.success(success);
      if (refresh) await load();
      return true;
    } catch (error) {
      toast.error("Operação não concluida", messageOf(error));
      return false;
    } finally {
      setBusy(null);
    }
  };

  if (loading || !workspace) return <PlayerLoading />;

  const moduleProps = { data: workspace, busy, run };
  const content = {
    dashboard: <PlayerDashboardModule {...moduleProps} />,
    profile: <PlayerProfileModule {...moduleProps} />,
    teams: <PlayerTeamsModule {...moduleProps} />,
    mix: <PlayerMixModule />,
    lineup: <PlayerLineupModule {...moduleProps} />,
    matches: <PlayerMatchesModule {...moduleProps} />,
    calendar: <PlayerCalendarModule {...moduleProps} />,
    statistics: <PlayerStatisticsModule {...moduleProps} />,
    career: <PlayerCareerModule {...moduleProps} />,
    messages: <PlayerMessagesModule {...moduleProps} />,
    support: <PlayerSupportModule {...moduleProps} />,
    settings: <PlayerSettingsModule {...moduleProps} />
  }[activeModule];

  const team = workspace.current_team;
  return <section className="px-4 pb-12 lg:px-8">
    <PageHeader
      eyebrow="Jogador"
      title={workspace.profile.nickname || workspace.profile.nome}
      description={team ? `${team.team_name} · ${team.game_name} · carreira competitiva` : "Construa seu perfil competitivo e encontre uma equipe"}
      action={<div className="flex flex-wrap gap-2">
        {workspace.teams.length > 1 ? <Select className="min-w-56" value={team?.team_id ?? ""} onChange={(event) => { const id = Number(event.target.value); setSelectedTeamId(id); void load(id); }}>{workspace.teams.map((item) => <option key={item.team_id} value={item.team_id}>{item.team_name} · {item.game_name}</option>)}</Select> : null}
        <Link to={`/jogador/${publicSlug(workspace.profile.nickname || String(workspace.profile.id))}`}><Button icon={<ExternalLink className="h-4 w-4" />} variant="secondary">Meu perfil público</Button></Link>
        {team ? <Link to={`/equipe/${team.team_slug}`}><Button icon={<Shield className="h-4 w-4" />} variant="secondary">Perfil da equipe</Button></Link> : null}
      </div>}
    />
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <ContextItem icon={<Swords className="h-4 w-4" />} label="Próxima partida" value={nextMatchLabel(workspace)} />
      <ContextItem icon={<Medal className="h-4 w-4" />} label="Ranking geral" value={workspace.career.totals.global_rank ? `#${workspace.career.totals.global_rank}` : "Ainda sem posição"} />
      <ContextItem icon={<CalendarDays className="h-4 w-4" />} label="Agenda" value={`${workspace.matches.filter((item) => item.status !== "finalizada").length + workspace.events.length} compromissos`} />
      <ContextItem icon={<Bell className="h-4 w-4" />} label="Notificações" value={`${workspace.notifications.filter((item) => !item.lida).length} nao lidas`} action={<button aria-label="Atualizar painel" className="text-arena-muted hover:text-cyan-200" title="Atualizar painel" onClick={() => void run("reload", load, "Painel atualizado", false)}><RefreshCw className={`h-4 w-4 ${busy === "reload" ? "animate-spin" : ""}`} /></button>} />
    </div>
    {content}
  </section>;
}

function ContextItem({ icon, label, value, action }: { icon: React.ReactNode; label: string; value: string; action?: React.ReactNode }) {
  return <div className="flex min-h-20 items-center gap-3 border border-arena-line bg-black/20 p-4"><span className="text-cyan-200">{icon}</span><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase text-arena-muted">{label}</p><p className="mt-1 truncate font-semibold">{value}</p></div>{action}</div>;
}

function nextMatchLabel(data: PlayerWorkspace) {
  const match = data.matches.find((item) => item.status !== "finalizada");
  return match ? `vs ${match.opponent}` : "Nenhuma agendada";
}

function PlayerLoading() {
  return <section className="space-y-5 px-4 py-8 lg:px-8"><Skeleton className="h-14 w-80" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton className="h-20" key={index} />)}</div><Skeleton className="h-[520px] w-full" /></section>;
}

function messageOf(error: unknown) { return error instanceof Error ? error.message : "Tente novamente."; }
function publicSlug(value: string) { return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
