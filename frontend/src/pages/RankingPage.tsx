import { useEffect, useState } from "react";
import { Medal, Trophy, UserRound, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Card, CardHeader } from "../components/ui/Card";
import { DataTable } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Select } from "../components/ui/Form";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { useToast } from "../hooks/useToast";
import { getPublicPortal } from "../services/api";
import type { PublicPortalData } from "../types/api";

export function RankingPage() {
  const { error } = useToast();
  const [data, setData] = useState<PublicPortalData | null>(null);
  const [gameId, setGameId] = useState<number | null>(null);
  const [tab, setTab] = useState<"players" | "teams">("players");

  useEffect(() => {
    void getPublicPortal(gameId).then(setData).catch((reason) =>
      error("Falha ao carregar ranking", reason instanceof Error ? reason.message : "Tente novamente."),
    );
  }, [gameId]);

  return <section className="mx-auto max-w-[1500px] px-4 py-10 lg:px-8">
    <PageHeader eyebrow="Rankings" title="Ranking competitivo" description="Classificação por jogo calculada a partir das estatísticas oficiais de cada partida." />
    <div className="mb-6 grid gap-4 md:grid-cols-3">
      <StatCard label="Jogadores ranqueados" value={String(data?.players.length ?? 0)} icon={<UserRound className="h-5 w-5" />} />
      <StatCard label="Equipes ranqueadas" value={String(data?.teams.length ?? 0)} icon={<Users className="h-5 w-5" />} />
      <StatCard label="Partidas processadas" value={String(data?.stats.matches ?? 0)} icon={<Trophy className="h-5 w-5" />} />
    </div>
    <div className="mb-5 flex flex-col gap-3 border-y border-arena-line py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex border border-arena-line p-1">
        <button className={`px-4 py-2 text-sm font-semibold ${tab === "players" ? "bg-cyan-400/15 text-white" : "text-arena-muted"}`} onClick={() => setTab("players")}>Jogadores</button>
        <button className={`px-4 py-2 text-sm font-semibold ${tab === "teams" ? "bg-cyan-400/15 text-white" : "text-arena-muted"}`} onClick={() => setTab("teams")}>Equipes</button>
      </div>
      <Select className="sm:w-72" value={gameId ?? ""} onChange={(event) => setGameId(event.target.value ? Number(event.target.value) : null)}>
        <option value="">Todos os jogos</option>{data?.games.map((game) => <option key={game.id} value={game.id}>{game.nome}</option>)}
      </Select>
    </div>
    <Card>
      <CardHeader className="flex flex-row items-center gap-3"><Medal className="h-5 w-5 text-cyan-200" /><h2 className="font-display text-xl font-semibold">{tab === "players" ? "Jogadores" : "Equipes"}</h2></CardHeader>
      {tab === "players" ? <DataTable data={data?.players ?? []} empty={<EmptyState title="Ranking vazio" description="Finalize partidas para gerar a classificação." />} columns={[
        { header: "Posição", cell: (item) => <Badge tone={(data?.players.indexOf(item) ?? 3) < 3 ? "info" : "neutral"}>#{(data?.players.indexOf(item) ?? 0) + 1}</Badge> },
        { header: "Jogador", cell: (item) => <Link className="font-semibold hover:text-cyan-200" to={`/jogador/${item.nickname || item.id}`}>{item.nickname || item.nick}</Link> },
        { header: "Equipe", cell: (item) => item.team_name }, { header: "Jogo", cell: (item) => item.game_short_name },
        { header: "Partidas", cell: (item) => item.matches }, { header: "K/D", cell: (item) => item.kd },
        { header: "HS", cell: (item) => `${item.hs_percent}%` }, { header: "MVPs", cell: (item) => item.mvps },
      ]} /> : <DataTable data={data?.teams ?? []} empty={<EmptyState title="Ranking vazio" description="Finalize partidas para gerar a classificação." />} columns={[
        { header: "Posição", cell: (item) => <Badge tone={(data?.teams.indexOf(item) ?? 3) < 3 ? "info" : "neutral"}>#{(data?.teams.indexOf(item) ?? 0) + 1}</Badge> },
        { header: "Equipe", cell: (item) => <Link className="flex items-center gap-3 font-semibold hover:text-cyan-200" to={`/equipe/${item.slug}`}><RankingTeamLogo logo={item.logo} name={item.nome} /><span>{item.nome}</span></Link> },
        { header: "Jogo", cell: (item) => item.game_short_name }, { header: "Partidas", cell: (item) => item.matches },
        { header: "Vitorias", cell: (item) => item.wins }, { header: "Derrotas", cell: (item) => item.losses },
        { header: "Win rate", cell: (item) => `${item.win_rate}%` },
      ]} />}
    </Card>
  </section>;
}

function RankingTeamLogo({ logo, name }: { logo: string | null; name: string }) {
  return logo ? <img className="h-10 w-10 shrink-0 object-contain" src={logo} alt={`Logo ${name}`} /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-arena-line text-xs text-arena-muted">{name.slice(0, 2).toUpperCase()}</span>;
}
