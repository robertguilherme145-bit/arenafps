import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Gamepad2, ImageOff, Map, X } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { Card, CardContent } from "../components/ui/Card";
import { PageHeader } from "../components/ui/PageHeader";
import { getGame, getGames } from "../services/api";

export function GamesPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data:games = [], isLoading, isError } = useQuery({ queryKey:["games"], queryFn:getGames });
  const { data:selected, isLoading:loadingGame } = useQuery({ queryKey:["game", selectedId], queryFn:()=>getGame(Number(selectedId)), enabled:Boolean(selectedId) });

  return (
    <section className="px-4 pb-16 lg:px-8">
      <PageHeader eyebrow="Games" title="Jogos disponiveis" description="Explore os jogos competitivos da Arena Camp e conheca os mapas habilitados em cada modalidade." />
      {isLoading ? <EmptyState title="Carregando jogos" description="Consultando o catálogo oficial da plataforma." /> : null}
      {isError ? <EmptyState title="Catálogo indisponivel" description="Não foi possivel consultar os jogos neste momento." /> : null}
      {!isLoading && !isError && games.length === 0 ? <EmptyState title="Nenhum jogo publicado" description="Os jogos cadastrados pela administracao aparecerao aqui." /> : null}
      {games.length > 0 ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{games.map((game) => (
        <button className="group overflow-hidden border border-arena-line bg-arena-panel text-left transition hover:border-cyan-400/50" key={game.id} onClick={()=>setSelectedId(game.id)}>
          <div className="relative aspect-[16/7] overflow-hidden bg-[#071321]">{game.banner ? <img className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" src={game.banner} alt={`Capa de ${game.nome}`} /> : <div className="flex h-full items-center justify-center"><Gamepad2 className="h-12 w-12 text-cyan-200" /></div>}<div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 to-transparent" /></div>
          <div className="p-5"><div className="flex items-center gap-3">{game.logo ? <img className="h-12 w-12 object-contain" src={game.logo} alt="" /> : <div className="flex h-12 w-12 items-center justify-center border border-cyan-400/25 bg-cyan-400/10"><Gamepad2 className="h-6 w-6 text-cyan-200" /></div>}<div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase text-cyan-200">{game.nome_curto}</p><h2 className="mt-1 truncate font-display text-xl font-semibold">{game.nome}</h2></div><ChevronRight className="h-5 w-5 text-arena-muted transition group-hover:translate-x-1 group-hover:text-cyan-200" /></div><p className="mt-4 line-clamp-2 min-h-10 text-sm text-arena-muted">{game.descricao || "Mapas, torneios, rankings e temporadas desta modalidade."}</p><p className="mt-4 border-t border-arena-line pt-3 text-xs font-semibold uppercase text-cyan-200">Visualizar mapas</p></div>
        </button>
      ))}</div> : null}

      {selectedId ? <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event)=>{if(event.currentTarget===event.target)setSelectedId(null);}}>
        <div className="mx-auto my-4 max-w-6xl overflow-hidden border border-arena-line bg-[#070b12] shadow-2xl">
          {loadingGame || !selected ? <div className="flex min-h-96 items-center justify-center text-sm text-arena-muted">Carregando mapas...</div> : <>
            <div className="relative min-h-56 overflow-hidden bg-[#071321]">{selected.banner ? <img className="absolute inset-0 h-full w-full object-cover opacity-55" src={selected.banner} alt="" /> : null}<div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent" /><button className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center border border-white/15 bg-black/50 text-white hover:bg-black/80" onClick={()=>setSelectedId(null)} aria-label="Fechar"><X className="h-5 w-5" /></button><div className="relative flex min-h-56 max-w-3xl items-end gap-4 p-6 sm:p-8">{selected.logo ? <img className="h-20 w-20 object-contain" src={selected.logo} alt="" /> : null}<div><p className="text-xs font-semibold uppercase text-cyan-200">Catálogo de mapas</p><h2 className="mt-2 font-display text-3xl font-bold">{selected.nome}</h2><p className="mt-2 text-sm leading-6 text-slate-300">{selected.descricao || "Mapas atualmente disponiveis para competicoes na Arena Camp."}</p></div></div></div>
            <div className="p-5 sm:p-8"><div className="mb-5 flex items-center justify-between"><div><h3 className="font-display text-xl font-semibold">Mapas disponiveis</h3><p className="mt-1 text-sm text-arena-muted">A selecao pode variar conforme as regras de cada torneio.</p></div><Badge tone="info">{selected.maps?.length || 0} mapas</Badge></div>
              {selected.maps?.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{selected.maps.map((map) => <article className="group overflow-hidden border border-arena-line bg-black/25 transition hover:border-cyan-400/45" key={map.id}><MapArtwork src={map.imagem} name={map.nome} /><div className="flex items-center justify-between gap-3 p-4"><div><p className="font-display text-lg font-semibold">{map.nome}</p><p className="mt-1 text-xs text-arena-muted">{map.slug}</p></div><Map className="h-5 w-5 text-cyan-200" /></div></article>)}</div> : <EmptyState title="Nenhum mapa publicado" description="Os mapas ativos deste jogo aparecerao aqui quando forem cadastrados." />}
            </div>
          </>}
        </div>
      </div> : null}
    </section>
  );
}

function EmptyState({ title, description }:{ title:string; description:string }) { return <div className="border border-arena-line bg-black/20 px-6 py-12 text-center"><Gamepad2 className="mx-auto h-9 w-9 text-cyan-200" /><h2 className="mt-4 font-display text-xl font-semibold">{title}</h2><p className="mt-2 text-sm text-arena-muted">{description}</p></div>; }

function MapArtwork({ src, name }:{ src:string | null; name:string }) {
  const [failed, setFailed] = useState(false);
  return <div className="aspect-video overflow-hidden bg-[#09121d]">{src && !failed ? <img className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" src={src} alt={`Mapa ${name}`} onError={()=>setFailed(true)} /> : <div className="flex h-full flex-col items-center justify-center px-4 text-center text-arena-muted"><ImageOff className="h-7 w-7" /><span className="mt-2 text-xs">Imagem indisponivel. Reenvie pelo painel administrativo.</span></div>}</div>;
}
