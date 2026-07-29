import { CalendarDays } from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { useTournaments } from "../hooks/useArenaData";

export function CalendarPage() {
  const { data:tournaments = [], isLoading, isError } = useTournaments();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const days = Array.from({ length:new Date(year, month + 1, 0).getDate() }, (_, index) => index + 1);
  const monthName = new Intl.DateTimeFormat("pt-BR", { month:"long", year:"numeric" }).format(now);
  const events = tournaments.flatMap((tournament) => [
    { date:new Date(tournament.inicio), label:`Inicio: ${tournament.nome}` },
    { date:new Date(tournament.fim), label:`Final: ${tournament.nome}` }
  ]).filter((event) => event.date.getFullYear() === year && event.date.getMonth() === month);

  return (
    <section className="px-4 pb-12 lg:px-8">
      <PageHeader eyebrow="Agenda" title="Calendário competitivo" description={`Torneios e eventos oficiais de ${monthName}.`} />
      <Card>
        <CardContent>
          {isLoading ? <p className="py-8 text-center text-sm text-arena-muted">Carregando calendário oficial.</p> : null}
          {isError ? <p className="py-8 text-center text-sm text-arena-muted">Não foi possivel consultar o calendário neste momento.</p> : null}
          {!isLoading && !isError ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-7">
            {days.map((day) => {
              const dayEvents = events.filter((event) => event.date.getDate() === day);
              return <div className="min-h-28 border border-arena-line bg-black/20 p-3" key={day}>
                <div className="flex items-center justify-between"><span className="font-semibold">{day}</span>{dayEvents.length ? <CalendarDays className="h-4 w-4 text-cyan-200" /> : null}</div>
                {dayEvents.map((event) => <p className="mt-3 text-xs text-arena-muted" key={event.label}>{event.label}</p>)}
              </div>;
            })}
          </div> : null}
        </CardContent>
      </Card>
    </section>
  );
}
