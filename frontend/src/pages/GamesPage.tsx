import { useQuery } from "@tanstack/react-query";
import { Gamepad2 } from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { getGames } from "../services/api";

export function GamesPage() {
  const { data:games = [], isLoading, isError } = useQuery({ queryKey:["games"], queryFn:getGames });

  return (
    <section className="px-4 pb-12 lg:px-8">
      <PageHeader eyebrow="Games" title="Jogos disponiveis" description="Catalogo de jogos preparado para torneios multi-game, mapas e regras por modalidade." />
      {isLoading ? <EmptyState title="Carregando jogos" description="Consultando o catalogo oficial da plataforma." /> : null}
      {isError ? <EmptyState title="Catalogo indisponivel" description="Nao foi possivel consultar os jogos neste momento." /> : null}
      {!isLoading && !isError && games.length === 0 ? <EmptyState title="Nenhum jogo publicado" description="Os jogos cadastrados pela administracao aparecerao aqui." /> : null}
      {games.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => (
            <Card className="overflow-hidden transition hover:border-cyan-400/40" key={game.id}>
              {game.banner ? <img className="h-32 w-full object-cover" src={game.banner} alt="" /> : null}
              <CardContent>
                <div className="flex items-center gap-3">
                  {game.logo ? <img className="h-10 w-10 object-contain" src={game.logo} alt="" /> : <Gamepad2 className="h-8 w-8 text-cyan-200" />}
                  <h2 className="font-display text-xl font-semibold">{game.nome}</h2>
                </div>
                <p className="mt-3 text-sm text-arena-muted">{game.descricao || "Perfis, lineups, mapas, rankings e temporadas por jogo."}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function EmptyState({ title, description }:{ title:string; description:string }) {
  return <div className="border border-arena-line bg-black/20 px-6 py-12 text-center"><Gamepad2 className="mx-auto h-9 w-9 text-cyan-200" /><h2 className="mt-4 font-display text-xl font-semibold">{title}</h2><p className="mt-2 text-sm text-arena-muted">{description}</p></div>;
}
