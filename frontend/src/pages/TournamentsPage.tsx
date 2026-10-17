import { Search, Trophy } from "lucide-react";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { TournamentCalendar } from "../components/tournament/TournamentCalendar";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Input, Select } from "../components/ui/Form";
import { PageHeader } from "../components/ui/PageHeader";
import { PageTabs } from "../components/ui/PageTabs";
import { Skeleton } from "../components/ui/Skeleton";
import { TournamentStatusBadge } from "../components/ui/StatusBadge";
import { useAuth } from "../contexts/AuthContext";
import { useTournaments } from "../hooks/useArenaData";
import { formatEntryFee, formatPrize } from "../lib/money";
import { isPublicTournament, tournamentTab, type TournamentTab } from "../lib/tournamentStatus";
import type { Tournament } from "../types/api";

type Tab = TournamentTab | "calendario";
const TABS: Array<{ value:Tab; label:string }> = [
  { value:"abertos", label:"Abertos" },
  { value:"andamento", label:"Em andamento" },
  { value:"encerrados", label:"Encerrados" },
  { value:"calendario", label:"Calendário" }
];
const EMPTY: Record<TournamentTab, { title:string; description:string }> = {
  abertos:{ title:"Nenhuma inscrição aberta agora", description:"Veja os campeonatos em andamento ou volte em breve. As próximas inscrições aparecem aqui." },
  andamento:{ title:"Nenhum campeonato em andamento", description:"Quando as inscrições encerrarem e as partidas começarem, o campeonato aparece aqui." },
  encerrados:{ title:"Nenhum campeonato encerrado ainda", description:"Os resultados e campeões ficam guardados aqui depois da final." }
};

export function TournamentsPage() {
  const { data = [], isLoading } = useTournaments();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const requested = params.get("aba") as Tab | null;
  const tab: Tab = TABS.some((item) => item.value === requested) ? requested! : "abertos";
  const search = params.get("q") ?? "";
  const game = params.get("jogo") ?? "";

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setParams(next, { replace:true });
  }

  const visible = useMemo(() => data.filter((tournament) => {
    if (!isPublicTournament(tournament.status)) return false;
    const text = `${tournament.nome} ${tournament.descricao ?? ""}`.toLowerCase();
    return (!search || text.includes(search.toLowerCase())) && (!game || String(tournament.game_id ?? tournament.game) === game);
  }), [data, search, game]);
  const counts = useMemo(() => {
    const result: Record<TournamentTab, number> = { abertos:0, andamento:0, encerrados:0 };
    visible.forEach((tournament) => { result[tournamentTab(tournament.status)] += 1; });
    return result;
  }, [visible]);
  const list = tab === "calendario" ? [] : visible.filter((tournament) => tournamentTab(tournament.status) === tab);
  const games = [...new Map(data.filter((item) => item.game_id).map((item) => [String(item.game_id), item.game_name || item.game_short_name || item.game])).entries()];

  return (
    <section className="mx-auto max-w-[1500px] px-4 pb-12 lg:px-8">
      <PageHeader
        action={user?.roles.includes("admin") ? <Link to="/admin/torneios/novo"><Button icon={<Trophy className="h-4 w-4" />}>Criar torneio</Button></Link> : undefined}
        description="Inscrições abertas, campeonatos em andamento e resultados."
        title="Torneios"
      />
      <PageTabs
        items={TABS.map((item) => ({ ...item, count:item.value === "calendario" ? undefined : counts[item.value] }))}
        label="Situação dos torneios"
        onChange={(aba) => update({ aba })}
        value={tab}
      />
      <div className="my-6 grid gap-3 md:grid-cols-[1fr_240px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-arena-muted" />
          <Input className="pl-9" placeholder="Buscar torneio" value={search} onChange={(event) => update({ q:event.target.value })} />
        </div>
        <Select aria-label="Jogo" value={game} onChange={(event) => update({ jogo:event.target.value })}>
          <option value="">Todos os jogos</option>
          {games.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length:3 }).map((_, index) => <Skeleton className="h-48" key={index} />)}</div>
      ) : tab === "calendario" ? (
        <TournamentCalendar tournaments={visible} />
      ) : list.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{list.map((tournament) => <TournamentCard key={tournament.id} tournament={tournament} />)}</div>
      ) : search || game ? (
        <EmptyState description="Nenhum torneio com esses filtros nesta aba. Limpe a busca ou escolha outro jogo." title="Nada encontrado" />
      ) : (
        <EmptyState description={EMPTY[tab].description} title={EMPTY[tab].title} />
      )}
    </section>
  );
}

function TournamentCard({ tournament }: { tournament: Tournament }) {
  return (
    <Link className="flex h-full flex-col border border-arena-line bg-arena-panel p-5 transition hover:border-arena-muted" to={`/torneios/${tournament.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <TournamentStatusBadge status={tournament.status} />
        {tournament.game_short_name ? <span className="text-sm text-arena-muted">{tournament.game_short_name}</span> : null}
      </div>
      <h2 className="mt-3 font-display text-xl font-bold leading-tight">{tournament.nome}</h2>
      {tournament.descricao ? <p className="mt-2 line-clamp-2 text-sm text-arena-muted">{tournament.descricao}</p> : null}
      <dl className="mt-auto grid grid-cols-3 gap-3 border-t border-arena-line pt-4 text-sm">
        <Fact label="Prêmio" value={formatPrize(tournament.premiacao)} />
        <Fact label="Inscrição" value={formatEntryFee(tournament)} />
        <Fact label="Início" value={tournament.inicio ? new Date(tournament.inicio).toLocaleDateString("pt-BR") : "A definir"} />
      </dl>
    </Link>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs text-arena-muted">{label}</dt><dd className="mt-1 font-semibold leading-snug">{value}</dd></div>;
}
