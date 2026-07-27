import {
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Clock3,
  Crosshair,
  ExternalLink,
  FileText,
  History,
  KeyRound,
  LogOut,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Save,
  Send,
  Server,
  Shield,
  Swords,
  Trophy,
  UserPlus,
  Users,
  XCircle
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { DataTable } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Input, Label, Select } from "../components/ui/Form";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { StatCard } from "../components/ui/StatCard";
import { TeamPlayerRankingPanel } from "../components/team/TeamPlayerRankingPanel";
import { useToast } from "../hooks/useToast";
import {
  confirmCaptainMatchResult,
  createCaptainDispute,
  getCaptainMatch,
  getCaptainTournamentCenter,
  getCaptainWorkspace,
  inviteCaptainPlayer,
  leaveCaptainTeam,
  performCaptainVeto,
  removeCaptainMember,
  sendCaptainMatchMessage,
  sendCaptainTeamMessage,
  updateCaptainEventAttendance,
  updateCaptainMatchAttendance,
  updateCaptainPreferences
} from "../services/api";
import type {
  CaptainMatch,
  CaptainMatchRoom,
  CaptainWorkspace,
  LeaderMessage,
  LeaderTournamentCenter
} from "../types/api";

const modules = ["dashboard", "matches", "veto", "lineup", "ranking", "calendar", "communication", "statistics", "history", "settings"] as const;
type CaptainModule = typeof modules[number];
type Runner = (key: string, action: () => Promise<unknown>, success: string, refresh?: boolean) => Promise<boolean>;
type ModuleProps = { data: CaptainWorkspace; busy: string | null; run: Runner };

