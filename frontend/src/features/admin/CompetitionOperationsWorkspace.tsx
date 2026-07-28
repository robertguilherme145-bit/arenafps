import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  Gamepad2,
  ListChecks,
  Map as MapIcon,
  PencilLine,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Swords,
  Trash2,
  UserRound
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardHeader } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input, Label, Select } from "../../components/ui/Form";
import { ImageUploadField } from "../../components/ui/ImageUploadField";
import { useToast } from "../../hooks/useToast";
import {
  addManualMatchMap,
  createGame,
  createGameMap,
  createMatch,
  deleteGame,
  deleteGameMap,
  deactivateGameMap,
  getAdminCompetitionGames,
  getGameMaps,
  getMatchOperations,
  getTournamentCompetition,
  getTournamentCompetitionTeams,
  openMatchVeto,
  performMatchVetoAction,
  resetMatchVeto,
  saveMatchMapResult,
  saveMatchMapPlayerStatistics,
  sendAdminMatchMessage,
  updateGame,
  updateGameCompetitionSettings,
  updateGameMap,
  updateMatchRoomSettings,
  updateTournamentCompetition
} from "../../services/api";
import type {
  AdminCompetitionGame,
  GameMap,
  Match,
  MatchOperations,
  Tournament,
  TournamentCompetition,
  TournamentTeam,
  VetoStep
} from "../../types/api";
import { cn } from "../../utils/cn";

type WorkspaceSection = "games" | "rules" | "matches" | "veto";
type PlayerStatDraft = Record<number, { kills: string; deaths: string; assists: string; headshots: string; mvp: boolean }>;
type MapPlayerStatDraft = Record<number, PlayerStatDraft>;

type Props = {
  tournaments: Tournament[];
  activeTournament: Tournament | null;
  matches: Match[];
  loadingMatches: boolean;
  onTournamentChange: (tournamentId: number) => void;
  onReloadMatches: (tournamentId: number) => Promise<void>;
  onRefreshAdmin: () => Promise<void>;
};

const sections: Array<{ id: WorkspaceSection; label: string; description: string; icon: ReactNode }> = [
  { id: "games", label: "Catalogo de jogos", description: "Cadastre os jogos e os mapas oficiais usados nos torneios.", icon: <Gamepad2 className="h-4 w-4" /> },
  { id: "rules", label: "Regras do torneio", description: "Defina formato, serie, map pool e regras competitivas.", icon: <ListChecks className="h-4 w-4" /> },
  { id: "matches", label: "Partidas e resultados", description: "Crie confrontos, informe placares e estatisticas por mapa.", icon: <Swords className="h-4 w-4" /> },
  { id: "veto", label: "Sala de Pick & Ban", description: "Libere e acompanhe as escolhas dos capitaes em tempo real.", icon: <ShieldCheck className="h-4 w-4" /> }
];

