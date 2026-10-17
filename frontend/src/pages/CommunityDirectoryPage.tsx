import { useEffect, useMemo, useState } from "react";
import { Search, UserRound, Users } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/ui/EmptyState";
import { Input, Select } from "../components/ui/Form";
import { PageHeader } from "../components/ui/PageHeader";
import { PageTabs } from "../components/ui/PageTabs";
import { Skeleton } from "../components/ui/Skeleton";
import { useToast } from "../hooks/useToast";
import { getPublicPortal } from "../services/api";
import type { PublicPortalData } from "../types/api";

type CommunityTab = "equipes" | "jogadores";

export function CommunityDirectoryPage() {
  const { error } = useToast();
  const [params, setParams] = useSearchParams();
  const tab: CommunityTab = params.get("aba") === "jogadores" ? "jogadores" : "equipes";
  const query = params.get("q") ?? "";
  const [portal, setPortal] = useState<PublicPortalData | null>(null);
  const [gameId, setGameId] = useState<number | null>(null);

  useEffect(() => {
    void getPublicPortal(gameId).then(setPortal).catch((reason) => error("Não foi possível carregar a comunidade", reason instanceof Error ? reason.message : "Tente novamente."));
  }, [gameId]);

  function update(next: { aba?: CommunityTab; q?: string }) {
    const merged = new URLSearchParams(params);
    if (next.aba) merged.set("aba", next.aba);
    if (next.q !== undefined) next.q ? merged.set("q", next.q) : merged.delete("q");
    setParams(merged, { replace:true });
  }

  const term = query.toLowerCase();
  const teams = useMemo(() => (portal?.teams ?? []).filter((item) => `${item.nome} ${item.tag ?? ""}`.toLowerCase().includes(term)), [portal, term]);
  const players = useMemo(() => (portal?.players ?? []).filter((item) => `${item.nickname ?? ""} ${item.nick} ${item.team_name}`.toLowerCase().includes(term)), [portal, term]);
  const empty = portal && (tab === "equipes" ? !teams.length : !players.length);

  return (
    <section className="mx-auto max-w-[1500px] px-4 pb-12 lg:px-8">
      <PageHeader title="Comunidade" description="Equipes e jogadores que disputam os campeonatos da Arena Camp." />
      <PageTabs
        items={[{ value:"equipes", label:"Equipes", count:portal?.teams.length }, { value:"jogadores", label:"Jogadores", count:portal?.players.length }]}
        label="Comunidade"
        onChange={(aba) => update({ aba })}
        value={tab}
      />
      <div className="my-6 grid gap-3 md:grid-cols-[1fr_260px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-arena-muted" />
          <Input className="pl-9" placeholder={tab === "equipes" ? "Buscar equipe ou tag" : "Buscar jogador ou equipe"} value={query} onChange={(event) => update({ q:event.target.value })} />
        </div>
        <Select aria-label="Jogo" value={gameId ?? ""} onChange={(event) => setGameId(event.target.value ? Number(event.target.value) : null)}>
          <option value="">Todos os jogos</option>
          {portal?.games.map((game) => <option key={game.id} value={game.id}>{game.nome}</option>)}
        </Select>
      </div>

      {!portal ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"><Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
      ) : empty ? (
        query
          ? <EmptyState title="Nada encontrado" description={`Nenhum resultado para "${query}". Tente outro nome ou limpe a busca.`} />
          : <EmptyState title={tab === "equipes" ? "Nenhuma equipe ativa ainda" : "Nenhum jogador ranqueado ainda"} description="Crie sua conta e monte sua equipe para aparecer aqui." />
      ) : tab === "equipes" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <Link className="border border-arena-line bg-arena-panel p-5 transition hover:border-arena-muted" key={team.id} to={`/equipe/${team.slug}`}>
              <div className="flex items-center gap-4">
                {team.logo ? <img alt="" className="h-14 w-14 object-contain" src={team.logo} /> : <span className="flex h-14 w-14 items-center justify-center border border-arena-line"><Users className="h-6 w-6 text-arena-muted" /></span>}
                <div className="min-w-0">
                  <h2 className="truncate font-display text-xl font-bold">{team.nome}</h2>
                  <p className="text-sm text-arena-muted">{team.game_short_name} · {team.members} membros</p>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-arena-line pt-4">
                <Metric label="Vitórias" value={team.wins} /><Metric label="Derrotas" value={team.losses} /><Metric label="Aproveitamento" value={`${team.win_rate}%`} />
              </dl>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {players.map((player) => (
            <Link className="border border-arena-line bg-arena-panel p-5 transition hover:border-arena-muted" key={`${player.id}-${player.player_id}`} to={`/jogador/${player.nickname || player.id}`}>
              <div className="flex items-center gap-4">
                {player.avatar || player.foto ? <img alt="" className="h-14 w-14 object-cover" src={player.avatar || player.foto || ""} /> : <span className="flex h-14 w-14 items-center justify-center border border-arena-line"><UserRound className="h-6 w-6 text-arena-muted" /></span>}
                <div className="min-w-0">
                  <h2 className="truncate font-display text-xl font-bold">{player.nickname || player.nick}</h2>
                  <p className="truncate text-sm text-arena-muted">{player.team_name} · {player.game_short_name}</p>
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-arena-line pt-4">
                <Metric label="K/D" value={player.kd} /><Metric label="HS" value={`${player.hs_percent}%`} /><Metric label="MVPs" value={player.mvps} />
              </dl>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div><dt className="text-xs text-arena-muted">{label}</dt><dd className="mt-1 font-display font-semibold">{value}</dd></div>;
}
