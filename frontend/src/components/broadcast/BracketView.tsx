import { Crown } from "lucide-react";
import type { BracketColumn, BracketMatch } from "../../lib/bracket";
import { cn } from "../../utils/cn";
import { Badge } from "../ui/Badge";

export function BracketView({ columns, onOpen }: { columns: BracketColumn[]; onOpen?: (matchId: number) => void }) {
  return (
    <div className="overflow-x-auto pb-4 scrollbar-thin">
      <div className="grid gap-5" style={{ gridTemplateColumns:`repeat(${columns.length}, minmax(240px, 1fr))` }}>
        {columns.map((column, index) => {
          const isFinal = column.title === "Final" && index === columns.length - 1;
          return (
            <div className="flex flex-col" key={column.key}>
              <h3 className={cn("mb-3 font-display text-sm font-semibold", isFinal ? "text-arena-amber" : "text-arena-muted")}>{column.title}</h3>
              <div className="flex flex-1 flex-col justify-around gap-4">
                {column.slots.map((slot, slotIndex) =>
                  "match" in slot ? (
                    <MatchCard emphasize={isFinal} key={slot.match.id} match={slot.match} onOpen={onOpen} />
                  ) : (
                    <div className="border border-dashed border-arena-line px-3 py-5 text-center text-sm text-arena-muted" key={`vaga-${slotIndex}`}>
                      A definir
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchCard({ match, onOpen, emphasize }: { match: BracketMatch; onOpen?: (matchId: number) => void; emphasize: boolean }) {
  const finished = match.status === "finalizada";
  const live = match.status === "andamento";
  return (
    <button
      className={cn("w-full border bg-arena-panel text-left transition hover:border-arena-muted", emphasize ? "border-arena-amber" : "border-arena-line")}
      onClick={() => onOpen?.(match.id)}
      type="button"
    >
      <Row name={match.team_a} score={finished || live ? match.score_team_a : null} side="a" winner={finished && match.winner_team_id === match.team_a_id} />
      <Row name={match.team_b} score={finished || live ? match.score_team_b : null} side="b" winner={finished && match.winner_team_id === match.team_b_id} />
      <div className="flex items-center justify-between gap-2 border-t border-arena-line px-3 py-1.5 text-xs text-arena-muted">
        {live ? <Badge className="h-5" tone="live">Ao vivo</Badge> : <span>{finished && !match.scheduled_at ? "" : when(match)}</span>}
        <span>{finished ? "Encerrada" : live ? "" : "Agendada"}</span>
      </div>
    </button>
  );
}

function Row({ name, score, side, winner }: { name?: string | null; score: number | null; side: "a" | "b"; winner: boolean }) {
  const label = name || "A definir";
  return (
    <div className={cn("grid grid-cols-[4px_1fr_auto] items-center gap-3 border-b border-arena-line py-2 pr-3 last:border-b-0", !winner && score !== null && "text-arena-muted")}>
      <span aria-hidden="true" className={cn("h-full self-stretch", side === "a" ? "bg-arena-blue" : "bg-arena-amber")} />
      <span className="flex min-w-0 items-center gap-1.5 font-semibold">
        <span className="truncate">{label}</span>
        {winner ? <Crown aria-label="Vencedor" className="h-3.5 w-3.5 shrink-0 text-arena-amber" /> : null}
      </span>
      <span className="font-display text-lg font-bold tabular-nums">{score ?? "–"}</span>
    </div>
  );
}

function when(match: BracketMatch) {
  if (!match.scheduled_at) return "Horário a definir";
  return new Date(match.scheduled_at).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
}