export function CompetitionOperationsWorkspace({
  tournaments,
  activeTournament,
  matches,
  loadingMatches,
  onTournamentChange,
  onReloadMatches,
  onRefreshAdmin
}: Props) {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [section, setSection] = useState<WorkspaceSection>(() => {
    const requested = searchParams.get("section");
    return sections.some((item) => item.id === requested) ? requested as WorkspaceSection : "games";
  });
  const [games, setGames] = useState<AdminCompetitionGame[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [competition, setCompetition] = useState<TournamentCompetition | null>(null);
  const [tournamentTeams, setTournamentTeams] = useState<TournamentTeam[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [operations, setOperations] = useState<MatchOperations | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showNewGame, setShowNewGame] = useState(false);
  const [gameForm, setGameForm] = useState(blankGameForm());
  const [mapForm, setMapForm] = useState(blankMapForm());
  const [editingMapId, setEditingMapId] = useState<number | null>(null);
  const [editMapForm, setEditMapForm] = useState(blankMapForm());
  const [matchForm, setMatchForm] = useState({ round: "1", team_a_id: "", team_b_id: "", scheduled_at: "" });
  const [mapScores, setMapScores] = useState<Record<number, { a: string; b: string }>>({});
  const [mapPlayerStats, setMapPlayerStats] = useState<MapPlayerStatDraft>({});
  const [selectedStatsMapId, setSelectedStatsMapId] = useState<number | null>(null);
  const [roomForm, setRoomForm] = useState({ server_address: "", server_password: "", captain_confirmation_enabled: true, veto_action_seconds: "30" });
  const [matchNotice, setMatchNotice] = useState({ message: "", attachment_url: "" });

  const selectedGame = games.find((game) => game.id === selectedGameId) ?? games[0] ?? null;
  const confirmedTeams = tournamentTeams.filter((team) =>
    ["confirmado", "pago"].includes(team.entry_status) &&
    team.lineup_size >= Number(activeTournament?.titulares ?? 0)
  );

  useEffect(() => {
    void loadGames();
  }, []);

  useEffect(() => {
    const requested = searchParams.get("section");
    if (requested && sections.some((item) => item.id === requested) && requested !== section) {
      setSection(requested as WorkspaceSection);
    }
  }, [searchParams, section]);

  useEffect(() => {
    if (!selectedGame) {
      setMaps([]);
      return;
    }

    setGameForm({
      nome: selectedGame.nome,
      nome_curto: selectedGame.nome_curto,
      slug: selectedGame.slug,
      descricao: selectedGame.descricao ?? "",
      cor_primaria: selectedGame.cor_primaria ?? "#22d3ee",
      player_id_label: selectedGame.player_id_label,
      player_id_required: selectedGame.player_id_required,
      default_best_of: selectedGame.default_best_of,
      ativo: Boolean(selectedGame.ativo)
    });
    void loadMaps(selectedGame.id);
  }, [selectedGame?.id]);

  useEffect(() => {
    if (!activeTournament) {
      setCompetition(null);
      setTournamentTeams([]);
      return;
    }

    void loadTournamentContext(activeTournament.id);
  }, [activeTournament?.id]);

  useEffect(() => {
    if (!matches.length) {
      setSelectedMatchId(null);
      setOperations(null);
      return;
    }

    setSelectedMatchId((current) => current && matches.some((match) => match.id === current) ? current : matches[0].id);
  }, [matches]);

  useEffect(() => {
    if (!selectedMatchId) {
      setOperations(null);
      return;
    }

    void loadOperations(selectedMatchId);
  }, [selectedMatchId]);

  useEffect(() => {
    if (!operations) return;
    setRoomForm({
      server_address: operations.match.server_address ?? "",
      server_password: operations.match.server_password ?? "",
      captain_confirmation_enabled: operations.match.captain_confirmation_enabled,
      veto_action_seconds: String(operations.match.veto_action_seconds || 30)
    });
  }, [operations?.match.id, operations?.match.server_address, operations?.match.server_password, operations?.match.captain_confirmation_enabled, operations?.match.veto_action_seconds]);

  useEffect(() => {
    if (!operations?.maps.length) {
      setSelectedStatsMapId(null);
      return;
    }

    setSelectedStatsMapId((current) =>
      current && operations.maps.some((map) => map.id === current)
        ? current
        : operations.maps.find((map) => map.status === "finalizado")?.id ?? operations.maps[0].id
    );
  }, [operations?.match.id, operations?.maps.length]);

  async function loadGames(preferredId?: number) {
    try {
      const data = await getAdminCompetitionGames();
      setGames(data);
      setSelectedGameId((current) => preferredId ?? (current && data.some((game) => game.id === current) ? current : data[0]?.id ?? null));
    } catch (error) {
      toast.error("Falha ao carregar jogos", messageOf(error));
    }
  }

  async function loadMaps(gameId: number) {
    try {
      setMaps(await getGameMaps(gameId));
    } catch (error) {
      toast.error("Falha ao carregar mapas", messageOf(error));
    }
  }

  async function loadTournamentContext(tournamentId: number) {
    try {
      const [config, teams] = await Promise.all([
        getTournamentCompetition(tournamentId),
        getTournamentCompetitionTeams(tournamentId)
      ]);
      setCompetition(config);
      setTournamentTeams(teams);
    } catch (error) {
      toast.error("Falha ao carregar configuracao competitiva", messageOf(error));
    }
  }

  async function loadOperations(matchId: number) {
    try {
      const data = await getMatchOperations(matchId);
      setOperations(data);
      setMapScores(Object.fromEntries(data.maps.map((map) => [map.id, {
        a: map.status === "finalizado" ? String(map.score_team_a) : "",
        b: map.status === "finalizado" ? String(map.score_team_b) : ""
      }])));
      setMapPlayerStats(buildMapPlayerStatDraft(data));
    } catch (error) {
      toast.error("Falha ao abrir a central da partida", messageOf(error));
    }
  }

  async function handleCreateGame() {
    setBusy("create-game");
    try {
      const game = await createGame({
        nome: gameForm.nome,
        nome_curto: gameForm.nome_curto,
        slug: gameForm.slug,
        descricao: gameForm.descricao,
        cor_primaria: gameForm.cor_primaria
      });
      await updateGameCompetitionSettings(game.id, {
        player_id_label: gameForm.player_id_label,
        player_id_required: gameForm.player_id_required,
        default_best_of: gameForm.default_best_of
      });
      setShowNewGame(false);
      toast.success("Jogo cadastrado", `${game.nome} agora pode receber mapas e torneios.`);
      await loadGames(game.id);
    } catch (error) {
      toast.error("Nao foi possivel cadastrar o jogo", messageOf(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveGame() {
    if (!selectedGame) return;
    setBusy("save-game");
    try {
      await Promise.all([
        updateGame(selectedGame.id, {
          nome: gameForm.nome,
          nome_curto: gameForm.nome_curto,
          slug: gameForm.slug,
          descricao: gameForm.descricao,
          cor_primaria: gameForm.cor_primaria,
          ativo: gameForm.ativo
        }),
        updateGameCompetitionSettings(selectedGame.id, {
          player_id_label: gameForm.player_id_label,
          player_id_required: gameForm.player_id_required,
          default_best_of: gameForm.default_best_of
        })
      ]);
      toast.success("Jogo atualizado", "Identificacao dos jogadores e padroes competitivos foram salvos.");
      await loadGames(selectedGame.id);
    } catch (error) {
      toast.error("Falha ao atualizar o jogo", messageOf(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateMap() {
    if (!selectedGame) return;
    setBusy("create-map");
    try {
      await createGameMap(selectedGame.id, {
        nome: mapForm.nome,
        slug: mapForm.slug,
        imagem: mapForm.imagem || null,
        ordem: Number(mapForm.ordem)
      });
      setMapForm(blankMapForm());
      toast.success("Mapa adicionado", "O mapa ja esta disponivel para os map pools deste jogo.");
      await Promise.all([loadMaps(selectedGame.id), loadGames(selectedGame.id)]);
      if (activeTournament) await loadTournamentContext(activeTournament.id);
    } catch (error) {
      toast.error("Falha ao adicionar mapa", messageOf(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleToggleMap(map: GameMap) {
    setBusy(`map-${map.id}`);
    try {
      if (map.ativo) await deactivateGameMap(map.id);
      else await updateGameMap(map.id, { ativo: true });
      await loadMaps(map.game_id);
    } catch (error) {
      toast.error("Falha ao atualizar mapa", messageOf(error));
    } finally {
      setBusy(null);
    }
  }

  function handleStartEditMap(map: GameMap) {
    setEditingMapId(map.id);
    setEditMapForm({ nome: map.nome, slug: map.slug, imagem: map.imagem || "", ordem: String(map.ordem) });
  }

  async function handleSaveMap(map: GameMap) {
    setBusy(`edit-map-${map.id}`);
    try {
      await updateGameMap(map.id, {
        nome: editMapForm.nome,
        slug: editMapForm.slug,
        imagem: editMapForm.imagem || null,
        ordem: Number(editMapForm.ordem)
      });
      toast.success("Mapa atualizado", "Nome, imagem e ordem foram salvos.");
      setEditingMapId(null);
      setEditMapForm(blankMapForm());
      await loadMaps(map.game_id);
      if (activeTournament) await loadTournamentContext(activeTournament.id);
    } catch (error) {
      toast.error("Falha ao atualizar mapa", messageOf(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleDeleteMap(map:GameMap){if(!window.confirm(`Excluir definitivamente o mapa ${map.nome}?`))return;setBusy(`delete-map-${map.id}`);try{await deleteGameMap(map.id);toast.success("Mapa excluido");await Promise.all([loadMaps(map.game_id),loadGames(map.game_id)]);}catch(error){toast.error("Mapa nao excluido",messageOf(error));}finally{setBusy(null);}}
  async function handleDeleteGame(){if(!selectedGame||!window.confirm(`Excluir definitivamente o jogo ${selectedGame.nome} e seus mapas sem uso?`))return;setBusy("delete-game");try{await deleteGame(selectedGame.id);toast.success("Jogo excluido");setSelectedGameId(null);setMaps([]);await loadGames();}catch(error){toast.error("Jogo nao excluido",messageOf(error));}finally{setBusy(null);}}

  async function handleSaveCompetition() {
    if (!activeTournament || !competition || !competition.game_id) return;
    setBusy("save-competition");
    try {
      const saved = await updateTournamentCompetition(activeTournament.id, {
        game_id: competition.game_id,
        format: competition.format,
        best_of: competition.best_of,
        pick_ban_enabled: competition.pick_ban_enabled,
        veto_order: competition.veto_order,
        auto_decider: competition.auto_decider,
        overtime_enabled: competition.overtime_enabled,
        initial_side: competition.initial_side,
        pause_minutes: competition.pause_minutes,
        walkover_minutes: competition.walkover_minutes,
        tiebreakers: competition.tiebreakers,
        seed_mode: competition.seed_mode,
        registration_approval: competition.registration_approval,
        map_ids: competition.map_ids
      });
      setCompetition(saved);
      toast.success("Regulamento salvo", "Serie, map pool e ordem de veto agora fazem parte do torneio.");
    } catch (error) {
      toast.error("Falha ao salvar regulamento", messageOf(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleCompetitionGameChange(gameId: number) {
    if (!competition) return;
    const gameMaps = await getGameMaps(gameId, false);
    const game = games.find((item) => item.id === gameId);
    setCompetition({
      ...competition,
      game_id: gameId,
      game_name: game?.nome ?? null,
      best_of: game?.default_best_of ?? competition.best_of,
      available_maps: gameMaps,
      map_ids: [],
      map_pool: [],
      veto_order: []
    });
  }

  async function handleCreateMatch() {
    if (!activeTournament) return;
    setBusy("create-match");
    try {
      const match = await createMatch({
        tournament_id: activeTournament.id,
        round: Number(matchForm.round),
        team_a_id: Number(matchForm.team_a_id),
        team_b_id: Number(matchForm.team_b_id),
        scheduled_at: matchForm.scheduled_at ? toApiDate(matchForm.scheduled_at) : null
      });
      setMatchForm({ round: "1", team_a_id: "", team_b_id: "", scheduled_at: "" });
      setSelectedMatchId(match.id);
      setSection("veto");
      await Promise.all([onReloadMatches(activeTournament.id), onRefreshAdmin()]);
      toast.success("Partida criada", "Confronto criado com a serie e o map pool configurados no torneio.");
    } catch (error) {
      toast.error("Falha ao criar partida", messageOf(error));
    } finally {
      setBusy(null);
    }
  }

  async function mutateOperations(key: string, callback: () => Promise<MatchOperations>) {
    setBusy(key);
    try {
      const data = await callback();
      setOperations(data);
    } catch (error) {
      toast.error("Operacao nao concluida", messageOf(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleMapResult(mapId: number) {
    if (!operations) return;
    const score = mapScores[mapId];
    await mutateOperations(`result-${mapId}`, () => saveMatchMapResult(mapId, {
      score_team_a: Number(score?.a),
      score_team_b: Number(score?.b)
    }));
    if (activeTournament) await Promise.all([onReloadMatches(activeTournament.id), onRefreshAdmin()]);
  }

  async function handleSavePlayerStats() {
    if (!operations || !selectedStatsMapId) return;
    const selectedMap = operations.maps.find((map) => map.id === selectedStatsMapId);
    if (!selectedMap) return;
    if (selectedMap.status !== "finalizado") {
      toast.warning("Mapa sem resultado", "Salve o placar deste mapa antes de preencher a sumula.");
      return;
    }

    const playerStats = mapPlayerStats[selectedStatsMapId] ?? {};
    setBusy("player-stats");
    try {
      const data = await saveMatchMapPlayerStatistics(
        operations.match.id,
        selectedStatsMapId,
        operations.rosters
          .filter((player) => player.in_lineup)
          .map((player) => ({
            player_id: player.id,
            kills: Number(playerStats[player.id]?.kills ?? 0),
            deaths: Number(playerStats[player.id]?.deaths ?? 0),
            assists: Number(playerStats[player.id]?.assists ?? 0),
            headshots: Number(playerStats[player.id]?.headshots ?? 0),
            mvp: Boolean(playerStats[player.id]?.mvp)
          }))
      );
      setOperations(data);
      setMapPlayerStats(buildMapPlayerStatDraft(data));
      toast.success(`Sumula de ${selectedMap.map_name} salva`, "Os totais da partida, K/D, HS%, MVPs e ranking foram recalculados.");
    } catch (error) {
      toast.error("Falha ao salvar sumula", messageOf(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveRoom() {
    if (!operations) return;
    setBusy("save-room");
    try {
      const data = await updateMatchRoomSettings(operations.match.id, {
        server_address: roomForm.server_address.trim() || null,
        server_password: roomForm.server_password.trim() || null,
        captain_confirmation_enabled: roomForm.captain_confirmation_enabled,
        veto_action_seconds: Number(roomForm.veto_action_seconds)
      });
      setOperations(data);
      toast.success("Sala atualizada", "Os capitaes ja podem consultar servidor, senha e regras desta partida.");
    } catch (error) {
      toast.error("Falha ao atualizar a sala", messageOf(error));
    } finally {
      setBusy(null);
    }
  }

  async function handleSendMatchNotice() {
    if (!operations || !matchNotice.message.trim()) return;
    setBusy("match-notice");
    try {
      await sendAdminMatchMessage(operations.match.id, {
        message: matchNotice.message.trim(),
        attachment_url: matchNotice.attachment_url.trim() || null,
        type: "announcement"
      });
      setMatchNotice({ message: "", attachment_url: "" });
      toast.success("Aviso enviado", "A mensagem foi publicada no chat da partida.");
    } catch (error) {
      toast.error("Falha ao enviar aviso", messageOf(error));
    } finally {
      setBusy(null);
    }
  }

  const canCreateMatch = Boolean(activeTournament && ["fechado", "em_andamento"].includes(activeTournament.status));
  const activeSection = sections.find((item) => item.id === section) ?? sections[0];

  return (
    <div className="mt-6 space-y-5">
      <div className="border-b border-arena-line">
        <div className="flex gap-1 overflow-x-auto">
        {sections.map((item) => (
          <button
            className={cn(
              "flex h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition",
              section === item.id
                ? "border-cyan-300 text-white"
                : "border-transparent text-arena-muted hover:text-white"
            )}
            key={item.id}
            onClick={() => {
              setSection(item.id);
              const next = new URLSearchParams(searchParams);
              next.set("module", "operations");
              next.set("section", item.id);
              setSearchParams(next);
            }}
            type="button"
          >
            {item.icon}
            {item.label}
          </button>
        ))}
        </div>
      </div>
      <div className="flex items-start gap-3 border-l-2 border-cyan-400 bg-cyan-400/[.06] px-4 py-3">
        <span className="mt-0.5 text-cyan-200">{activeSection.icon}</span>
        <div>
          <p className="font-semibold">{activeSection.label}</p>
          <p className="mt-1 text-sm text-arena-muted">{activeSection.description}</p>
        </div>
      </div>

      {section === "games" ? (
        <GameCatalog
          busy={busy}
          gameForm={gameForm}
          games={games}
          editingMapId={editingMapId}
          editMapForm={editMapForm}
          mapForm={mapForm}
          maps={maps}
          selectedGame={selectedGame}
          showNewGame={showNewGame}
          onCreateGame={() => void handleCreateGame()}
          onCreateMap={() => void handleCreateMap()}
          onGameFormChange={setGameForm}
          onEditMapFormChange={setEditMapForm}
          onMapFormChange={setMapForm}
          onSaveGame={() => void handleSaveGame()}
          onSelectGame={setSelectedGameId}
          onShowNewGame={(show) => {
            setShowNewGame(show);
            if (show) setGameForm(blankGameForm());
            else if (selectedGame) setSelectedGameId(selectedGame.id);
          }}
          onToggleMap={(map) => void handleToggleMap(map)}
          onStartEditMap={handleStartEditMap}
          onSaveMap={(map) => void handleSaveMap(map)}
          onCancelEditMap={() => setEditingMapId(null)}
          onDeleteMap={(map) => void handleDeleteMap(map)}
          onDeleteGame={() => void handleDeleteGame()}
        />
      ) : null}

      {section === "rules" ? (
        <TournamentRules
          busy={busy}
          competition={competition}
          games={games}
          tournaments={tournaments}
          onChange={setCompetition}
          onGameChange={(gameId) => void handleCompetitionGameChange(gameId)}
          onSave={() => void handleSaveCompetition()}
          onTournamentChange={onTournamentChange}
        />
      ) : null}

      {section === "matches" ? (
        <MatchSchedule
          activeTournament={activeTournament}
          busy={busy}
          canCreate={canCreateMatch}
          confirmedTeams={confirmedTeams}
          loading={loadingMatches}
          matchForm={matchForm}
          matches={matches}
          tournaments={tournaments}
          onCreate={() => void handleCreateMatch()}
          onFormChange={setMatchForm}
          onOpen={(matchId) => {
            setSelectedMatchId(matchId);
            setSection("veto");
          }}
          onReload={() => activeTournament && void onReloadMatches(activeTournament.id)}
          onTournamentChange={onTournamentChange}
        />
      ) : null}

      {section === "veto" ? (
        <VetoWorkspace
          busy={busy}
          mapScores={mapScores}
          matches={matches}
          operations={operations}
          playerStats={selectedStatsMapId ? mapPlayerStats[selectedStatsMapId] ?? {} : {}}
          roomForm={roomForm}
          matchNotice={matchNotice}
          selectedStatsMapId={selectedStatsMapId}
          selectedMatchId={selectedMatchId}
          onAddManualMap={(mapId) => operations && void mutateOperations("manual-map", () => addManualMatchMap(operations.match.id, { game_map_id: mapId }))}
          onMapResult={(mapId) => void handleMapResult(mapId)}
          onOpenVeto={() => operations && void mutateOperations("open-veto", () => openMatchVeto(operations.match.id))}
          onPerformAction={(mapId) => {
            if (!operations?.veto.expected_step) return;
            const expected = operations.veto.expected_step;
            const teamId = expected.team === "A" ? operations.match.team_a_id : expected.team === "B" ? operations.match.team_b_id : null;
            void mutateOperations("veto-action", () => performMatchVetoAction(operations.match.id, {
              action: expected.action,
              team_id: teamId,
              game_map_id: mapId
            }));
          }}
          onResetVeto={() => operations && void mutateOperations("reset-veto", () => resetMatchVeto(operations.match.id))}
          onRoomFormChange={setRoomForm}
          onSaveRoom={() => void handleSaveRoom()}
          onMatchNoticeChange={setMatchNotice}
          onSendMatchNotice={() => void handleSendMatchNotice()}
          onSavePlayerStats={() => void handleSavePlayerStats()}
          onSelectStatsMap={setSelectedStatsMapId}
          onScoreChange={(mapId, side, value) => setMapScores((current) => ({
            ...current,
            [mapId]: { ...current[mapId], [side]: value }
          }))}
          onSelectMatch={setSelectedMatchId}
          onStatChange={(playerId, field, value) => setMapPlayerStats((current) => {
            if (!selectedStatsMapId) return current;
            const selectedMapStats = current[selectedStatsMapId] ?? {};
            const next = { ...selectedMapStats, [playerId]: { ...selectedMapStats[playerId], [field]: value } };
            if (field === "mvp" && value === true) {
              for (const id of Object.keys(next).map(Number)) next[id] = { ...next[id], mvp: id === playerId };
            }
            return { ...current, [selectedStatsMapId]: next };
          })}
        />
      ) : null}
    </div>
  );
}

type GameForm = {
  nome: string;
  nome_curto: string;
  slug: string;
  descricao: string;
  cor_primaria: string;
  player_id_label: string;
  player_id_required: boolean;
  default_best_of: "bo1" | "bo3" | "bo5";
  ativo: boolean;
};
type MapForm = ReturnType<typeof blankMapForm>;

function GameCatalog({
  games, selectedGame, maps, gameForm, mapForm, editingMapId, editMapForm, showNewGame, busy,
  onSelectGame, onShowNewGame, onGameFormChange, onMapFormChange, onEditMapFormChange,
  onCreateGame, onSaveGame, onCreateMap, onToggleMap, onStartEditMap, onSaveMap,
  onCancelEditMap, onDeleteGame, onDeleteMap
}: {
  games: AdminCompetitionGame[];
  selectedGame: AdminCompetitionGame | null;
  maps: GameMap[];
  gameForm: GameForm;
  mapForm: MapForm;
  editingMapId: number | null;
  editMapForm: MapForm;
  showNewGame: boolean;
  busy: string | null;
  onSelectGame: (id: number) => void;
  onShowNewGame: (show: boolean) => void;
  onGameFormChange: (form: GameForm) => void;
  onMapFormChange: (form: MapForm) => void;
  onEditMapFormChange: (form: MapForm) => void;
  onCreateGame: () => void;
  onSaveGame: () => void;
  onCreateMap: () => void;
  onToggleMap: (map: GameMap) => void;
  onStartEditMap: (map: GameMap) => void;
  onSaveMap: (map: GameMap) => void;
  onCancelEditMap: () => void;
  onDeleteGame: () => void;
  onDeleteMap: (map: GameMap) => void;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Catalogo de jogos</h2>
            <p className="mt-1 text-sm text-arena-muted">{games.length} cadastrados</p>
          </div>
          <Button className="h-9 px-3" icon={<Plus className="h-4 w-4" />} onClick={() => onShowNewGame(true)}>Novo</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {games.map((game) => (
            <button
              className={cn(
                "w-full border-l-2 px-3 py-3 text-left transition",
                selectedGame?.id === game.id && !showNewGame
                  ? "border-cyan-300 bg-cyan-400/10"
                  : "border-transparent hover:bg-white/[.04]"
              )}
              key={game.id}
              onClick={() => { onShowNewGame(false); onSelectGame(game.id); }}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{game.nome}</p>
                <Badge tone={Boolean(game.ativo) ? "success" : "neutral"}>{Boolean(game.ativo) ? "Ativo" : "Inativo"}</Badge>
              </div>
              <p className="mt-1 text-xs text-arena-muted">#{game.id} · {game.nome_curto} · {game.active_maps_count} mapas ativos</p>
            </button>
          ))}
          {!games.length ? <EmptyState title="Nenhum jogo cadastrado" description="Cadastre o primeiro jogo para criar seus mapas." /> : null}
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-semibold">{showNewGame ? "Cadastrar jogo" : "Configuracao do jogo"}</h2>
            <p className="mt-1 text-sm text-arena-muted">O ID exigido dos jogadores e o formato padrao pertencem ao jogo.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Nome completo"><Input value={gameForm.nome} onChange={(event) => onGameFormChange({ ...gameForm, nome: event.target.value })} /></Field>
              <Field label="Nome curto"><Input value={gameForm.nome_curto} onChange={(event) => onGameFormChange({ ...gameForm, nome_curto: event.target.value })} /></Field>
              <Field label="Slug"><Input placeholder="gerado automaticamente" value={gameForm.slug} onChange={(event) => onGameFormChange({ ...gameForm, slug: event.target.value })} /></Field>
              <Field label="Nome do ID no jogo"><Input placeholder="Ex.: Steam ID, Riot ID" value={gameForm.player_id_label} onChange={(event) => onGameFormChange({ ...gameForm, player_id_label: event.target.value })} /></Field>
              <Field label="Serie padrao">
                <Select value={gameForm.default_best_of} onChange={(event) => onGameFormChange({ ...gameForm, default_best_of: event.target.value as GameForm["default_best_of"] })}>
                  <option value="bo1">MD1</option><option value="bo3">MD3</option><option value="bo5">MD5</option>
                </Select>
              </Field>
              <Field label="Cor primaria"><Input type="color" value={gameForm.cor_primaria} onChange={(event) => onGameFormChange({ ...gameForm, cor_primaria: event.target.value })} /></Field>
            </div>
            <Field label="Descricao"><Input value={gameForm.descricao} onChange={(event) => onGameFormChange({ ...gameForm, descricao: event.target.value })} /></Field>
            <div className="flex flex-wrap items-center gap-5">
              <CheckControl checked={gameForm.player_id_required} label="ID do jogador obrigatorio" onChange={(checked) => onGameFormChange({ ...gameForm, player_id_required: checked })} />
              {!showNewGame ? <CheckControl checked={gameForm.ativo} label="Jogo ativo no catalogo" onChange={(checked) => onGameFormChange({ ...gameForm, ativo: checked })} /> : null}
            </div>
            <div className="flex gap-3">
              <Button loading={busy === (showNewGame ? "create-game" : "save-game")} icon={showNewGame ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />} onClick={showNewGame ? onCreateGame : onSaveGame}>
                {showNewGame ? "Cadastrar jogo" : "Salvar jogo"}
              </Button>
              {showNewGame ? <Button variant="ghost" onClick={() => onShowNewGame(false)}>Cancelar</Button> : null}
              {!showNewGame ? <Button variant="danger" loading={busy === "delete-game"} icon={<Trash2 className="h-4 w-4" />} onClick={onDeleteGame}>Excluir jogo</Button> : null}
            </div>
          </CardContent>
        </Card>

        {!showNewGame && selectedGame ? (
          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-semibold">Mapas de {selectedGame.nome}</h2>
              <p className="mt-1 text-sm text-arena-muted">Estes mapas ficam disponiveis no map pool de cada torneio.</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_120px_auto]">
                <Field label="Nome do mapa"><Input placeholder="Ex.: Mirage" value={mapForm.nome} onChange={(event) => onMapFormChange({ ...mapForm, nome: event.target.value })} /></Field>
                <Field label="Slug"><Input placeholder="gerado automaticamente" value={mapForm.slug} onChange={(event) => onMapFormChange({ ...mapForm, slug: event.target.value })} /></Field>
                <Field label="Ordem"><Input min="0" type="number" value={mapForm.ordem} onChange={(event) => onMapFormChange({ ...mapForm, ordem: event.target.value })} /></Field>
                <Button className="self-end" loading={busy === "create-map"} icon={<Plus className="h-4 w-4" />} onClick={onCreateMap}>Adicionar mapa</Button>
              </div>
              <Field label="Imagem do mapa"><Input placeholder="URL ou envie uma imagem abaixo" value={mapForm.imagem} onChange={(event) => onMapFormChange({ ...mapForm, imagem:event.target.value })} /><div className="mt-2 max-w-xl"><ImageUploadField value={mapForm.imagem} onChange={(imagem)=>onMapFormChange({ ...mapForm, imagem })} label="Enviar imagem do mapa" /></div></Field>
              <div className="divide-y divide-arena-line border-y border-arena-line">
                {maps.map((map) => (
                  <div className="group/map relative grid items-center gap-3 py-3 md:grid-cols-[48px_1fr_120px_auto]" key={map.id}>
                    <div className="flex h-10 w-10 overflow-hidden border border-arena-line bg-black/25">{map.imagem ? <img className="h-full w-full object-cover" src={map.imagem} alt="" /> : <MapIcon className="m-auto h-4 w-4 text-cyan-200" />}</div>
                    <div><p className="font-semibold">{map.nome}</p><p className="text-xs text-arena-muted">#{map.id} · {map.slug}</p></div>
                    <Badge tone={map.ativo ? "success" : "neutral"}>{map.ativo ? "Disponivel" : "Desativado"}</Badge>
                    <div className="flex flex-wrap gap-2"><Button className="h-9" icon={<PencilLine className="h-4 w-4" />} variant="secondary" onClick={() => onStartEditMap(map)}>Editar</Button><Button className="h-9" loading={busy === `map-${map.id}`} variant="secondary" onClick={() => onToggleMap(map)}>{map.ativo ? "Desativar" : "Reativar"}</Button><Button aria-label={`Excluir ${map.nome}`} className="h-9 w-9 px-0" loading={busy === `delete-map-${map.id}`} variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => onDeleteMap(map)} /></div>
                    {map.imagem && editingMapId !== map.id ? <MapHoverPreview map={map} /> : null}
                    {editingMapId === map.id ? <div className="border border-cyan-400/30 bg-cyan-400/[.05] p-4 md:col-span-4">
                      <div className="grid gap-4 md:grid-cols-[1fr_1fr_120px]">
                        <Field label="Nome do mapa"><Input value={editMapForm.nome} onChange={(event) => onEditMapFormChange({ ...editMapForm, nome:event.target.value })} /></Field>
                        <Field label="Slug"><Input value={editMapForm.slug} onChange={(event) => onEditMapFormChange({ ...editMapForm, slug:event.target.value })} /></Field>
                        <Field label="Ordem"><Input min="0" type="number" value={editMapForm.ordem} onChange={(event) => onEditMapFormChange({ ...editMapForm, ordem:event.target.value })} /></Field>
                      </div>
                      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                        <Field label="Imagem do mapa"><Input placeholder="URL ou envie uma nova imagem" value={editMapForm.imagem} onChange={(event) => onEditMapFormChange({ ...editMapForm, imagem:event.target.value })} /><div className="mt-2"><ImageUploadField value={editMapForm.imagem} onChange={(imagem)=>onEditMapFormChange({ ...editMapForm, imagem })} label="Substituir imagem" /></div></Field>
                        <div className="aspect-video overflow-hidden border border-arena-line bg-[#09121d]">{editMapForm.imagem ? <img className="h-full w-full object-cover" src={editMapForm.imagem} alt={`Pre-visualizacao de ${editMapForm.nome}`} /> : <div className="flex h-full items-center justify-center"><MapIcon className="h-7 w-7 text-arena-muted" /></div>}</div>
                      </div>
                      <div className="mt-4 flex gap-2"><Button loading={busy === `edit-map-${map.id}`} icon={<Save className="h-4 w-4" />} onClick={() => onSaveMap(map)}>Salvar alteracoes</Button><Button variant="ghost" onClick={onCancelEditMap}>Cancelar</Button></div>
                    </div> : null}
                  </div>
                ))}
                {!maps.length ? <div className="py-8"><EmptyState title="Este jogo ainda nao tem mapas" description="Adicione os mapas oficiais usados nas competicoes." /></div> : null}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function TournamentRules({ tournaments, games, competition, busy, onTournamentChange, onGameChange, onChange, onSave }: {
  tournaments: Tournament[];
  games: AdminCompetitionGame[];
  competition: TournamentCompetition | null;
  busy: string | null;
  onTournamentChange: (id: number) => void;
  onGameChange: (id: number) => void;
  onChange: (value: TournamentCompetition) => void;
  onSave: () => void;
}) {
  if (!competition) return <EmptyState title="Selecione um torneio" description="O regulamento competitivo sera configurado por torneio." />;

  function change<K extends keyof TournamentCompetition>(key: K, value: TournamentCompetition[K]) {
    onChange({ ...competition!, [key]: value });
  }

  function moveStep(index: number, direction: -1 | 1) {
    const next = [...competition!.veto_order];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    change("veto_order", next);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="font-display text-lg font-semibold">Regulamento competitivo</h2><p className="mt-1 text-sm text-arena-muted">Formato, serie, regras e mapas usados pelo motor da competicao.</p></div>
          <Select className="w-full md:w-80" value={competition.tournament_id} onChange={(event) => onTournamentChange(Number(event.target.value))}>
            {tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.nome}</option>)}
          </Select>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Jogo">
              <Select value={competition.game_id ?? ""} onChange={(event) => onGameChange(Number(event.target.value))}>
                <option value="">Selecione</option>
                {games.filter((game) => Boolean(game.ativo)).map((game) => <option key={game.id} value={game.id}>{game.nome}</option>)}
              </Select>
            </Field>
            <Field label="Formato">
              <Select value={competition.format} onChange={(event) => change("format", event.target.value as TournamentCompetition["format"])}>
                <option value="single_elimination">Eliminação simples</option><option value="double_elimination">Eliminação dupla</option><option value="swiss">Sistema suíço</option><option value="round_robin">Todos contra todos</option><option value="group_playoffs">Fase de grupos + eliminatórias</option><option value="league">Liga</option><option value="custom">Personalizado</option>
              </Select>
            </Field>
            <Field label="Serie"><Select value={competition.best_of} onChange={(event) => change("best_of", event.target.value as TournamentCompetition["best_of"])}><option value="bo1">MD1</option><option value="bo3">MD3</option><option value="bo5">MD5</option></Select></Field>
            <Field label="Seed"><Select value={competition.seed_mode} onChange={(event) => change("seed_mode", event.target.value as TournamentCompetition["seed_mode"])}><option value="automatic">Automatico</option><option value="manual">Manual</option></Select></Field>
            <Field label="Side inicial"><Select value={competition.initial_side} onChange={(event) => change("initial_side", event.target.value)}><option value="knife">Knife round</option><option value="random">Sorteio</option><option value="higher_seed">Melhor seed escolhe</option><option value="home_team">Equipe A escolhe</option></Select></Field>
            <Field label="Pausa (min)"><Input min="0" type="number" value={competition.pause_minutes} onChange={(event) => change("pause_minutes", Number(event.target.value))} /></Field>
            <Field label="W.O. (min)"><Input min="0" type="number" value={competition.walkover_minutes} onChange={(event) => change("walkover_minutes", Number(event.target.value))} /></Field>
            <Field label="Aprovacao de inscricao"><Select value={competition.registration_approval} onChange={(event) => change("registration_approval", event.target.value as TournamentCompetition["registration_approval"])}><option value="manual">Manual</option><option value="automatic">Automatica</option></Select></Field>
          </div>
          <div className="flex flex-wrap gap-6"><CheckControl checked={competition.pick_ban_enabled} label="Pick & Ban ativo" onChange={(checked) => change("pick_ban_enabled", checked)} /><CheckControl checked={competition.auto_decider} label="Decider automatico" onChange={(checked) => change("auto_decider", checked)} /><CheckControl checked={competition.overtime_enabled} label="Overtime permitido" onChange={(checked) => change("overtime_enabled", checked)} /></div>
          <Field label="Criterios de desempate"><Input value={competition.tiebreakers} onChange={(event) => change("tiebreakers", event.target.value)} /></Field>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <Card>
          <CardHeader><h2 className="font-display text-lg font-semibold">Map pool</h2><p className="mt-1 text-sm text-arena-muted">Selecione somente os mapas liberados neste torneio.</p></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {competition.available_maps.map((map) => {
              const checked = competition.map_ids.includes(map.id);
              return <label className={cn("group/map relative flex cursor-pointer items-center gap-3 border p-3 transition", checked ? "border-cyan-400/50 bg-cyan-400/10" : "border-arena-line bg-black/20 hover:bg-white/[.04]")} key={map.id}><input checked={checked} className="h-4 w-4 accent-cyan-400" onChange={() => change("map_ids", checked ? competition.map_ids.filter((id) => id !== map.id) : [...competition.map_ids, map.id])} type="checkbox" />{map.imagem ? <img className="h-10 w-14 object-cover" src={map.imagem} alt="" /> : <MapIcon className="h-4 w-4 text-cyan-200" />}<span><span className="block text-sm font-semibold">{map.nome}</span><span className="text-xs text-arena-muted">#{map.id} · {map.slug}</span></span>{map.imagem ? <MapHoverPreview map={map} /> : null}</label>;
            })}
            {!competition.available_maps.length ? <div className="sm:col-span-2"><EmptyState title="Jogo sem mapas" description="Cadastre os mapas do jogo antes de montar o map pool." /></div> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between gap-3"><div><h2 className="font-display text-lg font-semibold">Ordem do Pick & Ban</h2><p className="mt-1 text-sm text-arena-muted">A sequencia e executada exatamente nesta ordem.</p></div><Badge tone="info">{competition.veto_order.length} etapas</Badge></CardHeader>
          <CardContent className="space-y-2">
            {competition.veto_order.map((step, index) => (
              <div className="grid items-center gap-2 border border-arena-line bg-black/20 p-2 sm:grid-cols-[36px_1fr_1fr_auto]" key={`${index}-${step.action}-${step.team}`}>
                <span className="text-center text-sm font-bold text-arena-muted">{index + 1}</span>
                <Select value={step.action} onChange={(event) => { const next = [...competition.veto_order]; next[index] = { action: event.target.value as VetoStep["action"], team: event.target.value === "decider" ? "SYSTEM" : step.team === "SYSTEM" ? "A" : step.team }; change("veto_order", next); }}><option value="ban">Ban</option><option value="pick">Pick</option><option value="decider">Decider</option></Select>
                <Select disabled={step.action === "decider"} value={step.team} onChange={(event) => { const next = [...competition.veto_order]; next[index] = { ...step, team: event.target.value as VetoStep["team"] }; change("veto_order", next); }}><option value="A">Equipe A</option><option value="B">Equipe B</option><option value="SYSTEM">Sistema</option></Select>
                <div className="flex"><IconButton label="Subir" onClick={() => moveStep(index, -1)}><ChevronUp className="h-4 w-4" /></IconButton><IconButton label="Descer" onClick={() => moveStep(index, 1)}><ChevronDown className="h-4 w-4" /></IconButton><IconButton label="Remover" onClick={() => change("veto_order", competition.veto_order.filter((_, itemIndex) => itemIndex !== index))}><Trash2 className="h-4 w-4" /></IconButton></div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-2"><Button className="h-9" icon={<Plus className="h-4 w-4" />} variant="secondary" onClick={() => change("veto_order", [...competition.veto_order, { action: "ban", team: "A" }])}>Ban</Button><Button className="h-9" icon={<Plus className="h-4 w-4" />} variant="secondary" onClick={() => change("veto_order", [...competition.veto_order, { action: "pick", team: "A" }])}>Pick</Button><Button className="h-9" icon={<Plus className="h-4 w-4" />} variant="secondary" onClick={() => change("veto_order", [...competition.veto_order, { action: "decider", team: "SYSTEM" }])}>Decider</Button></div>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-end"><Button loading={busy === "save-competition"} icon={<Save className="h-4 w-4" />} onClick={onSave}>Salvar regulamento competitivo</Button></div>
    </div>
  );
}

function MatchSchedule({ tournaments, activeTournament, confirmedTeams, matches, matchForm, loading, busy, canCreate, onTournamentChange, onFormChange, onCreate, onOpen, onReload }: {
  tournaments: Tournament[]; activeTournament: Tournament | null; confirmedTeams: TournamentTeam[]; matches: Match[]; matchForm: { round: string; team_a_id: string; team_b_id: string; scheduled_at: string }; loading: boolean; busy: string | null; canCreate: boolean; onTournamentChange: (id: number) => void; onFormChange: (form: { round: string; team_a_id: string; team_b_id: string; scheduled_at: string }) => void; onCreate: () => void; onOpen: (id: number) => void; onReload: () => void;
}) {
  return <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
    <Card><CardHeader><h2 className="font-display text-lg font-semibold">Criar partida</h2><p className="mt-1 text-sm text-arena-muted">As equipes vem das inscricoes confirmadas.</p></CardHeader><CardContent className="space-y-4">
      <Field label="Torneio"><Select value={activeTournament?.id ?? ""} onChange={(event) => onTournamentChange(Number(event.target.value))}>{tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.nome}</option>)}</Select></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Rodada"><Input min="1" type="number" value={matchForm.round} onChange={(event) => onFormChange({ ...matchForm, round: event.target.value })} /></Field><Field label="Agendamento"><Input type="datetime-local" value={matchForm.scheduled_at} onChange={(event) => onFormChange({ ...matchForm, scheduled_at: event.target.value })} /></Field></div>
      <Field label="Equipe A"><Select value={matchForm.team_a_id} onChange={(event) => onFormChange({ ...matchForm, team_a_id: event.target.value })}><option value="">Selecione</option>{confirmedTeams.map((team) => <option disabled={String(team.team_id) === matchForm.team_b_id} key={team.team_id} value={team.team_id}>#{team.team_id} · {team.team_name} ({team.lineup_size} jogadores)</option>)}</Select></Field>
      <Field label="Equipe B"><Select value={matchForm.team_b_id} onChange={(event) => onFormChange({ ...matchForm, team_b_id: event.target.value })}><option value="">Selecione</option>{confirmedTeams.map((team) => <option disabled={String(team.team_id) === matchForm.team_a_id} key={team.team_id} value={team.team_id}>#{team.team_id} · {team.team_name} ({team.lineup_size} jogadores)</option>)}</Select></Field>
      {!canCreate ? <div className="border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">Feche as inscricoes ou inicie o torneio antes de criar confrontos.</div> : null}
      <Button disabled={!canCreate || !matchForm.team_a_id || !matchForm.team_b_id} loading={busy === "create-match"} icon={<Swords className="h-4 w-4" />} onClick={onCreate}>Criar partida</Button>
    </CardContent></Card>
    <Card><CardHeader className="flex items-center justify-between gap-3"><div><h2 className="font-display text-lg font-semibold">Cronograma de partidas</h2><p className="mt-1 text-sm text-arena-muted">Abra uma partida para operar mapas, veto e lineups.</p></div><IconButton label="Atualizar partidas" onClick={onReload}><RefreshCw className="h-4 w-4" /></IconButton></CardHeader><CardContent className="p-0">
      <div className="divide-y divide-arena-line">{matches.map((match) => <div className="grid items-center gap-4 px-5 py-4 md:grid-cols-[90px_1fr_130px_auto]" key={match.id}><div><p className="text-xs uppercase text-arena-muted">Partida</p><p className="font-bold">#{match.id} · R{match.round}</p></div><div><p className="font-semibold">{match.team_a} <span className="text-arena-muted">vs</span> {match.team_b}</p><p className="mt-1 text-xs text-arena-muted">{match.scheduled_at ? new Date(match.scheduled_at).toLocaleString("pt-BR") : "Sem horario definido"}</p></div><Badge tone={match.status === "finalizada" ? "success" : match.status === "andamento" ? "warning" : "info"}>{match.status}</Badge><Button className="h-9" icon={<PencilLine className="h-4 w-4" />} variant="secondary" onClick={() => onOpen(match.id)}>Operar</Button></div>)}</div>
      {!matches.length && !loading ? <div className="p-5"><EmptyState title="Nenhuma partida" description="Crie o primeiro confronto com as equipes confirmadas." /></div> : null}{loading ? <p className="p-5 text-sm text-arena-muted">Carregando partidas...</p> : null}
    </CardContent></Card>
  </div>;
}

function VetoWorkspace({ matches, selectedMatchId, selectedStatsMapId, operations, busy, mapScores, playerStats, roomForm, matchNotice, onSelectMatch, onSelectStatsMap, onOpenVeto, onResetVeto, onPerformAction, onAddManualMap, onScoreChange, onMapResult, onStatChange, onSavePlayerStats, onRoomFormChange, onSaveRoom, onMatchNoticeChange, onSendMatchNotice }: {
  matches: Match[];
  selectedMatchId: number | null;
  selectedStatsMapId: number | null;
  operations: MatchOperations | null;
  busy: string | null;
  mapScores: Record<number, { a: string; b: string }>;
  playerStats: PlayerStatDraft;
  roomForm: { server_address: string; server_password: string; captain_confirmation_enabled: boolean; veto_action_seconds: string };
  matchNotice: { message: string; attachment_url: string };
  onSelectMatch: (id: number) => void;
  onSelectStatsMap: (id: number) => void;
  onOpenVeto: () => void;
  onResetVeto: () => void;
  onPerformAction: (mapId: number) => void;
  onAddManualMap: (mapId: number) => void;
  onScoreChange: (mapId: number, side: "a" | "b", value: string) => void;
  onMapResult: (mapId: number) => void;
  onStatChange: (playerId: number, field: keyof PlayerStatDraft[number], value: string | boolean) => void;
  onSavePlayerStats: () => void;
  onRoomFormChange: (value: typeof roomForm) => void;
  onSaveRoom: () => void;
  onMatchNoticeChange: (value: typeof matchNotice) => void;
  onSendMatchNotice: () => void;
}) {
  const usedMapIds = new Set([...(operations?.veto.actions.map((action) => action.game_map_id) ?? []), ...(operations?.maps.map((map) => map.game_map_id) ?? [])]);
  if (!matches.length) return <EmptyState title="Nenhuma partida para operar" description="Crie uma partida na aba Partidas." />;
  if (!operations) return <p className="py-8 text-sm text-arena-muted">Carregando central da partida...</p>;
  const expected = operations.veto.expected_step;
  const expectedTeam = expected?.team === "A" ? operations.match.team_a : expected?.team === "B" ? operations.match.team_b : "Sistema";
  const available = operations.map_pool.filter((map) => !usedMapIds.has(map.id));
  const teamARoster = operations.rosters.filter((player) => player.team_id === operations.match.team_a_id);
  const teamBRoster = operations.rosters.filter((player) => player.team_id === operations.match.team_b_id);
  const selectedStatsMap = operations.maps.find((map) => map.id === selectedStatsMapId) ?? null;
  const statsByMap = new Map<number, number>();
  for (const stat of operations.map_player_stats ?? []) {
    statsByMap.set(Number(stat.match_map_id), (statsByMap.get(Number(stat.match_map_id)) ?? 0) + 1);
  }
  const hasLegacyTotals = operations.player_stats.length > 0 && !(operations.map_player_stats ?? []).length;

  return <div className="space-y-5">
    <Card><CardContent className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="flex h-11 w-11 items-center justify-center border border-cyan-400/30 bg-cyan-400/10"><Swords className="h-5 w-5 text-cyan-200" /></div><div><p className="text-xs uppercase text-arena-muted">Central da partida</p><h2 className="font-display text-xl font-semibold">{operations.match.team_a} vs {operations.match.team_b}</h2><p className="mt-1 text-sm text-arena-muted">Partida #{operations.match.id} · Rodada {operations.match.round} · {operations.match.best_of.toUpperCase()}</p></div></div><Select className="w-full md:w-72" value={selectedMatchId ?? ""} onChange={(event) => onSelectMatch(Number(event.target.value))}>{matches.map((match) => <option key={match.id} value={match.id}>#{match.id} · {match.team_a} vs {match.team_b}</option>)}</Select></CardContent></Card>
    <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <Card><CardHeader><h3 className="font-display text-lg font-semibold">Sala e regras do capitao</h3><p className="mt-1 text-sm text-arena-muted">Dados privados que aparecem apenas para as equipes desta partida.</p></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><Field label="IP ou endereco do servidor"><Input placeholder="play.arenacamp.gg:27015" value={roomForm.server_address} onChange={(event) => onRoomFormChange({ ...roomForm, server_address: event.target.value })} /></Field><Field label="Senha da sala"><Input placeholder="Senha privada" value={roomForm.server_password} onChange={(event) => onRoomFormChange({ ...roomForm, server_password: event.target.value })} /></Field><Field label="Tempo por acao do Pick & Ban"><div className="flex items-center gap-2"><Input max="120" min="10" type="number" value={roomForm.veto_action_seconds} onChange={(event) => onRoomFormChange({ ...roomForm, veto_action_seconds: event.target.value })} /><span className="text-sm text-arena-muted">segundos</span></div></Field><div className="flex items-end"><CheckControl checked={roomForm.captain_confirmation_enabled} label="Permitir confirmacao do resultado pelo capitao" onChange={(checked) => onRoomFormChange({ ...roomForm, captain_confirmation_enabled: checked })} /></div></div><Button loading={busy === "save-room"} icon={<Save className="h-4 w-4" />} onClick={onSaveRoom}>Salvar dados da sala</Button></CardContent></Card>
      <Card><CardHeader><h3 className="font-display text-lg font-semibold">Aviso da organizacao</h3><p className="mt-1 text-sm text-arena-muted">Publicado no chat exclusivo da partida.</p></CardHeader><CardContent className="space-y-3"><Input placeholder="Mensagem para os capitaes" value={matchNotice.message} onChange={(event) => onMatchNoticeChange({ ...matchNotice, message: event.target.value })} /><Input placeholder="URL de anexo (opcional)" value={matchNotice.attachment_url} onChange={(event) => onMatchNoticeChange({ ...matchNotice, attachment_url: event.target.value })} /><Button disabled={!matchNotice.message.trim()} loading={busy === "match-notice"} icon={<Send className="h-4 w-4" />} onClick={onSendMatchNotice}>Enviar aviso</Button></CardContent></Card>
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <Card><CardHeader className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-display text-lg font-semibold">Pick & Ban de mapas</h3><p className="mt-1 text-sm text-arena-muted">Toda escolha fica registrada no historico da partida.</p></div><div className="flex gap-2">{operations.veto.status === "aguardando" ? <Button loading={busy === "open-veto"} icon={<Play className="h-4 w-4" />} onClick={onOpenVeto}>Liberar</Button> : null}<Button loading={busy === "reset-veto"} icon={<RotateCcw className="h-4 w-4" />} variant="secondary" onClick={onResetVeto}>Refazer</Button></div></CardHeader><CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3"><Metric label="Status" value={operations.veto.status} /><Metric label="Proxima acao" value={expected ? expected.action.toUpperCase() : "Concluido"} /><Metric label="Responsavel" value={expectedTeam} /></div>
        <div><p className="mb-3 text-xs font-semibold uppercase text-arena-muted">Mapas disponiveis</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{available.map((map) => <button className="border border-arena-line bg-black/20 p-3 text-left transition hover:border-cyan-400/50 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-50" disabled={operations.veto.status !== "liberado" && operations.match.pick_ban_enabled} key={map.id} onClick={() => operations.match.pick_ban_enabled ? onPerformAction(map.id) : onAddManualMap(map.id)} type="button"><MapIcon className="h-4 w-4 text-cyan-200" /><p className="mt-3 font-semibold">{map.nome}</p><p className="mt-1 text-xs text-arena-muted">#{map.id} · {operations.match.pick_ban_enabled ? expected?.action ?? "aguardando" : "adicionar manualmente"}</p></button>)}</div>{!available.length ? <p className="text-sm text-arena-muted">Nenhum mapa restante no pool.</p> : null}</div>
        <div><p className="mb-3 text-xs font-semibold uppercase text-arena-muted">Historico do veto</p><div className="space-y-2">{operations.veto.actions.map((action) => <div className="grid items-center gap-3 border-l-2 border-cyan-400 bg-white/[.03] px-3 py-2 sm:grid-cols-[36px_90px_1fr_1fr]" key={action.id}><span className="text-sm font-bold">{action.sequence_number}</span><Badge tone={action.action === "ban" ? "danger" : "info"}>{action.action}</Badge><span className="font-semibold">{action.map_name}</span><span className="text-sm text-arena-muted">{action.team_name ?? "Sistema"}</span></div>)}{!operations.veto.actions.length ? <p className="text-sm text-arena-muted">O historico comeca quando o primeiro ban ou pick for executado.</p> : null}</div></div>
      </CardContent></Card>
      <Card><CardHeader><h3 className="font-display text-lg font-semibold">Jogadores elegiveis</h3><p className="mt-1 text-sm text-arena-muted">ID interno e ID oficial do jogo ficam visiveis para conferencia.</p></CardHeader><CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-1"><Roster title={operations.match.team_a} players={teamARoster} /><Roster title={operations.match.team_b} players={teamBRoster} /></CardContent></Card>
    </div>
    <Card><CardHeader><h3 className="font-display text-lg font-semibold">Serie de mapas</h3><p className="mt-1 text-sm text-arena-muted">Ao atingir a maioria da serie, o backend finaliza a partida e atualiza o Competition Engine.</p></CardHeader><CardContent className="space-y-3">{operations.maps.map((map) => <div className="grid items-center gap-4 border border-arena-line bg-black/20 p-4 lg:grid-cols-[70px_1fr_130px_130px_auto]" key={map.id}><div><p className="text-xs uppercase text-arena-muted">Mapa {map.map_number}</p><p className="font-bold">#{map.id}</p></div><div><p className="font-semibold">{map.map_name}</p><p className="text-xs text-arena-muted">{map.selection_type === "pick" ? `Pick de ${map.selected_by_team}` : map.selection_type === "decider" ? "Decider" : "Escolha manual"}</p></div><Field label={operations.match.team_a}><Input disabled={map.status === "finalizado"} min="0" type="number" value={mapScores[map.id]?.a ?? ""} onChange={(event) => onScoreChange(map.id, "a", event.target.value)} /></Field><Field label={operations.match.team_b}><Input disabled={map.status === "finalizado"} min="0" type="number" value={mapScores[map.id]?.b ?? ""} onChange={(event) => onScoreChange(map.id, "b", event.target.value)} /></Field>{map.status === "finalizado" ? <div><Badge tone="success">{map.score_team_a} x {map.score_team_b}</Badge><p className="mt-1 text-xs text-arena-muted">{map.winner_team}</p></div> : <Button loading={busy === `result-${map.id}`} icon={<Save className="h-4 w-4" />} onClick={() => onMapResult(map.id)}>Salvar mapa</Button>}</div>)}{!operations.maps.length ? <EmptyState title="Mapas ainda nao definidos" description={operations.match.pick_ban_enabled ? "Conclua os picks para formar a serie." : "Adicione os mapas manualmente."} /> : null}</CardContent></Card>
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold">Sumula por mapa</h3>
          <p className="mt-1 text-sm text-arena-muted">Kills, mortes, assistencias, headshots e MVP ficam separados em cada mapa.</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Select className="min-w-56 flex-1" disabled={!operations.maps.length} value={selectedStatsMapId ?? ""} onChange={(event) => onSelectStatsMap(Number(event.target.value))}>
            {!operations.maps.length ? <option value="">Nenhum mapa definido</option> : null}
            {operations.maps.map((map) => <option key={map.id} value={map.id}>Mapa {map.map_number} - {map.map_name}</option>)}
          </Select>
          <Button disabled={!selectedStatsMap || selectedStatsMap.status !== "finalizado"} loading={busy === "player-stats"} icon={<Save className="h-4 w-4" />} onClick={onSavePlayerStats}>Salvar este mapa</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasLegacyTotals ? (
          <div className="border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
            Esta partida possui um total antigo sem divisao por mapas. Ele sera substituido pelos totais detalhados quando a primeira sumula de mapa for salva.
          </div>
        ) : null}

        {operations.maps.length ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {operations.maps.map((map) => {
                const completedPlayers = statsByMap.get(map.id) ?? 0;
                const selected = map.id === selectedStatsMapId;
                return (
                  <button
                    className={cn(
                      "flex min-h-20 items-center justify-between gap-3 border px-4 py-3 text-left transition",
                      selected ? "border-cyan-400/60 bg-cyan-400/10" : "border-arena-line bg-black/20 hover:bg-white/[.04]"
                    )}
                    key={map.id}
                    onClick={() => onSelectStatsMap(map.id)}
                    type="button"
                  >
                    <span>
                      <span className="block text-xs uppercase text-arena-muted">Mapa {map.map_number}</span>
                      <span className="mt-1 block font-semibold">{map.map_name}</span>
                      <span className="mt-1 block text-xs text-arena-muted">{map.status === "finalizado" ? `${map.score_team_a} x ${map.score_team_b}` : "Aguardando placar"}</span>
                    </span>
                    <Badge tone={completedPlayers ? "success" : map.status === "finalizado" ? "warning" : "neutral"}>
                      {completedPlayers}/{operations.rosters.filter((player) => player.in_lineup).length}
                    </Badge>
                  </button>
                );
              })}
            </div>

            {selectedStatsMap ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-y border-arena-line py-3">
                  <div>
                    <p className="font-semibold">Mapa {selectedStatsMap.map_number}: {selectedStatsMap.map_name}</p>
                    <p className="mt-1 text-xs text-arena-muted">
                      {selectedStatsMap.status === "finalizado"
                        ? `Placar oficial ${operations.match.team_a} ${selectedStatsMap.score_team_a} x ${selectedStatsMap.score_team_b} ${operations.match.team_b}`
                        : "O preenchimento sera liberado depois que o resultado deste mapa for salvo."}
                    </p>
                  </div>
                  <Badge tone={selectedStatsMap.status === "finalizado" ? "success" : "warning"}>{selectedStatsMap.status}</Badge>
                </div>

                <div className="overflow-x-auto">
                  <div className="min-w-[900px]">
                    <div className="grid grid-cols-[80px_1.4fr_1.4fr_repeat(4,90px)_70px] gap-2 border-b border-arena-line pb-2 text-xs font-semibold uppercase text-arena-muted">
                      <span>ID</span><span>Jogador</span><span>ID no jogo</span><span>Kills</span><span>Mortes</span><span>Assist.</span><span>HS</span><span>MVP</span>
                    </div>
                    {operations.rosters.filter((player) => player.in_lineup).map((player) => {
                      const stat = playerStats[player.id] ?? { kills: "0", deaths: "0", assists: "0", headshots: "0", mvp: false };
                      return (
                        <div className="grid grid-cols-[80px_1.4fr_1.4fr_repeat(4,90px)_70px] items-center gap-2 border-b border-arena-line py-3" key={player.id}>
                          <span className="font-mono text-sm">#{player.id}</span>
                          <span><span className="block text-sm font-semibold">{player.nick}</span><span className="text-xs text-arena-muted">{player.team_name}</span></span>
                          <span className="font-mono text-sm text-arena-muted">{player.game_uid || "Nao informado"}</span>
                          {(["kills", "deaths", "assists", "headshots"] as const).map((field) => (
                            <Input disabled={selectedStatsMap.status !== "finalizado"} key={field} min="0" type="number" value={stat[field]} onChange={(event) => onStatChange(player.id, field, event.target.value)} />
                          ))}
                          <label className="flex justify-center">
                            <input checked={stat.mvp} className="h-4 w-4 accent-cyan-400" disabled={selectedStatsMap.status !== "finalizado"} onChange={(event) => onStatChange(player.id, "mvp", event.target.checked)} type="checkbox" />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}
          </>
        ) : (
          <EmptyState title="Nenhum mapa para preencher" description="Conclua o Pick & Ban ou adicione um mapa manualmente antes de registrar estatisticas." />
        )}
      </CardContent>
    </Card>
  </div>;
}

function Roster({ title, players }: { title: string; players: MatchOperations["rosters"] }) {
  return <div><h4 className="mb-2 font-semibold">{title}</h4><div className="divide-y divide-arena-line border-y border-arena-line">{players.map((player) => <div className="grid grid-cols-[32px_1fr_auto] items-center gap-3 py-3" key={player.id}><UserRound className="h-4 w-4 text-arena-muted" /><div><p className="text-sm font-semibold">{player.nick}</p><p className="text-xs text-arena-muted">ID interno #{player.id} · ID do jogo: {player.game_uid || "nao informado"}</p></div><Badge tone={player.in_lineup ? "success" : "warning"}>{player.in_lineup ? (player.titular ? "Titular" : "Reserva") : "Fora da lineup"}</Badge></div>)}</div></div>;
}

function MapHoverPreview({ map }: { map: GameMap }) {
  return <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-0 z-50 hidden w-80 overflow-hidden border border-cyan-400/35 bg-[#070b12] shadow-2xl group-hover/map:block"><div className="aspect-video bg-[#09121d]"><img className="h-full w-full object-cover" src={map.imagem || ""} alt="" /></div><div className="p-3"><p className="font-display text-base font-semibold">{map.nome}</p><p className="mt-1 text-xs text-arena-muted">Pre-visualizacao do mapa</p></div></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="border border-arena-line bg-black/20 p-3"><p className="text-xs uppercase text-arena-muted">{label}</p><p className="mt-2 font-semibold capitalize">{value}</p></div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function CheckControl({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) { return <label className="flex cursor-pointer items-center gap-3 text-sm font-medium"><input checked={checked} className="h-4 w-4 accent-cyan-400" onChange={(event) => onChange(event.target.checked)} type="checkbox" />{label}</label>; }
function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) { return <button aria-label={label} className="flex h-9 w-9 items-center justify-center text-arena-muted transition hover:bg-white/[.07] hover:text-white" onClick={onClick} title={label} type="button">{children}</button>; }

function blankGameForm(): GameForm { return { nome: "", nome_curto: "", slug: "", descricao: "", cor_primaria: "#22d3ee", player_id_label: "ID do jogador", player_id_required: true, default_best_of: "bo3", ativo: true }; }
function blankMapForm() { return { nome: "", slug: "", imagem: "", ordem: "0" }; }
function buildMapPlayerStatDraft(operations: MatchOperations): MapPlayerStatDraft {
  return Object.fromEntries(operations.maps.map((map) => {
    const saved = new Map(
      (operations.map_player_stats ?? [])
        .filter((stat) => Number(stat.match_map_id) === Number(map.id))
        .map((stat) => [Number(stat.player_id), stat])
    );
    const players = Object.fromEntries(operations.rosters.filter((player) => player.in_lineup).map((player) => {
      const stat = saved.get(player.id);
      return [player.id, {
        kills: String(stat?.kills ?? 0),
        deaths: String(stat?.deaths ?? 0),
        assists: String(stat?.assists ?? 0),
        headshots: String(stat?.headshots ?? 0),
        mvp: Boolean(stat?.mvp)
      }];
    }));
    return [map.id, players];
  }));
}
function toApiDate(value: string) { return new Date(value).toISOString().slice(0, 19).replace("T", " "); }
function messageOf(error: unknown) { return error instanceof Error ? error.message : "Tente novamente."; }
