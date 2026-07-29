import { BarChart3, Crosshair, Medal, Swords, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import type { TeamPlayerRanking, TeamPlayerRankingRow } from "../../types/api";
import { Badge } from "../ui/Badge";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { DataTable } from "../ui/DataTable";
import { Select } from "../ui/Form";

type SortKey = "performance" | "kills" | "kd" | "mvps" | "headshots" | "assists";

export function TeamPlayerRankingPanel({ ranking }: { ranking: TeamPlayerRanking }) {
  const [sortBy, setSortBy] = useState<SortKey>("performance");
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);

  const players = useMemo(() => sortPlayers(ranking.players, sortBy), [ranking.players, sortBy]);
  const maps = useMemo(() => {
    const unique = new Map<number, { id: number; name: string }>();
    ranking.players.forEach((player) => player.map_statistics.forEach((map) => {
      unique.set(map.map_id, { id: map.map_id, name: map.map_name });
    }));
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [ranking.players]);
  const activeMapId = maps.some((map) => map.id === selectedMapId) ? selectedMapId : maps[0]?.id ?? null;
  const mapPlayers = activeMapId === null ? [] : ranking.players
    .flatMap((player) => {
      const stats = player.map_statistics.find((map) => map.map_id === activeMapId);
      return stats ? [{ ...stats, player }] : [];
    })
    .sort((a, b) => b.kills - a.kills || b.kd - a.kd || b.mvps - a.mvps);

  const playersWithStats = ranking.players.filter((player) => player.matches > 0);
  const topFragger = maxBy(playersWithStats, (player) => player.kills);
  const bestKd = maxBy(playersWithStats, (player) => player.kd);
  const mostMvps = maxBy(playersWithStats, (player) => player.mvps);

  return <div className="space-y-5">
    <Card>
      <CardHeader className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-xl font-semibold">Ranking interno da equipe</h2>
          <p className="mt-1 text-sm text-arena-muted">Desempenho consolidado de partidas oficiais finalizadas.</p>
        </div>
        <div className="w-full md:w-64">
          <Select aria-label="Ordenar ranking" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortKey)}>
            <option value="performance">Desempenho geral</option>
            <option value="kills">Mais kills</option>
            <option value="kd">Melhor K/D</option>
            <option value="mvps">Mais MVPs</option>
            <option value="headshots">Maior HS%</option>
            <option value="assists">Mais assists</option>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 border-b border-arena-line sm:grid-cols-3">
        <Highlight icon={<Crosshair className="h-4 w-4" />} label="Top fragger" player={topFragger} value={topFragger ? `${topFragger.kills} kills` : "Sem dados"} />
        <Highlight icon={<BarChart3 className="h-4 w-4" />} label="Melhor K/D" player={bestKd} value={bestKd ? formatDecimal(bestKd.kd) : "Sem dados"} />
        <Highlight icon={<Trophy className="h-4 w-4" />} label="Mais MVPs" player={mostMvps} value={mostMvps ? String(mostMvps.mvps) : "Sem dados"} />
      </CardContent>

      <DataTable
        data={players}
        empty={<div className="p-6 text-sm text-arena-muted">O elenco ainda não possui jogadores ativos.</div>}
        columns={[
          { header: "#", className: "w-14 px-4 py-3 font-semibold", cell: (_, index) => <RankPosition position={index + 1} /> },
          { header: "Jogador", cell: (player) => <PlayerIdentity player={player} /> },
          { header: "Partidas", cell: (player) => <div><p className="font-semibold">{player.matches}</p><p className="text-xs text-arena-muted">{player.maps} mapas</p></div> },
          { header: "V / D", cell: (player) => `${player.wins} / ${player.losses}` },
          { header: "K / D / A", cell: (player) => <span className="font-mono">{player.kills} / {player.deaths} / {player.assists}</span> },
          { header: "K/D", cell: (player) => <strong>{formatDecimal(player.kd)}</strong> },
          { header: "KDA", cell: (player) => formatDecimal(player.kda) },
          { header: "HS", cell: (player) => `${formatDecimal(player.hs_percent)}%` },
          { header: "MVPs", cell: (player) => player.mvps },
          { header: "Kills/mapa", cell: (player) => formatDecimal(player.kills_per_map) },
          { header: "Melhor mapa", cell: (player) => player.best_map ? <div><p className="font-semibold">{player.best_map.map_name}</p><p className="text-xs text-arena-muted">{formatDecimal(player.best_map.kills_per_map)} kills/mapa</p></div> : <span className="text-arena-muted">Sem dados</span> }
        ]}
      />
    </Card>

    <Card>
      <CardHeader className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-xl font-semibold">Desempenho por mapa</h2>
          <p className="mt-1 text-sm text-arena-muted">Compare o elenco dentro de cada mapa jogado.</p>
        </div>
        <div className="w-full md:w-64">
          <Select aria-label="Selecionar mapa" disabled={!maps.length} value={activeMapId ?? ""} onChange={(event) => setSelectedMapId(Number(event.target.value))}>
            {!maps.length ? <option value="">Nenhum mapa finalizado</option> : null}
            {maps.map((map) => <option key={map.id} value={map.id}>{map.name}</option>)}
          </Select>
        </div>
      </CardHeader>
      <DataTable
        data={mapPlayers}
        empty={<div className="p-6 text-sm text-arena-muted">As estatísticas por mapa aparecerao depois que o administrador finalizar um mapa com os dados dos jogadores.</div>}
        columns={[
          { header: "#", className: "w-14 px-4 py-3 font-semibold", cell: (_, index) => <RankPosition position={index + 1} /> },
          { header: "Jogador", cell: (item) => <PlayerIdentity player={item.player} /> },
          { header: "Mapas", cell: (item) => item.maps },
          { header: "K / D / A", cell: (item) => <span className="font-mono">{item.kills} / {item.deaths} / {item.assists}</span> },
          { header: "K/D", cell: (item) => <strong>{formatDecimal(item.kd)}</strong> },
          { header: "KDA", cell: (item) => formatDecimal(item.kda) },
          { header: "HS", cell: (item) => `${formatDecimal(item.hs_percent)}%` },
          { header: "MVPs", cell: (item) => item.mvps },
          { header: "Kills/mapa", cell: (item) => formatDecimal(item.kills_per_map) }
        ]}
      />
    </Card>
  </div>;
}

