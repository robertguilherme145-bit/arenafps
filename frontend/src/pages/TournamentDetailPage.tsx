import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Crown,
  Medal,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import { TournamentRegulationPanel } from "../components/tournament/TournamentRegulationPanel";
import { Badge } from "../components/ui/Badge";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { DataTable } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { StatCard } from "../components/ui/StatCard";
import { useToast } from "../hooks/useToast";
import { useTournamentInsights } from "../hooks/useArenaData";
import { getPublicTournamentCenter } from "../services/api";
import type { PublicTournamentCenter } from "../types/api";

export function TournamentDetailPage() {
  const id = Number(useParams().id);
  const [searchParams, setSearchParams] = useSearchParams();
  const { error } = useToast();
  const [center, setCenter] = useState<PublicTournamentCenter | null>(null);
  const [tab, setTab] = useState<
    "overview" | "standings" | "bracket" | "matches" | "statistics" | "rules"
  >(searchParams.get("tab") === "rules" ? "rules" : "overview");
  const [selectedMatch, setSelectedMatch] = useState<
    PublicTournamentCenter["matches"][number] | null
  >(null);
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);
  const [, statsQuery] = useTournamentInsights(id);
  useEffect(() => {
    void getPublicTournamentCenter(id)
      .then(setCenter)
      .catch((reason) =>
        error(
          "Falha ao carregar torneio",
          reason instanceof Error ? reason.message : "Tente novamente.",
        ),
      );
  }, [id]);
  const rounds = useMemo(
    () =>
      [
        ...new Set(center?.matches.map((match) => Number(match.round)) ?? []),
      ].sort((a, b) => a - b),
    [center],
  );
  if (!center)
    return (
      <section className="mx-auto max-w-[1500px] space-y-5 px-4 py-10 lg:px-8">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </section>
    );
  const tournament = center.tournament;
  const stats = statsQuery.data ?? [];
  const selectedMaps = selectedMatch
    ? center.match_maps.filter((map) => map.match_id === selectedMatch.id)
    : [];
  const selectedMap =
    selectedMaps.find((map) => map.id === selectedMapId) ??
    selectedMaps[0] ??
    null;
  const selectedMapStats = selectedMap
    ? center.map_player_stats.filter(
        (item) => item.match_map_id === selectedMap.id,
      )
    : [];
  const openMatch = (match: PublicTournamentCenter["matches"][number]) => {
    const maps = center.match_maps.filter((map) => map.match_id === match.id);
    setSelectedMapId(
      (maps.find((map) => map.status === "finalizado") ?? maps[0])?.id ?? null,
    );
    setSelectedMatch(match);
  };
  return (
    <section className="pb-12">
      <div
        className="relative min-h-72 border-b border-arena-line bg-arena-panel bg-cover bg-center"
        style={
          tournament.banner
            ? { backgroundImage: `url(${tournament.banner})` }
            : undefined
        }
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative mx-auto flex min-h-72 max-w-[1500px] items-end px-4 py-9 lg:px-8">
          <PageHeader
            eyebrow={`${tournament.game_short_name} · ${status(tournament.status)}`}
            title={tournament.nome}
            description={
              tournament.descricao ||
              "Central publica da competicao, com chaveamento, cronograma e estatisticas oficiais."
            }
          />
        </div>
      </div>
      <div className="mx-auto max-w-[1500px] px-4 pt-6 lg:px-8">
        {center.result ? (
          <div className="mb-6 grid items-center gap-5 border border-amber-300/40 bg-amber-300/[.07] p-5 md:grid-cols-[auto_1fr_auto]">
            <div className="flex h-16 w-16 items-center justify-center border border-amber-300/40 bg-amber-300/10 text-amber-200">
              <Trophy className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-amber-200">
                Campeao oficial
              </p>
              <div className="mt-2 flex items-center gap-3">{center.result.champion_logo ? <img className="h-14 w-14 object-contain" src={center.result.champion_logo} alt={`Logo ${center.result.champion_name}`} /> : null}<h2 className="font-display text-3xl font-bold">{center.result.champion_name}</h2></div>
              <p className="mt-1 text-sm text-arena-muted">
                Vice-campeao: {center.result.runner_up_name || "Nao definido"}
              </p>
            </div>
            <Badge tone="success">
              <Crown className="mr-1 h-4 w-4" /> Campeao
            </Badge>
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Status"
            value={status(tournament.status)}
            icon={<Activity className="h-5 w-5" />}
          />
          <StatCard
            label="Equipes"
            value={`${center.participants.length}/${tournament.max_teams}`}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            label="Premiacao"
            value={tournament.premiacao || "A definir"}
            icon={<Medal className="h-5 w-5" />}
          />
          <StatCard
            label="Formato"
            value={format(tournament.format)}
            icon={<Swords className="h-5 w-5" />}
          />
          <StatCard
            label="Inicio"
            value={date(tournament.inicio)}
            icon={<CalendarDays className="h-5 w-5" />}
          />
        </div>
        <div className="mt-6 flex gap-2 overflow-x-auto border-b border-arena-line pb-3">
          {[
            ["overview", "Visao geral"],
            ["standings", "Classificacao"],
            ["bracket", "Chaveamento"],
            ["matches", "Partidas"],
            ["statistics", "Estatisticas"],
            ["rules", "Regulamento"],
          ].map(([value, label]) => (
            <button
              className={`shrink-0 border px-4 py-2 text-sm font-semibold ${tab === value ? "border-cyan-400 bg-cyan-400/10 text-white" : "border-arena-line text-arena-muted"}`}
              key={value}
              onClick={() => { setTab(value as typeof tab); setSearchParams(value === "overview" ? {} : { tab: value }); }}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "overview" ? (
          <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
            <Card>
              <CardHeader>
                <h2 className="font-display text-xl font-semibold">
                  Participantes
                </h2>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {center.participants.map((team) => (
                  <div
                    className="flex items-center gap-3 border border-arena-line bg-black/20 p-3"
                    key={team.entry_id}
                  >
                    {team.logo ? (
                      <img
                        className="h-10 w-10 object-contain"
                        src={team.logo}
                        alt=""
                      />
                    ) : (
                      <Users className="h-5 w-5 text-arena-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{team.team_name}</p>
                      <p className="text-xs text-arena-muted">
                        {team.tag || "Sem tag"}
                      </p>
                    </div>
                    <Badge
                      tone={
                        team.status === "confirmado" ? "success" : "neutral"
                      }
                    >
                      {team.status}
                    </Badge>
                  </div>
                ))}
                {!center.participants.length ? (
                  <EmptyState
                    title="Sem participantes"
                    description="As equipes aparecerao quando as inscricoes forem confirmadas."
                  />
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <h2 className="font-display text-xl font-semibold">
                  Regulamento competitivo
                </h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <Metric
                  label="Serie"
                  value={(tournament.best_of || "bo3").toUpperCase()}
                />
                <Metric
                  label="Prorrogacao"
                  value={
                    tournament.overtime_enabled ? "Habilitada" : "Desabilitada"
                  }
                />
                <Metric
                  label="W.O."
                  value={`${tournament.walkover_minutes || 0} minutos`}
                />
                <div className="border-t border-arena-line pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase text-arena-muted">
                    Map pool
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {center.map_pool.map((map) => (
                      <Badge key={map.id} tone="info">
                        {map.nome}
                      </Badge>
                    ))}
                    {!center.map_pool.length ? (
                      <span className="text-sm text-arena-muted">
                        Nao publicado
                      </span>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
        {tab === "rules" ? <Card className="mt-6"><CardHeader><h2 className="font-display text-xl font-semibold">Regulamento oficial</h2><p className="mt-1 text-sm text-arena-muted">Este documento permanece disponivel durante toda a competicao.</p></CardHeader><CardContent><TournamentRegulationPanel tournament={tournament} mapPool={center.map_pool} /></CardContent></Card> : null}
        {tab === "standings" ? (
          <Card className="mt-6">
            <CardHeader>
              <h2 className="font-display text-xl font-semibold">Classificacao oficial</h2>
              <p className="mt-1 text-sm text-arena-muted">3 pontos por vitoria de serie. Mapas nao disputados nao geram saldo.</p>
            </CardHeader>
            <DataTable data={center.standings} columns={[
              { header: "#", cell: (team) => team.position },
              { header: "Equipe", cell: (team) => <strong>{team.team_name || `Equipe #${team.team_id}`}</strong> },
              { header: "Pontos", cell: (team) => <strong>{team.points ?? team.wins * 3}</strong> },
              { header: "Series", cell: (team) => team.matches },
              { header: "V-D", cell: (team) => `${team.wins}-${team.losses}` },
              { header: "Mapas", cell: (team) => `${team.score_for}-${team.score_against}` },
              { header: "Mapas jogados", cell: (team) => team.maps_played ?? 0 },
              { header: "Saldo medio de rounds", cell: (team) => Number(team.round_balance_per_map ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) },
              { header: "Aproveitamento", cell: (team) => `${team.win_rate}%` },
            ]} />
          </Card>
        ) : null}
        {tab === "bracket" ? (
          <div className="mt-6 overflow-x-auto pb-4">
            <div
              className="grid min-w-[760px] gap-5"
              style={{
                gridTemplateColumns: `repeat(${Math.max(rounds.length, 1)}, minmax(240px,1fr))`,
              }}
            >
              {rounds.map((round) => (
                <div key={round}>
                  <p className="mb-3 text-xs font-semibold uppercase text-cyan-200">
                    Rodada {round}
                  </p>
                  <div className="space-y-4">
                    {center.matches
                      .filter((match) => Number(match.round) === round)
                      .map((match) => (
                        <div
                          className="border border-arena-line bg-arena-panel p-4"
                          key={match.id}
                        >
                          <BracketTeam
                            name={match.team_a}
                            logo={match.team_a_logo}
                            score={
                              match.status === "finalizada"
                                ? match.score_team_a
                                : null
                            }
                            winner={match.winner_team_id === match.team_a_id}
                          />
                          <div className="my-2 h-px bg-arena-line" />
                          <BracketTeam
                            name={match.team_b}
                            logo={match.team_b_logo}
                            score={
                              match.status === "finalizada"
                                ? match.score_team_b
                                : null
                            }
                            winner={match.winner_team_id === match.team_b_id}
                          />
                          <p className="mt-3 border-t border-arena-line pt-2 text-xs text-arena-muted">
                            {dateTime(match.scheduled_at)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
              {!rounds.length ? (
                <EmptyState
                  title="Chaveamento ainda nao publicado"
                  description="A organizacao publicara os confrontos quando as inscricoes forem encerradas."
                />
              ) : null}
            </div>
          </div>
        ) : null}
        {tab === "matches" ? (
          <Card className="mt-6">
            <CardHeader>
              <h2 className="font-display text-xl font-semibold">
                Cronograma e resultados
              </h2>
            </CardHeader>
            <DataTable
              data={center.matches}
              columns={[
                { header: "Rodada", cell: (match) => match.round },
                {
                  header: "Confronto",
                  cell: (match) => (
                    <div className="space-y-2"><TeamIdentity name={match.team_a} logo={match.team_a_logo} winner={match.winner_team_id === match.team_a_id} /><TeamIdentity name={match.team_b} logo={match.team_b_logo} winner={match.winner_team_id === match.team_b_id} /></div>
                  ),
                },
                {
                  header: "Mapa",
                  cell: (match) => match.current_map_name || "A definir",
                },
                {
                  header: "Data",
                  cell: (match) => dateTime(match.scheduled_at),
                },
                {
                  header: "Status",
                  cell: (match) => (
                    <Badge
                      tone={
                        match.status === "finalizada"
                          ? "success"
                          : match.status === "andamento"
                            ? "info"
                            : "neutral"
                      }
                    >
                      {match.status}
                    </Badge>
                  ),
                },
                {
                  header: "Placar da serie",
                  cell: (match) =>
                    match.status === "finalizada" ? (
                      <strong>
                        {match.score_team_a} x {match.score_team_b}
                      </strong>
                    ) : (
                      "-"
                    ),
                },
                {
                  header: "Detalhes",
                  cell: (match) => (
                    <Button
                      variant="secondary"
                      onClick={() => openMatch(match)}
                    >
                      Abrir
                    </Button>
                  ),
                },
              ]}
            />
          </Card>
        ) : null}
        {tab === "statistics" ? (
          <Card className="mt-6">
            <CardHeader>
              <h2 className="font-display text-xl font-semibold">
                Estatisticas de jogadores
              </h2>
              <p className="mt-1 text-sm text-arena-muted">
                Dados consolidados das partidas oficiais deste torneio.
              </p>
            </CardHeader>
            <DataTable
              data={stats}
              empty={
                <EmptyState
                  title="Sem estatisticas oficiais"
                  description="Os dados aparecerao depois do primeiro mapa finalizado."
                />
              }
              columns={[
                { header: "Jogador", cell: (item) => item.nick },
                { header: "Equipe", cell: (item) => item.team },
                { header: "Kills", cell: (item) => item.kills },
                { header: "K/D", cell: (item) => item.kd },
                { header: "HS", cell: (item) => `${item.hs_percent}%` },
                { header: "MVPs", cell: (item) => item.mvps },
              ]}
            />
          </Card>
        ) : null}
      </div>
      <MatchMapDetails
        match={selectedMatch}
        maps={selectedMaps}
        selectedMap={selectedMap}
        stats={selectedMapStats}
        onSelectMap={setSelectedMapId}
        onClose={() => {
          setSelectedMatch(null);
          setSelectedMapId(null);
        }}
      />
      {selectedMatch && Boolean(0) && (
        <Modal
          open={Boolean(selectedMatch)}
          title={
            selectedMatch
              ? `${selectedMatch.team_a} x ${selectedMatch.team_b}`
              : "Partida"
          }
          description={
            selectedMatch?.status === "andamento"
              ? "Partida ao vivo"
              : selectedMatch?.winner
                ? `Vencedor: ${selectedMatch.winner}`
                : "Central publica da partida"
          }
          onClose={() => setSelectedMatch(null)}
          size="wide"
        >
          <div className="space-y-4">
            <div
              className="relative min-h-72 overflow-hidden border border-arena-line bg-arena-bg bg-cover bg-center"
              style={
                selectedMatch?.current_map_image
                  ? {
                      backgroundImage: `url(${selectedMatch.current_map_image})`,
                    }
                  : undefined
              }
            >
              <div className="absolute inset-0 bg-black/70" />
              <div className="relative flex min-h-72 flex-col items-center justify-center p-8 text-center">
                <Badge
                  tone={
                    selectedMatch?.status === "finalizada"
                      ? "success"
                      : selectedMatch?.status === "andamento"
                        ? "info"
                        : "neutral"
                  }
                >
                  {selectedMatch?.status || "agendada"}
                </Badge>
                <p className="mt-5 text-xs font-semibold uppercase text-cyan-200">
                  {selectedMatch?.status === "finalizada"
                    ? "Resultado da serie"
                    : "Mapa atual"}
                </p>
                {selectedMatch?.status === "finalizada" ? (
                  <>
                    <div className="mt-3 flex items-center gap-6">
                      <span
                        className={
                          selectedMatch.winner_team_id ===
                          selectedMatch.team_a_id
                            ? "font-display text-2xl font-bold text-emerald-300"
                            : "font-display text-2xl font-bold"
                        }
                      >
                        {selectedMatch.team_a}
                      </span>
                      <strong className="font-display text-4xl">
                        {selectedMatch.score_team_a} ×{" "}
                        {selectedMatch.score_team_b}
                      </strong>
                      <span
                        className={
                          selectedMatch.winner_team_id ===
                          selectedMatch.team_b_id
                            ? "font-display text-2xl font-bold text-emerald-300"
                            : "font-display text-2xl font-bold"
                        }
                      >
                        {selectedMatch.team_b}
                      </span>
                    </div>
                    <p className="mt-4 flex items-center gap-2 font-semibold text-emerald-300">
                      <Crown className="h-5 w-5" />
                      Vencedor: {selectedMatch.winner}
                    </p>
                  </>
                ) : (
                  <h3 className="mt-2 font-display text-4xl font-bold">
                    {selectedMatch?.current_map_name || "A definir"}
                  </h3>
                )}
                <p className="mt-5 text-sm text-arena-muted">
                  {dateTime(selectedMatch?.scheduled_at)}
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedMaps.map((map) => (
                <div
                  className="border border-arena-line bg-black/20 p-4"
                  key={map.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-arena-muted">
                        Mapa {map.map_number}
                      </p>
                      <h4 className="mt-1 font-display text-xl font-bold">
                        {map.map_name}
                      </h4>
                    </div>
                    <Badge
                      tone={map.status === "finalizado" ? "success" : "neutral"}
                    >
                      {map.status}
                    </Badge>
                  </div>
                  {map.status === "finalizado" ? (
                    <>
                      <p className="mt-4 font-display text-3xl font-bold">
                        {map.score_team_a} × {map.score_team_b}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-emerald-300">
                        Vencedor: {map.winner}
                      </p>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

function MatchMapDetails({
  match,
  maps,
  selectedMap,
  stats,
  onSelectMap,
  onClose,
}: {
  match: PublicTournamentCenter["matches"][number] | null;
  maps: PublicTournamentCenter["match_maps"];
  selectedMap: PublicTournamentCenter["match_maps"][number] | null;
  stats: PublicTournamentCenter["map_player_stats"];
  onSelectMap: (id: number) => void;
  onClose: () => void;
}) {
  const heroImage = selectedMap?.map_image || match?.current_map_image;
  return (
    <Modal
      open={Boolean(match)}
      title={match ? `${match.team_a} x ${match.team_b}` : "Partida"}
      description={
        match?.winner
          ? `Vencedor da serie: ${match.winner}`
          : "Central publica da partida"
      }
      onClose={onClose}
      size="wide"
    >
      <div className="space-y-4">
        <div
          className="relative min-h-72 overflow-hidden border border-arena-line bg-arena-bg bg-cover bg-center"
          style={
            heroImage ? { backgroundImage: `url(${heroImage})` } : undefined
          }
        >
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative flex min-h-72 flex-col items-center justify-center p-8 text-center">
            <Badge
              tone={
                selectedMap?.status === "finalizado"
                  ? "success"
                  : match?.status === "andamento"
                    ? "info"
                    : "neutral"
              }
            >
              {selectedMap?.status || match?.status || "agendada"}
            </Badge>
            <p className="mt-5 text-xs font-semibold uppercase text-cyan-200">
              Mapa {selectedMap?.map_number || "atual"}
            </p>
            <h3 className="mt-2 font-display text-4xl font-bold">
              {selectedMap?.map_name || match?.current_map_name || "A definir"}
            </h3>
            {selectedMap?.status === "finalizado" ? (
              <>
                <div className="mx-auto mt-4 grid w-full max-w-3xl grid-cols-1 gap-2 sm:grid-cols-2"><TeamIdentity large name={match?.team_a || "Equipe A"} logo={match?.team_a_logo} winner={selectedMap.winner_team_id === match?.team_a_id} /><TeamIdentity large name={match?.team_b || "Equipe B"} logo={match?.team_b_logo} winner={selectedMap.winner_team_id === match?.team_b_id} /></div>
                <p className="mt-3 font-display text-4xl font-bold">
                  {selectedMap.score_team_a} x {selectedMap.score_team_b}
                </p>
                <p className="mt-3 flex items-center gap-2 font-semibold text-emerald-300">
                  <Crown className="h-5 w-5" />
                  Vencedor: {selectedMap.winner}
                </p>
              </>
            ) : selectedMap?.status === "cancelado" ? (
              <p className="mt-3 text-sm text-arena-muted">
                Nao disputado porque a serie ja foi decidida.
              </p>
            ) : null}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {maps.map((map) => (
            <button
              type="button"
              aria-pressed={selectedMap?.id === map.id}
              className={`min-h-32 border p-4 text-left transition ${selectedMap?.id === map.id ? "border-cyan-400 bg-cyan-400/10" : map.winner_team_id ? "border-emerald-400/25 bg-emerald-400/[0.06] hover:border-emerald-400/50" : "border-arena-line bg-black/20 hover:border-cyan-400/60"}`}
              key={map.id}
              onClick={() => onSelectMap(map.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-arena-muted">
                    Mapa {map.map_number}
                  </p>
                  <h4 className="mt-1 font-display text-xl font-bold">
                    {map.map_name}
                  </h4>
                </div>
                <Badge
                  tone={map.status === "finalizado" ? "success" : "neutral"}
                >
                  {map.status}
                </Badge>
              </div>
              {map.status === "finalizado" ? (
                <>
                  <p className="mt-4 font-display text-3xl font-bold">
                    {map.score_team_a} x {map.score_team_b}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-emerald-300">
                    Vencedor: {map.winner}
                  </p>
                </>
              ) : null}
            </button>
          ))}
        </div>
        <div className="border border-arena-line">
          <div className="border-b border-arena-line p-4">
            <h4 className="font-display text-lg font-semibold">
              Estatisticas do mapa
            </h4>
            <p className="mt-1 text-sm text-arena-muted">
              Desempenho individual em {selectedMap?.map_name || "este mapa"}.
            </p>
          </div>
          {stats.length ? (
            <DataTable
              data={stats}
              columns={[
                {
                  header: "Jogador",
                  cell: (item) => (
                    <div className="flex items-center gap-3">{item.foto ? <img className="h-9 w-9 object-cover" src={item.foto} alt="" /> : <TeamLogo logo={item.team_logo} name={item.team_name} size="sm" />}<div><strong>{item.nick}</strong><div className="mt-1 flex items-center gap-2"><TeamLogo logo={item.team_logo} name={item.team_name} size="xs" /><p className={`text-xs ${selectedMap?.winner_team_id === item.team_id ? "font-semibold text-emerald-300" : "text-arena-muted"}`}>{item.team_name}{selectedMap?.winner_team_id === item.team_id ? " · Vencedora" : ""}</p></div></div></div>
                  ),
                },
                { header: "Kills", cell: (item) => item.kills },
                { header: "Mortes", cell: (item) => item.deaths },
                { header: "Assist.", cell: (item) => item.assists },
                { header: "HS", cell: (item) => item.headshots },
                {
                  header: "K/D",
                  cell: (item) =>
                    (item.kills / Math.max(item.deaths, 1)).toFixed(2),
                },
                {
                  header: "Destaque",
                  cell: (item) =>
                    item.mvp ? <Badge tone="success">MVP</Badge> : "-",
                },
              ]}
            />
          ) : (
            <div className="p-5">
              <EmptyState
                title={
                  selectedMap?.status === "cancelado"
                    ? "Mapa nao disputado"
                    : "Sem estatisticas neste mapa"
                }
                description={
                  selectedMap?.status === "cancelado"
                    ? "A serie terminou antes deste mapa."
                    : "A sumula sera exibida quando a organizacao registrar os dados."
                }
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function BracketTeam({
  name,
  logo,
  score,
  winner,
}: {
  name: string;
  logo: string | null;
  score: number | null;
  winner: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${winner ? "text-emerald-300" : ""}`}
    >
      <span className="flex min-w-0 items-center gap-2"><TeamLogo logo={logo} name={name} size="sm" /><span className="truncate font-semibold">{name}</span>{winner ? <Crown className="h-4 w-4 shrink-0" aria-label="Vencedor" /> : null}</span>
      <strong>{score ?? "-"}</strong>
    </div>
  );
}
function TeamIdentity({ name, logo, winner, large = false }: { name: string; logo: string | null | undefined; winner?: boolean; large?: boolean }) {
  return <div className={`flex items-center gap-3 transition-colors ${large ? "min-h-20 border px-4 py-3" : winner ? "-mx-2 border border-emerald-400/20 bg-emerald-400/[0.06] px-2 py-1.5" : ""} ${large && winner ? "border-emerald-400/35 bg-emerald-400/[0.11] text-emerald-200" : large ? "border-white/10 bg-black/25 text-arena-text" : winner ? "text-emerald-300" : "text-arena-text"}`}><TeamLogo logo={logo} name={name} size={large ? "lg" : "sm"} /><span className={`${large ? "min-w-0 flex-1 text-base" : "text-sm"} font-semibold`}>{name}</span>{winner ? <Badge tone="success"><Crown className="mr-1 h-3 w-3" /> Vencedor</Badge> : null}</div>;
}
function TeamLogo({ logo, name, size }: { logo: string | null | undefined; name: string; size: "xs" | "sm" | "lg" }) {
  const classes = size === "lg" ? "h-16 w-16" : size === "sm" ? "h-9 w-9" : "h-5 w-5";
  return logo ? <img className={`${classes} shrink-0 object-contain`} src={logo} alt={`Logo ${name}`} /> : <span className={`${classes} flex shrink-0 items-center justify-center border border-arena-line bg-black/30 text-[10px] font-bold text-arena-muted`}>{name.slice(0, 2).toUpperCase()}</span>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-arena-line pb-3">
      <span className="text-sm text-arena-muted">{label}</span>
      <strong className="text-sm">{value}</strong>
    </div>
  );
}
function status(value: string) {
  return (
    (
      {
        criado: "Em preparacao",
        aberto: "Inscricoes abertas",
        fechado: "Inscricoes encerradas",
        em_andamento: "Ao vivo",
        finalizado: "Finalizado",
        cancelado: "Cancelado",
      } as Record<string, string>
    )[value] ?? value
  );
}
function format(value: string) {
  return (
    (
      {
        mix_single_elimination: "Mix Individual",
        single_elimination: "Eliminacao simples",
        double_elimination: "Eliminacao dupla",
        swiss: "Sistema suico",
        round_robin: "Pontos corridos",
        group_playoffs: "Grupos e playoffs",
        league: "Liga",
        custom: "Personalizado",
      } as Record<string, string>
    )[value] ?? "A definir"
  );
}
function date(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("pt-BR") : "A definir";
}
function dateTime(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "A definir";
}
