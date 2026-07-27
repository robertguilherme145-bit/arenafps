import { CalendarDays } from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";

export function CalendarPage() {
  const days = Array.from({ length: 30 }, (_, index) => index + 1);

  return (
    <section className="px-4 pb-12 lg:px-8">
      <PageHeader eyebrow="Agenda" title="Calendario competitivo" description="Visual mensal, semanal e agenda para torneios, partidas e eventos." />
      <Card>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-7">
            {days.map((day) => (
              <div className="min-h-28 rounded-arena border border-arena-line bg-black/20 p-3" key={day}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{day}</span>
                  {day === 10 || day === 20 ? <CalendarDays className="h-4 w-4 text-cyan-200" /> : null}
                </div>
                {day === 10 ? <p className="mt-4 text-xs text-arena-muted">Inicio Arena Camp Teste</p> : null}
                {day === 20 ? <p className="mt-4 text-xs text-arena-muted">Final prevista</p> : null}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