function Highlight({ icon, label, player, value }: { icon: React.ReactNode; label: string; player: TeamPlayerRankingRow | null; value: string }) {
  return <div className="flex min-h-20 items-center gap-3 border border-arena-line bg-black/20 p-3">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-cyan-400/30 bg-cyan-400/10 text-cyan-200">{icon}</span>
    <div className="min-w-0"><p className="text-xs font-semibold uppercase text-arena-muted">{label}</p><p className="mt-1 truncate font-semibold">{player?.nick ?? "Aguardando estatísticas"}</p><p className="text-xs text-cyan-200">{value}</p></div>
  </div>;
}

function PlayerIdentity({ player }: { player: TeamPlayerRankingRow }) {
  return <div className="flex min-w-44 items-center gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border border-arena-line bg-white/[.04] text-sm font-bold text-cyan-100">
      {player.photo ? <img alt="" className="h-full w-full object-cover" src={player.photo} /> : player.nick.slice(0, 2).toUpperCase()}
    </div>
    <div className="min-w-0"><p className="truncate font-semibold">{player.nick}</p><div className="mt-1 flex flex-wrap gap-1"><Badge className="h-5 px-2 text-[10px]" tone={player.lineup_status === "titular" ? "success" : "neutral"}>{player.lineup_status === "titular" ? "Titular" : "Reserva"}</Badge><span className="text-xs text-arena-muted">ID #{player.player_id}</span></div></div>
  </div>;
}

function RankPosition({ position }: { position: number }) {
  if (position === 1) return <Trophy className="h-5 w-5 text-amber-300" />;
  if (position <= 3) return <Medal className={position === 2 ? "h-5 w-5 text-slate-300" : "h-5 w-5 text-orange-300"} />;
  return <span className="font-semibold text-arena-muted">{position}</span>;
}

function sortPlayers(players: TeamPlayerRankingRow[], sortBy: SortKey) {
  const values: Record<Exclude<SortKey, "performance">, (player: TeamPlayerRankingRow) => number> = {
    kills: (player) => player.kills,
    kd: (player) => player.kd,
    mvps: (player) => player.mvps,
    headshots: (player) => player.hs_percent,
    assists: (player) => player.assists
  };
  const copy = [...players];
  if (sortBy === "performance") return copy.sort((a, b) => b.kills - a.kills || b.kd - a.kd || b.mvps - a.mvps || a.nick.localeCompare(b.nick, "pt-BR"));
  return copy.sort((a, b) => values[sortBy](b) - values[sortBy](a) || b.kills - a.kills || a.nick.localeCompare(b.nick, "pt-BR"));
}

function maxBy(players: TeamPlayerRankingRow[], getter: (player: TeamPlayerRankingRow) => number) {
  return players.reduce<TeamPlayerRankingRow | null>((best, player) => !best || getter(player) > getter(best) ? player : best, null);
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}