export function CaptainDashboardPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("module") as CaptainModule | null;
  const activeModule: CaptainModule = requested && modules.includes(requested) ? requested : "dashboard";
  const [workspace, setWorkspace] = useState<CaptainWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setWorkspace(await getCaptainWorkspace()); }
    catch (error) { toast.error("Falha ao abrir o workspace", messageOf(error)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const run: Runner = async (key, action, success, refresh = true) => {
    setBusy(key);
    try {
      await action();
      toast.success(success);
      if (refresh) await load();
      return true;
    } catch (error) {
      toast.error("Operacao nao concluida", messageOf(error));
      return false;
    } finally { setBusy(null); }
  };

  function openModule(module: CaptainModule) {
    const next = new URLSearchParams(searchParams);
    next.set("module", module);
    setSearchParams(next);
  }

  if (loading || !workspace) return <CaptainLoading />;

  const content = {
    dashboard: <DashboardModule data={workspace} openModule={openModule} />,
    matches: <MatchesModule data={workspace} busy={busy} run={run} />,
    veto: <VetoModule data={workspace} busy={busy} run={run} />,
    lineup: <LineupModule data={workspace} busy={busy} run={run} />,
    ranking: <TeamPlayerRankingPanel ranking={workspace.team_ranking} />,
    calendar: <CalendarModule data={workspace} busy={busy} run={run} />,
    communication: <CommunicationModule data={workspace} busy={busy} run={run} />,
    statistics: <StatisticsModule data={workspace} />,
    history: <HistoryModule data={workspace} />,
    settings: <div className="space-y-5"><SettingsModule data={workspace} busy={busy} run={run} /><LeaveTeamCard data={workspace} busy={busy} run={run} /></div>
  }[activeModule];

  return <section className="px-4 pb-12 lg:px-8">
    <PageHeader eyebrow="Capitao da equipe" title={workspace.captain.nick || "Capitao"} description={`${workspace.captain.team_name} · ${workspace.captain.game_name} · Operacao competitiva`} action={<Link to={`/equipe/${workspace.captain.team_slug}`}><Button icon={<ExternalLink className="h-4 w-4" />} variant="secondary">Equipe publica</Button></Link>} />
    <CaptainContext data={workspace} busy={busy} onReload={() => void run("reload", load, "Workspace atualizado", false)} />
    <div className="mt-6">{content}</div>
  </section>;
}

function CaptainContext({ data, busy, onReload }: { data: CaptainWorkspace; busy: string | null; onReload: () => void }) {
  const next = data.matches.find((match) => match.status !== "finalizada");
  const pendingVeto = data.matches.filter((match) => match.status !== "finalizada" && match.veto_status === "liberado").length;
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
    <StatCard label="Proxima partida" value={next ? formatShortDate(next.scheduled_at) : "Sem agenda"} helper={next?.opponent || "Aguardando chaveamento"} icon={<Swords className="h-5 w-5" />} />
    <StatCard label="Pick & Ban" value={String(pendingVeto)} helper="Salas liberadas" icon={<Crosshair className="h-5 w-5" />} />
    <StatCard label="K/D" value={String(data.statistics.player.kd)} helper={`${data.statistics.player.kills} kills · ${data.statistics.player.deaths} deaths`} icon={<BarChart3 className="h-5 w-5" />} />
    <Card><CardContent className="flex h-full items-center justify-between"><div><p className="text-xs font-semibold uppercase text-arena-muted">Sincronizacao</p><p className="mt-2 text-sm font-semibold">Dados oficiais da competicao</p></div><button aria-label="Atualizar workspace" className="flex h-10 w-10 items-center justify-center border border-arena-line text-cyan-200 hover:bg-white/[.05]" disabled={busy === "reload"} onClick={onReload}><RefreshCw className={`h-4 w-4 ${busy === "reload" ? "animate-spin" : ""}`} /></button></CardContent></Card>
  </div>;
}

function DashboardModule({ data, openModule }: { data: CaptainWorkspace; openModule: (module: CaptainModule) => void }) {
  const upcoming = data.matches.filter((match) => match.status !== "finalizada").slice(0, 4);
  const results = data.matches.filter((match) => match.status === "finalizada").slice(0, 4);
  const lineup = data.lineups[0];
  return <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
    <div className="space-y-5"><Card><CardHeader><h2 className="font-display text-xl font-semibold">Central do dia</h2></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><QuickAction label="Presencas" value={data.matches.filter((match) => match.status !== "finalizada" && !match.attendance_status).length} action="Abrir partidas" onClick={() => openModule("matches")} /><QuickAction label="Pick & Ban" value={data.matches.filter((match) => match.status !== "finalizada" && match.veto_status === "liberado").length} action="Entrar na sala" onClick={() => openModule("veto")} /><QuickAction label="Notificacoes" value={data.notifications.filter((item) => !item.lida).length} action="Ver avisos" onClick={() => openModule("communication")} /></CardContent></Card><Card><CardHeader><h2 className="font-display text-xl font-semibold">Proximas partidas</h2></CardHeader><CardContent className="space-y-3">{upcoming.map((match) => <MatchSummary key={match.id} match={match} />)}{!upcoming.length ? <InlineEmpty text="Nenhuma partida agendada para a proxima rodada." /> : null}</CardContent></Card><Card><CardHeader><h2 className="font-display text-xl font-semibold">Ultimos resultados</h2></CardHeader><CardContent className="space-y-3">{results.map((match) => <MatchSummary key={match.id} match={match} />)}{!results.length ? <InlineEmpty text="Os resultados oficiais aparecerao aqui." /> : null}</CardContent></Card></div>
    <div className="space-y-5"><Card><CardHeader><h2 className="font-display text-xl font-semibold">Lineup oficial</h2></CardHeader><CardContent className="space-y-3">{lineup ? <><div className="flex items-center justify-between"><div><p className="font-semibold">{lineup.lineup_name}</p><p className="text-xs text-arena-muted">{lineup.tournament_name}</p></div><StatusBadge value={lineup.entry_status} /></div>{lineup.players.map((player) => <div className="flex items-center justify-between border-b border-arena-line pb-2" key={player.player_id}><div><p className="text-sm font-semibold">{player.nick}</p><p className="text-xs text-arena-muted">#{player.player_id} · {player.game_uid || "ID pendente"}</p></div><Badge tone={player.titular ? "success" : "info"}>{player.titular ? "Titular" : "Reserva"}</Badge></div>)}</> : <InlineEmpty text="Nenhuma lineup oficial enviada." />}</CardContent></Card><Card><CardHeader><h2 className="font-display text-xl font-semibold">Avisos recentes</h2></CardHeader><CardContent className="space-y-3">{data.notifications.slice(0, 6).map((item) => <div className="border-b border-arena-line pb-3" key={item.id}><div className="flex items-center gap-2"><Bell className="h-4 w-4 text-cyan-200" /><p className="text-sm font-semibold">{item.titulo}</p></div><p className="mt-1 text-sm text-arena-muted">{item.mensagem}</p></div>)}{!data.notifications.length ? <InlineEmpty text="Nenhum aviso recebido." /> : null}</CardContent></Card></div>
  </div>;
}

function MatchesModule({ data, busy, run }: ModuleProps) {
  const [selectedId, setSelectedId] = useState<number | null>(data.matches[0]?.id ?? null);
  const { room, loading, reload } = useCaptainRoom(selectedId, false);
  const [contest, setContest] = useState(false);
  const [contestForm, setContestForm] = useState({ title: "Divergencia no resultado", description: "", evidence: "", comments: "" });
  const [center, setCenter] = useState<LeaderTournamentCenter | null>(null);
  const [centerOpen, setCenterOpen] = useState(false);

  async function attendance(status: "confirmado" | "ausente" | "talvez") {
    if (!selectedId) return;
    const ok = await run(`attendance-${selectedId}`, () => updateCaptainMatchAttendance(selectedId, status), "Presenca atualizada");
    if (ok) await reload();
  }
  async function confirmResult(correct: boolean) {
    if (!selectedId) return;
    const payload = correct ? { correct: true } : { correct: false, ...contestForm };
    const ok = await run(`result-${selectedId}`, () => confirmCaptainMatchResult(selectedId, payload), correct ? "Resultado confirmado" : "Resultado contestado");
    if (ok) { setContest(false); await reload(); }
  }
  async function openTournamentCenter(tournamentId: number) {
    const value = await getCaptainTournamentCenter(tournamentId);
    setCenter(value); setCenterOpen(true);
  }

  return <div className="grid gap-5 xl:grid-cols-[350px_1fr]">
    <Card><CardHeader><h2 className="font-display text-xl font-semibold">Minhas partidas</h2><p className="mt-1 text-sm text-arena-muted">Cronograma, presenca e resultados.</p></CardHeader><CardContent className="space-y-2">{data.matches.map((match) => <button className={`w-full border p-3 text-left ${selectedId === match.id ? "border-cyan-400/50 bg-cyan-400/10" : "border-arena-line hover:bg-white/[.04]"}`} key={match.id} onClick={() => setSelectedId(match.id)}><div className="flex items-center justify-between gap-2"><span className="font-semibold">vs {match.opponent}</span><StatusBadge value={match.status} /></div><p className="mt-2 text-xs text-arena-muted">{match.tournament_name} · {formatShortDate(match.scheduled_at || match.finished_at)}</p></button>)}{!data.matches.length ? <InlineEmpty text="Aguardando a primeira partida." /> : null}</CardContent></Card>
    {loading ? <Card><CardContent><Skeleton className="h-96" /></CardContent></Card> : room ? <div className="space-y-5"><Card><CardContent><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><StatusBadge value={room.match.status} /><Badge tone="info">{room.match.best_of.toUpperCase()}</Badge></div><h2 className="mt-3 font-display text-2xl font-bold">{room.match.team_a} vs {room.match.team_b}</h2><p className="mt-2 text-sm text-arena-muted">{room.match.tournament_name} · Rodada {room.match.round} · {formatDate(room.match.scheduled_at)}</p></div><Button icon={<Trophy className="h-4 w-4" />} variant="secondary" onClick={() => void openTournamentCenter(room.match.tournament_id)}>Central do torneio</Button></div></CardContent></Card>
      {room.match.status !== "finalizada" ? <Card><CardHeader><h3 className="font-display text-lg font-semibold">Confirmar presenca</h3></CardHeader><CardContent><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-arena-muted">Informe sua disponibilidade antes do horario da partida.</p>{room.attendance ? <div className="mt-2"><StatusBadge value={room.attendance.status} /></div> : null}</div><div className="flex flex-wrap gap-2"><Button icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => void attendance("confirmado")}>Confirmar presenca</Button><Button variant="secondary" onClick={() => void attendance("talvez")}>Talvez</Button><Button icon={<XCircle className="h-4 w-4" />} variant="danger" onClick={() => void attendance("ausente")}>Nao poderei</Button></div></div></CardContent></Card> : null}
      <MatchRoomDetails room={room} />
      <Card><CardHeader><h3 className="font-display text-lg font-semibold">Lineups da partida</h3></CardHeader><CardContent className="grid gap-5 md:grid-cols-2"><Roster title={room.match.team_a} players={room.rosters.filter((player) => player.team_id === room.match.team_a_id)} /><Roster title={room.match.team_b} players={room.rosters.filter((player) => player.team_id === room.match.team_b_id)} /></CardContent></Card>
      {room.match.status === "finalizada" ? <Card><CardHeader><h3 className="font-display text-lg font-semibold">Confirmacao do resultado</h3><p className="mt-1 text-sm text-arena-muted">Esta confirmacao nao altera o placar oficial.</p></CardHeader><CardContent>{!room.match.captain_confirmation_enabled ? <InlineEmpty text="A organizacao desabilitou a confirmacao pelo capitao." /> : room.result_confirmation ? <div className="flex items-center gap-3"><StatusBadge value={room.result_confirmation.status} /><span className="text-sm text-arena-muted">Resposta registrada em {formatDate(room.result_confirmation.confirmed_at)}</span></div> : <div className="flex flex-wrap gap-3"><Button icon={<Check className="h-4 w-4" />} loading={busy === `result-${room.match.id}`} onClick={() => void confirmResult(true)}>Resultado correto</Button><Button icon={<AlertTriangle className="h-4 w-4" />} variant="danger" onClick={() => setContest(true)}>Contestar resultado</Button></div>}</CardContent></Card> : null}
    </div> : <EmptyState title="Selecione uma partida" description="Abra o confronto para consultar a sala oficial." />}
    <Modal open={contest} title="Contestar resultado" description="Uma disputa sera aberta automaticamente." onClose={() => setContest(false)}><div className="space-y-4"><Field label="Titulo"><Input value={contestForm.title} onChange={(event) => setContestForm((state) => ({ ...state, title: event.target.value }))} /></Field><Field label="Divergencia"><Textarea value={contestForm.description} onChange={(event) => setContestForm((state) => ({ ...state, description: event.target.value }))} /></Field><Field label="Replay, screenshots ou evidencias"><Input value={contestForm.evidence} onChange={(event) => setContestForm((state) => ({ ...state, evidence: event.target.value }))} /></Field><Button className="w-full" variant="danger" onClick={() => void confirmResult(false)}>Contestar e abrir disputa</Button></div></Modal>
    <TournamentCenterModal center={center} open={centerOpen} teamId={data.captain.team_id} onClose={() => setCenterOpen(false)} />
  </div>;
}

function VetoModule({ data, busy, run }: ModuleProps) {
  const preferred = data.matches.find((match) => match.status !== "finalizada" && match.veto_status === "liberado") ?? data.matches[0];
  const [selectedId, setSelectedId] = useState<number | null>(preferred?.id ?? null);
  const { room, loading, reload } = useCaptainRoom(selectedId, true);
  const seconds = useCountdown(room?.veto.action_deadline ?? null);
  const expectedTeamId = room?.veto.expected_step?.team === "A" ? room.match.team_a_id : room?.veto.expected_step?.team === "B" ? room.match.team_b_id : null;
  const canAct = room?.veto.status === "liberado" && room.match.status !== "finalizada" && Number(expectedTeamId) === Number(data.captain.team_id) && seconds > 0;
  const used = new Set(room?.veto.actions.map((action) => Number(action.game_map_id)) ?? []);

  async function chooseMap(mapId: number) {
    if (!room?.veto.expected_step || !selectedId) return;
    const ok = await run(`veto-${mapId}`, () => performCaptainVeto(selectedId, { action: room.veto.expected_step!.action, game_map_id: mapId }), "Acao registrada");
    if (ok) await reload();
  }

  return <div className="space-y-5"><Card><CardContent className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><p className="text-xs font-semibold uppercase text-cyan-200">Sala de Pick & Ban</p><h2 className="mt-2 font-display text-2xl font-bold">Operacao de mapas</h2></div><Select className="md:w-80" value={selectedId ?? ""} onChange={(event) => setSelectedId(Number(event.target.value))}>{data.matches.map((match) => <option key={match.id} value={match.id}>#{match.id} · {match.opponent} · {statusLabel(match.veto_status || "aguardando")}</option>)}</Select></CardContent></Card>
    {loading ? <Card><CardContent><Skeleton className="h-96" /></CardContent></Card> : room ? <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><Card><CardHeader><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h3 className="font-display text-xl font-semibold">{room.match.team_a} vs {room.match.team_b}</h3><p className="mt-1 text-sm text-arena-muted">{room.match.best_of.toUpperCase()} · {room.match.tournament_name}</p></div><StatusBadge value={room.veto.status} /></div></CardHeader><CardContent className="space-y-5"><div className="grid gap-3 sm:grid-cols-3"><Metric label="Proxima acao" value={room.veto.expected_step ? actionLabel(room.veto.expected_step.action) : "Concluido"} /><Metric label="Responsavel" value={expectedTeamId === room.match.team_a_id ? room.match.team_a : expectedTeamId === room.match.team_b_id ? room.match.team_b : "Sistema"} /><div className={`border p-3 ${canAct ? "border-cyan-400/50 bg-cyan-400/10" : "border-arena-line bg-black/20"}`}><p className="text-xs uppercase text-arena-muted">Cronometro</p><p className="mt-2 font-mono text-2xl font-bold">00:{String(seconds).padStart(2, "0")}</p></div></div>{room.match.status === "finalizada" ? <div className="border border-arena-line bg-white/[.03] p-3 text-sm text-arena-muted">Partida finalizada. O historico do veto permanece somente para consulta.</div> : room.veto.status === "aguardando" ? <div className="border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">Aguardando a administracao liberar o Pick & Ban.</div> : !canAct && room.veto.status === "liberado" ? <div className="border border-arena-line p-3 text-sm text-arena-muted">Aguardando a acao do adversario. Esta tela atualiza automaticamente.</div> : null}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{room.map_pool.map((map) => <button className={`border p-4 text-left ${used.has(map.id) ? "cursor-not-allowed border-arena-line opacity-40" : canAct ? "border-cyan-400/40 hover:bg-cyan-400/10" : "border-arena-line"}`} disabled={!canAct || used.has(map.id) || Boolean(busy)} key={map.id} onClick={() => void chooseMap(map.id)}><p className="font-semibold">{map.nome}</p><p className="mt-1 text-xs text-arena-muted">{used.has(map.id) ? "Ja utilizado" : canAct ? actionLabel(room.veto.expected_step!.action) : "Aguardando"}</p></button>)}</div><div><p className="mb-3 text-xs font-semibold uppercase text-arena-muted">Historico em tempo real</p><div className="space-y-2">{room.veto.actions.map((action) => <div className="grid grid-cols-[34px_80px_1fr] items-center gap-3 border-l-2 border-cyan-400 bg-white/[.03] p-3" key={action.id}><span className="font-bold">{action.sequence_number}</span><Badge tone={action.action === "ban" ? "danger" : "info"}>{actionLabel(action.action)}</Badge><div><p className="font-semibold">{action.map_name}</p><p className="text-xs text-arena-muted">{action.team_name || "Sistema"}{action.admin_forced ? " · Automatico" : ""}</p></div></div>)}{!room.veto.actions.length ? <InlineEmpty text="Nenhuma acao executada." /> : null}</div></div></CardContent></Card><div className="space-y-5"><MatchRoomDetails room={room} compact /><Card><CardHeader><h3 className="font-display text-lg font-semibold">Mapas definidos</h3></CardHeader><CardContent className="space-y-2">{room.maps.map((map) => <div className="flex items-center justify-between border border-arena-line p-3" key={map.id}><div><p className="font-semibold">{map.map_name}</p><p className="text-xs text-arena-muted">{map.selection_type === "decider" ? "Decider" : `Pick de ${map.selected_by_team || "sistema"}`}</p></div><StatusBadge value={map.status} /></div>)}{!room.maps.length ? <InlineEmpty text="Os mapas aparecerao apos os picks." /> : null}</CardContent></Card></div></div> : <EmptyState title="Nenhuma partida" description="Nao ha sala de veto disponivel." />}</div>;
}

function LineupModule({ data, busy, run }: ModuleProps) {
  const [email, setEmail] = useState("");
  return <div className="space-y-5"><div className="grid gap-5 xl:grid-cols-2">{data.lineups.map((lineup) => <Card key={lineup.entry_id}><CardHeader><div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-xl font-semibold">{lineup.lineup_name}</h2><p className="mt-1 text-sm text-arena-muted">{lineup.tournament_name}</p></div><StatusBadge value={lineup.entry_status} /></div></CardHeader><CardContent className="space-y-3">{lineup.players.map((player) => <div className="flex items-center justify-between border border-arena-line p-3" key={player.player_id}><div><p className="font-semibold">{player.nick}</p><p className="text-xs text-arena-muted">ID #{player.player_id} · {player.game_uid || "ID do jogo pendente"}</p></div><div className="flex gap-2"><Badge tone={player.titular ? "success" : "info"}>{player.titular ? "Titular" : "Reserva"}</Badge><StatusBadge value={player.confirmado ? "confirmado" : "pendente"} /></div></div>)}</CardContent></Card>)}{!data.lineups.length ? <EmptyState title="Nenhuma lineup oficial" description="O lider ainda nao enviou uma lineup para torneios." /> : null}</div>
    {data.permissions.invite_players ? <Card><CardHeader><h2 className="font-display text-xl font-semibold">Permissao delegada: convites</h2></CardHeader><CardContent className="flex flex-col gap-3 md:flex-row"><Input type="email" placeholder="email@jogador.com" value={email} onChange={(event) => setEmail(event.target.value)} /><Button loading={busy === "captain-invite"} icon={<UserPlus className="h-4 w-4" />} onClick={() => void run("captain-invite", async () => { await inviteCaptainPlayer(email); setEmail(""); }, "Convite enviado")}>Convidar jogador</Button></CardContent></Card> : null}
    <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-xl font-semibold">Elenco da equipe</h2><p className="mt-1 text-sm text-arena-muted">Leitura operacional. Cargos e lineups sao definidos pelo lider.</p></div>{!data.permissions.remove_players ? <Badge tone="neutral">Gestao exclusiva do lider</Badge> : null}</div></CardHeader><DataTable data={data.members} columns={[{ header: "Jogador", cell: (member) => <div><p className="font-semibold">{member.nick || member.nickname || member.nome}</p><p className="text-xs text-arena-muted">#{member.player_id ?? "-"} · {member.game_uid || "ID pendente"}</p></div> }, { header: "Cargo", cell: (member) => roleLabel(member.cargo) }, { header: "Escalacao", cell: (member) => <Badge tone={member.lineup_status === "titular" ? "success" : "info"}>{member.lineup_status}</Badge> }, { header: "Status", cell: (member) => <StatusBadge value={member.status} /> }, { header: "Acao", cell: (member) => data.permissions.remove_players && member.cargo === "player" ? <Button className="h-8 text-xs" variant="danger" onClick={() => confirmAction("Remover este jogador da equipe?", () => run(`remove-${member.id}`, () => removeCaptainMember(member.id), "Jogador removido"))}>Remover</Button> : <span className="text-xs text-arena-muted">Somente leitura</span> }]} /></Card>
  </div>;
}

function CalendarModule({ data, busy, run }: ModuleProps) {
  async function matchAttendance(matchId: number, status: "confirmado" | "ausente") { await run(`match-att-${matchId}`, () => updateCaptainMatchAttendance(matchId, status), "Presenca atualizada"); }
  async function eventAttendance(eventId: number, status: "confirmado" | "ausente" | "talvez") { await run(`event-att-${eventId}`, () => updateCaptainEventAttendance(eventId, status), "Presenca atualizada"); }
  return <div className="grid gap-5 xl:grid-cols-2"><Card><CardHeader><h2 className="font-display text-xl font-semibold">Partidas oficiais</h2></CardHeader><CardContent className="space-y-3">{data.matches.map((match) => <div className="border border-arena-line p-4" key={match.id}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">vs {match.opponent}</p><p className="mt-1 text-sm text-arena-muted">{match.tournament_name} · {formatDate(match.scheduled_at)}</p></div><StatusBadge value={match.status} /></div>{match.status !== "finalizada" ? <div className="mt-3 flex gap-2 border-t border-arena-line pt-3"><Button className="h-8 text-xs" loading={busy === `match-att-${match.id}`} onClick={() => void matchAttendance(match.id, "confirmado")}>Vou jogar</Button><Button className="h-8 text-xs" variant="danger" onClick={() => void matchAttendance(match.id, "ausente")}>Nao poderei</Button></div> : null}</div>)}{!data.matches.length ? <InlineEmpty text="Nenhuma partida no calendario." /> : null}</CardContent></Card><Card><CardHeader><h2 className="font-display text-xl font-semibold">Treinos e eventos</h2></CardHeader><CardContent className="space-y-3">{data.events.map((event) => <div className="border border-arena-line p-4" key={event.id}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{event.title}</p><p className="mt-1 text-sm text-arena-muted">{formatDate(event.starts_at)}{event.location ? ` · ${event.location}` : ""}</p></div><Badge tone="info">{event.type}</Badge></div><div className="mt-3 flex flex-wrap gap-2 border-t border-arena-line pt-3"><Button className="h-8 text-xs" onClick={() => void eventAttendance(event.id, "confirmado")}>Confirmar</Button><Button className="h-8 text-xs" variant="secondary" onClick={() => void eventAttendance(event.id, "talvez")}>Talvez</Button><Button className="h-8 text-xs" variant="danger" onClick={() => void eventAttendance(event.id, "ausente")}>Ausente</Button></div></div>)}{!data.events.length ? <InlineEmpty text="Nenhum treino ou evento cadastrado." /> : null}</CardContent></Card></div>;
}

function CommunicationModule({ data, busy, run }: ModuleProps) {
  const [teamMessage, setTeamMessage] = useState("");
  const [teamAttachment, setTeamAttachment] = useState("");
  const [matchId, setMatchId] = useState<number | null>(data.matches[0]?.id ?? null);
  const { room, reload } = useCaptainRoom(matchId, false);
  const [matchMessage, setMatchMessage] = useState("");
  const [matchAttachment, setMatchAttachment] = useState("");
  const [dispute, setDispute] = useState({ match_id: String(data.matches[0]?.id ?? ""), title: "", description: "", evidence: "" });
  return <div className="space-y-5"><div className="grid gap-5 xl:grid-cols-2"><ChatCard title="Chat da equipe" messages={data.messages.team} message={teamMessage} attachment={teamAttachment} busy={busy === "team-message"} onMessage={setTeamMessage} onAttachment={setTeamAttachment} onSend={() => void run("team-message", async () => { await sendCaptainTeamMessage({ message: teamMessage, attachment_url: teamAttachment || null }); setTeamMessage(""); setTeamAttachment(""); }, "Mensagem enviada")} /><Card><CardHeader><h2 className="font-display text-xl font-semibold">Chat da partida</h2><p className="mt-1 text-sm text-arena-muted">Equipe, adversario e organizacao no mesmo contexto.</p></CardHeader><CardContent className="space-y-4"><Select value={matchId ?? ""} onChange={(event) => setMatchId(Number(event.target.value))}>{data.matches.map((match) => <option key={match.id} value={match.id}>#{match.id} · {match.opponent}</option>)}</Select><MessageList messages={room?.messages ?? []} /><div className="grid gap-2 sm:grid-cols-[1fr_auto]"><Input placeholder="Mensagem da partida" value={matchMessage} onChange={(event) => setMatchMessage(event.target.value)} /><Button disabled={!matchMessage.trim() || !matchId} loading={busy === "match-message"} icon={<Send className="h-4 w-4" />} onClick={() => matchId && void run("match-message", async () => { await sendCaptainMatchMessage(matchId, { message: matchMessage, attachment_url: matchAttachment || null }); setMatchMessage(""); setMatchAttachment(""); await reload(); }, "Mensagem enviada", false)} /><Input className="sm:col-span-2" placeholder="URL de replay, imagem ou arquivo (opcional)" value={matchAttachment} onChange={(event) => setMatchAttachment(event.target.value)} /></div></CardContent></Card></div>
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><Card><CardHeader><h2 className="font-display text-xl font-semibold">Abrir disputa</h2></CardHeader><CardContent className="space-y-4"><Field label="Partida"><Select value={dispute.match_id} onChange={(event) => setDispute((state) => ({ ...state, match_id: event.target.value }))}>{data.matches.map((match) => <option key={match.id} value={match.id}>#{match.id} · {match.opponent}</option>)}</Select></Field><Field label="Motivo"><Input value={dispute.title} onChange={(event) => setDispute((state) => ({ ...state, title: event.target.value }))} /></Field><Field label="Comentarios"><Textarea value={dispute.description} onChange={(event) => setDispute((state) => ({ ...state, description: event.target.value }))} /></Field><Field label="Replay, screenshots ou evidencias"><Input value={dispute.evidence} onChange={(event) => setDispute((state) => ({ ...state, evidence: event.target.value }))} /></Field><Button loading={busy === "dispute"} onClick={() => void run("dispute", () => createCaptainDispute({ ...dispute, match_id: Number(dispute.match_id) }), "Disputa aberta")}>Enviar disputa</Button></CardContent></Card><Card><CardHeader><h2 className="font-display text-xl font-semibold">Acompanhamento de disputas</h2></CardHeader><DataTable data={data.disputes} columns={[{ header: "Partida", cell: (item) => item.match_id ? `#${item.match_id}` : "Geral" }, { header: "Motivo", cell: (item) => item.title }, { header: "Status", cell: (item) => <StatusBadge value={item.status} /> }, { header: "Resposta", cell: (item) => item.resolution_notes || "Aguardando organizacao" }]} /></Card></div>
  </div>;
}

function StatisticsModule({ data }: { data: CaptainWorkspace }) {
  const stats = data.statistics.player;
  return <div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="K/D" value={String(stats.kd)} helper={`${stats.kills} / ${stats.deaths}`} icon={<Crosshair className="h-5 w-5" />} /><StatCard label="HS" value={`${stats.hs_percent}%`} helper={`${stats.headshots} headshots`} icon={<Swords className="h-5 w-5" />} /><StatCard label="Assists" value={String(stats.assists)} icon={<Users className="h-5 w-5" />} /><StatCard label="Ranking" value={stats.ranking ? `#${stats.ranking}` : "Sem ranking"} helper={`${stats.mvps} MVPs`} icon={<Trophy className="h-5 w-5" />} /></div><Card><CardHeader><div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-xl font-semibold">Progressao competitiva</h2><p className="mt-1 text-sm text-arena-muted">Metas oficiais definidas pela administracao para este jogo.</p></div><Badge tone="info">Nivel {data.career.level} · {data.career.xp} XP</Badge></div></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{data.career.achievements.map((item) => <div className={`border p-4 ${item.unlocked ? "border-cyan-400/40 bg-cyan-400/10" : "border-arena-line bg-black/20"}`} key={item.code}><div className="flex items-center justify-between gap-2"><Trophy className="h-5 w-5 text-cyan-200" /><Badge tone={item.unlocked ? "success" : "neutral"}>{item.unlocked ? "Conquistada" : `${item.progress}/${item.target}`}</Badge></div><p className="mt-3 font-semibold">{item.title}</p><p className="mt-1 text-sm text-arena-muted">{item.description}</p></div>)}</CardContent></Card><Card><CardHeader><h2 className="font-display text-xl font-semibold">Desempenho por partida</h2><p className="mt-1 text-sm text-arena-muted">Informacoes oficiais e somente leitura.</p></CardHeader><DataTable data={data.statistics.history} columns={[{ header: "Torneio", cell: (item) => item.tournament_name }, { header: "Adversario", cell: (item) => item.opponent }, { header: "K / D / A", cell: (item) => `${item.kills} / ${item.deaths} / ${item.assists}` }, { header: "HS", cell: (item) => item.headshots }, { header: "K/D", cell: (item) => item.kd }, { header: "MVP", cell: (item) => item.mvp ? <Badge tone="success">Sim</Badge> : "-" }]} /></Card><Card><CardHeader><h2 className="font-display text-xl font-semibold">Penalidades</h2></CardHeader><DataTable data={data.penalties} columns={[{ header: "Tipo", cell: (item) => penaltyLabel(item.type) }, { header: "Escopo", cell: (item) => item.scope }, { header: "Motivo", cell: (item) => item.reason }, { header: "Status", cell: (item) => <StatusBadge value={item.status} /> }, { header: "Data", cell: (item) => formatDate(item.created_at) }]} /></Card></div>;
}

function HistoryModule({ data }: { data: CaptainWorkspace }) {
  const results = data.matches.filter((match) => match.status === "finalizada");
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3"><StatCard label="Partidas" value={String(data.statistics.team.matches)} icon={<Swords className="h-5 w-5" />} /><StatCard label="Vitorias" value={String(data.statistics.team.wins)} icon={<Trophy className="h-5 w-5" />} /><StatCard label="Derrotas" value={String(data.statistics.team.losses)} icon={<History className="h-5 w-5" />} /></div><Card><CardHeader><h2 className="font-display text-xl font-semibold">Historico competitivo</h2></CardHeader><DataTable data={results} columns={[{ header: "Torneio", cell: (match) => match.tournament_name }, { header: "Adversario", cell: (match) => match.opponent }, { header: "Mapas", cell: (match) => match.maps || "A definir" }, { header: "Placar", cell: (match) => `${match.score_team_a} x ${match.score_team_b}` }, { header: "Resultado", cell: (match) => <Badge tone={Number(match.winner_team_id) === data.captain.team_id ? "success" : "danger"}>{Number(match.winner_team_id) === data.captain.team_id ? "Vitoria" : "Derrota"}</Badge> }, { header: "Data", cell: (match) => formatDate(match.finished_at) }]} /></Card><Card><CardHeader><h2 className="font-display text-xl font-semibold">Temporadas</h2></CardHeader><DataTable data={data.statistics.seasons} columns={[{ header: "Temporada", cell: (item) => item.season }, { header: "Partidas", cell: (item) => item.matches }, { header: "Vitorias", cell: (item) => item.wins }, { header: "Derrotas", cell: (item) => item.losses }]} /></Card></div>;
}

function SettingsModule({ data, busy, run }: ModuleProps) {
  const [form, setForm] = useState({ ...data.preferences });
  return <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><Card><CardHeader><h2 className="font-display text-xl font-semibold">Preferencias</h2></CardHeader><CardContent className="space-y-4"><Field label="Idioma"><Select value={form.language} onChange={(event) => setForm((state) => ({ ...state, language: event.target.value }))}><option value="pt-BR">Portugues</option><option value="en-US">English</option><option value="es-ES">Espanol</option></Select></Field><Field label="Tema"><Select value={form.theme} onChange={(event) => setForm((state) => ({ ...state, theme: event.target.value as typeof form.theme }))}><option value="dark">Escuro</option><option value="light">Claro</option><option value="system">Sistema</option></Select></Field><Field label="Perfil Steam"><Input placeholder="https://steamcommunity.com/id/..." value={form.steam_profile || ""} onChange={(event) => setForm((state) => ({ ...state, steam_profile: event.target.value }))} /></Field>{[["email_notifications", "Notificacoes por email"], ["discord_notifications", "Notificacoes pelo Discord"], ["profile_public", "Perfil publico"]].map(([key, label]) => <label className="flex items-center gap-3 text-sm font-semibold" key={key}><input checked={Boolean(form[key as keyof typeof form])} className="h-4 w-4 accent-cyan-400" type="checkbox" onChange={(event) => setForm((state) => ({ ...state, [key]: event.target.checked }))} />{label}</label>)}<Button loading={busy === "preferences"} icon={<Save className="h-4 w-4" />} onClick={() => void run("preferences", () => updateCaptainPreferences({ language: form.language, theme: form.theme, steam_profile: form.steam_profile, email_notifications: form.email_notifications, discord_notifications: form.discord_notifications, profile_public: form.profile_public }), "Preferencias salvas")}>Salvar preferencias</Button></CardContent></Card><Card><CardHeader><h2 className="font-display text-xl font-semibold">Permissoes da conta</h2></CardHeader><CardContent className="space-y-3">{[["Operar Pick & Ban", true], ["Confirmar presenca", true], ["Confirmar resultado", true], ["Abrir disputas", true], ["Convidar jogadores", data.permissions.invite_players], ["Remover jogadores", data.permissions.remove_players], ["Editar identidade da equipe", false], ["Inscrever em torneios", false], ["Efetuar pagamentos", false], ["Alterar resultados", false]].map(([label, allowed]) => <div className="flex items-center justify-between border-b border-arena-line pb-3" key={String(label)}><span className="text-sm font-semibold">{label}</span>{allowed ? <Badge tone="success">Permitido</Badge> : <Badge tone="neutral">Sem permissao</Badge>}</div>)}</CardContent></Card></div>;
}

function LeaveTeamCard({ data, busy, run }: ModuleProps) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const pendingMatches = data.matches.filter((match) => match.status !== "finalizada").length;
  const activeTournaments = data.tournaments.filter((tournament) => ["fechado", "em_andamento"].includes(tournament.status)).length;
  const confirmed = confirmation.trim().toLocaleLowerCase("pt-BR") === data.captain.team_name.toLocaleLowerCase("pt-BR");

  async function leaveTeam() {
    const ok = await run("leave-team", () => leaveCaptainTeam(confirmation), "Voce saiu da equipe", false);
    if (ok) window.location.assign("/jogador?status=team-left");
  }

  return <>
    <Card className="border-red-500/35">
      <CardHeader><h2 className="font-display text-xl font-semibold">Vinculo com a equipe</h2><p className="mt-1 text-sm text-arena-muted">A saida encerra suas permissoes de capitao, mas preserva todo o historico competitivo.</p></CardHeader>
      <CardContent className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="font-semibold">Sair de {data.captain.team_name}</p><p className="mt-1 text-sm text-arena-muted">Sua conta voltara ao perfil de jogador e podera procurar outra equipe.</p></div><Button icon={<LogOut className="h-4 w-4" />} variant="danger" onClick={() => setOpen(true)}>Sair da equipe</Button></CardContent>
    </Card>
    <Modal open={open} title="Sair da equipe" description="Esta acao remove imediatamente seu vinculo de capitao." onClose={() => { setOpen(false); setConfirmation(""); }}>
      <div className="space-y-4">
        {(pendingMatches || activeTournaments) ? <div className="border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-100"><p className="font-semibold">Atencao ao calendario competitivo</p><p className="mt-1">Existem {pendingMatches} partidas pendentes e {activeTournaments} torneios ativos vinculados a equipe. A organizacao e o lider continuarao com o historico da lineup.</p></div> : null}
        <div className="space-y-2 text-sm text-arena-muted"><p>Ao confirmar:</p><p>• voce perde acesso ao workspace do capitao;</p><p>• seu cadastro antigo fica inativo na equipe;</p><p>• partidas, resultados e estatisticas permanecem registrados;</p><p>• sua conta volta para o perfil Jogador.</p></div>
        <Field label={`Digite ${data.captain.team_name} para confirmar`}><Input autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></Field>
        <Button className="w-full" disabled={!confirmed} loading={busy === "leave-team"} icon={<LogOut className="h-4 w-4" />} variant="danger" onClick={() => void leaveTeam()}>Confirmar saida da equipe</Button>
      </div>
    </Modal>
  </>;
}

function MatchRoomDetails({ room, compact = false }: { room: CaptainMatchRoom; compact?: boolean }) {
  return <Card><CardHeader><h3 className="font-display text-lg font-semibold">Sala da partida</h3></CardHeader><CardContent className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"}`}><Metric label="Horario" value={formatDate(room.match.scheduled_at)} /><Metric label="Servidor" value={room.match.server_address || "Aguardando organizacao"} /><Metric label="Senha" value={room.match.server_password || "Nao informada"} /><Metric label="Responsavel" value={room.match.responsible_admin_name || "Organizacao Arena Camp"} />{room.match.server_address ? <div className="sm:col-span-2 lg:col-span-4"><Button icon={<ClipboardCopy className="h-4 w-4" />} variant="secondary" onClick={() => void navigator.clipboard.writeText(`${room.match.server_address}${room.match.server_password ? ` | Senha: ${room.match.server_password}` : ""}`)}>Copiar dados da sala</Button></div> : null}</CardContent></Card>;
}

function TournamentCenterModal({ center, open, teamId, onClose }: { center: LeaderTournamentCenter | null; open: boolean; teamId: number; onClose: () => void }) {
  const [tab, setTab] = useState<"bracket" | "table" | "rules">("bracket");
  return <Modal open={open} size="wide" title={center?.tournament.nome || "Central do torneio"} description="Chaveamento, tabela, cronograma e regulamento." onClose={onClose}>{center ? <div className="space-y-5"><div className="grid grid-cols-3 gap-2">{[["bracket", "Chaveamento"], ["table", "Tabela"], ["rules", "Regras"]].map(([value, label]) => <button className={`border px-3 py-2 text-sm font-semibold ${tab === value ? "border-cyan-400/50 bg-cyan-400/10" : "border-arena-line text-arena-muted"}`} key={value} onClick={() => setTab(value as typeof tab)}>{label}</button>)}</div>{tab === "bracket" ? <div className="grid gap-3 md:grid-cols-2">{center.matches.map((match) => <div className="border border-arena-line p-4" key={match.id}><div className="flex justify-between"><span>{match.team_a}</span><strong>{match.status === "finalizada" ? match.score_team_a : "-"}</strong></div><div className="mt-2 flex justify-between"><span>{match.team_b}</span><strong>{match.status === "finalizada" ? match.score_team_b : "-"}</strong></div><p className="mt-3 border-t border-arena-line pt-2 text-xs text-arena-muted">Rodada {match.round} · {formatDate(match.scheduled_at)}</p></div>)}{!center.matches.length ? <InlineEmpty text="Chaveamento ainda nao publicado." /> : null}</div> : null}{tab === "table" ? <DataTable data={center.standings} columns={[{ header: "Posicao", cell: (row) => `#${center.standings.indexOf(row) + 1}` }, { header: "Equipe", cell: (row) => <span className={row.team_id === teamId ? "font-bold text-cyan-200" : "font-semibold"}>{row.team_name}</span> }, { header: "J", cell: (row) => row.played }, { header: "V", cell: (row) => row.wins }, { header: "D", cell: (row) => row.losses }, { header: "Pontos", cell: (row) => row.points }]} /> : null}{tab === "rules" ? <div className="grid gap-3 md:grid-cols-2"><Metric label="Formato" value={formatTournamentFormat(center.tournament.format)} /><Metric label="Serie" value={(center.tournament.best_of || "bo3").toUpperCase()} /><Metric label="Prorrogacao" value={center.tournament.overtime_enabled ? "Habilitada" : "Desabilitada"} /><Metric label="W.O." value={`${center.tournament.walkover_minutes || 0} minutos`} /><div className="border border-arena-line p-4 md:col-span-2"><p className="whitespace-pre-wrap text-sm text-arena-muted">{center.tournament.descricao || "Sem regras adicionais publicadas."}</p></div></div> : null}</div> : <Skeleton className="h-80" />}</Modal>;
}

function ChatCard({ title, messages, message, attachment, busy, onMessage, onAttachment, onSend }: { title: string; messages: LeaderMessage[]; message: string; attachment: string; busy: boolean; onMessage: (value: string) => void; onAttachment: (value: string) => void; onSend: () => void }) { return <Card><CardHeader><h2 className="font-display text-xl font-semibold">{title}</h2></CardHeader><CardContent className="space-y-4"><MessageList messages={messages} /><div className="grid gap-2 sm:grid-cols-[1fr_auto]"><Input placeholder="Digite sua mensagem" value={message} onChange={(event) => onMessage(event.target.value)} /><Button disabled={!message.trim()} loading={busy} icon={<Send className="h-4 w-4" />} onClick={onSend} /><div className="relative sm:col-span-2"><Paperclip className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-arena-muted" /><Input className="pl-9" placeholder="URL de arquivo ou imagem (opcional)" value={attachment} onChange={(event) => onAttachment(event.target.value)} /></div></div></CardContent></Card>; }
function MessageList({ messages }: { messages: LeaderMessage[] }) { return <div className="h-72 space-y-3 overflow-y-auto border border-arena-line bg-black/20 p-3">{messages.map((message) => <div key={message.id}><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{message.nickname || message.nome}</span><Badge tone={message.role === "admin" ? "warning" : "neutral"}>{message.role === "admin" ? "Organizacao" : roleLabel(message.role || "player")}</Badge><span className="text-xs text-arena-muted">{formatShortDate(message.created_at)}</span></div><p className="mt-1 text-sm">{message.message}</p>{message.attachment_url ? <a className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-cyan-200 hover:underline" href={message.attachment_url} rel="noreferrer" target="_blank"><Paperclip className="h-3 w-3" />Abrir anexo</a> : null}</div>)}{!messages.length ? <InlineEmpty text="Nenhuma mensagem nesta conversa." /> : null}</div>; }
function Roster({ title, players }: { title: string; players: CaptainMatchRoom["rosters"] }) { return <div><h4 className="mb-3 font-semibold">{title}</h4><div className="space-y-2">{players.map((player) => <div className="flex items-center justify-between border border-arena-line p-3" key={player.id}><div><p className="text-sm font-semibold">{player.nick}</p><p className="text-xs text-arena-muted">#{player.id} · {player.game_uid || "ID pendente"}</p></div><Badge tone={player.in_lineup ? "success" : "warning"}>{player.in_lineup ? (player.titular ? "Titular" : "Reserva") : "Fora"}</Badge></div>)}</div></div>; }
function MatchSummary({ match }: { match: CaptainMatch }) { return <div className="flex items-center justify-between gap-3 border border-arena-line p-3"><div><p className="font-semibold">vs {match.opponent}</p><p className="mt-1 text-xs text-arena-muted">{match.tournament_name} · {match.maps || "Mapa a definir"} · {formatShortDate(match.scheduled_at || match.finished_at)}</p></div>{match.status === "finalizada" ? <span className="font-display text-lg font-bold">{match.score_team_a} x {match.score_team_b}</span> : <StatusBadge value={match.status} />}</div>; }
function QuickAction({ label, value, action, onClick }: { label: string; value: number; action: string; onClick: () => void }) { return <button className="border border-arena-line p-4 text-left hover:bg-white/[.04]" onClick={onClick}><p className="text-xs font-semibold uppercase text-arena-muted">{label}</p><p className="mt-2 font-display text-2xl font-bold">{value}</p><p className="mt-2 text-xs text-cyan-200">{action}</p></button>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="border border-arena-line bg-black/20 p-3"><p className="text-xs uppercase text-arena-muted">{label}</p><p className="mt-2 break-words text-sm font-semibold">{value}</p></div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className="min-h-28 w-full resize-y rounded-arena border border-arena-line bg-black/25 p-3 text-sm text-arena-text focus:border-arena-cyan" />; }
function InlineEmpty({ text }: { text: string }) { return <div className="border border-dashed border-arena-line p-5 text-center text-sm text-arena-muted">{text}</div>; }
function StatusBadge({ value }: { value: string }) { const normalized = String(value); const tone = ["ativo", "aberto", "aprovado", "aprovada", "pago", "confirmado", "correto", "finalizada", "finalizado", "liberado", "aceita"].includes(normalized) ? "success" : ["cancelado", "cancelada", "rejeitado", "rejeitada", "ausente", "inativo", "contestado", "derrota"].includes(normalized) ? "danger" : ["pendente", "aguardando", "agendada", "aberta", "talvez"].includes(normalized) ? "warning" : "info"; return <Badge tone={tone}>{statusLabel(normalized)}</Badge>; }
function CaptainLoading() { return <section className="space-y-5 px-4 pb-12 lg:px-8"><Skeleton className="h-24" /><div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton className="h-32" key={item} />)}</div><Skeleton className="h-96" /></section>; }

function useCaptainRoom(matchId: number | null, poll: boolean) {
  const [room, setRoom] = useState<CaptainMatchRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const reload = useCallback(async (silent = false) => {
    if (!matchId) { setRoom(null); return; }
    if (!silent) setLoading(true);
    try { setRoom(await getCaptainMatch(matchId)); }
    finally { if (!silent) setLoading(false); }
  }, [matchId]);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { if (!poll || !matchId || room?.veto.status !== "liberado") return; const timer = window.setInterval(() => void reload(true), 3000); return () => window.clearInterval(timer); }, [poll, matchId, room?.veto.status, reload]);
  return { room, loading, reload: () => reload(false) };
}

function useCountdown(deadline: string | null) {
  const calculate = useCallback(() => deadline ? Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)) : 0, [deadline]);
  const [seconds, setSeconds] = useState(calculate);
  useEffect(() => { setSeconds(calculate()); const timer = window.setInterval(() => setSeconds(calculate()), 250); return () => window.clearInterval(timer); }, [calculate]);
  return seconds;
}

function formatDate(value: string | null | undefined) { return value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "A definir"; }
function formatShortDate(value: string | null | undefined) { return value ? new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "A definir"; }
function statusLabel(value: string) { return ({ agendada: "Agendada", andamento: "Em andamento", finalizada: "Finalizada", aguardando: "Aguardando", liberado: "Liberado", finalizado: "Finalizado", confirmado: "Confirmado", ausente: "Ausente", talvez: "Talvez", correto: "Correto", contestado: "Contestado", pendente: "Pendente", ativa: "Ativa", aberto: "Aberto", aberta: "Aberta", em_analise: "Em analise", aceita: "Aceita", rejeitada: "Rejeitada" } as Record<string, string>)[value] ?? value.replaceAll("_", " "); }
function actionLabel(value: string) { return ({ ban: "Ban", pick: "Pick", decider: "Decider", manual: "Manual" } as Record<string, string>)[value] ?? value; }
function roleLabel(value: string) { return ({ leader: "Lider", captain: "Capitao", manager: "Manager", player: "Jogador", lider: "Lider", capitao: "Capitao", jogador: "Jogador", admin: "Admin" } as Record<string, string>)[value] ?? value; }
function penaltyLabel(value: string) { return ({ warning: "Advertencia", suspension: "Suspensao", temporary_ban: "Ban temporario", permanent_ban: "Ban permanente", tournament_ban: "Ban do torneio", season_ban: "Ban da temporada", global_ban: "Ban global" } as Record<string, string>)[value] ?? value; }
function formatTournamentFormat(value: string | null) { return ({ single_elimination: "Eliminacao simples", double_elimination: "Eliminacao dupla", swiss: "Sistema suico", round_robin: "Todos contra todos", group_playoffs: "Grupos + eliminatorias", league: "Liga", custom: "Personalizado" } as Record<string, string>)[value || ""] || "Formato a definir"; }
function messageOf(error: unknown) { return error instanceof Error ? error.message : "Tente novamente."; }
function confirmAction(message: string, action: () => void | Promise<unknown>) { if (window.confirm(message)) void action(); }
