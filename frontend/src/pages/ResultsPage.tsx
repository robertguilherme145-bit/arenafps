import { useQuery } from "@tanstack/react-query";
import { Swords } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { getPublicPortal } from "../services/api";

export function ResultsPage() {
  const { data:portal, isLoading, isError } = useQuery({ queryKey:["public-portal"], queryFn:() => getPublicPortal() });
  const results = portal?.results ?? [];

  return (
    <section className="px-4 pb-12 lg:px-8">
      <PageHeader eyebrow="Partidas" title="Resultados" description="Resultados oficiais enviados ao Competition Engine." />
      <Card>
        <CardHeader><h2 className="font-display text-xl font-semibold">Partidas finalizadas</h2></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <EmptyResults text="Carregando resultados oficiais." /> : null}
          {isError ? <EmptyResults text="Nao foi possivel consultar os resultados neste momento." /> : null}
          {!isLoading && !isError && results.length === 0 ? <EmptyResults text="Nenhuma partida finalizada foi publicada." /> : null}
          {results.map((result) => (
            <div className="flex flex-col gap-4 border border-arena-line bg-black/20 p-4 md:flex-row md:items-center md:justify-between" key={result.id}>
              <div className="flex items-center gap-3">
                <Swords className="h-5 w-5 text-cyan-200" />
                <div>
                  <p className="font-semibold">{result.team_a} vs {result.team_b}</p>
                  <p className="text-sm text-arena-muted">Rodada {result.round} - {result.tournament_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl font-bold">{result.score_team_a} - {result.score_team_b}</span>
                <Badge tone="success">Finalizada</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

function EmptyResults({ text }:{ text:string }) {
  return <div className="py-10 text-center"><Swords className="mx-auto h-8 w-8 text-cyan-200" /><p className="mt-3 text-sm text-arena-muted">{text}</p></div>;
}
