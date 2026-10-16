import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { CountdownTimer } from "../../components/broadcast/CountdownTimer";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import type { PlayerWorkspace } from "../../types/api";
import { formatDate } from "./playerWorkspaceShared";

type WorkspaceMatch = PlayerWorkspace["matches"][number];

const ATTENDANCE_LABELS: Record<string, string> = { confirmado:"Confirmada", ausente:"Ausente", talvez:"Talvez" };

// Primeiro bloco do painel do jogador: a proxima partida em formato de transmissao.
export function NextMatchBanner({ match, teamName }: { match: WorkspaceMatch | undefined; teamName: string | null }) {
  if (!match) {
    return (
      <section className="border border-arena-line border-t-4 border-t-arena-amber bg-arena-panel p-5">
        <h2 className="font-display text-xl font-semibold">Próxima partida</h2>
        <p className="mt-2 text-arena-muted">Sua equipe não tem partidas marcadas.</p>
        <Link className="mt-4 inline-flex items-center gap-1 font-semibold text-cyan-200 hover:text-cyan-100" to="/torneios">
          Ver campeonatos abertos <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  const live = match.status === "andamento";
  const upcoming = Boolean(match.scheduled_at && new Date(match.scheduled_at).getTime() > Date.now());
  return (
    <section aria-label="Próxima partida" className="grid gap-5 border border-arena-line border-t-4 border-t-arena-amber bg-arena-panel p-5 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <p className="text-sm text-arena-muted">{match.tournament_name}</p>
        <h2 className="mt-1 font-display text-2xl font-bold leading-tight md:text-3xl">
          <span className="text-cyan-300">{teamName || "Sua equipe"}</span> <span className="text-arena-muted">contra</span> <span className="text-arena-amber">{match.opponent}</span>
        </h2>
        <p className="mt-2 text-sm text-arena-muted">
          {match.scheduled_at ? formatDate(match.scheduled_at) : "Horário a definir"} · {match.best_of.toUpperCase().replace("BO", "MD")}
          {match.maps ? ` · ${match.maps}` : ""}
        </p>
      </div>
      <div className="md:text-right">
        {live ? <Badge tone="live">Ao vivo</Badge> : upcoming && match.scheduled_at ? <>
          <CountdownTimer className="block font-display text-4xl font-bold leading-none text-arena-amber tabular-nums" target={match.scheduled_at} />
          <span className="text-xs text-arena-muted">até a partida</span>
        </> : <span className="font-display text-xl font-semibold">Horário a definir</span>}
      </div>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <Link to="/jogador?module=matches"><Button variant="urgent" icon={<ChevronRight className="h-4 w-4" />}>Abrir sala da partida</Button></Link>
        <span className="text-sm text-arena-muted">Presença: <strong className="text-arena-text">{ATTENDANCE_LABELS[match.attendance_status ?? ""] ?? "Pendente"}</strong></span>
        <span className="text-sm text-arena-muted">Escalação: <strong className="text-arena-text">{match.in_official_lineup ? "Titular" : "Acompanhando"}</strong></span>
      </div>
    </section>
  );
}
