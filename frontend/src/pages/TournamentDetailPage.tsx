import { useEffect, useMemo, useState } from "react";
import { Crown, Download, Trophy, Users } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { TournamentRegulationPanel } from "../components/tournament/TournamentRegulationPanel";
import { Badge } from "../components/ui/Badge";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { DataTable } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Skeleton } from "../components/ui/Skeleton";
import { useToast } from "../hooks/useToast";
import { useTournamentInsights } from "../hooks/useArenaData";
import { getPublicTournamentCenter } from "../services/api";
import { BracketView } from "../components/broadcast/BracketView";
import { buildBracketColumns } from "../lib/bracket";
import { formatPrize } from "../lib/money";
import type { PublicTournamentCenter } from "../types/api";
import { TournamentStatusBadge } from "../components/ui/StatusBadge";
import { tournamentStatusLabel } from "../lib/tournamentStatus";

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function assetExtension(url: string) {
  try {
    const pathname = new URL(url, window.location.origin).pathname;
    const extension = pathname.match(/\.[a-zA-Z0-9]+$/)?.[0];
    return extension || ".png";
  } catch {
    return ".png";
  }
}

async function downloadAsset(url: string, filename: string) {
  const safeName = `${safeFileName(filename) || "logo"}${assetExtension(url)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Falha ao baixar arquivo.");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

const DEFAULT_TOURNAMENT_SUMMARY =
  "Central pública da competição, com inscrições, classificação, partidas e regulamento oficial da Arena Camp.";

function tournamentHeroSummary(description?: string | null) {
  const cleanDescription = (description || "")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanDescription) return DEFAULT_TOURNAMENT_SUMMARY;

  const looksLikeFullRegulation =
    cleanDescription.length > 360 ||
    /regulamento|formato da competi|pontua|criterio|pick\s*&?\s*ban|map pool|denuncia|penalidade|w\.o\./i.test(
      cleanDescription,
    );

  return looksLikeFullRegulation
    ? DEFAULT_TOURNAMENT_SUMMARY
    : cleanDescription;
}

export function TournamentDetailPage() {
  const id = Number(useParams().id);
  const [searchParams, setSearchParams] = useSearchParams();
  const { error } = useToast();
  const { user } = useAuth();
  const [center, setCenter] = useState<PublicTournamentCenter | null>(null);
  const [tab, setTab] = useState<
    "overview" | "standings" | "bracket" | "matches" | "statistics" | "rules"
  >(initialTab(searchParams.get("tab")));
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
  const bracketColumns = useMemo(
    () =>
      center
        ? buildBracketColumns({
            format: center.tournament.format,
            teamCount: center.participants.length,
            matches: center.matches,
          })
        : [],
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
  const heroDescription = tournamentHeroSummary(tournament.descricao);
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
      <header className="border-b border-arena-line bg-arena-panel2">
        <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-8 lg:grid-cols-[1fr_auto] lg:items-end lg:px-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <TournamentStatusBadge status={tournament.status} />
              <span className="text-sm text-arena-muted">{tournament.game_short_name}</span>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight md:text-5xl">{tournament.nome}</h1>
            {heroDescription ? <p className="mt-3 max-w-3xl text-arena-muted">{heroDescription}</p> : null}
            <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
              <HeaderFact label="Premiação" value={formatPrize(tournament.premiacao)} />
              <HeaderFact label="Inscrição" value={entryFee(tournament)} />
              <HeaderFact label="Equipes" value={`${center.participants.length}/${tournament.max_teams}`} />
              <HeaderFact label="Formato" value={format(tournament.format)} />
              <HeaderFact label="Início" value={date(tournament.inicio)} />
            </dl>
          </div>
          <div className="flex flex-wrap gap-2">
            {tournament.status === "aberto" ? (
              <Link to={user ? (user.roles?.includes("lider") ? "/lider" : "/jogador") : "/criar-conta"}>
                <Button variant="urgent">Inscrever equipe</Button>
              </Link>
            ) : null}
            <Button variant="secondary" onClick={() => { setTab("rules"); setSearchParams({ tab: "rules" }); }}>Regulamento</Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1500px] px-4 pt-6 lg:px-8">
        {center.result ? (
          <div className="mb-6 grid items-center gap-5 border border-amber-300/40 bg-amber-300/[.07] p-5 md:grid-cols-[auto_1fr_auto]">
            <div className="flex h-16 w-16 items-center justify-center border border-amber-300/40 bg-amber-300/10 text-amber-200">
              <Trophy className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-amber-200">
                Campeão oficial
              </p>
              <div className="mt-2 flex items-center gap-3">{center.result.champion_logo ? <img className="h-14 w-14 object-contain" src={center.result.champion_logo} alt={`Logo ${center.result.champion_name}`} /> : null}<h2 className="font-display text-3xl font-bold">{center.result.champion_name}</h2></div>
              <p className="mt-1 text-sm text-arena-muted">
                Vice-campeão: {center.result.runner_up_name || "Não definido"}
              </p>
            </div>
            <Badge tone="success">
              <Crown className="mr-1 h-4 w-4" /> Campeão
            </Badge>
          </div>
        ) : null}
        <div className="flex gap-1 overflow-x-auto border-b border-arena-line scrollbar-thin" role="tablist">
          {[
            ["overview", "Visão geral"],
            ["standings", "Classificação"],
            ["bracket", "Chaveamento"],
            ["matches", "Partidas"],
            ["statistics", "Estatísticas"],
            ["rules", "Regulamento"],
          ].map(([value, label]) => (
            <button
              aria-selected={tab === value}
              className={`shrink-0 px-4 py-3 text-sm font-semibold transition ${tab === value ? "text-arena-text shadow-[inset_0_-3px_0_#ffb020]" : "text-arena-muted hover:text-arena-text"}`}
              key={value}
              role="tab"
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
                    description="As equipes aparecerao quando as inscrições forem confirmadas."
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
                <Metric label="Inscrição" value={entryFee(tournament)} />
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
                        Não publicado
                      </span>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
        {tab === "rules" ? <Card className="mt-6"><CardHeader><h2 className="font-display text-xl font-semibold">Regulamento oficial</h2><p className="mt-1 text-sm text-arena-muted">Este documento permanece disponivel durante toda a competição.</p></CardHeader><CardContent><TournamentRegulationPanel tournament={tournament} mapPool={center.map_pool} /></CardContent></Card> : null}
        {tab === "standings" ? (
          <Card className="mt-6">
            <CardHeader>
              <h2 className="font-display text-xl font-semibold">Classificação oficial</h2>
              <p className="mt-1 text-sm text-arena-muted">3 pontos por vitoria de serie. Mapas não disputados não geram saldo.</p>
            </CardHeader>
            <DataTable data={center.standings} columns={[
              { header: "#", cell: (team) => team.position },
              { header: "Equipe", cell: (team) => <strong>{team.team_name || `Equipe #${team.team_id}`}</strong> },
              { header: "Pontos", cell: (team) => <strong>{team.points ?? team.wins * 3}</strong> },
              { header: "Series", cell: (team) => team.matches },
              { header: "V-D", cell: (team) => `${team.wins}-${team.losses}` },
              { header: "Mapas", cell: (team) => `${team.score_for}-${team.score_against}` },
              { header: "Mapas jogados", cell: (team) => team.maps_played ?? 0 },
              { header: "Saldo médio de rounds", cell: (team) => Number(team.round_balance_per_map ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) },
              { header: "Aproveitamento", cell: (team) => `${team.win_rate}%` },
            ]} />
          </Card>
        ) : null}
        {tab === "bracket" ? (
          <div className="mt-6">
            {bracketColumns.length ? (
              <BracketView
                columns={bracketColumns}
                onOpen={(matchId) => {
                  const match = center.matches.find((item) => item.id === matchId);
                  if (match) openMatch(match);
                }}
              />
            ) : (
              <EmptyState
                title="Chaveamento ainda não publicado"
                description="A organização publica os confrontos quando as inscrições forem encerradas."
              />
            )}
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
                Estatísticas de jogadores
              </h2>
              <p className="mt-1 text-sm text-arena-muted">
                Dados consolidados das partidas oficiais deste torneio.
              </p>
            </CardHeader>
            <DataTable
              data={stats}
              empty={
                <EmptyState
                  title="Sem estatísticas oficiais"
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
                : "Central pública da partida"
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
  const logoActions = match
    ? [
        {
          label: match.team_a,
          url: match.team_a_logo,
        },
        {
          label: match.team_b,
          url: match.team_b_logo,
        },
      ].filter((item): item is { label: string; url: string } =>
        Boolean(item.url),
      )
    : [];
  return (
    <Modal
      open={Boolean(match)}
      title={match ? `${match.team_a} x ${match.team_b}` : "Partida"}
      description={
        match?.winner
          ? `Vencedor da serie: ${match.winner}`
          : "Central pública da partida"
      }
      onClose={onClose}
      size="wide"
    >
      <div className="space-y-4">
        {logoActions.length ? (
          <div className="flex flex-col gap-3 border border-arena-line bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                Logos do confronto
              </p>
              <p className="mt-1 text-sm text-arena-muted">
                Baixe as logos das equipes para montar banners e artes da partida.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {logoActions.map((team) => (
                <button
                  key={team.label}
                  type="button"
                  className="inline-flex items-center gap-2 border border-arena-line bg-arena-panel px-3 py-2 text-sm font-semibold text-arena-text transition hover:border-cyan-300 hover:text-cyan-100"
                  onClick={() =>
                    void downloadAsset(team.url, `logo-${team.label}`)
                  }
                >
                  <Download className="h-4 w-4" />
                  {team.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
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
                Não disputado porque a serie já foi decidida.
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
              Estatísticas do mapa
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
                    ? "Mapa não disputado"
                    : "Sem estatísticas neste mapa"
                }
                description={
                  selectedMap?.status === "cancelado"
                    ? "A serie terminou antes deste mapa."
                    : "A sumula será exibida quando a organizacao registrar os dados."
                }
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
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
const TABS = ["overview", "standings", "bracket", "matches", "statistics", "rules"] as const;
function initialTab(value: string | null): (typeof TABS)[number] {
  return TABS.find((tab) => tab === value) ?? "overview";
}
function HeaderFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-arena-muted">{label}</dt>
      <dd className="font-display text-lg font-semibold">{value}</dd>
    </div>
  );
}
function status(value: string) {
  return tournamentStatusLabel(value).label;
}
function format(value: string) {
  return (
    (
      {
        mix_single_elimination: "Mix Individual",
        single_elimination: "Eliminação simples",
        double_elimination: "Eliminação dupla",
        swiss: "Sistema suíço",
        round_robin: "Pontos corridos",
        group_playoffs: "Grupos e playoffs",
        league: "Liga",
        custom: "Personalizado",
      } as Record<string, string>
    )[value] ?? "A definir"
  );
}
function entryFee(tournament: {
  valor?: string | number | null;
  format?: string | null;
}) {
  const amount = Number(
    String(tournament.valor ?? 0)
      .replace(/[^\d,.-]/g, "")
      .replace(",", ".")
  );

  if (!Number.isFinite(amount) || amount <= 0) return "Grátis";

  const scope =
    tournament.format === "mix_single_elimination" ? "por jogador" : "por equipe";

  return `${new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount)} ${scope}`;
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
