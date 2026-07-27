import { Gamepad2 } from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";

const games = ["Sudden Attack", "Counter-Strike 2", "Valorant", "League of Legends", "Rocket League", "Free Fire"];

export function GamesPage() {
  return (
    <section className="px-4 pb-12 lg:px-8">
      <PageHeader eyebrow="Games" title="Jogos disponiveis" description="Catalogo de jogos preparado para torneios multi-game, mapas e regras por modalidade." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {games.map((game) => (
          <Card className="transition hover:border-cyan-400/40" key={game}>
            <CardContent>
              <Gamepad2 className="h-8 w-8 text-cyan-200" />
              <h2 className="mt-4 font-display text-xl font-semibold">{game}</h2>
              <p className="mt-2 text-sm text-arena-muted">Perfis, lineups, mapas, rankings e temporadas por jogo.</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
