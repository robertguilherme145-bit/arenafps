import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { buildMonthGrid } from "../../lib/calendar";
import { cn } from "../../utils/cn";
import { Button } from "../ui/Button";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function TournamentCalendar({ tournaments }: { tournaments: Array<{ id:number; nome:string; inicio:string | null; fim:string | null }> }) {
  const today = new Date();
  const [cursor, setCursor] = useState({ year:today.getFullYear(), month:today.getMonth() });
  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month, tournaments), [cursor, tournaments]);
  const title = new Intl.DateTimeFormat("pt-BR", { month:"long", year:"numeric" }).format(new Date(cursor.year, cursor.month, 1));
  const move = (delta: number) => setCursor(({ year, month }) => {
    const next = new Date(year, month + delta, 1);
    return { year:next.getFullYear(), month:next.getMonth() };
  });
  const hasEvents = grid.some((day) => day.events.length);

  return (
    <div className="border border-arena-line bg-arena-panel">
      <div className="flex items-center justify-between gap-3 border-b border-arena-line px-4 py-3">
        <Button aria-label="Mês anterior" className="h-9 w-9 px-0" icon={<ChevronLeft className="h-4 w-4" />} onClick={() => move(-1)} variant="ghost" />
        <h2 className="font-display text-lg font-semibold capitalize">{title}</h2>
        <Button aria-label="Próximo mês" className="h-9 w-9 px-0" icon={<ChevronRight className="h-4 w-4" />} onClick={() => move(1)} variant="ghost" />
      </div>
      <div className="grid grid-cols-7 border-b border-arena-line text-center text-xs font-semibold text-arena-muted">
        {WEEKDAYS.map((day) => <div className="py-2" key={day}>{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {grid.map((day) => {
          const isToday = day.inMonth && day.date.toDateString() === today.toDateString();
          return (
            <div className={cn("min-h-20 border-b border-r border-arena-line p-1.5 sm:min-h-24 sm:p-2", !day.inMonth && "bg-arena-panel2/60")} key={day.date.toISOString()}>
              <span className={cn("inline-flex h-6 w-6 items-center justify-center text-xs font-semibold", day.inMonth ? "text-arena-text" : "text-arena-muted/50", isToday && "bg-arena-blue text-arena-ink")}>{day.day}</span>
              <div className="mt-1 space-y-1">
                {day.events.map((event) => (
                  <Link className={cn("block truncate border-l-2 px-1.5 py-0.5 text-[11px] font-semibold hover:bg-arena-panel2", event.kind === "inicio" ? "border-arena-blue text-cyan-200" : "border-arena-amber text-arena-amber")} key={`${event.id}-${event.kind}`} title={event.label} to={`/torneios/${event.id}`}>
                    {event.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {!hasEvents ? <p className="px-4 py-3 text-sm text-arena-muted">Nenhum campeonato começa ou termina neste mês. Use as setas para ver outros meses.</p> : null}
    </div>
  );
}
