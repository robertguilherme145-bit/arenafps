import { Search, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Input, Select } from "../components/ui/Form";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { useTournaments } from "../hooks/useArenaData";
import { useAuth } from "../contexts/AuthContext";

export function TournamentsPage() {
  const { data = [], isLoading } = useTournaments();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [game, setGame] = useState("");

  const filtered = useMemo(
    () =>
      data.filter((tournament) => {
        const matchesSearch =
          !search ||
          tournament.nome.toLowerCase().includes(search.toLowerCase()) ||
          (tournament.descricao ?? "").toLowerCase().includes(search.toLowerCase());
        const matchesStatus = !status || tournament.status === status;
        const matchesGame = !game || String(tournament.game_id ?? tournament.game) === game;

        return matchesSearch && matchesStatus && matchesGame;
      }),
    [data, game, search, status]
  );

  return (
    <section className="px-4 pb-12 lg:px-8">
      <PageHeader
        eyebrow="Competicoes"
        title="Torneios"
        description="Lista pública de campeonatos com status, datas, premiação e capacidade de equipes."
        action={user?.roles.includes("admin") ?
          <Link to="/admin/torneios/novo">
            <Button icon={<Trophy className="h-4 w-4" />}>Criar torneio</Button>
          </Link>
        : undefined}
      />
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_180px_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-arena-muted" />
          <Input className="pl-9" placeholder="Pesquisar torneio" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Select aria-label="Status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos os status</option><option value="criado">Em preparacao</option><option value="aberto">Inscrições abertas</option><option value="fechado">Inscrições encerradas</option><option value="em_andamento">Ao vivo</option><option value="finalizado">Finalizado</option></Select>
        <Select aria-label="Jogo" value={game} onChange={(event) => setGame(event.target.value)}><option value="">Todos os jogos</option>{[...new Map(data.filter((item) => item.game_id).map((item) => [String(item.game_id), item.game_name || item.game_short_name || item.game])).entries()].map(([id,name]) => <option key={id} value={id}>{name}</option>)}</Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton className="h-52" key={index} />)}</div>
      ) : filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tournament) => (
            <Link to={`/torneios/${tournament.id}`} key={tournament.id}>
              <Card className="h-full transition hover:border-cyan-400/45 hover:bg-white/[.035]">
                <CardContent>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-xl font-semibold">{tournament.nome}</h2>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-arena-muted">{tournament.descricao}</p>
                    </div>
                    <Badge tone={tournament.status === "aberto" ? "success" : tournament.status === "em_andamento" ? "info" : "neutral"}>{statusLabel(tournament.status)}</Badge>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                    <Metric label="Equipes" value={String(tournament.max_teams)} />
                    <Metric label="Titulares" value={String(tournament.titulares)} />
                    <Metric label="Valor" value={`R$ ${tournament.valor}`} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="Nenhum torneio encontrado" description="Ajuste a pesquisa ou os filtros para localizar outra competição." />
      )}
    </section>
  );
}

function statusLabel(value: string) { return ({ criado:"Em preparacao", aberto:"Inscrições abertas", fechado:"Encerrado", em_andamento:"Ao vivo", finalizado:"Finalizado", cancelado:"Cancelado" } as Record<string,string>)[value] ?? value; }

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-arena border border-arena-line bg-black/20 p-3">
      <p className="text-xs text-arena-muted">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
