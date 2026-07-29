import {
  BarChart3,
  Archive,
  Bell,
  CalendarDays,
  Check,
  ClipboardCopy,
  CreditCard,
  Crown,
  ExternalLink,
  FileText,
  Plus,
  Paperclip,
  ReceiptText,
  RefreshCw,
  Save,
  Send,
  Shield,
  Snowflake,
  Swords,
  Trash2,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
import { TournamentRegulationPanel } from "../components/tournament/TournamentRegulationPanel";
import { ImageUploadField } from "../components/ui/ImageUploadField";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/useToast";
import { setArenaTheme } from "../utils/theme";
import {
  archiveLeaderTeam,
  createLeaderCompetitionRequest,
  createLeaderDispute,
  createLeaderDocument,
  createLeaderEvent,
  createLeaderPayment,
  createLeaderTicket,
  createTeam,
  decideLeaderRequest,
  deleteLeaderEvent,
  duplicateLeaderLineup,
  freezeLeaderLineup,
  getLeaderMatch,
  getLeaderTournamentCenter,
  getLeaderWorkspace,
  inviteLeaderPlayer,
  performLeaderVeto,
  registerLeaderTournament,
  replyLeaderTicket,
  removeLeaderMember,
  saveLeaderLineup,
  sendLeaderTeamMessage,
  sendLeaderTournamentMessage,
  syncLeaderPayments,
  transferLeaderLeadership,
  updateLeaderMember,
  updateLeaderEventAttendance,
  updateLeaderPreferences,
  updateLeaderTeam,
} from "../services/api";
import type {
  LeaderLineup,
  LeaderMatch,
  LeaderMember,
  LeaderTournament,
  LeaderTournamentCenter,
  LeaderWorkspace,
  MatchOperations,
} from "../types/api";

const modules = [
  "dashboard",
  "team",
  "roster",
  "lineups",
  "ranking",
  "tournaments",
  "matches",
  "calendar",
  "finance",
  "communication",
  "history",
  "settings",
] as const;
type LeaderModule = (typeof modules)[number];
type Runner = (
  key: string,
  action: () => Promise<unknown>,
  success: string,
  refresh?: boolean,
) => Promise<boolean>;

export function LeaderDashboardPage() {
  const { refreshSession } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("module") as LeaderModule | null;
  const activeModule: LeaderModule =
    requested && modules.includes(requested) ? requested : "dashboard";
  const [workspace, setWorkspace] = useState<LeaderWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setWorkspace(await getLeaderWorkspace());
    } catch (error) {
      toast.error("Falha ao carregar o workspace", messageOf(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingPaymentKey =
    workspace?.payments
      .filter((payment) => payment.status === "pendente")
      .map((payment) => payment.id)
      .join(",") ?? "";

  useEffect(() => {
    if (activeModule !== "finance" || !pendingPaymentKey) return;

    let synchronizing = false;
    const synchronize = async () => {
      if (synchronizing) return;
      synchronizing = true;
      try {
        const result = await syncLeaderPayments();
        if (result.updated > 0) {
          toast.success(
            "Pagamento atualizado",
            "A confirmação do Mercado Pago foi recebida automaticamente.",
          );
          await Promise.all([load(), refreshSession()]);
        }
      } catch {
        // O webhook continua sendo a fonte principal; uma falha temporaria sera tentada novamente.
      } finally {
        synchronizing = false;
      }
    };

    void synchronize();
    const timer = window.setInterval(() => void synchronize(), 6000);
    return () => window.clearInterval(timer);
  }, [activeModule, pendingPaymentKey, load, refreshSession]);

  const run: Runner = async (key, action, success, refresh = true) => {
    setBusy(key);
    try {
      await action();
      toast.success(success);
      if (refresh) await load();
      return true;
    } catch (error) {
      toast.error("Operação não concluida", messageOf(error));
      return false;
    } finally {
      setBusy(null);
    }
  };

  function openModule(module: LeaderModule) {
    const next = new URLSearchParams(searchParams);
    next.set("module", module);
    setSearchParams(next);
  }

  if (loading || !workspace) return <LeaderLoading />;
  if (!workspace.team)
    return (
      <TeamOnboarding
        games={workspace.games}
        busy={busy}
        run={run}
        onCreated={async () => {
          await refreshSession();
          await load();
        }}
      />
    );

  const content = {
    dashboard: <DashboardModule data={workspace} openModule={openModule} />,
    team: <TeamModule data={workspace} busy={busy} run={run} />,
    roster: <RosterModule data={workspace} busy={busy} run={run} />,
    lineups: <LineupsModule data={workspace} busy={busy} run={run} />,
    ranking: <TeamPlayerRankingPanel ranking={workspace.team_ranking} />,
    tournaments: (
      <TournamentsModule
        data={workspace}
        busy={busy}
        run={run}
        openModule={openModule}
      />
    ),
    matches: <MatchesModule data={workspace} busy={busy} run={run} />,
    calendar: <CalendarModule data={workspace} busy={busy} run={run} />,
    finance: <FinanceModule data={workspace} busy={busy} run={run} />,
    communication: (
      <CommunicationModule data={workspace} busy={busy} run={run} />
    ),
    history: <HistoryModule data={workspace} />,
    settings: <SettingsModule data={workspace} busy={busy} run={run} />,
  }[activeModule];

  return (
    <section className="px-4 pb-12 lg:px-8">
      <PageHeader
        eyebrow="Líder da equipe"
        title={workspace.team.nome}
        description={`${workspace.team.game_name} · ${workspace.team.tag || "Sem tag"} · Gestao competitiva da equipe`}
        action={
          <Link to={`/equipe/${workspace.team.slug}`}>
            <Button
              icon={<ExternalLink className="h-4 w-4" />}
              variant="secondary"
            >
              Pagina pública
            </Button>
          </Link>
        }
      />
      <TeamContext
        data={workspace}
        busy={busy}
        onReload={() => void run("reload", load, "Workspace atualizado", false)}
      />
      <div className="mt-6">{content}</div>
    </section>
  );
}

function TeamOnboarding({
  games,
  busy,
  run,
  onCreated,
}: {
  games: LeaderWorkspace["games"];
  busy: string | null;
  run: Runner;
  onCreated: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    nome: "",
    tag: "",
    slug: "",
    game_id: String(games[0]?.id ?? ""),
    descricao: "",
    logo: "",
    banner: "",
  });
  useEffect(() => {
    if (!form.game_id && games[0])
      setForm((state) => ({ ...state, game_id: String(games[0].id) }));
  }, [games, form.game_id]);
  async function submit() {
    const slug = form.slug || slugify(form.nome);
    if (!form.nome.trim() || !form.tag.trim() || !slug || !form.game_id) return;
    const ok = await run(
      "create-team",
      () =>
        createTeam({
          ...form,
          nome: form.nome.trim(),
          tag: form.tag.trim(),
          slug,
          game_id: Number(form.game_id),
        }),
      "Equipe criada",
      false,
    );
    if (ok) await onCreated();
  }
  return (
    <section className="px-4 pb-12 lg:px-8">
      <PageHeader
        eyebrow="Primeiro passo"
        title="Criar sua equipe"
        description="Defina a identidade principal para liberar elenco, lineups, inscrições e partidas."
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_.7fr]">
        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold">
              Identidade competitiva
            </h2>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Nome">
              <Input
                value={form.nome}
                onChange={(event) =>
                  setForm((state) => ({
                    ...state,
                    nome: event.target.value,
                    slug: state.slug || slugify(event.target.value),
                  }))
                }
              />
            </Field>
            <Field label="Tag">
              <Input
                maxLength={10}
                value={form.tag}
                onChange={(event) =>
                  setForm((state) => ({
                    ...state,
                    tag: event.target.value.toUpperCase(),
                  }))
                }
              />
            </Field>
            <Field label="URL da equipe">
              <Input
                placeholder="ex.: minha-equipe"
                value={form.slug}
                onChange={(event) =>
                  setForm((state) => ({
                    ...state,
                    slug: slugify(event.target.value),
                  }))
                }
              />
            </Field>
            <Field label="Jogo">
              <Select
                value={form.game_id}
                onChange={(event) =>
                  setForm((state) => ({
                    ...state,
                    game_id: event.target.value,
                  }))
                }
              >
                {games.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Logo da equipe">
              <ImageUploadField
                value={form.logo}
                onChange={(logo) => setForm((state) => ({ ...state, logo }))}
                label="Selecionar logo"
              />
            </Field>
            <Field label="Banner da equipe">
              <ImageUploadField
                value={form.banner}
                onChange={(banner) =>
                  setForm((state) => ({ ...state, banner }))
                }
                label="Selecionar banner"
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Descrição">
                <Textarea
                  value={form.descricao}
                  onChange={(event) =>
                    setForm((state) => ({
                      ...state,
                      descricao: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Button
                disabled={
                  !form.nome.trim() ||
                  !form.tag.trim() ||
                  !form.slug ||
                  !form.game_id
                }
                loading={busy === "create-team"}
                icon={<Shield className="h-4 w-4" />}
                onClick={() => void submit()}
              >
                Criar equipe
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold">
              Fluxo liberado
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "Personalizar a equipe",
              "Convidar jogadores",
              "Criar lineup",
              "Inscrever em torneios",
              "Operar Pick & Ban",
            ].map((item, index) => (
              <div
                className="flex items-center gap-3 border-b border-arena-line pb-3"
                key={item}
              >
                <span className="flex h-7 w-7 items-center justify-center border border-cyan-400/30 bg-cyan-400/10 text-xs font-bold text-cyan-200">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function TeamContext({
  data,
  busy,
  onReload,
}: {
  data: LeaderWorkspace;
  busy: string | null;
  onReload: () => void;
}) {
  const nextMatch = data.matches.find((match) => match.status !== "finalizada");
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Elenco"
        value={`${data.members.filter((item) => item.status === "ativo").length}`}
        helper="Membros ativos"
        icon={<Users className="h-5 w-5" />}
      />
      <StatCard
        label="Próxima partida"
        value={
          nextMatch ? formatShortDate(nextMatch.scheduled_at) : "Sem agenda"
        }
        helper={nextMatch?.opponent ?? "Aguardando chaveamento"}
        icon={<Swords className="h-5 w-5" />}
      />
      <StatCard
        label="Win rate"
        value={`${data.statistics.win_rate}%`}
        helper={`${data.statistics.wins}V · ${data.statistics.losses}D`}
        icon={<BarChart3 className="h-5 w-5" />}
      />
      <Card>
        <CardContent className="flex h-full items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-arena-muted">
              Sincronizacao
            </p>
            <p className="mt-2 text-sm font-semibold">
              Dados oficiais da plataforma
            </p>
          </div>
          <button
            aria-label="Atualizar workspace"
            className="flex h-10 w-10 items-center justify-center border border-arena-line text-cyan-200 hover:bg-white/[.05]"
            disabled={busy === "reload"}
            onClick={onReload}
          >
            <RefreshCw
              className={`h-4 w-4 ${busy === "reload" ? "animate-spin" : ""}`}
            />
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardModule({
  data,
  openModule,
}: {
  data: LeaderWorkspace;
  openModule: (module: LeaderModule) => void;
}) {
  const nextMatches = data.matches
    .filter((match) => match.status !== "finalizada")
    .slice(0, 4);
  const recentResults = data.matches
    .filter((match) => match.status === "finalizada")
    .slice(0, 4);
  const pendingRequests = data.requests.filter(
    (request) => request.status === "pending",
  );
  const progress = [
    {
      label: "Equipe configurada",
      done: Boolean(data.team?.tag && data.team.descricao),
      module: "team" as const,
    },
    {
      label: "Elenco completo",
      done: data.members.filter((item) => item.status === "ativo").length >= 3,
      module: "roster" as const,
    },
    {
      label: "Lineup ativa",
      done: data.lineups.some((lineup) =>
        ["ativa", "congelada"].includes(lineup.status),
      ),
      module: "lineups" as const,
    },
    {
      label: "Inscrição confirmada",
      done: data.entries.some((entry) => entry.status === "confirmado"),
      module: "tournaments" as const,
    },
    {
      label: "Partida recebida",
      done: data.matches.length > 0,
      module: "matches" as const,
    },
  ];
  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold">
              Central do dia
            </h2>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <QuickMetric
              label="Solicitacoes"
              value={pendingRequests.length}
              action="Abrir elenco"
              onClick={() => openModule("roster")}
            />
            <QuickMetric
              label="Pick & Ban"
              value={
                data.matches.filter((match) => match.veto_status === "liberado")
                  .length
              }
              action="Abrir partidas"
              onClick={() => openModule("matches")}
            />
            <QuickMetric
              label="Pagamentos"
              value={
                data.entries.filter(
                  (entry) => entry.payment_status === "aguardando",
                ).length
              }
              action="Abrir financeiro"
              onClick={() => openModule("finance")}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold">
              Proximas partidas
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextMatches.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
            {!nextMatches.length ? (
              <InlineEmpty text="Nenhuma partida agendada." />
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold">
              Ultimos resultados
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentResults.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
            {!recentResults.length ? (
              <InlineEmpty text="Os resultados oficiais aparecerao aqui." />
            ) : null}
          </CardContent>
        </Card>
      </div>
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold">
              Jornada da equipe
            </h2>
          </CardHeader>
          <CardContent className="space-y-2">
            {progress.map((item) => (
              <button
                className="flex w-full items-center gap-3 border border-arena-line p-3 text-left hover:bg-white/[.04]"
                key={item.label}
                onClick={() => openModule(item.module)}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center border ${item.done ? "border-green-500/40 bg-green-500/10 text-green-300" : "border-arena-line text-arena-muted"}`}
                >
                  {item.done ? <Check className="h-4 w-4" /> : null}
                </span>
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold">Notificações</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.notifications.slice(0, 6).map((item) => (
              <div className="border-b border-arena-line pb-3" key={item.id}>
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-cyan-200" />
                  <p className="text-sm font-semibold">{item.titulo}</p>
                </div>
                <p className="mt-1 text-sm text-arena-muted">{item.mensagem}</p>
              </div>
            ))}
            {!data.notifications.length ? (
              <InlineEmpty text="Nenhuma notificacao recebida." />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TeamModule({ data, busy, run }: ModuleProps) {
  const team = data.team!;
  const [form, setForm] = useState(teamForm(team));
  useEffect(() => setForm(teamForm(team)), [team]);
  return (
    <div className="grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
      <Card>
        <CardContent className="p-0">
          <div className="relative aspect-[16/7] overflow-hidden border-b border-arena-line bg-cyan-400/10">
            {team.banner ? (
              <img
                alt={`Banner da ${team.nome}`}
                className="h-full w-full object-cover"
                src={team.banner}
              />
            ) : null}
          </div>
          <div className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center border border-cyan-400/30 bg-arena-bg">
                {team.logo ? (
                  <img
                    alt={`Logo da ${team.nome}`}
                    className="h-full w-full object-cover"
                    src={team.logo}
                  />
                ) : (
                  <Shield className="h-8 w-8 text-cyan-200" />
                )}
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold">{team.nome}</h2>
                <p className="text-sm text-arena-muted">
                  {team.tag} · {team.game_name}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Regiao" value={team.regiao || "Não definida"} />
              <Metric label="Criada ha" value={`${team.age_days} dias`} />
              <Metric label="Win rate" value={`${data.statistics.win_rate}%`} />
              <Metric
                label="Partidas"
                value={String(data.statistics.matches)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">
            Personalizacao da equipe
          </h2>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Nome">
            <Input
              value={form.nome}
              onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))}
            />
          </Field>
          <Field label="Tag">
            <Input
              maxLength={10}
              value={form.tag}
              onChange={(e) =>
                setForm((s) => ({ ...s, tag: e.target.value.toUpperCase() }))
              }
            />
          </Field>
          <Field label="Logo da equipe">
            <ImageUploadField
              value={form.logo}
              onChange={(logo) => setForm((state) => ({ ...state, logo }))}
              label="Alterar logo"
            />
          </Field>
          <Field label="Banner da equipe">
            <ImageUploadField
              value={form.banner}
              onChange={(banner) => setForm((state) => ({ ...state, banner }))}
              label="Alterar banner"
            />
          </Field>
          <Field label="Regiao">
            <Input
              value={form.regiao}
              onChange={(e) =>
                setForm((s) => ({ ...s, regiao: e.target.value }))
              }
            />
          </Field>
          <Field label="Discord">
            <Input
              value={form.discord}
              onChange={(e) =>
                setForm((s) => ({ ...s, discord: e.target.value }))
              }
            />
          </Field>
          <Field label="Steam">
            <Input
              value={form.steam}
              onChange={(e) =>
                setForm((s) => ({ ...s, steam: e.target.value }))
              }
            />
          </Field>
          <Field label="Instagram">
            <Input
              value={form.instagram}
              onChange={(e) =>
                setForm((s) => ({ ...s, instagram: e.target.value }))
              }
            />
          </Field>
          <Field label="Website">
            <Input
              value={form.website}
              onChange={(e) =>
                setForm((s) => ({ ...s, website: e.target.value }))
              }
            />
          </Field>
          <Field label="YouTube">
            <Input
              value={form.youtube}
              onChange={(e) =>
                setForm((s) => ({ ...s, youtube: e.target.value }))
              }
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Descrição">
              <Textarea
                value={form.descricao}
                onChange={(e) =>
                  setForm((s) => ({ ...s, descricao: e.target.value }))
                }
              />
            </Field>
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input
              checked={form.recrutando}
              className="h-4 w-4 accent-cyan-400"
              type="checkbox"
              onChange={(e) =>
                setForm((s) => ({ ...s, recrutando: e.target.checked }))
              }
            />
            Equipe recrutando
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <input
              checked={form.privada}
              className="h-4 w-4 accent-cyan-400"
              type="checkbox"
              onChange={(e) =>
                setForm((s) => ({ ...s, privada: e.target.checked }))
              }
            />
            Perfil privado
          </label>
          <div className="flex flex-wrap justify-between gap-3 border-t border-arena-line pt-4 md:col-span-2">
            <Button
              loading={busy === "team-save"}
              icon={<Save className="h-4 w-4" />}
              onClick={() =>
                void run(
                  "team-save",
                  () => updateLeaderTeam(form),
                  "Equipe atualizada",
                )
              }
            >
              Salvar equipe
            </Button>
            <Button
              loading={busy === "team-archive"}
              icon={<Archive className="h-4 w-4" />}
              variant="secondary"
              onClick={() =>
                confirmAction(
                  team.ativo
                    ? "Arquivar a equipe? O histórico será preservado."
                    : "Reativar está equipe?",
                  () =>
                    run(
                      "team-archive",
                      () => archiveLeaderTeam(team.ativo),
                      team.ativo ? "Equipe arquivada" : "Equipe reativada",
                    ),
                )
              }
            >
              {team.ativo ? "Arquivar equipe" : "Reativar equipe"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RosterModule({ data, busy, run }: ModuleProps) {
  const [email, setEmail] = useState("");
  const [drafts, setDrafts] = useState<
    Record<
      number,
      {
        cargo: string;
        lineup_status: string;
        status: string;
        can_invite_players: boolean;
        can_remove_players: boolean;
      }
    >
  >({});
  useEffect(
    () =>
      setDrafts(
        Object.fromEntries(
          data.members.map((member) => [
            member.id,
            {
              cargo: member.cargo,
              lineup_status: member.lineup_status,
              status: member.status,
              can_invite_players: member.can_invite_players,
              can_remove_players: member.can_remove_players,
            },
          ]),
        ),
      ),
    [data.members],
  );
  const pending = data.requests.filter(
    (request) => request.status === "pending",
  );
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">
            Convidar jogador
          </h2>
          <p className="mt-1 text-sm text-arena-muted">
            O convite e enviado para uma conta existente na Arena Camp.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row">
          <Input
            type="email"
            placeholder="email@jogador.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            loading={busy === "invite"}
            icon={<UserPlus className="h-4 w-4" />}
            onClick={() =>
              void run(
                "invite",
                async () => {
                  await inviteLeaderPlayer(email);
                  setEmail("");
                },
                "Convite enviado",
              )
            }
          >
            Convidar
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">
            Elenco completo
          </h2>
        </CardHeader>
        <DataTable
          data={data.members}
          columns={[
            {
              header: "Jogador",
              cell: (member) => (
                <div>
                  <p className="font-semibold">
                    {member.nick || member.nickname || member.nome}
                  </p>
                  <p className="text-xs text-arena-muted">
                    #{member.player_id ?? "-"} ·{" "}
                    {member.game_uid || "ID no jogo pendente"}
                  </p>
                </div>
              ),
            },
            {
              header: "Cargo",
              cell: (member) =>
                member.cargo === "leader" ? (
                  <Badge tone="info">Líder</Badge>
                ) : (
                  <Select
                    value={drafts[member.id]?.cargo ?? member.cargo}
                    onChange={(e) =>
                      setDrafts((s) => ({
                        ...s,
                        [member.id]: { ...s[member.id], cargo: e.target.value },
                      }))
                    }
                  >
                    <option value="captain">Capitão</option>
                    <option value="manager">Manager</option>
                    <option value="player">Jogador</option>
                  </Select>
                ),
            },
            {
              header: "Escalacao",
              cell: (member) => (
                <Select
                  disabled={member.cargo === "leader"}
                  value={
                    drafts[member.id]?.lineup_status ?? member.lineup_status
                  }
                  onChange={(e) =>
                    setDrafts((s) => ({
                      ...s,
                      [member.id]: {
                        ...s[member.id],
                        lineup_status: e.target.value,
                      },
                    }))
                  }
                >
                  <option value="titular">Titular</option>
                  <option value="reserva">Reserva</option>
                </Select>
              ),
            },
            {
              header: "Status",
              cell: (member) => (
                <Select
                  disabled={member.cargo === "leader"}
                  value={drafts[member.id]?.status ?? member.status}
                  onChange={(e) =>
                    setDrafts((s) => ({
                      ...s,
                      [member.id]: { ...s[member.id], status: e.target.value },
                    }))
                  }
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </Select>
              ),
            },
            {
              header: "Delegacao",
              cell: (member) =>
                (drafts[member.id]?.cargo ?? member.cargo) !== "captain" ? (
                  <span className="text-xs text-arena-muted">
                    Somente capitão
                  </span>
                ) : (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold">
                      <input
                        checked={drafts[member.id]?.can_invite_players ?? false}
                        className="h-4 w-4 accent-cyan-400"
                        type="checkbox"
                        onChange={(e) =>
                          setDrafts((s) => ({
                            ...s,
                            [member.id]: {
                              ...s[member.id],
                              can_invite_players: e.target.checked,
                            },
                          }))
                        }
                      />
                      Convidar jogadores
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold">
                      <input
                        checked={drafts[member.id]?.can_remove_players ?? false}
                        className="h-4 w-4 accent-cyan-400"
                        type="checkbox"
                        onChange={(e) =>
                          setDrafts((s) => ({
                            ...s,
                            [member.id]: {
                              ...s[member.id],
                              can_remove_players: e.target.checked,
                            },
                          }))
                        }
                      />
                      Remover jogadores
                    </label>
                  </div>
                ),
            },
            {
              header: "Ultimo acesso",
              cell: (member) =>
                member.last_seen_at
                  ? formatDate(member.last_seen_at)
                  : "Ainda não registrado",
            },
            {
              header: "Ações",
              cell: (member) =>
                member.cargo === "leader" ? (
                  <span className="text-xs text-arena-muted">
                    Conta principal
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="h-8 px-3 text-xs"
                      loading={busy === `member-${member.id}`}
                      onClick={() =>
                        void run(
                          `member-${member.id}`,
                          () =>
                            updateLeaderMember(member.id, drafts[member.id]),
                          "Jogador atualizado",
                        )
                      }
                    >
                      Salvar
                    </Button>
                    <Button
                      className="h-8 px-3 text-xs"
                      variant="secondary"
                      onClick={() =>
                        confirmAction(
                          "Transferir a lideranca para este membro?",
                          () =>
                            run(
                              `transfer-${member.id}`,
                              () => transferLeaderLeadership(member.id),
                              "Lideranca transferida",
                            ),
                        )
                      }
                    >
                      Líder
                    </Button>
                    <Button
                      className="h-8 px-3 text-xs"
                      variant="danger"
                      onClick={() =>
                        confirmAction("Remover este membro da equipe?", () =>
                          run(
                            `remove-${member.id}`,
                            () => removeLeaderMember(member.id),
                            "Membro removido",
                          ),
                        )
                      }
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ),
            },
          ]}
        />
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">
            Solicitacoes e convites
          </h2>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.map((request) => (
            <div
              className="flex flex-col gap-3 border border-arena-line p-4 md:flex-row md:items-center md:justify-between"
              key={request.id}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">
                    {request.nickname || request.nome}
                  </p>
                  <Badge tone={request.tipo === "request" ? "warning" : "info"}>
                    {request.tipo === "request"
                      ? "Solicitou entrada"
                      : "Convite enviado"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-arena-muted">
                  {request.email} · {formatDate(request.created_at)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {request.tipo === "request" ? (
                  <>
                    <Button
                      className="h-9"
                      onClick={() =>
                        void run(
                          `request-${request.id}`,
                          () => decideLeaderRequest(request.id, "accept"),
                          "Jogador adicionado",
                        )
                      }
                    >
                      Aceitar
                    </Button>
                    <Button
                      className="h-9"
                      variant="secondary"
                      onClick={() =>
                        void run(
                          `request-${request.id}`,
                          () => decideLeaderRequest(request.id, "reject"),
                          "Solicitacao recusada",
                        )
                      }
                    >
                      Recusar
                    </Button>
                    <Button
                      className="h-9"
                      variant="danger"
                      onClick={() =>
                        void run(
                          `request-${request.id}`,
                          () => decideLeaderRequest(request.id, "block"),
                          "Usuário bloqueado",
                        )
                      }
                    >
                      Bloquear
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      className="h-9"
                      variant="secondary"
                      onClick={() =>
                        void run(
                          `request-${request.id}`,
                          () => decideLeaderRequest(request.id, "resend"),
                          "Convite reenviado",
                        )
                      }
                    >
                      Reenviar
                    </Button>
                    <Button
                      className="h-9"
                      variant="danger"
                      onClick={() =>
                        void run(
                          `request-${request.id}`,
                          () => decideLeaderRequest(request.id, "cancel"),
                          "Convite cancelado",
                        )
                      }
                    >
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
          {!pending.length ? (
            <InlineEmpty text="Nenhuma solicitacao ou convite pendente." />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function LineupsModule({ data, busy, run }: ModuleProps) {
  const [selectedId, setSelectedId] = useState<number | null>(
    data.lineups[0]?.id ?? null,
  );
  const selected =
    data.lineups.find((lineup) => lineup.id === selectedId) ?? null;
  const [form, setForm] = useState(lineupForm(selected));
  useEffect(() => setForm(lineupForm(selected)), [selectedId, data.lineups]);
  const players = data.members.filter(
    (member) => member.player_id && member.status === "ativo",
  );
  function toggle(playerId: number, type: "titulares" | "reservas") {
    setForm((state) => {
      const other = type === "titulares" ? "reservas" : "titulares";
      const selectedIds = state[type].includes(playerId)
        ? state[type].filter((id) => id !== playerId)
        : [...state[type], playerId];
      return {
        ...state,
        [type]: selectedIds,
        [other]: state[other].filter((id) => id !== playerId),
      };
    });
  }
  async function save() {
    const ok = await run(
      "lineup-save",
      () => saveLeaderLineup(selected?.id ?? null, form),
      "Lineup salva",
    );
    if (ok && !selected) setSelectedId(null);
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Lineups</h2>
            <p className="mt-1 text-sm text-arena-muted">
              {data.lineups.length} configuradas
            </p>
          </div>
          <Button
            className="h-9"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setSelectedId(null)}
          >
            Nova
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.lineups.map((lineup) => (
            <button
              className={`w-full border p-3 text-left ${selectedId === lineup.id ? "border-cyan-400/50 bg-cyan-400/10" : "border-arena-line hover:bg-white/[.04]"}`}
              key={lineup.id}
              onClick={() => setSelectedId(lineup.id)}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{lineup.name}</span>
                <StatusBadge value={lineup.status} />
              </div>
              <p className="mt-2 text-xs text-arena-muted">
                {lineup.players.filter((p) => p.titular).length} titulares ·{" "}
                {lineup.players.filter((p) => !p.titular).length} reservas
              </p>
            </button>
          ))}
          {!data.lineups.length ? (
            <InlineEmpty text="Crie a primeira lineup da equipe." />
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold">
                {selected ? "Editar lineup" : "Nova lineup"}
              </h2>
              <p className="mt-1 text-sm text-arena-muted">
                Lineups congeladas devem ser duplicadas antes de qualquer
                alteracao.
              </p>
            </div>
            {selected ? (
              <div className="flex gap-2">
                <Button
                  className="h-9"
                  icon={<ClipboardCopy className="h-4 w-4" />}
                  variant="secondary"
                  onClick={() =>
                    void run(
                      `duplicate-${selected.id}`,
                      () => duplicateLeaderLineup(selected.id),
                      "Lineup duplicada",
                    )
                  }
                >
                  Duplicar
                </Button>
                <Button
                  className="h-9"
                  disabled={selected.status === "congelada"}
                  icon={<Snowflake className="h-4 w-4" />}
                  variant="secondary"
                  onClick={() =>
                    void run(
                      `freeze-${selected.id}`,
                      () => freezeLeaderLineup(selected.id),
                      "Lineup congelada",
                    )
                  }
                >
                  Congelar
                </Button>
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome">
              <Input
                disabled={selected?.status === "congelada"}
                value={form.name}
                onChange={(e) =>
                  setForm((s) => ({ ...s, name: e.target.value }))
                }
              />
            </Field>
            <Field label="Status">
              <Select
                disabled={selected?.status === "congelada"}
                value={form.status}
                onChange={(e) =>
                  setForm((s) => ({ ...s, status: e.target.value }))
                }
              >
                <option value="rascunho">Rascunho</option>
                <option value="ativa">Ativa</option>
              </Select>
            </Field>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <PlayerChecklist
              title="Titulares"
              players={players}
              selected={form.titulares}
              disabled={selected?.status === "congelada"}
              onToggle={(id) => toggle(id, "titulares")}
            />
            <PlayerChecklist
              title="Reservas"
              players={players}
              selected={form.reservas}
              disabled={selected?.status === "congelada"}
              onToggle={(id) => toggle(id, "reservas")}
            />
          </div>
          <Button
            disabled={selected?.status === "congelada"}
            loading={busy === "lineup-save"}
            icon={<Save className="h-4 w-4" />}
            onClick={() => void save()}
          >
            Salvar lineup
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function TournamentsModule({
  data,
  busy,
  run,
  openModule,
}: ModuleProps & { openModule: (module: LeaderModule) => void }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [target, setTarget] = useState<LeaderTournament | null>(null);
  const [lineupId, setLineupId] = useState(
    String(
      data.lineups.find((lineup) => lineup.status !== "rascunho")?.id ?? "",
    ),
  );
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [center, setCenter] = useState<LeaderTournamentCenter | null>(null);
  const [centerLoading, setCenterLoading] = useState(false);
  const filtered = data.tournaments.filter(
    (tournament) =>
      tournament.nome.toLowerCase().includes(search.toLowerCase()) &&
      (status === "todos" || tournament.status === status),
  );
  async function openCenter(tournamentId: number) {
    setCenterLoading(true);
    try {
      setCenter(await getLeaderTournamentCenter(tournamentId));
    } finally {
      setCenterLoading(false);
    }
  }
  return (
    <div className="space-y-5">
      {center ? (
        <TournamentCenterPanel
          center={center}
          teamId={data.team!.id}
          onClose={() => setCenter(null)}
          openMatches={() => openModule("matches")}
        />
      ) : null}
      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <Input
          placeholder="Pesquisar torneio"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="todos">Todos os status</option>
          <option value="aberto">Inscrições abertas</option>
          <option value="fechado">Inscrições encerradas</option>
          <option value="em_andamento">Em andamento</option>
          <option value="finalizado">Finalizado</option>
        </Select>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {filtered.map((tournament) => (
          <Card key={tournament.id}>
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge value={tournament.status} />
                    {tournament.entry_id ? (
                      <Badge tone="success">Equipe inscrita</Badge>
                    ) : null}
                  </div>
                  <h2 className="mt-3 font-display text-xl font-semibold">
                    {tournament.nome}
                  </h2>
                  <p className="mt-2 text-sm text-arena-muted">
                    {formatLabel(tournament.format)} ·{" "}
                    {(tournament.best_of || "bo3").toUpperCase()}
                  </p>
                </div>
                <Trophy className="h-7 w-7 text-cyan-200" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric
                  label="Premiação"
                  value={tournament.premiacao || "A definir"}
                />
                <Metric
                  label="Inscrição"
                  value={formatCurrency(tournament.valor)}
                />
                <Metric
                  label="Equipes"
                  value={`${tournament.registered_teams}/${tournament.max_teams}`}
                />
                <Metric label="Inicio" value={formatDate(tournament.inicio)} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {!tournament.entry_id ? (
                  <Button
                    disabled={tournament.status !== "aberto"}
                    onClick={() => {
                      setTarget(tournament);
                      setAcceptedRules(false);
                    }}
                  >
                    Inscrever equipe
                  </Button>
                ) : (
                  <Button
                    loading={centerLoading}
                    variant="secondary"
                    onClick={() => void openCenter(tournament.id)}
                  >
                    Central do torneio
                  </Button>
                )}
                <Link to={`/torneios/${tournament.id}`}>
                  <Button variant="ghost">Ver pagina</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {!filtered.length ? (
          <EmptyState
            title="Nenhum torneio encontrado"
            description="Ajuste os filtros para consultar outras competicoes."
          />
        ) : null}
      </div>
      <Modal
        open={Boolean(target)}
        title="Confirmar inscrição"
        description={target ? target.nome : undefined}
        onClose={() => setTarget(null)}
      >
        <div className="space-y-4">
          <Field label="Lineup">
            <Select
              value={lineupId}
              onChange={(e) => setLineupId(e.target.value)}
            >
              <option value="">Selecione</option>
              {data.lineups
                .filter((lineup) => lineup.status !== "rascunho")
                .map((lineup) => (
                  <option key={lineup.id} value={lineup.id}>
                    {lineup.name} ·{" "}
                    {lineup.players.filter((p) => p.titular).length} titulares
                  </option>
                ))}
            </Select>
          </Field>
          {target ? (
            <Link
              className="block border border-cyan-400/30 bg-cyan-400/[.06] p-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/10"
              target="_blank"
              to={`/torneios/${target.id}?tab=rules`}
            >
              Abrir regulamento completo antes de aceitar
            </Link>
          ) : null}
          <label className="flex items-start gap-3 border border-arena-line p-3 text-sm">
            <input
              checked={acceptedRules}
              className="mt-0.5 h-4 w-4 accent-cyan-400"
              type="checkbox"
              onChange={(e) => setAcceptedRules(e.target.checked)}
            />
            <span>
              Li e aceito o regulamento, o congelamento da lineup e as regras da
              competição.
            </span>
          </label>
          <Button
            className="w-full"
            disabled={!lineupId || !acceptedRules}
            loading={busy === "entry-create"}
            onClick={() =>
              target &&
              void run(
                "entry-create",
                () =>
                  registerLeaderTournament({
                    tournament_id: target.id,
                    lineup_id: Number(lineupId),
                    accepted_rules: acceptedRules,
                  }),
                "Equipe inscrita",
              ).then((ok) => {
                if (ok) setTarget(null);
              })
            }
          >
            Confirmar inscrição
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function TournamentCenterPanel({
  center,
  teamId,
  onClose,
  openMatches,
}: {
  center: LeaderTournamentCenter;
  teamId: number;
  onClose: () => void;
  openMatches: () => void;
}) {
  const [tab, setTab] = useState<
    "overview" | "bracket" | "standings" | "team" | "rules"
  >("overview");
  const rounds = [
    ...new Set(center.matches.map((match) => Number(match.round))),
  ].sort((a, b) => a - b);
  const ownEntry = center.participants.find(
    (entry) => Number(entry.team_id) === Number(teamId),
  );
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">Central do torneio</Badge>
            <StatusBadge value={center.tournament.status} />
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold">
            {center.tournament.nome}
          </h2>
          <p className="mt-1 text-sm text-arena-muted">
            Acompanhamento oficial da inscrição, chaveamento e regulamento.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={<Swords className="h-4 w-4" />}
            onClick={openMatches}
          >
            Minhas partidas
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5"
          role="tablist"
        >
          {[
            ["overview", "Visao geral"],
            ["bracket", "Chaveamento"],
            ["standings", "Tabela"],
            ["team", "Minha equipe"],
            ["rules", "Regras"],
          ].map(([value, label]) => (
            <button
              className={`border px-3 py-2 text-sm font-semibold ${tab === value ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-100" : "border-arena-line text-arena-muted hover:bg-white/[.04]"}`}
              key={value}
              role="tab"
              onClick={() => setTab(value as typeof tab)}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "overview" ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Formato"
                value={formatLabel(center.tournament.format)}
              />
              <Metric
                label="Serie"
                value={(center.tournament.best_of || "bo3").toUpperCase()}
              />
              <Metric
                label="Participantes"
                value={`${center.participants.length}/${center.tournament.max_teams}`}
              />
              <Metric
                label="Sua inscrição"
                value={statusLabel(ownEntry?.status || "pendente")}
              />
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold">Cronograma</p>
              <div className="grid gap-3 md:grid-cols-2">
                {center.matches.slice(0, 6).map((match) => (
                  <div
                    className="flex items-center justify-between border border-arena-line p-3"
                    key={match.id}
                  >
                    <div>
                      <p className="font-semibold">
                        {match.team_a} vs {match.team_b}
                      </p>
                      <p className="mt-1 text-xs text-arena-muted">
                        Rodada {match.round} · {formatDate(match.scheduled_at)}
                      </p>
                    </div>
                    <StatusBadge value={match.status} />
                  </div>
                ))}
                {!center.matches.length ? (
                  <InlineEmpty text="O chaveamento ainda não foi publicado." />
                ) : null}
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold">Map pool</p>
              <div className="flex flex-wrap gap-2">
                {center.map_pool.map((map) => (
                  <Badge key={map.id} tone="info">
                    {map.nome}
                  </Badge>
                ))}
                {!center.map_pool.length ? (
                  <span className="text-sm text-arena-muted">
                    Mapas ainda não publicados.
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        {tab === "bracket" ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {rounds.map((round) => (
              <div key={round}>
                <p className="mb-3 text-xs font-semibold uppercase text-arena-muted">
                  Rodada {round}
                </p>
                <div className="space-y-3">
                  {center.matches
                    .filter((match) => Number(match.round) === round)
                    .map((match) => (
                      <div
                        className="border border-arena-line p-3"
                        key={match.id}
                      >
                        <div className="flex justify-between gap-3">
                          <span>{match.team_a}</span>
                          <strong>
                            {match.status === "finalizada"
                              ? match.score_team_a
                              : "-"}
                          </strong>
                        </div>
                        <div className="mt-2 flex justify-between gap-3">
                          <span>{match.team_b}</span>
                          <strong>
                            {match.status === "finalizada"
                              ? match.score_team_b
                              : "-"}
                          </strong>
                        </div>
                        <p className="mt-3 border-t border-arena-line pt-2 text-xs text-arena-muted">
                          {formatDate(match.scheduled_at)}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
            {!rounds.length ? (
              <InlineEmpty text="A administracao ainda não gerou o chaveamento." />
            ) : null}
          </div>
        ) : null}
        {tab === "standings" ? (
          <DataTable
            data={center.standings}
            columns={[
              {
                header: "Posição",
                cell: (row) => `#${center.standings.indexOf(row) + 1}`,
              },
              {
                header: "Equipe",
                cell: (row) => (
                  <span
                    className={
                      Number(row.team_id) === Number(teamId)
                        ? "font-bold text-cyan-200"
                        : "font-semibold"
                    }
                  >
                    {row.team_name}
                  </span>
                ),
              },
              { header: "J", cell: (row) => row.played },
              { header: "V", cell: (row) => row.wins },
              { header: "D", cell: (row) => row.losses },
              {
                header: "Saldo",
                cell: (row) => row.score_for - row.score_against,
              },
              { header: "Pontos", cell: (row) => row.points },
            ]}
          />
        ) : null}
        {tab === "team" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric
                label="Lineup enviada"
                value={ownEntry?.lineup_name || "Lineup legada"}
              />
              <Metric label="Jogadores" value={String(center.lineup.length)} />
              <Metric
                label="Pagamento"
                value={statusLabel(ownEntry?.payment_status || "aguardando")}
              />
            </div>
            <DataTable
              data={center.lineup}
              columns={[
                {
                  header: "Jogador",
                  cell: (player) => (
                    <div>
                      <p className="font-semibold">{player.nick}</p>
                      <p className="text-xs text-arena-muted">
                        #{player.player_id} · {player.game_uid || "ID pendente"}
                      </p>
                    </div>
                  ),
                },
                {
                  header: "Escalacao",
                  cell: (player) => (
                    <Badge tone={player.titular ? "success" : "info"}>
                      {player.titular ? "Titular" : "Reserva"}
                    </Badge>
                  ),
                },
                {
                  header: "Confirmação",
                  cell: (player) => (
                    <StatusBadge
                      value={player.confirmado ? "confirmado" : "pendente"}
                    />
                  ),
                },
              ]}
            />
          </div>
        ) : null}
        {tab === "rules" ? (
          <TournamentRegulationPanel
            tournament={center.tournament}
            mapPool={center.map_pool}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function MatchesModule({ data, busy, run }: ModuleProps) {
  const [selectedId, setSelectedId] = useState<number | null>(
    data.matches[0]?.id ?? null,
  );
  const [operations, setOperations] = useState<MatchOperations | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const selected =
    data.matches.find((match) => match.id === selectedId) ?? null;
  const loadMatch = useCallback(async (id: number, silent = false) => {
    if (!silent) setLoadingMatch(true);
    try {
      setOperations(await getLeaderMatch(id));
    } catch {
      setOperations(null);
    } finally {
      if (!silent) setLoadingMatch(false);
    }
  }, []);
  useEffect(() => {
    if (selectedId) void loadMatch(selectedId);
  }, [selectedId, loadMatch]);
  useEffect(() => {
    if (!selectedId || operations?.veto.status !== "liberado") return;
    const timer = window.setInterval(
      () => void loadMatch(selectedId, true),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [selectedId, operations?.veto.status, loadMatch]);
  const expectedTeamId =
    operations?.veto.expected_step?.team === "A"
      ? operations.match.team_a_id
      : operations?.veto.expected_step?.team === "B"
        ? operations.match.team_b_id
        : null;
  const canVeto =
    operations?.veto.status === "liberado" &&
    Number(expectedTeamId) === Number(data.team?.id);
  async function vetoMap(mapId: number) {
    if (!operations?.veto.expected_step || !selectedId) return;
    const ok = await run(
      `veto-${mapId}`,
      () =>
        performLeaderVeto(selectedId, {
          action: operations.veto.expected_step!.action,
          game_map_id: mapId,
        }),
      "Ação registrada",
      false,
    );
    if (ok) {
      await loadMatch(selectedId);
    }
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">
            Minhas partidas
          </h2>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.matches.map((match) => (
            <button
              className={`w-full border p-3 text-left ${selectedId === match.id ? "border-cyan-400/50 bg-cyan-400/10" : "border-arena-line"}`}
              key={match.id}
              onClick={() => setSelectedId(match.id)}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">vs {match.opponent}</span>
                <StatusBadge value={match.status} />
              </div>
              <p className="mt-2 text-xs text-arena-muted">
                {match.tournament_name} · {formatShortDate(match.scheduled_at)}
              </p>
            </button>
          ))}
          {!data.matches.length ? (
            <InlineEmpty text="Aguardando o primeiro chaveamento." />
          ) : null}
        </CardContent>
      </Card>
      {loadingMatch ? (
        <Card>
          <CardContent>
            <Skeleton className="h-72" />
          </CardContent>
        </Card>
      ) : selected && operations ? (
        <div className="space-y-5">
          <Card>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase text-arena-muted">
                    Partida #{selected.id} · {selected.tournament_name}
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold">
                    {operations.match.team_a} vs {operations.match.team_b}
                  </h2>
                  <p className="mt-2 text-sm text-arena-muted">
                    {operations.match.best_of.toUpperCase()} ·{" "}
                    {formatDate(operations.match.scheduled_at)} · Servidor:{" "}
                    {operations.match.server_address || "Aguardando liberacao"}
                  </p>
                </div>
                <StatusBadge value={operations.match.status} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    Pick & Ban
                  </h2>
                  <p className="mt-1 text-sm text-arena-muted">
                    {operations.veto.expected_step
                      ? `Proxima acao: ${operations.veto.expected_step.action.toUpperCase()} · Equipe ${operations.veto.expected_step.team}`
                      : "Sequencia concluida"}
                  </p>
                </div>
                <StatusBadge value={operations.veto.status} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {operations.map_pool.map((map) => {
                  const used = operations.veto.actions.some(
                    (action) => action.game_map_id === map.id,
                  );
                  return (
                    <button
                      className={`border p-4 text-left ${used ? "cursor-not-allowed border-arena-line opacity-40" : canVeto ? "border-cyan-400/40 hover:bg-cyan-400/10" : "border-arena-line"}`}
                      disabled={used || !canVeto || Boolean(busy)}
                      key={map.id}
                      onClick={() => void vetoMap(map.id)}
                    >
                      <p className="font-semibold">{map.nome}</p>
                      <p className="mt-1 text-xs text-arena-muted">
                        {used
                          ? "Ja utilizado"
                          : canVeto
                            ? "Selecionar agora"
                            : "Aguardando a vez"}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-5 space-y-2">
                {operations.veto.actions.map((action) => (
                  <div
                    className="flex items-center justify-between border-b border-arena-line py-2 text-sm"
                    key={action.id}
                  >
                    <span>
                      #{action.sequence_number} · {action.action.toUpperCase()}{" "}
                      · {action.team_name || "Sistema"}
                    </span>
                    <span className="font-semibold">{action.map_name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="font-display text-xl font-semibold">
                Serie e resultado
              </h2>
            </CardHeader>
            <CardContent className="space-y-3">
              {operations.maps.map((map) => (
                <div
                  className="flex items-center justify-between border border-arena-line p-3"
                  key={map.id}
                >
                  <div>
                    <p className="font-semibold">
                      Mapa {map.map_number} · {map.map_name}
                    </p>
                    <p className="text-xs text-arena-muted">
                      {map.selection_type}
                    </p>
                  </div>
                  <StatusBadge
                    value={
                      map.status === "finalizado"
                        ? `${map.score_team_a} x ${map.score_team_b}`
                        : map.status
                    }
                  />
                </div>
              ))}
              {!operations.maps.length ? (
                <InlineEmpty text="Os mapas serao formados pelo Pick & Ban." />
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          title="Selecione uma partida"
          description="Abra uma partida para consultar servidor, lineup, mapas e veto."
        />
      )}
    </div>
  );
}

function CalendarModule({ data, busy, run }: ModuleProps) {
  const [form, setForm] = useState({
    title: "",
    type: "treino",
    starts_at: "",
    ends_at: "",
    location: "",
    notes: "",
  });
  async function submit() {
    const ok = await run(
      "event-create",
      () => createLeaderEvent(form),
      "Evento criado",
    );
    if (ok)
      setForm({
        title: "",
        type: "treino",
        starts_at: "",
        ends_at: "",
        location: "",
        notes: "",
      });
  }
  return (
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">
            Novo compromisso
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Titulo">
            <Input
              value={form.title}
              onChange={(e) =>
                setForm((s) => ({ ...s, title: e.target.value }))
              }
            />
          </Field>
          <Field label="Tipo">
            <Select
              value={form.type}
              onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
            >
              <option value="treino">Treino</option>
              <option value="partida">Partida</option>
              <option value="reuniao">Reuniao</option>
              <option value="evento">Evento</option>
            </Select>
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Inicio">
              <Input
                type="datetime-local"
                value={form.starts_at}
                onChange={(e) =>
                  setForm((s) => ({ ...s, starts_at: e.target.value }))
                }
              />
            </Field>
            <Field label="Fim">
              <Input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) =>
                  setForm((s) => ({ ...s, ends_at: e.target.value }))
                }
              />
            </Field>
          </div>
          <Field label="Local ou servidor">
            <Input
              value={form.location}
              onChange={(e) =>
                setForm((s) => ({ ...s, location: e.target.value }))
              }
            />
          </Field>
          <Field label="Observacoes">
            <Textarea
              value={form.notes}
              onChange={(e) =>
                setForm((s) => ({ ...s, notes: e.target.value }))
              }
            />
          </Field>
          <Button
            loading={busy === "event-create"}
            icon={<CalendarDays className="h-4 w-4" />}
            onClick={() => void submit()}
          >
            Adicionar
          </Button>
        </CardContent>
      </Card>
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold">
              Agenda compartilhada
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.events.map((event) => (
              <div className="border border-arena-line p-4" key={event.id}>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{event.title}</p>
                      <Badge tone="info">{event.type}</Badge>
                      {event.my_attendance ? (
                        <StatusBadge value={event.my_attendance} />
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-arena-muted">
                      {formatDate(event.starts_at)}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                    <p className="mt-2 text-xs text-arena-muted">
                      {Number(event.confirmed_count)} confirmados ·{" "}
                      {Number(event.declined_count)} ausentes
                    </p>
                  </div>
                  <button
                    aria-label="Remover evento"
                    className="p-2 text-red-300 hover:bg-red-500/10"
                    onClick={() =>
                      void run(
                        `event-${event.id}`,
                        () => deleteLeaderEvent(event.id),
                        "Evento removido",
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-arena-line pt-3">
                  <Button
                    className="h-8 text-xs"
                    variant={
                      event.my_attendance === "confirmado"
                        ? "primary"
                        : "secondary"
                    }
                    onClick={() =>
                      void run(
                        `attendance-${event.id}`,
                        () =>
                          updateLeaderEventAttendance(event.id, "confirmado"),
                        "Presença confirmada",
                      )
                    }
                  >
                    Vou participar
                  </Button>
                  <Button
                    className="h-8 text-xs"
                    variant={
                      event.my_attendance === "talvez" ? "primary" : "secondary"
                    }
                    onClick={() =>
                      void run(
                        `attendance-${event.id}`,
                        () => updateLeaderEventAttendance(event.id, "talvez"),
                        "Presença atualizada",
                      )
                    }
                  >
                    Talvez
                  </Button>
                  <Button
                    className="h-8 text-xs"
                    variant={
                      event.my_attendance === "ausente" ? "danger" : "secondary"
                    }
                    onClick={() =>
                      void run(
                        `attendance-${event.id}`,
                        () => updateLeaderEventAttendance(event.id, "ausente"),
                        "Ausencia registrada",
                      )
                    }
                  >
                    Não vou
                  </Button>
                </div>
              </div>
            ))}
            {!data.events.length ? (
              <InlineEmpty text="Nenhum treino ou evento agendado." />
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold">
              Partidas oficiais
            </h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.matches
              .filter((match) => match.status !== "finalizada")
              .map((match) => (
                <MatchRow match={match} key={match.id} />
              ))}
            {!data.matches.some((match) => match.status !== "finalizada") ? (
              <InlineEmpty text="Nenhuma partida oficial agendada." />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FinanceModule({ data, busy, run }: ModuleProps) {
  const refundableEntries = data.entries.filter((entry) =>
    data.payments.some(
      (payment) =>
        payment.entry_id === entry.id && payment.status === "aprovado",
    ),
  );
  const [refund, setRefund] = useState({
    tournament_id: String(refundableEntries[0]?.tournament_id ?? ""),
    subject: "Solicitacao de reembolso",
    description: "",
  });
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Pagamentos"
          value={String(data.payments.length)}
          helper="Histórico da equipe"
          icon={<CreditCard className="h-5 w-5" />}
        />
        <StatCard
          label="Aprovados"
          value={String(
            data.payments.filter((item) => item.status === "aprovado").length,
          )}
          helper="Confirmados pelo gateway"
          icon={<Check className="h-5 w-5" />}
        />
        <StatCard
          label="Investimento"
          value={formatCurrency(
            data.payments
              .filter((item) => item.status === "aprovado")
              .reduce((sum, item) => sum + Number(item.valor), 0),
          )}
          helper="Inscrições aprovadas"
          icon={<Trophy className="h-5 w-5" />}
        />
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">
            Inscrições e pagamentos
          </h2>
        </CardHeader>
        <DataTable
          data={data.entries}
          columns={[
            {
              header: "Torneio",
              cell: (entry) => (
                <div>
                  <p className="font-semibold">{entry.tournament_name}</p>
                  <p className="text-xs text-arena-muted">
                    {entry.lineup_name || "Lineup legada"}
                  </p>
                </div>
              ),
            },
            { header: "Valor", cell: (entry) => formatCurrency(entry.valor) },
            {
              header: "Inscrição",
              cell: (entry) => <StatusBadge value={entry.status} />,
            },
            {
              header: "Pagamento",
              cell: (entry) => <StatusBadge value={entry.payment_status} />,
            },
            {
              header: "Ação",
              cell: (entry) =>
                entry.payment_status === "aguardando" &&
                Number(entry.valor) > 0 ? (
                  <Button
                    className="h-8 text-xs"
                    loading={busy === `payment-${entry.id}`}
                    onClick={() =>
                      void run(
                        `payment-${entry.id}`,
                        () => createLeaderPayment(entry.id),
                        "PIX gerado",
                      )
                    }
                  >
                    Gerar PIX
                  </Button>
                ) : (
                  <span className="text-xs text-arena-muted">
                    Sem ação pendente
                  </span>
                ),
            },
          ]}
        />
      </Card>
      {data.payments
        .filter(
          (payment) => payment.copia_cola && payment.status === "pendente",
        )
        .map((payment) => (
          <Card key={payment.id}>
            <CardHeader>
              <h2 className="font-display text-xl font-semibold">
                PIX · {payment.tournament_name}
              </h2>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-[180px_1fr]">
              {payment.qr_code_base64 ? (
                <img
                  alt="QR Code PIX"
                  className="aspect-square w-full bg-white p-2"
                  src={`data:image/png;base64,${payment.qr_code_base64}`}
                />
              ) : null}
              <div>
                <p className="text-sm text-arena-muted">
                  Copie o código abaixo para concluir o pagamento.
                </p>
                <div className="mt-3 break-all border border-arena-line bg-black/20 p-3 font-mono text-xs">
                  {payment.copia_cola}
                </div>
                <Button
                  className="mt-3"
                  icon={<ClipboardCopy className="h-4 w-4" />}
                  variant="secondary"
                  onClick={() =>
                    void navigator.clipboard.writeText(payment.copia_cola!)
                  }
                >
                  Copiar código
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold">Recibos</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.payments
              .filter((payment) => payment.status === "aprovado")
              .map((payment) => (
                <div
                  className="flex flex-col justify-between gap-3 border border-arena-line p-4 sm:flex-row sm:items-center"
                  key={payment.id}
                >
                  <div>
                    <p className="font-semibold">{payment.tournament_name}</p>
                    <p className="mt-1 text-xs text-arena-muted">
                      {payment.external_reference ||
                        payment.payment_id ||
                        `Pagamento #${payment.id}`}{" "}
                      · {formatDate(payment.paid_at || payment.created_at)}
                    </p>
                  </div>
                  <Button
                    className="h-9"
                    icon={<ReceiptText className="h-4 w-4" />}
                    variant="secondary"
                    onClick={() => printReceipt(payment, data.team!)}
                  >
                    Abrir recibo
                  </Button>
                </div>
              ))}
            {!data.payments.some((payment) => payment.status === "aprovado") ? (
              <InlineEmpty text="Nenhum recibo disponivel." />
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold">
              Solicitar reembolso
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Inscrição paga">
              <Select
                value={refund.tournament_id}
                onChange={(e) =>
                  setRefund((s) => ({ ...s, tournament_id: e.target.value }))
                }
              >
                <option value="">Selecione</option>
                {refundableEntries.map((entry) => (
                  <option key={entry.id} value={entry.tournament_id}>
                    {entry.tournament_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Motivo">
              <Textarea
                value={refund.description}
                onChange={(e) =>
                  setRefund((s) => ({ ...s, description: e.target.value }))
                }
              />
            </Field>
            <Button
              disabled={!refund.tournament_id || !refund.description.trim()}
              loading={busy === "refund"}
              onClick={() =>
                void run(
                  "refund",
                  () =>
                    createLeaderCompetitionRequest({
                      type: "reembolso",
                      tournament_id: Number(refund.tournament_id),
                      subject: refund.subject,
                      description: refund.description,
                    }),
                  "Reembolso solicitado",
                )
              }
            >
              Enviar solicitacao
            </Button>
            <div className="space-y-2 border-t border-arena-line pt-4">
              {data.competition_requests
                .filter((request) => request.type === "reembolso")
                .map((request) => (
                  <div
                    className="flex items-center justify-between border border-arena-line p-3"
                    key={request.id}
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {request.tournament_name}
                      </p>
                      <p className="text-xs text-arena-muted">
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                    <StatusBadge value={request.status} />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CommunicationModule({ data, busy, run }: ModuleProps) {
  const [teamMessage, setTeamMessage] = useState("");
  const [teamAttachment, setTeamAttachment] = useState("");
  const [tournamentId, setTournamentId] = useState(
    String(data.entries[0]?.tournament_id ?? ""),
  );
  const [tournamentMessage, setTournamentMessage] = useState("");
  const [tournamentAttachment, setTournamentAttachment] = useState("");
  const [dispute, setDispute] = useState({
    match_id: String(data.matches[0]?.id ?? ""),
    title: "",
    description: "",
    evidence: "",
  });
  const [ticket, setTicket] = useState({
    category: "geral",
    priority: "media",
    subject: "",
    message: "",
  });
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(
    data.tickets[0]?.id ?? null,
  );
  const [ticketReply, setTicketReply] = useState("");
  const [request, setRequest] = useState({
    type: "substituicao",
    tournament_id: String(data.entries[0]?.tournament_id ?? ""),
    match_id: String(data.matches[0]?.id ?? ""),
    outgoing_player_id: "",
    incoming_player_id: "",
    requested_for: "",
    subject: "",
    description: "",
    evidence_url: "",
  });
  function sendCompetitionRequest() {
    return createLeaderCompetitionRequest({
      ...request,
      tournament_id: request.tournament_id
        ? Number(request.tournament_id)
        : null,
      match_id: request.match_id ? Number(request.match_id) : null,
      outgoing_player_id: request.outgoing_player_id
        ? Number(request.outgoing_player_id)
        : null,
      incoming_player_id: request.incoming_player_id
        ? Number(request.incoming_player_id)
        : null,
    });
  }
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <ChatPanel
          title="Chat da equipe"
          messages={data.messages.team}
          value={teamMessage}
          attachment={teamAttachment}
          onAttachment={setTeamAttachment}
          onChange={setTeamMessage}
          busy={busy === "team-message"}
          onSend={() =>
            void run(
              "team-message",
              async () => {
                await sendLeaderTeamMessage({
                  message: teamMessage,
                  attachment_url: teamAttachment || null,
                });
                setTeamMessage("");
                setTeamAttachment("");
              },
              "Mensagem enviada",
            )
          }
        />
        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold">
              Chat do torneio
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={tournamentId}
              onChange={(e) => setTournamentId(e.target.value)}
            >
              <option value="">Selecione um torneio</option>
              {data.entries.map((entry) => (
                <option key={entry.id} value={entry.tournament_id}>
                  {entry.tournament_name}
                </option>
              ))}
            </Select>
            <MessageList
              messages={data.messages.tournaments.filter(
                (message) => String(message.tournament_id) === tournamentId,
              )}
            />
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input
                placeholder="Mensagem oficial"
                value={tournamentMessage}
                onChange={(e) => setTournamentMessage(e.target.value)}
              />
              <Button
                disabled={!tournamentId || !tournamentMessage.trim()}
                loading={busy === "tournament-message"}
                icon={<Send className="h-4 w-4" />}
                onClick={() =>
                  void run(
                    "tournament-message",
                    async () => {
                      await sendLeaderTournamentMessage(Number(tournamentId), {
                        message: tournamentMessage,
                        attachment_url: tournamentAttachment || null,
                      });
                      setTournamentMessage("");
                      setTournamentAttachment("");
                    },
                    "Mensagem enviada",
                  )
                }
              />
              <Input
                className="sm:col-span-2"
                placeholder="URL de arquivo ou imagem (opcional)"
                value={tournamentAttachment}
                onChange={(e) => setTournamentAttachment(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">
            Solicitacoes competitivas
          </h2>
          <p className="mt-1 text-sm text-arena-muted">
            Substituicoes, adiamentos e outras excecoes seguem para analise da
            administracao.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Tipo">
              <Select
                value={request.type}
                onChange={(e) =>
                  setRequest((s) => ({ ...s, type: e.target.value }))
                }
              >
                <option value="substituicao">Substituicao de jogador</option>
                <option value="adiamento">Adiamento de partida</option>
                <option value="outro">Outra solicitacao</option>
              </Select>
            </Field>
            {request.type === "substituicao" ? (
              <>
                <Field label="Torneio">
                  <Select
                    value={request.tournament_id}
                    onChange={(e) =>
                      setRequest((s) => ({
                        ...s,
                        tournament_id: e.target.value,
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    {data.entries.map((entry) => (
                      <option key={entry.id} value={entry.tournament_id}>
                        {entry.tournament_name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Jogador que sai">
                  <Select
                    value={request.outgoing_player_id}
                    onChange={(e) =>
                      setRequest((s) => ({
                        ...s,
                        outgoing_player_id: e.target.value,
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    {data.members
                      .filter((member) => member.player_id)
                      .map((member) => (
                        <option key={member.id} value={member.player_id!}>
                          {member.nick || member.nome}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Field label="Jogador que entra">
                  <Select
                    value={request.incoming_player_id}
                    onChange={(e) =>
                      setRequest((s) => ({
                        ...s,
                        incoming_player_id: e.target.value,
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    {data.members
                      .filter((member) => member.player_id)
                      .map((member) => (
                        <option key={member.id} value={member.player_id!}>
                          {member.nick || member.nome}
                        </option>
                      ))}
                  </Select>
                </Field>
              </>
            ) : request.type === "adiamento" ? (
              <>
                <Field label="Partida">
                  <Select
                    value={request.match_id}
                    onChange={(e) =>
                      setRequest((s) => ({ ...s, match_id: e.target.value }))
                    }
                  >
                    <option value="">Selecione</option>
                    {data.matches.map((match) => (
                      <option key={match.id} value={match.id}>
                        #{match.id} · {match.opponent}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Nova data sugerida">
                  <Input
                    type="datetime-local"
                    value={request.requested_for}
                    onChange={(e) =>
                      setRequest((s) => ({
                        ...s,
                        requested_for: e.target.value,
                      }))
                    }
                  />
                </Field>
              </>
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Assunto">
              <Input
                value={request.subject}
                onChange={(e) =>
                  setRequest((s) => ({ ...s, subject: e.target.value }))
                }
              />
            </Field>
            <Field label="Evidencia (URL opcional)">
              <Input
                value={request.evidence_url}
                onChange={(e) =>
                  setRequest((s) => ({ ...s, evidence_url: e.target.value }))
                }
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Justificativa">
                <Textarea
                  value={request.description}
                  onChange={(e) =>
                    setRequest((s) => ({ ...s, description: e.target.value }))
                  }
                />
              </Field>
            </div>
          </div>
          <Button
            loading={busy === "competition-request"}
            onClick={() =>
              void run(
                "competition-request",
                sendCompetitionRequest,
                "Solicitacao enviada",
              )
            }
          >
            Enviar para analise
          </Button>
          <DataTable
            data={data.competition_requests.filter(
              (item) => item.type !== "reembolso",
            )}
            columns={[
              { header: "Tipo", cell: (item) => formatRequestType(item.type) },
              {
                header: "Assunto",
                cell: (item) => (
                  <div>
                    <p className="font-semibold">{item.subject}</p>
                    <p className="text-xs text-arena-muted">
                      {item.tournament_name ||
                        (item.match_id ? `Partida #${item.match_id}` : "Geral")}
                    </p>
                  </div>
                ),
              },
              {
                header: "Status",
                cell: (item) => <StatusBadge value={item.status} />,
              },
              {
                header: "Atualizacao",
                cell: (item) =>
                  item.admin_response || "Aguardando administracao",
              },
            ]}
          />
        </CardContent>
      </Card>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold">
              Abrir disputa
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Partida">
              <Select
                value={dispute.match_id}
                onChange={(e) =>
                  setDispute((s) => ({ ...s, match_id: e.target.value }))
                }
              >
                {data.matches.map((match) => (
                  <option key={match.id} value={match.id}>
                    #{match.id} · {match.opponent}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Titulo">
              <Input
                value={dispute.title}
                onChange={(e) =>
                  setDispute((s) => ({ ...s, title: e.target.value }))
                }
              />
            </Field>
            <Field label="Motivo">
              <Textarea
                value={dispute.description}
                onChange={(e) =>
                  setDispute((s) => ({ ...s, description: e.target.value }))
                }
              />
            </Field>
            <Field label="Evidencias (links)">
              <Input
                value={dispute.evidence}
                onChange={(e) =>
                  setDispute((s) => ({ ...s, evidence: e.target.value }))
                }
              />
            </Field>
            <Button
              loading={busy === "dispute"}
              onClick={() =>
                void run(
                  "dispute",
                  () =>
                    createLeaderDispute({
                      ...dispute,
                      match_id: Number(dispute.match_id),
                    }),
                  "Disputa aberta",
                )
              }
            >
              Abrir disputa
            </Button>
            <div className="space-y-2 border-t border-arena-line pt-4">
              {data.disputes.map((item) => (
                <div
                  className="flex items-center justify-between border border-arena-line p-3"
                  key={item.id}
                >
                  <span className="text-sm font-semibold">{item.title}</span>
                  <StatusBadge value={item.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold">Suporte</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Categoria">
                <Input
                  value={ticket.category}
                  onChange={(e) =>
                    setTicket((s) => ({ ...s, category: e.target.value }))
                  }
                />
              </Field>
              <Field label="Prioridade">
                <Select
                  value={ticket.priority}
                  onChange={(e) =>
                    setTicket((s) => ({ ...s, priority: e.target.value }))
                  }
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="critica">Critica</option>
                </Select>
              </Field>
            </div>
            <Field label="Assunto">
              <Input
                value={ticket.subject}
                onChange={(e) =>
                  setTicket((s) => ({ ...s, subject: e.target.value }))
                }
              />
            </Field>
            <Field label="Mensagem">
              <Textarea
                value={ticket.message}
                onChange={(e) =>
                  setTicket((s) => ({ ...s, message: e.target.value }))
                }
              />
            </Field>
            <Button
              loading={busy === "ticket"}
              onClick={() =>
                void run(
                  "ticket",
                  () => createLeaderTicket(ticket),
                  "Ticket aberto",
                )
              }
            >
              Enviar ao suporte
            </Button>
            <div className="space-y-3 border-t border-arena-line pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-arena-muted">
                Meus chamados
              </p>
              {data.tickets.map((item) => {
                const selected = selectedTicketId === item.id;
                return (
                  <div
                    className={`border ${selected ? "border-cyan-400/50" : "border-arena-line"}`}
                    key={item.id}
                  >
                    <button
                      className={`flex w-full items-center justify-between gap-3 p-3 text-left ${selected ? "bg-cyan-400/[.06]" : "hover:bg-white/[.03]"}`}
                      type="button"
                      onClick={() =>
                        setSelectedTicketId(selected ? null : item.id)
                      }
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          #{item.id} · {item.subject}
                        </p>
                        <p className="mt-1 text-xs text-arena-muted">
                          Atualizado em{" "}
                          {formatDate(item.updated_at || item.created_at)}
                        </p>
                      </div>
                      <StatusBadge value={item.status} />
                    </button>
                    {selected ? (
                      <div className="space-y-3 border-t border-arena-line p-3">
                        <div className="border border-cyan-400/25 bg-cyan-400/[.05] p-3">
                          <p className="text-[11px] font-semibold uppercase text-cyan-200">
                            Solicitacao inicial
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm">
                            {item.message}
                          </p>
                        </div>
                        {(item.messages ?? []).map((message) => (
                          <div
                            className={`max-w-[92%] border p-3 ${message.role === "admin" ? "ml-auto border-emerald-400/30 bg-emerald-400/[.07]" : "border-cyan-400/25 bg-cyan-400/[.05]"}`}
                            key={message.id}
                          >
                            <p className="text-[11px] font-semibold uppercase text-arena-muted">
                              {message.role === "admin"
                                ? "Equipe Arena Camp"
                                : "Você"}{" "}
                              · {formatDate(message.created_at)}
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm">
                              {message.message}
                            </p>
                          </div>
                        ))}
                        {item.response &&
                        !(item.messages ?? []).some(
                          (message) => message.role === "admin",
                        ) ? (
                          <div className="ml-auto max-w-[92%] border border-emerald-400/30 bg-emerald-400/[.07] p-3">
                            <p className="text-[11px] font-semibold uppercase text-emerald-200">
                              Equipe Arena Camp
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm">
                              {item.response}
                            </p>
                          </div>
                        ) : null}
                        <Field label="Responder ao atendimento">
                          <Textarea
                            placeholder="Escreva sua resposta ou envie mais informações"
                            value={ticketReply}
                            onChange={(event) =>
                              setTicketReply(event.target.value)
                            }
                          />
                        </Field>
                        <Button
                          disabled={!ticketReply.trim()}
                          icon={<Send className="h-4 w-4" />}
                          loading={busy === `ticket-reply-${item.id}`}
                          onClick={() =>
                            void run(
                              `ticket-reply-${item.id}`,
                              async () => {
                                await replyLeaderTicket(item.id, ticketReply);
                                setTicketReply("");
                              },
                              "Resposta enviada",
                            )
                          }
                        >
                          Responder suporte
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {!data.tickets.length ? (
                <InlineEmpty text="Nenhum chamado aberto." />
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HistoryModule({ data }: { data: LeaderWorkspace }) {
  const results = data.matches.filter((match) => match.status === "finalizada");
  const headToHead = [...new Set(results.map((match) => match.opponent))].map(
    (opponent) => {
      const matches = results.filter((match) => match.opponent === opponent);
      const wins = matches.filter(
        (match) => Number(match.winner_team_id) === Number(data.team?.id),
      ).length;
      return {
        opponent,
        matches: matches.length,
        wins,
        losses: matches.length - wins,
      };
    },
  );
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Ranking"
          value={
            data.statistics.platform_rank
              ? `#${data.statistics.platform_rank}`
              : "Sem ranking"
          }
          icon={<Crown className="h-5 w-5" />}
        />
        <StatCard
          label="Vitorias"
          value={String(data.statistics.wins)}
          icon={<Trophy className="h-5 w-5" />}
        />
        <StatCard
          label="Derrotas"
          value={String(data.statistics.losses)}
          icon={<Swords className="h-5 w-5" />}
        />
        <StatCard
          label="Kills"
          value={String(data.statistics.kills)}
          helper={`${data.statistics.hs_percent}% HS`}
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <StatCard
          label="MVPs"
          value={String(data.statistics.mvps)}
          icon={<Crown className="h-5 w-5" />}
        />
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">
            Histórico de confrontos
          </h2>
        </CardHeader>
        <DataTable
          data={results}
          columns={[
            { header: "Torneio", cell: (match) => match.tournament_name },
            { header: "Adversario", cell: (match) => match.opponent },
            {
              header: "Placar",
              cell: (match) => `${match.score_team_a} x ${match.score_team_b}`,
            },
            {
              header: "Resultado",
              cell: (match) => (
                <Badge
                  tone={
                    Number(match.winner_team_id) === Number(data.team?.id)
                      ? "success"
                      : "danger"
                  }
                >
                  {Number(match.winner_team_id) === Number(data.team?.id)
                    ? "Vitoria"
                    : "Derrota"}
                </Badge>
              ),
            },
            { header: "Data", cell: (match) => formatDate(match.finished_at) },
          ]}
        />
      </Card>
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold">
              Comparativo entre equipes
            </h2>
          </CardHeader>
          <DataTable
            data={headToHead}
            columns={[
              { header: "Adversario", cell: (item) => item.opponent },
              { header: "Jogos", cell: (item) => item.matches },
              { header: "Vitorias", cell: (item) => item.wins },
              { header: "Derrotas", cell: (item) => item.losses },
            ]}
          />
        </Card>
        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold">Temporadas</h2>
          </CardHeader>
          <DataTable
            data={data.statistics.seasons}
            columns={[
              { header: "Temporada", cell: (item) => item.season },
              { header: "Jogos", cell: (item) => item.matches },
              { header: "Vitorias", cell: (item) => item.wins },
              { header: "Derrotas", cell: (item) => item.losses },
            ]}
          />
        </Card>
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">Conquistas</h2>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {data.statistics.achievements.map((achievement) => (
            <div
              className="border border-cyan-400/30 bg-cyan-400/[.06] p-4"
              key={achievement.code}
            >
              <Trophy className="h-5 w-5 text-cyan-200" />
              <p className="mt-3 font-semibold">{achievement.title}</p>
              <p className="mt-1 text-sm text-arena-muted">
                {achievement.description}
              </p>
            </div>
          ))}
          {!data.statistics.achievements.length ? (
            <InlineEmpty text="A primeira conquista será liberada com uma vitoria oficial." />
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">Participacoes</h2>
        </CardHeader>
        <DataTable
          data={data.entries}
          columns={[
            { header: "Torneio", cell: (entry) => entry.tournament_name },
            {
              header: "Lineup",
              cell: (entry) => entry.lineup_name || "Legada",
            },
            {
              header: "Status",
              cell: (entry) => <StatusBadge value={entry.status} />,
            },
            {
              header: "Periodo",
              cell: (entry) =>
                `${formatDate(entry.inicio)} ate ${formatDate(entry.fim)}`,
            },
          ]}
        />
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">
            Histórico de gestao do elenco
          </h2>
        </CardHeader>
        <DataTable
          data={data.member_history}
          columns={[
            { header: "Quando", cell: (item) => formatDate(item.created_at) },
            {
              header: "Ação",
              cell: (item) => formatHistoryAction(item.action),
            },
            { header: "Responsavel", cell: (item) => item.actor_name },
            { header: "Membro", cell: (item) => item.subject_name || "Equipe" },
          ]}
        />
      </Card>
    </div>
  );
}

function SettingsModule({ data, busy, run }: ModuleProps) {
  const [preferences, setPreferences] = useState({ ...data.preferences });
  useEffect(() => setArenaTheme(preferences.theme), [preferences.theme]);
  const [document, setDocument] = useState({
    name: "",
    type: "outro",
    url: "",
  });
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">Preferências</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Idioma">
            <Select
              value={preferences.language}
              onChange={(e) =>
                setPreferences((s) => ({ ...s, language: e.target.value }))
              }
            >
              <option value="pt-BR">Português</option>
              <option value="en-US">English</option>
              <option value="es-ES">Español</option>
            </Select>
          </Field>
          <Field label="Tema">
            <Select
              value={preferences.theme}
              onChange={(e) =>
                setPreferences((s) => ({
                  ...s,
                  theme: e.target.value as typeof preferences.theme,
                }))
              }
            >
              <option value="dark">Escuro</option>
              <option value="light">Claro</option>
              <option value="system">Sistema</option>
            </Select>
          </Field>
          {[
            ["email_notifications", "Notificações por email"],
            ["discord_notifications", "Notificações pelo Discord"],
            ["profile_public", "Perfil público"],
          ].map(([key, label]) => (
            <label
              className="flex items-center gap-3 text-sm font-semibold"
              key={key}
            >
              <input
                checked={Boolean(preferences[key as keyof typeof preferences])}
                className="h-4 w-4 accent-cyan-400"
                type="checkbox"
                onChange={(e) =>
                  setPreferences((s) => ({ ...s, [key]: e.target.checked }))
                }
              />
              {label}
            </label>
          ))}
          <Button
            loading={busy === "preferences"}
            icon={<Save className="h-4 w-4" />}
            onClick={() =>
              void run(
                "preferences",
                () =>
                  updateLeaderPreferences({
                    language: preferences.language,
                    theme: preferences.theme,
                    email_notifications: preferences.email_notifications,
                    discord_notifications: preferences.discord_notifications,
                    profile_public: preferences.profile_public,
                  }),
                "Preferências salvas",
              )
            }
          >
            Salvar preferências
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-display text-xl font-semibold">
            Central de documentos
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nome">
              <Input
                value={document.name}
                onChange={(e) =>
                  setDocument((s) => ({ ...s, name: e.target.value }))
                }
              />
            </Field>
            <Field label="Tipo">
              <Select
                value={document.type}
                onChange={(e) =>
                  setDocument((s) => ({ ...s, type: e.target.value }))
                }
              >
                <option value="regulamento">Regulamento</option>
                <option value="comprovante">Comprovante</option>
                <option value="evidencia">Evidencia</option>
                <option value="outro">Outro</option>
              </Select>
            </Field>
          </div>
          <Field label="URL do arquivo">
            <Input
              value={document.url}
              onChange={(e) =>
                setDocument((s) => ({ ...s, url: e.target.value }))
              }
            />
          </Field>
          <Button
            loading={busy === "document"}
            icon={<FileText className="h-4 w-4" />}
            onClick={() =>
              void run(
                "document",
                () => createLeaderDocument(document),
                "Documento adicionado",
              )
            }
          >
            Adicionar documento
          </Button>
          <div className="space-y-2 border-t border-arena-line pt-4">
            {data.documents.map((item) => (
              <a
                className="flex items-center justify-between border border-arena-line p-3 hover:bg-white/[.04]"
                href={item.url}
                key={item.id}
                rel="noreferrer"
                target="_blank"
              >
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-arena-muted">
                    {item.type} · {formatDate(item.created_at)}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4" />
              </a>
            ))}
            {!data.documents.length ? (
              <InlineEmpty text="Nenhum documento salvo." />
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChatPanel({
  title,
  messages,
  value,
  attachment,
  onChange,
  onAttachment,
  onSend,
  busy,
}: {
  title: string;
  messages: LeaderWorkspace["messages"]["team"];
  value: string;
  attachment: string;
  onChange: (value: string) => void;
  onAttachment: (value: string) => void;
  onSend: () => void;
  busy: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <MessageList messages={messages} />
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            placeholder="Mensagem para a equipe"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <Button
            disabled={!value.trim()}
            loading={busy}
            icon={<Send className="h-4 w-4" />}
            onClick={onSend}
          />
          <div className="relative sm:col-span-2">
            <Paperclip className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-arena-muted" />
            <Input
              className="pl-9"
              placeholder="URL de arquivo ou imagem (opcional)"
              value={attachment}
              onChange={(e) => onAttachment(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
function MessageList({
  messages,
}: {
  messages: LeaderWorkspace["messages"]["team"];
}) {
  return (
    <div className="h-72 space-y-3 overflow-y-auto border border-arena-line bg-black/20 p-3">
      {messages.map((message) => (
        <div key={message.id}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              {message.nickname || message.nome}
            </span>
            <span className="text-xs text-arena-muted">
              {formatShortDate(message.created_at)}
            </span>
          </div>
          <p className="mt-1 text-sm text-arena-text">{message.message}</p>
          {message.attachment_url ? (
            <a
              className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-cyan-200 hover:underline"
              href={message.attachment_url}
              rel="noreferrer"
              target="_blank"
            >
              <Paperclip className="h-3 w-3" />
              Abrir anexo
            </a>
          ) : null}
        </div>
      ))}
      {!messages.length ? (
        <InlineEmpty text="Nenhuma mensagem nesta conversa." />
      ) : null}
    </div>
  );
}
function PlayerChecklist({
  title,
  players,
  selected,
  onToggle,
  disabled,
}: {
  title: string;
  players: LeaderMember[];
  selected: number[];
  onToggle: (id: number) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase text-arena-muted">
        {title} · {selected.length}
      </p>
      <div className="space-y-2">
        {players.map((member) => (
          <label
            className={`flex items-center gap-3 border p-3 ${selected.includes(member.player_id!) ? "border-cyan-400/40 bg-cyan-400/10" : "border-arena-line"}`}
            key={member.id}
          >
            <input
              checked={selected.includes(member.player_id!)}
              disabled={disabled}
              className="h-4 w-4 accent-cyan-400"
              type="checkbox"
              onChange={() => onToggle(member.player_id!)}
            />
            <span>
              <span className="block text-sm font-semibold">
                {member.nick || member.nome}
              </span>
              <span className="text-xs text-arena-muted">
                #{member.player_id} · {member.game_uid || "ID pendente"}
              </span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
function MatchRow({ match }: { match: LeaderMatch }) {
  return (
    <div className="flex items-center justify-between gap-4 border border-arena-line p-3">
      <div>
        <p className="font-semibold">vs {match.opponent}</p>
        <p className="mt-1 text-xs text-arena-muted">
          {match.tournament_name} · {formatShortDate(match.scheduled_at)}
        </p>
      </div>
      {match.status === "finalizada" ? (
        <span className="font-display text-lg font-bold">
          {match.score_team_a} x {match.score_team_b}
        </span>
      ) : (
        <StatusBadge value={match.status} />
      )}
    </div>
  );
}
function QuickMetric({
  label,
  value,
  action,
  onClick,
}: {
  label: string;
  value: number;
  action: string;
  onClick: () => void;
}) {
  return (
    <button
      className="border border-arena-line p-4 text-left hover:bg-white/[.04]"
      onClick={onClick}
    >
      <p className="text-xs font-semibold uppercase text-arena-muted">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      <p className="mt-2 text-xs text-cyan-200">{action}</p>
    </button>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-arena-line bg-black/20 p-3">
      <p className="text-xs uppercase text-arena-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-28 w-full resize-y rounded-arena border border-arena-line bg-black/25 p-3 text-sm text-arena-text focus:border-arena-cyan"
    />
  );
}
function InlineEmpty({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-arena-line p-5 text-center text-sm text-arena-muted">
      {text}
    </div>
  );
}
function StatusBadge({ value }: { value: string }) {
  const normalized = String(value);
  const tone = [
    "ativo",
    "ativa",
    "aberto",
    "aprovado",
    "aprovada",
    "pago",
    "confirmado",
    "finalizada",
    "finalizado",
    "congelada",
    "liberado",
  ].includes(normalized)
    ? "success"
    : [
          "cancelado",
          "cancelada",
          "cancelled",
          "rejeitado",
          "rejeitada",
          "ausente",
          "inativo",
          "derrota",
        ].includes(normalized)
      ? "danger"
      : [
            "pendente",
            "pending",
            "aguardando",
            "rascunho",
            "agendada",
            "aberta",
            "talvez",
          ].includes(normalized)
        ? "warning"
        : "info";
  return <Badge tone={tone}>{statusLabel(normalized)}</Badge>;
}
function LeaderLoading() {
  return (
    <section className="space-y-5 px-4 pb-12 lg:px-8">
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton className="h-32" key={item} />
        ))}
      </div>
      <Skeleton className="h-96" />
    </section>
  );
}

type ModuleProps = { data: LeaderWorkspace; busy: string | null; run: Runner };
function teamForm(team: LeaderWorkspace["team"]) {
  return {
    nome: team?.nome ?? "",
    tag: team?.tag ?? "",
    logo: team?.logo ?? "",
    banner: team?.banner ?? "",
    descricao: team?.descricao ?? "",
    regiao: team?.regiao ?? "",
    discord: team?.discord ?? "",
    steam: team?.steam ?? "",
    instagram: team?.instagram ?? "",
    youtube: team?.youtube ?? "",
    twitch: team?.twitch ?? "",
    tiktok: team?.tiktok ?? "",
    website: team?.website ?? "",
    recrutando: team?.recrutando ?? true,
    privada: team?.privada ?? false,
  };
}
function lineupForm(lineup: LeaderLineup | null) {
  return {
    name: lineup?.name ?? "",
    status: lineup?.status === "ativa" ? "ativa" : "rascunho",
    titulares:
      lineup?.players
        .filter((player) => player.titular)
        .map((player) => player.player_id) ?? [],
    reservas:
      lineup?.players
        .filter((player) => !player.titular)
        .map((player) => player.player_id) ?? [],
  };
}
function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Tente novamente.";
}
function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}
function formatDate(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "A definir";
}
function formatShortDate(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      })
    : "A definir";
}
function formatLabel(value: string | null) {
  return (
    (
      {
        single_elimination: "Eliminacao simples",
        double_elimination: "Eliminacao dupla",
        swiss: "Sistema suico",
        round_robin: "Todos contra todos",
        group_playoffs: "Grupos + eliminatorias",
        league: "Liga",
        custom: "Personalizado",
      } as Record<string, string>
    )[value ?? ""] ?? "Formato a definir"
  );
}
function statusLabel(value: string) {
  return (
    (
      {
        pending: "Pendente",
        accepted: "Aceito",
        rejected: "Recusado",
        cancelled: "Cancelado",
        aguardando: "Aguardando",
        em_andamento: "Em andamento",
        em_analise: "Em analise",
        rascunho: "Rascunho",
        ativa: "Ativa",
        congelada: "Congelada",
        agendada: "Agendada",
        finalizada: "Finalizada",
        confirmado: "Confirmado",
        ausente: "Ausente",
        talvez: "Talvez",
        aberta: "Aberta",
        aprovada: "Aprovada",
        rejeitada: "Rejeitada",
        cancelada: "Cancelada",
      } as Record<string, string>
    )[value] ?? value.replaceAll("_", " ")
  );
}
function formatRequestType(value: string) {
  return (
    (
      {
        substituicao: "Substituicao",
        adiamento: "Adiamento",
        reembolso: "Reembolso",
        outro: "Outra",
      } as Record<string, string>
    )[value] ?? value
  );
}
function formatHistoryAction(value: string) {
  return (
    (
      {
        convite_enviado: "Convite enviado",
        solicitacao_accept: "Entrada aprovada",
        solicitacao_reject: "Solicitacao recusada",
        solicitacao_block: "Usuário bloqueado",
        solicitacao_cancel: "Convite cancelado",
        membro_atualizado: "Cargo ou status alterado",
        lideranca_transferida: "Lideranca transferida",
        membro_removido: "Membro removido",
        equipe_arquivada: "Equipe arquivada",
        equipe_reativada: "Equipe reativada",
      } as Record<string, string>
    )[value] ?? value.replaceAll("_", " ")
  );
}
function printReceipt(
  payment: LeaderWorkspace["payments"][number],
  team: NonNullable<LeaderWorkspace["team"]>,
) {
  const receipt = window.open("", "_blank", "width=760,height=700");
  if (!receipt) return;
  receipt.opener = null;
  receipt.document.write(
    `<!doctype html><html><head><title>Recibo Arena Camp</title><style>body{font-family:Arial,sans-serif;color:#101828;max-width:680px;margin:48px auto;padding:0 24px}h1{font-size:26px}section{border:1px solid #d0d5dd;padding:24px;margin-top:24px}.row{display:flex;justify-content:space-between;border-bottom:1px solid #eaecf0;padding:12px 0}.ok{color:#067647;font-weight:700}@media print{button{display:none}}</style></head><body><h1>Arena Camp</h1><p>Recibo de inscricao competitiva</p><section><div class="row"><span>Equipe</span><strong>${escapeHtml(team.nome)}</strong></div><div class="row"><span>Torneio</span><strong>${escapeHtml(payment.tournament_name)}</strong></div><div class="row"><span>Valor</span><strong>${formatCurrency(payment.valor)}</strong></div><div class="row"><span>Referencia</span><strong>${escapeHtml(payment.external_reference || payment.payment_id || `#${payment.id}`)}</strong></div><div class="row"><span>Data</span><strong>${formatDate(payment.paid_at || payment.created_at)}</strong></div><div class="row"><span>Status</span><span class="ok">Pagamento aprovado</span></div></section><p>Documento gerado a partir dos dados oficiais da plataforma.</p><button onclick="window.print()">Imprimir recibo</button></body></html>`,
  );
  receipt.document.close();
}
function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ]!,
  );
}
function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
function confirmAction(message: string, action: () => void | Promise<unknown>) {
  if (window.confirm(message)) void action();
}
