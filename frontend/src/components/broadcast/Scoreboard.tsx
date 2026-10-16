import { Link } from "react-router-dom";
import type { FeaturedMatch } from "../../types/api";
import { cn } from "../../utils/cn";
import { Badge } from "../ui/Badge";
import { CountdownTimer } from "./CountdownTimer";

type Side = FeaturedMatch["team_a"];

export function Scoreboard({ match, className }: { match: FeaturedMatch; className?: string }) {
  const live = match.status === "ao_vivo";
  const details = [match.map_number ? `Mapa ${match.map_number}` : null, match.map_name, bestOf(match.best_of)].filter(Boolean).join(" · ");
  return (
    <Link
      aria-label={`${match.team_a.name} contra ${match.team_b.name}, ${match.tournament_name}`}
      className={cn("chamfer grid border border-arena-line bg-arena-panel2 transition hover:border-arena-muted sm:grid-cols-[1fr_auto_1fr]", className)}
      to={`/torneios/${match.tournament_id}`}
    >
      <TeamSide side={match.team_a} color="a" />
      <div className="flex flex-col items-center justify-center gap-1 border-y border-arena-line px-6 py-3 text-center sm:border-x sm:border-y-0">
        {live ? <Badge tone="live">Ao vivo</Badge> : <span className="text-xs font-bold text-arena-amber">Próxima partida</span>}
        {live ? (
          <p className="font-display text-4xl font-bold leading-none tabular-nums">{match.score_a} : {match.score_b}</p>
        ) : match.scheduled_at ? (
          <CountdownTimer className="font-display text-3xl font-bold leading-none tabular-nums" target={match.scheduled_at} />
        ) : (
          <p className="font-display text-xl font-bold leading-tight">Horário a definir</p>
        )}
        <p className="text-xs text-arena-muted">{details || match.tournament_name}</p>
        {!live && match.scheduled_at ? <p className="text-xs text-arena-muted">{dateLabel(match.scheduled_at)}</p> : null}
      </div>
      <TeamSide side={match.team_b} color="b" />
    </Link>
  );
}

function TeamSide({ side, color }: { side: Side; color: "a" | "b" }) {
  const mirrored = color === "b";
  return (
    <div className={cn("flex min-w-0 items-center gap-3 px-4 py-3", mirrored && "sm:flex-row-reverse sm:text-right")}>
      <div
        className={cn("flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden font-display text-sm font-bold text-arena-ink", color === "a" ? "bg-arena-blue" : "bg-arena-amber")}
      >
        {side.logo ? <img alt="" className="h-full w-full object-cover" src={side.logo} /> : initials(side)}
      </div>
      <div className="min-w-0">
        <p className="truncate font-display text-lg font-bold leading-tight">{side.name}</p>
        {side.tag ? <p className="truncate text-xs text-arena-muted">{side.tag}</p> : null}
      </div>
    </div>
  );
}

function initials(side: Side) {
  return (side.tag || side.name).replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2).toUpperCase() || "?";
}

function bestOf(value: string | null) {
  return value ? value.toUpperCase().replace("BO", "MD") : null;
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString("pt-BR", { weekday:"short", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
}
