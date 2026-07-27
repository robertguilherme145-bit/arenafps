import { Swords } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";

export function ResultsPage() {
  return (
    <section className="px-4 pb-12 lg:px-8">
      <PageHeader eyebrow="Partidas" title="Resultados" description="Resultados oficiais sao fatos enviados ao Competition Engine." />
      <Card>
        <CardHeader><h2 className="font-display text-xl font-semibold">Partidas finalizadas</h2></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-4 rounded-arena border border-arena-line bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <Swords className="h-5 w-5 text-cyan-200" />
              <div>
                <p className="font-semibold">Ghost vs Warriors</p>
                <p className="text-sm text-arena-muted">Round 1 • Arena Camp Teste</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display text-2xl font-bold">13 - 8</span>
              <Badge tone="success">Finalizada</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
