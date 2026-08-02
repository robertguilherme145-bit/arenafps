import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BadgeDollarSign,
  Ban,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  Gamepad2,
  Gavel,
  LifeBuoy,
  Mail,
  MessageSquare,
  PencilLine,
  PlayCircle,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  Trash2,
  Users,
} from "lucide-react";
import {
  approveAdminEntry,
  banAdminAccessAccount,
  cancelAdminEntry,
  createAdminAchievement,
  createAdminPublicContent,
  createAdminDispute,
  createAdminPenalty,
  createAdminTicket,
  deleteAdminAccessAccount,
  getAdminAuditLogs,
  getAdminAchievements,
  getAdminAccessAccounts,
  getAdminPublicContent,
  getAdminPublicContacts,
  getAdminDashboard,
  getAdminDisputes,
  getAdminCompetitionGames,
  getAdminEntries,
  getAdminEntryLineup,
  getAdminPayments,
  getAdminPenalties,
  getAdminPlayers,
  getAdminTeams,
  getAdminTickets,
  getTournamentMatches,
  resolveAdminPenalty,
  saveAdminEntryLineup,
  sendAdminNotification,
  updateAdminEntryPayment,
  updateAdminAchievement,
  updateAdminAccessAccount,
  updateAdminPublicContent,
  updateAdminPublicContact,
  updateAdminDispute,
  updateAdminPaymentStatus,
  updateAdminPlayer,
  updateAdminTicket,
  updateAdminTeam,
  unbanAdminAccessAccount,
  updateTournament,
  updateTournamentStatus,
} from "../services/api";
import { RevenueChart } from "../components/charts/RevenueChart";
import { CompetitionOperationsWorkspace } from "../features/admin/CompetitionOperationsWorkspace";
import { OfficialTournamentsWorkspace } from "../features/admin/OfficialTournamentsWorkspace";
import { DiscordServerWorkspace } from "../features/admin/DiscordServerWorkspace";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { DataTable } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { Input, Label, Select } from "../components/ui/Form";
import { PageHeader } from "../components/ui/PageHeader";
import { StatCard } from "../components/ui/StatCard";
import { useToast } from "../hooks/useToast";
import { useTournamentInsights, useTournaments } from "../hooks/useArenaData";
import type {
  AdminCompetitionGame,
  AchievementDefinition,
  AdminAccessAccount,
  AdminDashboardData,
  AdminEntry,
  AdminPayment,
  AdminPenalty,
  AdminPlayer,
  AdminTeam,
  AuditLog,
  Dispute,
  EntryPlayer,
  Match,
  PublicContent,
  PublicContactMessage,
  SupportTicket,
  Tournament,
} from "../types/api";

const statusActions = {
  criado: ["aberto", "cancelado"],
  aberto: ["fechado", "cancelado"],
  fechado: ["em_andamento", "cancelado"],
  em_andamento: ["finalizado"],
  finalizado: [],
  cancelado: [],
} satisfies Record<Tournament["status"], Tournament["status"][]>;

const statusLabels: Record<Tournament["status"], string> = {
  criado: "Criado",
  aberto: "Aberto",
  fechado: "Fechado",
  em_andamento: "Em andamento",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const adminModules = [
  {
    id: "dashboard",
    title: "Visao geral",
    description: "Acompanhe indicadores, pendencias e o ritmo da plataforma.",
  },
  {
    id: "competitions",
    title: "Torneios e inscrições",
    description: "Configure torneios, aprove equipes e organize as lineups.",
  },
  {
    id: "operations",
    title: "Central de partidas",
    description: "Cadastre jogos e mapas, prepare partidas, Pick & Ban e resultados.",
  },
  {
    id: "community",
    title: "Equipes e jogadores",
    description: "Gerencie a comunidade, comunicados, penalidades e disputas.",
  },
  {
    id: "progression",
    title: "Conquistas e XP",
    description: "Crie metas competitivas e recompensas para os jogadores.",
  },
  {
    id: "content",
    title: "Conteúdo do portal",
    description: "Publique noticias, FAQ, parceiros e mensagens institucionais.",
  },
  {
    id: "official",
    title: "Circuito oficial",
    description: "Publique campeonatos externos, agenda, transmissao e resultados.",
  },
  {
    id: "access",
    title: "Contas e permissões",
    description: "Controle papeis, jogos vinculados e verificacao das contas.",
  },
  {
    id: "finance",
    title: "Financeiro",
    description: "Acompanhe pagamentos, confirmacoes e receita dos torneios.",
  },
  {
    id: "audit",
    title: "Auditoria",
    description: "Consulte o histórico de alteracoes administrativas.",
  },
] as const;

export function AdminDashboardPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: tournaments = [], refetch: refetchTournaments } =
    useTournaments();
  const [activeModule, setActiveModule] = useState<
    (typeof adminModules)[number]["id"]
  >(() => {
    const requested = searchParams.get("module");
    return adminModules.some((module) => module.id === requested)
      ? (requested as (typeof adminModules)[number]["id"])
      : "dashboard";
  });
  const [activeTournamentId, setActiveTournamentId] = useState<number | null>(
    null,
  );
  const [games, setGames] = useState<AdminCompetitionGame[]>([]);
  const [gameFilter, setGameFilter] = useState(
    () => searchParams.get("game") || "all",
  );
  const [tournamentStatusFilter, setTournamentStatusFilter] = useState<
    Tournament["status"] | "all"
  >(() => {
    const requested = searchParams.get("status");
    return requested && requested in statusLabels
      ? (requested as Tournament["status"])
      : "all";
  });
  const [adminDashboard, setAdminDashboard] =
    useState<AdminDashboardData | null>(null);
  const [entries, setEntries] = useState<AdminEntry[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [penalties, setPenalties] = useState<AdminPenalty[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [achievements, setAchievements] = useState<AchievementDefinition[]>([]);
  const [publicContent, setPublicContent] = useState<PublicContent[]>([]);
  const [publicContacts, setPublicContacts] = useState<PublicContactMessage[]>(
    [],
  );
  const [accessAccounts, setAccessAccounts] = useState<AdminAccessAccount[]>(
    [],
  );
  const [matches, setMatches] = useState<Match[]>([]);
  const [lineup, setLineup] = useState<EntryPlayer[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [savingTournament, setSavingTournament] = useState(false);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [savingLineup, setSavingLineup] = useState(false);
  const [tournamentForm, setTournamentForm] = useState({
    nome: "",
    descricao: "",
    valor: "",
    max_teams: "",
    titulares: "",
    reservas: "",
    premiacao: "",
    inicio: "",
    fim: "",
  });
  const [lineupForm, setLineupForm] = useState({
    titulares: "",
    reservas: "",
  });
  const [notificationForm, setNotificationForm] = useState({
    user_ids: "",
    titulo: "",
    mensagem: "",
    link: "",
  });
  const [penaltyForm, setPenaltyForm] = useState({
    player_id: "",
    tournament_id: "",
    type: "warning" as AdminPenalty["type"],
    scope: "player" as AdminPenalty["scope"],
    reason: "",
    evidence: "",
    duration_days: "",
    notes: "",
  });
  const [ticketForm, setTicketForm] = useState({
    user_id: "",
    category: "geral",
    priority: "media" as SupportTicket["priority"],
    subject: "",
    message: "",
  });
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<SupportTicket["status"] | "all">("all");
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketReply, setTicketReply] = useState("");
  const [ticketBusy, setTicketBusy] = useState(false);
  const [disputeForm, setDisputeForm] = useState({
    match_id: "",
    tournament_id: "",
    team_id: "",
    title: "",
    description: "",
    evidence: "",
  });
  const [editingAchievementId, setEditingAchievementId] = useState<
    number | null
  >(null);
  const [achievementForm, setAchievementForm] = useState({
    game_id: "",
    code: "",
    title: "",
    description: "",
    metric: "wins" as AchievementDefinition["metric"],
    comparator: "gte" as AchievementDefinition["comparator"],
    target: "1",
    tier: "bronze" as AchievementDefinition["tier"],
    xp_reward: "100",
    icon: "trophy",
    active: true,
  });
  const [editingContentId, setEditingContentId] = useState<number | null>(null);
  const [contentForm, setContentForm] = useState({
    type: "noticia" as PublicContent["type"],
    title: "",
    subtitle: "",
    body: "",
    image_url: "",
    link_url: "",
    author_name: "",
    sort_order: "0",
    published: true,
  });
  const [selectedAccessId, setSelectedAccessId] = useState<number | null>(null);
  const [accessForm, setAccessForm] = useState({
    roles: [] as string[],
    game_ids: [] as number[],
    primary_game_id: null as number | null,
  });
  const [banForm, setBanForm] = useState({
    duration: "7_days",
    reason: "",
  });
  const [moderatingAccess, setModeratingAccess] = useState(false);

  const filteredTournaments = useMemo(
    () =>
      tournaments.filter((tournament) => {
        const matchesGame =
          gameFilter === "all" ||
          String(tournament.game_id ?? tournament.game) === gameFilter;
        const matchesStatus =
          tournamentStatusFilter === "all" ||
          tournament.status === tournamentStatusFilter;
        return matchesGame && matchesStatus;
      }),
    [gameFilter, tournamentStatusFilter, tournaments],
  );

  const activeTournament =
    filteredTournaments.find((item) => item.id === activeTournamentId) ??
    filteredTournaments[0] ??
    null;
  const selectedGame =
    games.find((game) => String(game.id) === gameFilter) ?? null;
  const filteredAchievements = achievements.filter(
    (achievement) =>
      gameFilter === "all" ||
      achievement.game_id === null ||
      String(achievement.game_id) === gameFilter,
  );
  const filteredTeams = teams.filter(
    (team) => gameFilter === "all" || String(team.game_id) === gameFilter,
  );
  const filteredPlayers = players.filter(
    (player) => gameFilter === "all" || String(player.game_id) === gameFilter,
  );
  const filteredAccessAccounts = accessAccounts.filter(
    (account) =>
      gameFilter === "all" || account.game_ids.includes(Number(gameFilter)),
  );
  const newTournamentHref = selectedGame
    ? `/admin/torneios/novo?game=${selectedGame.id}`
    : "/admin/torneios/novo";
  const activeModuleInfo =
    adminModules.find((module) => module.id === activeModule) ?? adminModules[0];
  const showsGameFilter = !["content", "official", "audit"].includes(activeModule);
  const showsStatusFilter = ["dashboard", "competitions"].includes(activeModule);
  const showsTournamentAction = ["dashboard", "competitions"].includes(activeModule);

  const filteredEntries = useMemo(
    () =>
      activeTournament
        ? entries.filter((item) => item.tournament_id === activeTournament.id)
        : [],
    [entries, activeTournament],
  );

  const filteredPayments = useMemo(
    () =>
      activeTournament
        ? payments.filter((item) => item.tournament_id === activeTournament.id)
        : [],
    [payments, activeTournament],
  );

  const scopedTournamentIds = useMemo(
    () => new Set(filteredTournaments.map((item) => item.id)),
    [filteredTournaments],
  );
  const scopedEntries = useMemo(
    () => entries.filter((item) => scopedTournamentIds.has(item.tournament_id)),
    [entries, scopedTournamentIds],
  );
  const scopedPayments = useMemo(
    () =>
      payments.filter((item) => scopedTournamentIds.has(item.tournament_id)),
    [payments, scopedTournamentIds],
  );
  const scopeIsGlobal =
    gameFilter === "all" && tournamentStatusFilter === "all";
  const scopedPendingEntries = scopeIsGlobal
    ? (adminDashboard?.pending_entries ?? 0)
    : scopedEntries.filter((item) => item.status === "pendente").length;
  const scopedConfirmedEntries = scopeIsGlobal
    ? (adminDashboard?.confirmed_entries ?? 0)
    : scopedEntries.filter((item) => item.status === "confirmado").length;
  const scopedApprovedRevenue = scopeIsGlobal
    ? (adminDashboard?.approved_revenue ?? 0)
    : scopedPayments
        .filter((item) => item.status === "aprovado")
        .reduce((total, item) => total + Number(item.valor || 0), 0);
  const scopedPendingPayments = scopeIsGlobal
    ? (adminDashboard?.pending_payments ?? 0)
    : scopedPayments.filter((item) => item.status === "pendente").length;
  const scopedLatestPayments = scopeIsGlobal
    ? (adminDashboard?.latest_payments ?? [])
    : [...scopedPayments]
        .sort((a, b) =>
          String(b.created_at).localeCompare(String(a.created_at)),
        )
        .slice(0, 8);
  const dashboardSeries = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - index));
      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        month: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", ""),
        receita: 0,
        inscricoes: 0,
      };
    });
    const byMonth = new Map(months.map((item) => [item.key, item]));
    scopedPayments.filter((item) => item.status === "aprovado").forEach((item) => {
      const date = new Date(item.paid_at || item.created_at);
      const point = byMonth.get(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
      if (point) point.receita += Number(item.valor || 0);
    });
    scopedEntries.forEach((item) => {
      const date = new Date(item.created_at);
      const point = byMonth.get(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
      if (point) point.inscricoes += 1;
    });
    return months;
  }, [scopedEntries, scopedPayments]);
  const operationalPriorities = [
    { label: "Inscrições aguardando analise", value: scopedPendingEntries, module: "competitions" as const },
    { label: "Pagamentos aguardando confirmação", value: scopedPendingPayments, module: "finance" as const },
    { label: "Partidas aguardando resultado", value: adminDashboard?.matches_waiting_result ?? 0, module: "operations" as const },
    { label: "Disputas abertas", value: adminDashboard?.open_disputes ?? 0, module: "community" as const },
    { label: "Tickets abertos", value: adminDashboard?.open_tickets ?? 0, module: "community" as const },
  ].filter((item) => item.value > 0);
  const filteredTickets = useMemo(() => {
    const query = ticketSearch.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (ticketStatusFilter !== "all" && ticket.status !== ticketStatusFilter) return false;
      if (!query) return true;
      return [ticket.subject, ticket.user_name, ticket.user_email, ticket.category, String(ticket.id)]
        .some((value) => String(value ?? "").toLowerCase().includes(query));
    });
  }, [ticketSearch, ticketStatusFilter, tickets]);
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? filteredTickets[0] ?? null;

  const activeEntry =
    filteredEntries.find((item) => item.id === selectedEntryId) ??
    filteredEntries[0] ??
    null;
  const [rankingQuery, statisticsQuery] = useTournamentInsights(
    activeTournament?.id ?? 0,
  );
  const nextActions = activeTournament
    ? statusActions[activeTournament.status]
    : [];

  const topTeams = rankingQuery.data?.slice(0, 5) ?? [];
  const topPlayers = statisticsQuery.data?.slice(0, 5) ?? [];

  const matchSummary = useMemo(() => {
    const scheduled = matches.filter(
      (item) => item.status === "agendada",
    ).length;
    const live = matches.filter((item) => item.status === "andamento").length;
    const finished = matches.filter(
      (item) => item.status === "finalizada",
    ).length;

    return { total: matches.length, scheduled, live, finished };
  }, [matches]);

  useEffect(() => {
    if (!filteredTournaments.length) {
      setActiveTournamentId(null);
      return;
    }

    setActiveTournamentId((current) =>
      current && filteredTournaments.some((item) => item.id === current)
        ? current
        : filteredTournaments[0].id,
    );
  }, [filteredTournaments]);

  useEffect(() => {
    const requested = searchParams.get("module");
    if (
      requested &&
      adminModules.some((module) => module.id === requested) &&
      requested !== activeModule
    ) {
      setActiveModule(requested as (typeof adminModules)[number]["id"]);
    }
  }, [searchParams, activeModule]);

  useEffect(() => {
    const requestedGame = searchParams.get("game") || "all";
    const requestedStatus = searchParams.get("status");
    const nextStatus =
      requestedStatus && requestedStatus in statusLabels
        ? (requestedStatus as Tournament["status"])
        : "all";

    if (requestedGame !== gameFilter) setGameFilter(requestedGame);
    if (nextStatus !== tournamentStatusFilter)
      setTournamentStatusFilter(nextStatus);
  }, [gameFilter, searchParams, tournamentStatusFilter]);

  useEffect(() => {
    if (!activeTournament) {
      setTournamentForm(blankTournamentForm());
      return;
    }

    setTournamentForm(buildTournamentForm(activeTournament));
  }, [activeTournament]);

  useEffect(() => {
    void loadAdminWorkspace();
    void getAdminCompetitionGames()
      .then((items) => setGames(items.filter((game) => Boolean(game.ativo))))
      .catch((error) =>
        toast.error(
          "Falha ao carregar jogos",
          error instanceof Error ? error.message : "Tente novamente.",
        ),
      );
  }, []);

  useEffect(() => {
    if (!activeTournament?.id) {
      setMatches([]);
      return;
    }

    void loadMatches(activeTournament.id);
  }, [activeTournament?.id]);

  useEffect(() => {
    if (!activeEntry?.id) {
      setSelectedEntryId(null);
      setLineup([]);
      setLineupForm({ titulares: "", reservas: "" });
      return;
    }

    setSelectedEntryId(activeEntry.id);
    void loadLineup(activeEntry.id);
  }, [activeEntry?.id]);

  useEffect(() => {
    if (activeModule !== "finance") return;
    const timer = window.setInterval(() => void loadAdminWorkspace(), 15000);
    return () => window.clearInterval(timer);
  }, [activeModule]);

  async function loadAdminWorkspace() {
    setLoadingAdmin(true);

    try {
      const [
        dashboardData,
        entriesData,
        paymentsData,
        teamsData,
        playersData,
        penaltiesData,
        ticketsData,
        disputesData,
        auditData,
        achievementData,
        publicContentData,
        accessData,
        publicContactsData,
      ] = await Promise.all([
        getAdminDashboard(),
        getAdminEntries(),
        getAdminPayments(),
        getAdminTeams(),
        getAdminPlayers(),
        getAdminPenalties(),
        getAdminTickets(),
        getAdminDisputes(),
        getAdminAuditLogs(40),
        getAdminAchievements(),
        getAdminPublicContent(),
        getAdminAccessAccounts(),
        getAdminPublicContacts(),
      ]);

      setAdminDashboard(dashboardData);
      setEntries(entriesData);
      setPayments(paymentsData);
      setTeams(teamsData);
      setPlayers(playersData);
      setPenalties(penaltiesData);
      setTickets(ticketsData);
      setDisputes(disputesData);
      setAuditLogs(auditData);
      setAchievements(achievementData);
      setPublicContent(publicContentData);
      setAccessAccounts(accessData);
      setPublicContacts(publicContactsData);
    } catch (err) {
      toast.error(
        "Falha ao carregar backoffice",
        err instanceof Error ? err.message : "Tente novamente.",
      );
    } finally {
      setLoadingAdmin(false);
    }
  }

  async function loadMatches(tournamentId: number) {
    setLoadingMatches(true);

    try {
      const data = await getTournamentMatches(tournamentId);
      setMatches(data);
    } catch (err) {
      toast.error(
        "Falha ao carregar partidas",
        err instanceof Error ? err.message : "Tente novamente.",
      );
    } finally {
      setLoadingMatches(false);
    }
  }

  async function loadLineup(entryId: number) {
    try {
      const data = await getAdminEntryLineup(entryId);
      setLineup(data);
      setLineupForm({
        titulares: data
          .filter((item) => Boolean(item.titular))
          .map((item) => item.player_id)
          .join(", "),
        reservas: data
          .filter((item) => !Boolean(item.titular))
          .map((item) => item.player_id)
          .join(", "),
      });
    } catch (err) {
      toast.error(
        "Falha ao carregar lineup",
        err instanceof Error ? err.message : "Tente novamente.",
      );
    }
  }

  async function refreshOperationalData() {
    await Promise.all([
      loadAdminWorkspace(),
      activeTournament ? loadMatches(activeTournament.id) : Promise.resolve(),
      rankingQuery.refetch(),
      statisticsQuery.refetch(),
    ]);
  }

  async function handleStatusChange(status: Tournament["status"]) {
    if (!activeTournament) {
      return;
    }

    setChangingStatus(status);

    try {
      await updateTournamentStatus(activeTournament.id, status);
      toast.success(
        "Status atualizado",
        `O torneio agora esta em ${statusLabels[status].toLowerCase()}.`,
      );
      await refetchTournaments();
    } catch (err) {
      toast.error(
        "Falha ao atualizar status",
        err instanceof Error ? err.message : "Tente novamente.",
      );
    } finally {
      setChangingStatus(null);
    }
  }

  async function handleTournamentSave() {
    if (!activeTournament) {
      return;
    }

    setSavingTournament(true);

    try {
      await updateTournament(activeTournament.id, {
        nome: tournamentForm.nome,
        descricao: tournamentForm.descricao,
        valor: Number(tournamentForm.valor),
        max_teams: Number(tournamentForm.max_teams),
        titulares: Number(tournamentForm.titulares),
        reservas: Number(tournamentForm.reservas),
        premiacao: tournamentForm.premiacao,
        inicio: toApiDate(tournamentForm.inicio),
        fim: toApiDate(tournamentForm.fim),
      });
      toast.success(
        "Torneio atualizado",
        "Configuracoes principais salvas com sucesso.",
      );
      await refetchTournaments();
    } catch (err) {
      toast.error(
        "Falha ao salvar torneio",
        err instanceof Error ? err.message : "Revise os campos obrigatorios.",
      );
    } finally {
      setSavingTournament(false);
    }
  }

  async function handleApproveEntry(entryId: number) {
    try {
      await approveAdminEntry(entryId);
      toast.success(
        "Inscrição aprovada",
        "A equipe foi confirmada pelo admin.",
      );
      await loadAdminWorkspace();
    } catch (err) {
      toast.error(
        "Falha ao aprovar inscrição",
        err instanceof Error ? err.message : "Tente novamente.",
      );
    }
  }

  async function handleCancelEntry(entryId: number) {
    try {
      await cancelAdminEntry(entryId);
      toast.success(
        "Inscrição cancelada",
        "A equipe foi removida do fluxo competitivo.",
      );
      await loadAdminWorkspace();
    } catch (err) {
      toast.error(
        "Falha ao cancelar inscrição",
        err instanceof Error ? err.message : "Tente novamente.",
      );
    }
  }

  async function handleEntryPayment(
    entryId: number,
    status: "aguardando" | "pago" | "falhou",
  ) {
    try {
      await updateAdminEntryPayment(entryId, status);
      toast.success(
        "Pagamento da inscrição atualizado",
        `Novo status: ${status}.`,
      );
      await loadAdminWorkspace();
    } catch (err) {
      toast.error(
        "Falha ao atualizar inscrição",
        err instanceof Error ? err.message : "Tente novamente.",
      );
    }
  }

  async function handlePaymentStatus(
    paymentId: number,
    status: "pendente" | "aprovado" | "cancelado" | "rejeitado",
  ) {
    try {
      await updateAdminPaymentStatus(paymentId, status);
      toast.success("Pagamento atualizado", `Gateway ajustado para ${status}.`);
      await loadAdminWorkspace();
    } catch (err) {
      toast.error(
        "Falha ao atualizar pagamento",
        err instanceof Error ? err.message : "Tente novamente.",
      );
    }
  }

  async function handleTeamToggle(
    team: AdminTeam,
    field: "ativo" | "recrutando",
  ) {
    try {
      await updateAdminTeam(team.id, { [field]: !Boolean(team[field]) });
      toast.success(
        "Equipe atualizada",
        `${team.nome} teve ${field} ajustado.`,
      );
      await loadAdminWorkspace();
    } catch (err) {
      toast.error(
        "Falha ao atualizar equipe",
        err instanceof Error ? err.message : "Tente novamente.",
      );
    }
  }

  async function handlePlayerStatus(
    player: AdminPlayer,
    status: AdminPlayer["status"],
  ) {
    try {
      await updateAdminPlayer(player.id, { status });
      toast.success(
        "Jogador atualizado",
        `${player.nick} agora esta como ${status}.`,
      );
      await loadAdminWorkspace();
    } catch (err) {
      toast.error(
        "Falha ao atualizar jogador",
        err instanceof Error ? err.message : "Tente novamente.",
      );
    }
  }

  function editAchievement(item: AchievementDefinition) {
    setEditingAchievementId(item.id);
    setAchievementForm({
      game_id: item.game_id ? String(item.game_id) : "",
      code: item.code,
      title: item.title,
      description: item.description,
      metric: item.metric,
      comparator: item.comparator,
      target: String(item.target),
      tier: item.tier,
      xp_reward: String(item.xp_reward),
      icon: item.icon,
      active: item.active,
    });
  }

  function resetAchievementForm() {
    setEditingAchievementId(null);
    setAchievementForm({
      game_id: gameFilter === "all" ? "" : gameFilter,
      code: "",
      title: "",
      description: "",
      metric: "wins",
      comparator: "gte",
      target: "1",
      tier: "bronze",
      xp_reward: "100",
      icon: "trophy",
      active: true,
    });
  }

  async function handleSaveAchievement() {
    try {
      const payload = {
        game_id: achievementForm.game_id
          ? Number(achievementForm.game_id)
          : null,
        code: achievementForm.code,
        title: achievementForm.title,
        description: achievementForm.description,
        metric: achievementForm.metric,
        comparator: achievementForm.comparator,
        target: Number(achievementForm.target),
        tier: achievementForm.tier,
        xp_reward: Number(achievementForm.xp_reward),
        icon: achievementForm.icon,
        active: achievementForm.active,
      } as Omit<
        AchievementDefinition,
        | "id"
        | "game_name"
        | "game_short_name"
        | "players_count"
        | "unlocked_count"
      >;
      if (editingAchievementId)
        await updateAdminAchievement(editingAchievementId, payload);
      else await createAdminAchievement(payload);
      toast.success(
        editingAchievementId ? "Conquista atualizada" : "Conquista criada",
        "A meta já está integrada ao progresso dos jogadores.",
      );
      resetAchievementForm();
      setAchievements(await getAdminAchievements());
    } catch (err) {
      toast.error(
        "Falha ao salvar conquista",
        err instanceof Error ? err.message : "Revise os campos.",
      );
    }
  }

  async function handleToggleAchievement(item: AchievementDefinition) {
    try {
      await updateAdminAchievement(item.id, { active: !item.active });
      setAchievements(await getAdminAchievements());
      toast.success(
        "Conquista atualizada",
        item.active ? "A meta foi desativada." : "A meta está ativa novamente.",
      );
    } catch (err) {
      toast.error(
        "Falha ao atualizar conquista",
        err instanceof Error ? err.message : "Tente novamente.",
      );
    }
  }

  function editPublicContent(item: PublicContent) {
    setEditingContentId(item.id);
    setContentForm({
      type: item.type,
      title: item.title,
      subtitle: item.subtitle || "",
      body: item.body || "",
      image_url: item.image_url || "",
      link_url: item.link_url || "",
      author_name: item.author_name || "",
      sort_order: String(item.sort_order),
      published: Boolean(item.published),
    });
  }

  function resetContentForm() {
    setEditingContentId(null);
    setContentForm({
      type: "noticia",
      title: "",
      subtitle: "",
      body: "",
      image_url: "",
      link_url: "",
      author_name: "",
      sort_order: "0",
      published: true,
    });
  }

  async function handleSavePublicContent() {
    try {
      const payload = {
        ...contentForm,
        sort_order: Number(contentForm.sort_order),
        published_at: new Date().toISOString(),
      };
      if (editingContentId)
        await updateAdminPublicContent(editingContentId, payload);
      else await createAdminPublicContent(payload);
      toast.success(
        editingContentId ? "Conteúdo atualizado" : "Conteúdo publicado",
        "O portal público já recebeu a alteracao.",
      );
      resetContentForm();
      setPublicContent(await getAdminPublicContent());
    } catch (err) {
      toast.error(
        "Falha ao salvar conteúdo",
        err instanceof Error ? err.message : "Revise os campos.",
      );
    }
  }

  async function handleTogglePublicContent(item: PublicContent) {
    try {
      await updateAdminPublicContent(item.id, {
        ...item,
        published: !item.published,
      });
      setPublicContent(await getAdminPublicContent());
      toast.success(
        "Publicação atualizada",
        item.published ? "O item foi ocultado." : "O item voltou ao portal.",
      );
    } catch (err) {
      toast.error(
        "Falha ao atualizar publicação",
        err instanceof Error ? err.message : "Tente novamente.",
      );
    }
  }

  async function handlePublicContact(
    item: PublicContactMessage,
    status: PublicContactMessage["status"],
  ) {
    try {
      await updateAdminPublicContact(item.id, {
        status,
        admin_notes: item.admin_notes || undefined,
      });
      setPublicContacts(await getAdminPublicContacts());
      toast.success("Contato atualizado", `Novo status: ${status}.`);
    } catch (err) {
      toast.error(
        "Falha ao atualizar contato",
        err instanceof Error ? err.message : "Tente novamente.",
      );
    }
  }

  function selectAccessAccount(item: AdminAccessAccount) {
    setSelectedAccessId(item.id);
    setAccessForm({
      roles: [...item.roles],
      game_ids: [...item.game_ids],
      primary_game_id: item.game_ids[0] ?? null,
    });
  }
  function toggleAccessRole(role: string) {
    setAccessForm((state) => ({
      ...state,
      roles: state.roles.includes(role)
        ? state.roles.filter((item) => item !== role)
        : [...state.roles, role],
    }));
  }
  function toggleAccessGame(gameId: number) {
    setAccessForm((state) => {
      const selected = state.game_ids.includes(gameId);
      const gameIds = selected
        ? state.game_ids.filter((id) => id !== gameId)
        : [...state.game_ids, gameId];
      return {
        ...state,
        game_ids: gameIds,
        primary_game_id: gameIds.includes(Number(state.primary_game_id))
          ? state.primary_game_id
          : (gameIds[0] ?? null),
      };
    });
  }
  async function handleSaveAccessAccount() {
    if (!selectedAccessId) return;
    try {
      await updateAdminAccessAccount(selectedAccessId, {
        ...accessForm,
        primary_game_id: accessForm.primary_game_id ?? undefined,
      });
      setAccessAccounts(await getAdminAccessAccounts());
      toast.success(
        "Acesso atualizado",
        "Os papeis e jogos já estao disponiveis na conta.",
      );
    } catch (err) {
      toast.error(
        "Falha ao atualizar acesso",
        err instanceof Error ? err.message : "Tente novamente.",
      );
    }
  }

  async function handleBanAccessAccount() {
    if (!selectedAccessId || !banForm.reason.trim()) {
      toast.error("Informe o motivo", "O motivo do banimento e obrigatorio.");
      return;
    }
    const durationDays: Record<string, number> = {
      "1_day": 1,
      "7_days": 7,
      "30_days": 30,
      "90_days": 90,
      "180_days": 180,
      "365_days": 365,
    };
    const permanent = banForm.duration === "permanent";
    const bannedUntil = permanent
      ? null
      : new Date(Date.now() + durationDays[banForm.duration] * 86400000).toISOString();
    if (!window.confirm("Confirmar o banimento desta conta e encerrar suas sessoes?")) return;
    setModeratingAccess(true);
    try {
      await banAdminAccessAccount(selectedAccessId, {
        permanent,
        banned_until: bannedUntil,
        reason: banForm.reason.trim(),
      });
      setAccessAccounts(await getAdminAccessAccounts());
      setBanForm((state) => ({ ...state, reason: "" }));
      toast.success("Conta banida", "O acesso foi bloqueado e as sessoes foram encerradas.");
    } catch (err) {
      toast.error("Falha ao banir conta", err instanceof Error ? err.message : "Tente novamente.");
    } finally {
      setModeratingAccess(false);
    }
  }

  async function handleUnbanAccessAccount() {
    if (!selectedAccessId || !window.confirm("Liberar novamente o acesso desta conta?")) return;
    setModeratingAccess(true);
    try {
      await unbanAdminAccessAccount(selectedAccessId);
      setAccessAccounts(await getAdminAccessAccounts());
      toast.success("Acesso liberado", "A conta pode entrar novamente na plataforma.");
    } catch (err) {
      toast.error("Falha ao liberar conta", err instanceof Error ? err.message : "Tente novamente.");
    } finally {
      setModeratingAccess(false);
    }
  }

  async function handleDeleteAccessAccount() {
    if (!selectedAccessId) return;
    const selected = accessAccounts.find((item) => item.id === selectedAccessId);
    if (!window.confirm(`Excluir definitivamente a conta ${selected?.nickname || selected?.nome || "selecionada"}? Esta acao nao pode ser desfeita.`)) return;
    setModeratingAccess(true);
    try {
      await deleteAdminAccessAccount(selectedAccessId);
      setAccessAccounts(await getAdminAccessAccounts());
      setSelectedAccessId(null);
      toast.success("Conta excluida", "O cadastro sem histórico foi removido.");
    } catch (err) {
      toast.error("Conta não pode ser excluida", err instanceof Error ? err.message : "Tente novamente.");
    } finally {
      setModeratingAccess(false);
    }
  }

  async function handleSaveLineup() {
    if (!activeEntry) {
      return;
    }

    setSavingLineup(true);

    try {
      const titulares = parseIds(lineupForm.titulares);
      const reservas = parseIds(lineupForm.reservas);
      await saveAdminEntryLineup(activeEntry.id, { titulares, reservas });
      toast.success("Lineup salva", "Titulares e reservas foram atualizados.");
      await loadLineup(activeEntry.id);
      await loadAdminWorkspace();
    } catch (err) {
      toast.error(
        "Falha ao salvar lineup",
        err instanceof Error ? err.message : "Revise os IDs informados.",
      );
    } finally {
      setSavingLineup(false);
    }
  }

  async function handleSendNotification() {
    try {
      await sendAdminNotification({
        user_ids: parseIds(notificationForm.user_ids),
        titulo: notificationForm.titulo,
        mensagem: notificationForm.mensagem,
        link: notificationForm.link || null,
      });
      toast.success(
        "Notificacao enviada",
        "Os destinatarios receberam a mensagem.",
      );
      setNotificationForm({
        user_ids: "",
        titulo: "",
        mensagem: "",
        link: "",
      });
      await loadAdminWorkspace();
    } catch (err) {
      toast.error(
        "Falha ao enviar notificacao",
        err instanceof Error
          ? err.message
          : "Confira destinatarios e conteúdo.",
      );
    }
  }

  async function handleCreatePenalty() {
    try {
      await createAdminPenalty({
        player_id: Number(penaltyForm.player_id),
        tournament_id: penaltyForm.tournament_id
          ? Number(penaltyForm.tournament_id)
          : null,
        type: penaltyForm.type,
        scope: penaltyForm.scope,
        reason: penaltyForm.reason,
        evidence: penaltyForm.evidence || null,
        duration_days: penaltyForm.duration_days
          ? Number(penaltyForm.duration_days)
          : null,
        notes: penaltyForm.notes || null,
      });
      toast.success(
        "Penalidade registrada",
        "O histórico disciplinar foi atualizado.",
      );
      setPenaltyForm({
        player_id: "",
        tournament_id: "",
        type: "warning",
        scope: "player",
        reason: "",
        evidence: "",
        duration_days: "",
        notes: "",
      });
      await loadAdminWorkspace();
    } catch (err) {
      toast.error(
        "Falha ao registrar penalidade",
        err instanceof Error ? err.message : "Revise os dados.",
      );
    }
  }

  async function handleResolvePenalty(penaltyId: number) {
    try {
      await resolveAdminPenalty(penaltyId, "Encerrada pelo admin.");
      toast.success(
        "Penalidade encerrada",
        "O caso foi movido para histórico.",
      );
      await loadAdminWorkspace();
    } catch (err) {
      toast.error(
        "Falha ao encerrar penalidade",
        err instanceof Error ? err.message : "Tente novamente.",
      );
    }
  }

  async function handleCreateTicket() {
    try {
      await createAdminTicket({
        user_id: ticketForm.user_id ? Number(ticketForm.user_id) : null,
        category: ticketForm.category,
        priority: ticketForm.priority,
        subject: ticketForm.subject,
        message: ticketForm.message,
      });
      toast.success("Ticket criado", "A fila de suporte foi atualizada.");
      setTicketForm({
        user_id: "",
        category: "geral",
        priority: "media",
        subject: "",
        message: "",
      });
      await loadAdminWorkspace();
    } catch (err) {
      toast.error(
        "Falha ao criar ticket",
        err instanceof Error ? err.message : "Revise os campos.",
      );
    }
  }

  async function handleUpdateTicket(
    ticketId: number,
    status: SupportTicket["status"],
  ) {
    try {
      await updateAdminTicket(ticketId, { status });
      toast.success("Ticket atualizado", `Status movido para ${status}.`);
      await loadAdminWorkspace();
    } catch (err) {
      toast.error(
        "Falha ao atualizar ticket",
        err instanceof Error ? err.message : "Tente novamente.",
      );
    }
  }

  async function handleReplyTicket(ticketId: number) {
    if (!ticketReply.trim()) return;
    try {
      setTicketBusy(true);
      await updateAdminTicket(ticketId, { response: ticketReply.trim() });
      setTicketReply("");
      toast.success("Resposta enviada", "O usuário podera continuar a conversa pelo painel dele.");
      await loadAdminWorkspace();
    } catch (err) {
      toast.error("Falha ao responder", err instanceof Error ? err.message : "Tente novamente.");
    } finally {
      setTicketBusy(false);
    }
  }

  async function handleCreateDispute() {
    try {
      await createAdminDispute({
        match_id: disputeForm.match_id ? Number(disputeForm.match_id) : null,
        tournament_id: disputeForm.tournament_id
          ? Number(disputeForm.tournament_id)
          : null,
        team_id: disputeForm.team_id ? Number(disputeForm.team_id) : null,
        title: disputeForm.title,
        description: disputeForm.description,
        evidence: disputeForm.evidence || null,
      });
      toast.success("Disputa registrada", "O caso entrou na fila de analise.");
      setDisputeForm({
        match_id: "",
        tournament_id: "",
        team_id: "",
        title: "",
        description: "",
        evidence: "",
      });
      await loadAdminWorkspace();
    } catch (err) {
      toast.error(
        "Falha ao abrir disputa",
        err instanceof Error ? err.message : "Revise os dados.",
      );
    }
  }

  async function handleUpdateDispute(
    disputeId: number,
    status: Dispute["status"],
  ) {
    try {
      await updateAdminDispute(disputeId, {
        status,
        resolution_notes: `Atualizado para ${status}.`,
      });
      toast.success("Disputa atualizada", `Status movido para ${status}.`);
      await loadAdminWorkspace();
    } catch (err) {
      toast.error(
        "Falha ao atualizar disputa",
        err instanceof Error ? err.message : "Tente novamente.",
      );
    }
  }

  function updateTournamentFilter(key: "game" | "status", value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  }

  return (
    <section className="px-4 pb-12 lg:px-8">
      <PageHeader
        eyebrow="Admin"
        title={activeModuleInfo.title}
        description={activeModuleInfo.description}
        action={
          showsTournamentAction ? <Link to={newTournamentHref}>
            <Button icon={<Plus className="h-4 w-4" />}>Novo torneio</Button>
          </Link> : undefined
        }
      />

      {showsGameFilter ? <div className={`mb-6 grid gap-4 border-y border-arena-line bg-black/15 py-4 ${showsStatusFilter ? "lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_minmax(260px,1.2fr)]" : "lg:grid-cols-[minmax(260px,.8fr)_minmax(300px,1.2fr)]"} lg:items-end`}>
        <Field label="Jogo">
          <Select
            value={gameFilter}
            onChange={(event) => {
              setGameFilter(event.target.value);
              updateTournamentFilter("game", event.target.value);
            }}
          >
            <option value="all">Todos os jogos</option>
            {games.map((game) => (
              <option value={game.id} key={game.id}>
                {game.nome}
              </option>
            ))}
          </Select>
        </Field>
        {showsStatusFilter ? <Field label="Status do torneio">
          <Select
            value={tournamentStatusFilter}
            onChange={(event) => {
              const status = event.target.value as Tournament["status"] | "all";
              setTournamentStatusFilter(status);
              updateTournamentFilter("status", status);
            }}
          >
            <option value="all">Todos os status</option>
            {Object.entries(statusLabels).map(([status, label]) => (
              <option value={status} key={status}>
                {label}
              </option>
            ))}
          </Select>
        </Field> : null}
        <div className="flex min-h-11 items-center gap-3 border border-arena-line bg-arena-panel/60 px-4 py-3">
          <Gamepad2 className="h-5 w-5 shrink-0 text-cyan-300" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {selectedGame?.nome ?? "Todos os jogos"}
            </p>
            <p className="text-xs text-arena-muted">
              {activeModule === "community"
                ? `${filteredTeams.length} equipes · ${filteredPlayers.length} jogadores`
                : activeModule === "progression"
                  ? `${filteredAchievements.length} conquistas configuradas`
                  : activeModule === "access"
                    ? `${filteredAccessAccounts.length} contas encontradas`
                    : activeModule === "finance"
                      ? `${payments.length} pagamentos registrados`
                      : activeModule === "operations"
                        ? `${games.length} jogos no catalogo`
                        : `${filteredTournaments.length} ${filteredTournaments.length === 1 ? "torneio encontrado" : "torneios encontrados"}${tournamentStatusFilter !== "all" ? `: ${statusLabels[tournamentStatusFilter].toLowerCase()}` : ""}`}
            </p>
          </div>
        </div>
      </div> : null}

      {activeModule === "dashboard" ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Torneios no filtro"
          value={String(filteredTournaments.length)}
          icon={<Trophy className="h-5 w-5" />}
          helper={selectedGame?.nome ?? "Todos os jogos"}
        />
        <StatCard
          label="Inscrições pendentes"
          value={String(scopedPendingEntries)}
          icon={<Users className="h-5 w-5" />}
          helper="Aguardando decisao"
        />
        <StatCard
          label="Receita aprovada"
          value={formatCurrency(scopedApprovedRevenue)}
          icon={<BadgeDollarSign className="h-5 w-5" />}
          helper="Pagamentos aprovados"
        />
        <StatCard
          label="Partidas pendentes"
          value={String(
            scopeIsGlobal
              ? (adminDashboard?.matches_waiting_result ?? 0)
              : matchSummary.scheduled + matchSummary.live,
          )}
          icon={<Swords className="h-5 w-5" />}
          helper={
            scopeIsGlobal
              ? "Aguardando placar"
              : (activeTournament?.nome ?? "Sem torneio no filtro")
          }
        />
      </div> : null}

      {activeModule === "dashboard" ? (
        <>
          <div className="mt-6 grid gap-5 xl:grid-cols-[1.08fr_.92fr]">
            <Card>
              <CardHeader>
                <h2 className="font-display text-xl font-semibold">Movimento dos ultimos 6 meses</h2>
                <p className="mt-1 text-sm text-arena-muted">Receita aprovada e novas inscrições registradas no banco.</p>
              </CardHeader>
              <CardContent>
                <RevenueChart data={dashboardSeries} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-display text-xl font-semibold">
                  Radar operacional
                </h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <QueueLine
                  icon={<CalendarClock className="h-4 w-4" />}
                  label="Torneios em preparacao ou abertos"
                  value={String(
                    filteredTournaments.filter((item) =>
                      ["criado", "aberto"].includes(item.status),
                    ).length,
                  )}
                />
                <QueueLine
                  icon={<PlayCircle className="h-4 w-4" />}
                  label="Torneios em andamento"
                  value={String(
                    filteredTournaments.filter(
                      (item) => item.status === "em_andamento",
                    ).length,
                  )}
                />
                <QueueLine
                  icon={<CreditCard className="h-4 w-4" />}
                  label="Pagamentos pendentes"
                  value={String(scopedPendingPayments)}
                />
                <QueueLine
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  label="Inscrições confirmadas"
                  value={String(scopedConfirmedEntries)}
                />
                <QueueLine
                  icon={<Gavel className="h-4 w-4" />}
                  label="Penalidades ativas"
                  value={String(adminDashboard?.active_penalties ?? 0)}
                />
                <QueueLine
                  icon={<LifeBuoy className="h-4 w-4" />}
                  label="Tickets abertos"
                  value={String(adminDashboard?.open_tickets ?? 0)}
                />
                <QueueLine
                  icon={<Mail className="h-4 w-4" />}
                  label="Disputas abertas"
                  value={String(adminDashboard?.open_disputes ?? 0)}
                />
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <h2 className="font-display text-xl font-semibold">Prioridades agora</h2>
                <p className="mt-1 text-sm text-arena-muted">Somente itens que exigem uma decisao ou atualizacao.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {operationalPriorities.length ? operationalPriorities.map((item) => (
                  <Link
                    className="flex items-center justify-between border border-arena-line bg-black/20 px-4 py-3 transition hover:border-cyan-400/40 hover:bg-cyan-400/5"
                    key={item.label}
                    to={`/admin?module=${item.module}`}
                  >
                    <span className="text-sm font-semibold">{item.label}</span>
                    <span className="flex h-7 min-w-7 items-center justify-center bg-amber-400/10 px-2 text-sm font-bold text-amber-200">{item.value}</span>
                  </Link>
                )) : (
                  <div className="flex min-h-48 flex-col items-center justify-center border border-dashed border-emerald-400/25 bg-emerald-400/5 px-6 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                    <p className="mt-3 font-semibold">Operação em dia</p>
                    <p className="mt-1 text-sm text-arena-muted">Não existem pendencias administrativas neste momento.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-display text-xl font-semibold">Atividade recente</h2>
                <p className="mt-1 text-sm text-arena-muted">Alteracoes administrativas registradas pela auditoria.</p>
              </CardHeader>
              <CardContent className="space-y-1">
                {auditLogs.slice(0, 6).map((item) => (
                  <div className="grid gap-1 border-b border-arena-line py-3 last:border-0 sm:grid-cols-[1fr_auto]" key={item.id}>
                    <div><p className="text-sm font-semibold">{auditActionLabel(item.action)}</p><p className="mt-1 text-xs text-arena-muted">{item.actor_name || item.actor_email || "Sistema"} · {item.entity_type}{item.entity_id ? ` #${item.entity_id}` : ""}</p></div>
                    <time className="text-xs text-arena-muted">{formatRelativeDate(item.created_at)}</time>
                  </div>
                ))}
                {!auditLogs.length ? <div className="flex min-h-48 items-center justify-center border border-dashed border-arena-line text-sm text-arena-muted">Nenhuma atividade administrativa registrada.</div> : null}
                {auditLogs.length ? <Link className="mt-3 inline-flex text-sm font-semibold text-cyan-200 hover:text-cyan-100" to="/admin?module=audit">Ver auditoria completa</Link> : null}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader><h2 className="font-display text-xl font-semibold">Ultimos pagamentos</h2><p className="mt-1 text-sm text-arena-muted">Transacoes reais mais recentes no filtro selecionado.</p></CardHeader>
            <DataTable data={scopedLatestPayments} empty={<div className="p-6 text-sm text-arena-muted">Nenhum pagamento registrado.</div>} columns={[
              { header: "Equipe", cell: (item) => item.team_name },
              { header: "Torneio", cell: (item) => item.tournament_name },
              { header: "Valor", cell: (item) => formatCurrency(item.valor) },
              { header: "Status", cell: (item) => <Badge tone={item.status === "aprovado" ? "success" : "warning"}>{item.status}</Badge> },
              { header: "Quando", cell: (item) => formatRelativeDate(item.paid_at || item.created_at) },
            ]} />
          </Card>
        </>
      ) : null}

      {activeModule === "competitions" ? (
        <>
          <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold">
                      Torre de controle
                    </h2>
                    <p className="mt-1 text-sm text-arena-muted">
                      Selecione um torneio e governe o ciclo administrativo.
                    </p>
                  </div>
                  <Select
                    className="w-full md:w-80"
                    value={String(activeTournament?.id ?? "")}
                    onChange={(event) =>
                      setActiveTournamentId(Number(event.target.value))
                    }
                    disabled={!filteredTournaments.length}
                  >
                    {!filteredTournaments.length ? (
                      <option value="">Nenhum torneio no filtro</option>
                    ) : null}
                    {filteredTournaments.map((tournament) => (
                      <option value={tournament.id} key={tournament.id}>
                        {tournament.nome} - {statusLabels[tournament.status]}
                      </option>
                    ))}
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {activeTournament ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-4">
                      <MetricTile
                        title="Status"
                        value={statusLabels[activeTournament.status]}
                        icon={<ShieldCheck className="h-4 w-4" />}
                      />
                      <MetricTile
                        title="Inscrições"
                        value={String(filteredEntries.length)}
                        icon={<Users className="h-4 w-4" />}
                      />
                      <MetricTile
                        title="Lineups"
                        value={String(
                          filteredEntries.filter((item) => item.lineup_size > 0)
                            .length,
                        )}
                        icon={<Sparkles className="h-4 w-4" />}
                      />
                      <MetricTile
                        title="Partidas"
                        value={String(matchSummary.total)}
                        icon={<Swords className="h-4 w-4" />}
                      />
                    </div>

                    <div className="rounded-arena border border-arena-line bg-black/20 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[.16em] text-arena-muted">
                        Ações de status
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {nextActions.length ? (
                          nextActions.map((status) => (
                            <Button
                              key={status}
                              loading={changingStatus === status}
                              onClick={() => void handleStatusChange(status)}
                            >
                              {statusLabels[status]}
                            </Button>
                          ))
                        ) : (
                          <Badge tone="success">Fluxo encerrado</Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Nome do torneio">
                        <Input
                          value={tournamentForm.nome}
                          onChange={(event) =>
                            setTournamentForm((state) => ({
                              ...state,
                              nome: event.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field label="Entry fee">
                        <Input
                          type="number"
                          value={tournamentForm.valor}
                          onChange={(event) =>
                            setTournamentForm((state) => ({
                              ...state,
                              valor: event.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field label="Max equipes">
                        <Input
                          type="number"
                          value={tournamentForm.max_teams}
                          onChange={(event) =>
                            setTournamentForm((state) => ({
                              ...state,
                              max_teams: event.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field label="Titulares">
                        <Input
                          type="number"
                          value={tournamentForm.titulares}
                          onChange={(event) =>
                            setTournamentForm((state) => ({
                              ...state,
                              titulares: event.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field label="Reservas">
                        <Input
                          type="number"
                          value={tournamentForm.reservas}
                          onChange={(event) =>
                            setTournamentForm((state) => ({
                              ...state,
                              reservas: event.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field label="Premiação">
                        <Input
                          value={tournamentForm.premiacao}
                          onChange={(event) =>
                            setTournamentForm((state) => ({
                              ...state,
                              premiacao: event.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field label="Inicio">
                        <Input
                          type="datetime-local"
                          value={tournamentForm.inicio}
                          onChange={(event) =>
                            setTournamentForm((state) => ({
                              ...state,
                              inicio: event.target.value,
                            }))
                          }
                        />
                      </Field>
                      <Field label="Fim">
                        <Input
                          type="datetime-local"
                          value={tournamentForm.fim}
                          onChange={(event) =>
                            setTournamentForm((state) => ({
                              ...state,
                              fim: event.target.value,
                            }))
                          }
                        />
                      </Field>
                    </div>

                    <Field label="Descrição">
                      <textarea
                        className="min-h-[108px] w-full rounded-arena border border-arena-line bg-black/25 px-3 py-3 text-sm text-arena-text outline-none transition focus:border-arena-cyan"
                        value={tournamentForm.descricao}
                        onChange={(event) =>
                          setTournamentForm((state) => ({
                            ...state,
                            descricao: event.target.value,
                          }))
                        }
                      />
                    </Field>

                    <Button
                      loading={savingTournament}
                      icon={<PencilLine className="h-4 w-4" />}
                      onClick={() => void handleTournamentSave()}
                    >
                      Salvar configuracoes
                    </Button>
                  </>
                ) : (
                  <EmptyState
                    title="Sem torneios"
                    description="Crie um torneio para iniciar a operação administrativa."
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-display text-xl font-semibold">
                  Lineup da inscrição
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Inscrição">
                  <Select
                    value={String(activeEntry?.id ?? "")}
                    onChange={(event) =>
                      setSelectedEntryId(Number(event.target.value))
                    }
                  >
                    {filteredEntries.map((entry) => (
                      <option value={entry.id} key={entry.id}>
                        #{entry.id} - {entry.team_name}
                      </option>
                    ))}
                  </Select>
                </Field>
                {activeEntry ? (
                  <>
                    <div className="rounded-arena border border-arena-line bg-black/20 p-4 text-sm text-arena-muted">
                      <p>
                        Equipe:{" "}
                        <span className="font-medium text-arena-text">
                          {activeEntry.team_name}
                        </span>
                      </p>
                      <p className="mt-1">
                        Titulares exigidos: {activeTournament?.titulares ?? "-"}
                      </p>
                      <p className="mt-1">
                        IDs atuais:{" "}
                        {lineup.map((item) => item.player_id).join(", ") ||
                          "nenhum"}
                      </p>
                    </div>
                    <Field label="Titulares (IDs separados por virgula)">
                      <Input
                        value={lineupForm.titulares}
                        onChange={(event) =>
                          setLineupForm((state) => ({
                            ...state,
                            titulares: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Reservas (IDs separados por virgula)">
                      <Input
                        value={lineupForm.reservas}
                        onChange={(event) =>
                          setLineupForm((state) => ({
                            ...state,
                            reservas: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Button
                      loading={savingLineup}
                      icon={<Save className="h-4 w-4" />}
                      onClick={() => void handleSaveLineup()}
                    >
                      Salvar lineup
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-arena-muted">
                    Selecione uma inscrição para editar a lineup.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <h2 className="font-display text-xl font-semibold">
                Inscrições do torneio
              </h2>
            </CardHeader>
            <DataTable
              data={filteredEntries}
              empty={
                <EmptyState
                  title="Sem inscrições"
                  description="Ainda não existem equipes inscritas para o torneio atual."
                />
              }
              columns={[
                { header: "Equipe", cell: (item) => item.team_name },
                {
                  header: "Status",
                  cell: (item) => (
                    <Badge
                      tone={
                        item.status === "confirmado"
                          ? "success"
                          : item.status === "cancelado"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {item.status}
                    </Badge>
                  ),
                },
                {
                  header: "Pagamento",
                  cell: (item) => (
                    <Badge
                      tone={
                        item.payment_status === "pago"
                          ? "success"
                          : item.payment_status === "falhou"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {item.payment_status}
                    </Badge>
                  ),
                },
                {
                  header: "Lineup",
                  cell: (item) => `${item.starters_count}/${item.lineup_size}`,
                },
                {
                  header: "Ações",
                  cell: (item) => (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => void handleApproveEntry(item.id)}
                      >
                        Aprovar
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => void handleEntryPayment(item.id, "pago")}
                      >
                        Pago
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => void handleCancelEntry(item.id)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </>
      ) : null}

      {activeModule === "operations" ? (
        <CompetitionOperationsWorkspace
          activeTournament={activeTournament}
          loadingMatches={loadingMatches}
          matches={matches}
          tournaments={filteredTournaments}
          onRefreshAdmin={loadAdminWorkspace}
          onReloadMatches={loadMatches}
          onTournamentChange={setActiveTournamentId}
        />
      ) : null}

      {activeModule === "community" ? (
        <>
          <DiscordServerWorkspace />
          <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr]">
            <Card>
              <CardHeader>
                <h2 className="font-display text-xl font-semibold">
                  Equipes da plataforma
                </h2>
              </CardHeader>
              <DataTable
                data={filteredTeams}
                empty={
                  <div className="p-6 text-sm text-arena-muted">
                    Nenhuma equipe encontrada.
                  </div>
                }
                columns={[
                  { header: "Equipe", cell: (item) => item.nome },
                  { header: "Jogo", cell: (item) => item.game_short_name },
                  { header: "Membros", cell: (item) => item.members_count },
                  {
                    header: "Ativa",
                    cell: (item) => (
                      <Badge tone={Boolean(item.ativo) ? "success" : "danger"}>
                        {Boolean(item.ativo) ? "Sim" : "Não"}
                      </Badge>
                    ),
                  },
                  {
                    header: "Ações",
                    cell: (item) => (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            void handleTeamToggle(item, "recrutando")
                          }
                        >
                          {Boolean(item.recrutando)
                            ? "Fechar recrut."
                            : "Abrir recrut."}
                        </Button>
                        <Button
                          variant={Boolean(item.ativo) ? "danger" : "secondary"}
                          onClick={() => void handleTeamToggle(item, "ativo")}
                        >
                          {Boolean(item.ativo) ? "Desativar" : "Ativar"}
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
                  Jogadores da plataforma
                </h2>
              </CardHeader>
              <DataTable
                data={filteredPlayers}
                empty={
                  <div className="p-6 text-sm text-arena-muted">
                    Nenhum jogador encontrado.
                  </div>
                }
                columns={[
                  { header: "ID Arena", cell: (item) => `#${item.id}` },
                  { header: "Nick", cell: (item) => item.nick },
                  {
                    header: "ID no jogo",
                    cell: (item) => item.game_uid || "Não informado",
                  },
                  { header: "Equipe", cell: (item) => item.team_name },
                  {
                    header: "Status",
                    cell: (item) => (
                      <Badge tone={playerTone(item.status)}>
                        {item.status}
                      </Badge>
                    ),
                  },
                  {
                    header: "Ações",
                    cell: (item) => (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => void handlePlayerStatus(item, "ativo")}
                        >
                          Ativar
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            void handlePlayerStatus(item, "reserva")
                          }
                        >
                          Reserva
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() =>
                            void handlePlayerStatus(item, "banido")
                          }
                        >
                          Banir
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <h2 className="font-display text-xl font-semibold">
                Notificacao administrativa
              </h2>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Usuários (IDs separados por virgula)">
                <Input
                  value={notificationForm.user_ids}
                  onChange={(event) =>
                    setNotificationForm((state) => ({
                      ...state,
                      user_ids: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Titulo">
                <Input
                  value={notificationForm.titulo}
                  onChange={(event) =>
                    setNotificationForm((state) => ({
                      ...state,
                      titulo: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Link">
                <Input
                  value={notificationForm.link}
                  onChange={(event) =>
                    setNotificationForm((state) => ({
                      ...state,
                      link: event.target.value,
                    }))
                  }
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Mensagem">
                  <textarea
                    className="min-h-[108px] w-full rounded-arena border border-arena-line bg-black/25 px-3 py-3 text-sm text-arena-text outline-none transition focus:border-arena-cyan"
                    value={notificationForm.mensagem}
                    onChange={(event) =>
                      setNotificationForm((state) => ({
                        ...state,
                        mensagem: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Button
                  icon={<Mail className="h-4 w-4" />}
                  onClick={() => void handleSendNotification()}
                >
                  Enviar notificacao
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_1fr_1fr]">
            <Card>
              <CardHeader>
                <h2 className="font-display text-xl font-semibold">
                  Penalidades
                </h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Player ID">
                  <Input
                    value={penaltyForm.player_id}
                    onChange={(event) =>
                      setPenaltyForm((state) => ({
                        ...state,
                        player_id: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Tournament ID">
                  <Input
                    value={penaltyForm.tournament_id}
                    onChange={(event) =>
                      setPenaltyForm((state) => ({
                        ...state,
                        tournament_id: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Tipo">
                  <Select
                    value={penaltyForm.type}
                    onChange={(event) =>
                      setPenaltyForm((state) => ({
                        ...state,
                        type: event.target.value as AdminPenalty["type"],
                      }))
                    }
                  >
                    <option value="warning">Warning</option>
                    <option value="suspension">Suspension</option>
                    <option value="temporary_ban">Temporary ban</option>
                    <option value="permanent_ban">Permanent ban</option>
                    <option value="tournament_ban">Tournament ban</option>
                    <option value="season_ban">Season ban</option>
                    <option value="global_ban">Global ban</option>
                  </Select>
                </Field>
                <Field label="Escopo">
                  <Select
                    value={penaltyForm.scope}
                    onChange={(event) =>
                      setPenaltyForm((state) => ({
                        ...state,
                        scope: event.target.value as AdminPenalty["scope"],
                      }))
                    }
                  >
                    <option value="player">Player</option>
                    <option value="tournament">Tournament</option>
                    <option value="season">Season</option>
                    <option value="global">Global</option>
                  </Select>
                </Field>
                <Field label="Motivo">
                  <Input
                    value={penaltyForm.reason}
                    onChange={(event) =>
                      setPenaltyForm((state) => ({
                        ...state,
                        reason: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Button
                  icon={<Gavel className="h-4 w-4" />}
                  onClick={() => void handleCreatePenalty()}
                >
                  Registrar penalidade
                </Button>
                <div className="space-y-2">
                  {penalties.slice(0, 4).map((item) => (
                    <div
                      className="rounded-arena border border-arena-line bg-black/20 p-3"
                      key={item.id}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {item.player_nick}
                        </p>
                        <Badge
                          tone={item.status === "ativa" ? "warning" : "neutral"}
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-arena-muted">
                        {item.type} | {item.reason}
                      </p>
                      {item.status === "ativa" ? (
                        <Button
                          className="mt-3"
                          variant="secondary"
                          onClick={() => void handleResolvePenalty(item.id)}
                        >
                          Encerrar
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3"><LifeBuoy className="h-5 w-5 text-cyan-200" /><div><h2 className="font-display text-xl font-semibold">Central de suporte</h2><p className="text-sm text-arena-muted">Fila de atendimento e conversa com os usuários.</p></div></div>
                  <Badge tone="info">{tickets.filter((ticket) => ticket.status !== "fechado").length} em atendimento</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                  <Input placeholder="Buscar por protocolo, assunto, nome ou e-mail" value={ticketSearch} onChange={(event) => setTicketSearch(event.target.value)} />
                  <Select value={ticketStatusFilter} onChange={(event) => setTicketStatusFilter(event.target.value as SupportTicket["status"] | "all")}>
                    <option value="all">Todos os status</option><option value="aberto">Abertos</option><option value="em_analise">Em analise</option><option value="respondido">Respondidos</option><option value="fechado">Fechados</option>
                  </Select>
                </div>

                <div className="grid min-h-[560px] border border-arena-line lg:grid-cols-[340px_1fr]">
                  <div className="max-h-[680px] overflow-y-auto border-b border-arena-line lg:border-b-0 lg:border-r">
                    {filteredTickets.map((ticket) => (
                      <button className={`block w-full border-b border-arena-line p-4 text-left transition ${selectedTicket?.id === ticket.id ? "bg-cyan-400/10" : "bg-black/20 hover:bg-white/[.04]"}`} key={ticket.id} onClick={() => { setSelectedTicketId(ticket.id); setTicketReply(""); }} type="button">
                        <div className="flex items-start justify-between gap-3"><p className="line-clamp-2 text-sm font-semibold">#{ticket.id} · {ticket.subject}</p><Badge tone={ticket.status === "fechado" ? "neutral" : ticket.priority === "critica" ? "danger" : "warning"}>{ticket.status}</Badge></div>
                        <p className="mt-2 truncate text-xs text-arena-muted">{ticket.user_name ?? "Atendimento interno"} · {ticket.category}</p>
                        <p className="mt-1 text-xs text-arena-muted">{formatDateTime(ticket.updated_at || ticket.created_at)}</p>
                      </button>
                    ))}
                    {!filteredTickets.length ? <div className="p-8 text-center text-sm text-arena-muted">Nenhum ticket encontrado neste filtro.</div> : null}
                  </div>

                  {selectedTicket ? (
                    <div className="flex min-w-0 flex-col">
                      <div className="border-b border-arena-line p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-cyan-200">Protocolo #{selectedTicket.id}</p><h3 className="mt-1 text-lg font-semibold">{selectedTicket.subject}</h3><p className="mt-2 text-sm text-arena-muted">{selectedTicket.user_name ?? "Atendimento interno"} · {selectedTicket.user_email ?? "Sem e-mail vinculado"}</p></div><div className="flex flex-wrap gap-2"><Badge>{selectedTicket.category}</Badge><Badge tone={selectedTicket.priority === "critica" ? "danger" : "warning"}>{selectedTicket.priority}</Badge></div></div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <Field label="Status"><Select value={selectedTicket.status} onChange={(event) => void handleUpdateTicket(selectedTicket.id, event.target.value as SupportTicket["status"])}><option value="aberto">Aberto</option><option value="em_analise">Em analise</option><option value="respondido">Respondido</option><option value="fechado">Fechado</option></Select></Field>
                          <Field label="Prioridade"><Select value={selectedTicket.priority} onChange={async (event) => { try { await updateAdminTicket(selectedTicket.id, { priority: event.target.value as SupportTicket["priority"] }); await loadAdminWorkspace(); } catch (err) { toast.error("Falha ao alterar prioridade", err instanceof Error ? err.message : "Tente novamente."); } }}><option value="baixa">Baixa</option><option value="media">Media</option><option value="alta">Alta</option><option value="critica">Critica</option></Select></Field>
                        </div>
                      </div>
                      <div className="max-h-[390px] flex-1 space-y-4 overflow-y-auto bg-black/20 p-5">
                        <div className="max-w-[88%] border border-cyan-400/30 bg-cyan-400/[.06] p-4"><p className="text-xs font-semibold uppercase text-cyan-200">Solicitacao inicial · {formatDateTime(selectedTicket.created_at)}</p><p className="mt-2 whitespace-pre-wrap text-sm">{selectedTicket.message}</p></div>
                        {(selectedTicket.messages ?? []).map((message) => { const fromAdmin = message.role === "admin"; return <div className={`max-w-[88%] border p-4 ${fromAdmin ? "ml-auto border-emerald-400/35 bg-emerald-400/[.07]" : "border-cyan-400/30 bg-cyan-400/[.06]"}`} key={message.id}><p className={`text-xs font-semibold ${fromAdmin ? "text-emerald-200" : "text-cyan-200"}`}>{message.nome} · {formatDateTime(message.created_at)}</p><p className="mt-2 whitespace-pre-wrap text-sm">{message.message}</p></div>; })}
                        {selectedTicket.response && !(selectedTicket.messages ?? []).length ? <div className="ml-auto max-w-[88%] border border-emerald-400/35 bg-emerald-400/[.07] p-4"><p className="text-xs font-semibold text-emerald-200">Resposta registrada</p><p className="mt-2 whitespace-pre-wrap text-sm">{selectedTicket.response}</p></div> : null}
                      </div>
                      <div className="border-t border-arena-line p-4"><textarea className="min-h-24 w-full border border-arena-line bg-black/30 p-3 text-sm outline-none focus:border-cyan-400" disabled={selectedTicket.status === "fechado"} placeholder={selectedTicket.status === "fechado" ? "Reabra o ticket para responder." : "Escreva uma resposta clara para o usuário..."} value={ticketReply} onChange={(event) => setTicketReply(event.target.value)} /><div className="mt-3 flex justify-end"><Button disabled={!ticketReply.trim() || selectedTicket.status === "fechado"} loading={ticketBusy} icon={<Send className="h-4 w-4" />} onClick={() => void handleReplyTicket(selectedTicket.id)}>Enviar resposta</Button></div></div>
                    </div>
                  ) : <div className="flex items-center justify-center p-8 text-center"><div><MessageSquare className="mx-auto h-8 w-8 text-arena-muted" /><p className="mt-3 font-semibold">Selecione um ticket</p><p className="mt-1 text-sm text-arena-muted">O histórico completo aparecera aqui.</p></div></div>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="font-display text-xl font-semibold">Disputas</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Match ID">
                  <Input
                    value={disputeForm.match_id}
                    onChange={(event) =>
                      setDisputeForm((state) => ({
                        ...state,
                        match_id: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Tournament ID">
                  <Input
                    value={disputeForm.tournament_id}
                    onChange={(event) =>
                      setDisputeForm((state) => ({
                        ...state,
                        tournament_id: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Team ID">
                  <Input
                    value={disputeForm.team_id}
                    onChange={(event) =>
                      setDisputeForm((state) => ({
                        ...state,
                        team_id: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Titulo">
                  <Input
                    value={disputeForm.title}
                    onChange={(event) =>
                      setDisputeForm((state) => ({
                        ...state,
                        title: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Descrição">
                  <Input
                    value={disputeForm.description}
                    onChange={(event) =>
                      setDisputeForm((state) => ({
                        ...state,
                        description: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Button
                  icon={<Mail className="h-4 w-4" />}
                  onClick={() => void handleCreateDispute()}
                >
                  Abrir disputa
                </Button>
                <div className="space-y-2">
                  {disputes.slice(0, 4).map((item) => (
                    <div
                      className="rounded-arena border border-arena-line bg-black/20 p-3"
                      key={item.id}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{item.title}</p>
                        <Badge
                          tone={
                            item.status === "aceita"
                              ? "success"
                              : item.status === "rejeitada"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-arena-muted">
                        {item.team_name ?? "Sem equipe"} |{" "}
                        {item.tournament_name ?? "Sem torneio"}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            void handleUpdateDispute(item.id, "em_analise")
                          }
                        >
                          Analisar
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            void handleUpdateDispute(item.id, "aceita")
                          }
                        >
                          Aceitar
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() =>
                            void handleUpdateDispute(item.id, "rejeitada")
                          }
                        >
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      {activeModule === "progression" ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(320px,.72fr)_minmax(0,1.28fr)]">
          <Card>
            <CardHeader>
              <h2 className="font-display text-xl font-semibold">
                {editingAchievementId ? "Editar conquista" : "Nova conquista"}
              </h2>
              <p className="mt-1 text-sm text-arena-muted">
                Crie metas globais ou exclusivas para um jogo.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Jogo">
                <Select
                  value={achievementForm.game_id}
                  onChange={(event) =>
                    setAchievementForm((state) => ({
                      ...state,
                      game_id: event.target.value,
                    }))
                  }
                >
                  <option value="">Todos os jogos</option>
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.nome}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Titulo">
                  <Input
                    value={achievementForm.title}
                    onChange={(event) =>
                      setAchievementForm((state) => ({
                        ...state,
                        title: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Código interno">
                  <Input
                    placeholder="Gerado pelo titulo"
                    value={achievementForm.code}
                    onChange={(event) =>
                      setAchievementForm((state) => ({
                        ...state,
                        code: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
              <Field label="Descrição">
                <textarea
                  className="min-h-24 w-full rounded-arena border border-arena-line bg-black/25 px-3 py-3 text-sm text-arena-text outline-none focus:border-arena-cyan"
                  value={achievementForm.description}
                  onChange={(event) =>
                    setAchievementForm((state) => ({
                      ...state,
                      description: event.target.value,
                    }))
                  }
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Metrica">
                  <Select
                    value={achievementForm.metric}
                    onChange={(event) =>
                      setAchievementForm((state) => ({
                        ...state,
                        metric: event.target
                          .value as AchievementDefinition["metric"],
                        comparator:
                          event.target.value === "global_rank" ? "lte" : "gte",
                      }))
                    }
                  >
                    <option value="wins">Vitorias</option>
                    <option value="kills">Eliminacoes</option>
                    <option value="assists">Assistencias</option>
                    <option value="headshots">Headshots</option>
                    <option value="mvps">MVPs</option>
                    <option value="matches">Partidas</option>
                    <option value="win_streak">Sequencia de vitorias</option>
                    <option value="global_rank">Posição no ranking</option>
                  </Select>
                </Field>
                <Field label="Regra">
                  <Select
                    value={achievementForm.comparator}
                    onChange={(event) =>
                      setAchievementForm((state) => ({
                        ...state,
                        comparator: event.target
                          .value as AchievementDefinition["comparator"],
                      }))
                    }
                  >
                    <option value="gte">Alcancar ou superar</option>
                    <option value="lte">Ficar igual ou abaixo</option>
                  </Select>
                </Field>
                <Field label="Meta">
                  <Input
                    min="1"
                    type="number"
                    value={achievementForm.target}
                    onChange={(event) =>
                      setAchievementForm((state) => ({
                        ...state,
                        target: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Recompensa de XP">
                  <Input
                    min="0"
                    type="number"
                    value={achievementForm.xp_reward}
                    onChange={(event) =>
                      setAchievementForm((state) => ({
                        ...state,
                        xp_reward: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Nivel">
                  <Select
                    value={achievementForm.tier}
                    onChange={(event) =>
                      setAchievementForm((state) => ({
                        ...state,
                        tier: event.target
                          .value as AchievementDefinition["tier"],
                      }))
                    }
                  >
                    <option value="bronze">Bronze</option>
                    <option value="prata">Prata</option>
                    <option value="ouro">Ouro</option>
                    <option value="diamante">Diamante</option>
                    <option value="lendaria">Lendaria</option>
                  </Select>
                </Field>
                <Field label="Icone">
                  <Input
                    value={achievementForm.icon}
                    onChange={(event) =>
                      setAchievementForm((state) => ({
                        ...state,
                        icon: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 border border-arena-line bg-black/20 px-3 text-sm">
                <input
                  type="checkbox"
                  checked={achievementForm.active}
                  onChange={(event) =>
                    setAchievementForm((state) => ({
                      ...state,
                      active: event.target.checked,
                    }))
                  }
                />
                Disponibilizar conquista aos jogadores
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  icon={<Sparkles className="h-4 w-4" />}
                  onClick={() => void handleSaveAchievement()}
                >
                  {editingAchievementId
                    ? "Salvar alteracoes"
                    : "Criar conquista"}
                </Button>
                {editingAchievementId ? (
                  <Button variant="secondary" onClick={resetAchievementForm}>
                    Cancelar edicao
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    Catálogo de conquistas
                  </h2>
                  <p className="mt-1 text-sm text-arena-muted">
                    {filteredAchievements.length} metas no filtro atual.
                  </p>
                </div>
                <Badge tone="info">
                  {achievements.reduce(
                    (sum, item) => sum + item.unlocked_count,
                    0,
                  )}{" "}
                  desbloqueios
                </Badge>
              </div>
            </CardHeader>
            <DataTable
              data={filteredAchievements}
              empty={
                <div className="p-6 text-sm text-arena-muted">
                  Nenhuma conquista cadastrada.
                </div>
              }
              columns={[
                {
                  header: "Conquista",
                  cell: (item) => (
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      <p className="text-xs text-arena-muted">{item.code}</p>
                    </div>
                  ),
                },
                {
                  header: "Jogo",
                  cell: (item) => item.game_short_name ?? "Global",
                },
                {
                  header: "Meta",
                  cell: (item) => (
                    <div>
                      <p>
                        {achievementMetricLabel(item.metric)}{" "}
                        {item.comparator === "lte" ? "ate" : "a partir de"}{" "}
                        {item.target}
                      </p>
                      <p className="text-xs text-arena-muted">
                        {item.xp_reward} XP · {item.tier}
                      </p>
                    </div>
                  ),
                },
                {
                  header: "Progresso",
                  cell: (item) => (
                    <div>
                      <p>{item.unlocked_count} conquistaram</p>
                      <p className="text-xs text-arena-muted">
                        {item.players_count} acompanhados
                      </p>
                    </div>
                  ),
                },
                {
                  header: "Status",
                  cell: (item) => (
                    <Badge tone={item.active ? "success" : "neutral"}>
                      {item.active ? "Ativa" : "Inativa"}
                    </Badge>
                  ),
                },
                {
                  header: "Ações",
                  cell: (item) => (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        icon={<PencilLine className="h-4 w-4" />}
                        onClick={() => editAchievement(item)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant={item.active ? "danger" : "secondary"}
                        onClick={() => void handleToggleAchievement(item)}
                      >
                        {item.active ? "Desativar" : "Ativar"}
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      ) : null}

      {activeModule === "content" ? (
        <>
          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(320px,.72fr)_minmax(0,1.28fr)]">
            <Card>
              <CardHeader>
                <h2 className="font-display text-xl font-semibold">
                  {editingContentId ? "Editar conteúdo" : "Nova publicação"}
                </h2>
                <p className="mt-1 text-sm text-arena-muted">
                  Gerencie o que aparece no portal público.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Field label="Tipo">
                  <Select
                    value={contentForm.type}
                    onChange={(event) =>
                      setContentForm((state) => ({
                        ...state,
                        type: event.target.value as PublicContent["type"],
                      }))
                    }
                  >
                    <option value="noticia">Noticia</option>
                    <option value="parceiro">Parceiro</option>
                    <option value="depoimento">Depoimento</option>
                    <option value="faq">FAQ</option>
                  </Select>
                </Field>
                <Field label="Titulo">
                  <Input
                    value={contentForm.title}
                    onChange={(event) =>
                      setContentForm((state) => ({
                        ...state,
                        title: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Subtitulo">
                  <Input
                    value={contentForm.subtitle}
                    onChange={(event) =>
                      setContentForm((state) => ({
                        ...state,
                        subtitle: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field
                  label={contentForm.type === "faq" ? "Resposta" : "Conteúdo"}
                >
                  <textarea
                    className="min-h-28 w-full rounded-arena border border-arena-line bg-black/25 px-3 py-3 text-sm text-arena-text outline-none focus:border-arena-cyan"
                    value={contentForm.body}
                    onChange={(event) =>
                      setContentForm((state) => ({
                        ...state,
                        body: event.target.value,
                      }))
                    }
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Imagem (URL)">
                    <Input
                      value={contentForm.image_url}
                      onChange={(event) =>
                        setContentForm((state) => ({
                          ...state,
                          image_url: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Link">
                    <Input
                      value={contentForm.link_url}
                      onChange={(event) =>
                        setContentForm((state) => ({
                          ...state,
                          link_url: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Autor">
                    <Input
                      value={contentForm.author_name}
                      onChange={(event) =>
                        setContentForm((state) => ({
                          ...state,
                          author_name: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Ordem">
                    <Input
                      type="number"
                      value={contentForm.sort_order}
                      onChange={(event) =>
                        setContentForm((state) => ({
                          ...state,
                          sort_order: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
                <label className="flex min-h-11 items-center gap-3 border border-arena-line bg-black/20 px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={contentForm.published}
                    onChange={(event) =>
                      setContentForm((state) => ({
                        ...state,
                        published: event.target.checked,
                      }))
                    }
                  />
                  Publicar no portal
                </label>
                <div className="flex gap-2">
                  <Button
                    disabled={!contentForm.title}
                    icon={<Save className="h-4 w-4" />}
                    onClick={() => void handleSavePublicContent()}
                  >
                    {editingContentId ? "Salvar alteracoes" : "Publicar"}
                  </Button>
                  {editingContentId ? (
                    <Button variant="secondary" onClick={resetContentForm}>
                      Cancelar
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold">
                      Conteúdo do portal
                    </h2>
                    <p className="mt-1 text-sm text-arena-muted">
                      {publicContent.length} itens cadastrados.
                    </p>
                  </div>
                  <Badge tone="info">
                    {publicContent.filter((item) => item.published).length}{" "}
                    publicados
                  </Badge>
                </div>
              </CardHeader>
              <DataTable
                data={publicContent}
                empty={
                  <div className="p-6 text-sm text-arena-muted">
                    Nenhum conteúdo cadastrado.
                  </div>
                }
                columns={[
                  {
                    header: "Tipo",
                    cell: (item) => (
                      <Badge tone="neutral">
                        {publicContentTypeLabel(item.type)}
                      </Badge>
                    ),
                  },
                  {
                    header: "Conteúdo",
                    cell: (item) => (
                      <div>
                        <p className="font-semibold">{item.title}</p>
                        <p className="max-w-sm truncate text-xs text-arena-muted">
                          {item.subtitle || item.body}
                        </p>
                      </div>
                    ),
                  },
                  { header: "Ordem", cell: (item) => item.sort_order },
                  {
                    header: "Status",
                    cell: (item) => (
                      <Badge tone={item.published ? "success" : "neutral"}>
                        {item.published ? "Publicado" : "Oculto"}
                      </Badge>
                    ),
                  },
                  {
                    header: "Ações",
                    cell: (item) => (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          icon={<PencilLine className="h-4 w-4" />}
                          onClick={() => editPublicContent(item)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant={item.published ? "danger" : "secondary"}
                          onClick={() => void handleTogglePublicContent(item)}
                        >
                          {item.published ? "Ocultar" : "Publicar"}
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </div>
          <Card className="mt-5">
            <CardHeader>
              <h2 className="font-display text-xl font-semibold">
                Mensagens de contato
              </h2>
              <p className="mt-1 text-sm text-arena-muted">
                Solicitacoes enviadas pela pagina pública.
              </p>
            </CardHeader>
            <DataTable
              data={publicContacts}
              empty={
                <div className="p-6 text-sm text-arena-muted">
                  Nenhuma mensagem recebida.
                </div>
              }
              columns={[
                {
                  header: "Recebida",
                  cell: (item) => formatDateTime(item.created_at),
                },
                {
                  header: "Contato",
                  cell: (item) => (
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-arena-muted">{item.email}</p>
                    </div>
                  ),
                },
                {
                  header: "Assunto",
                  cell: (item) => (
                    <div>
                      <p className="font-semibold">{item.subject}</p>
                      <p className="max-w-md truncate text-xs text-arena-muted">
                        {item.message}
                      </p>
                    </div>
                  ),
                },
                {
                  header: "Status",
                  cell: (item) => (
                    <Badge
                      tone={
                        item.status === "novo"
                          ? "warning"
                          : item.status === "respondido"
                            ? "success"
                            : "neutral"
                      }
                    >
                      {item.status}
                    </Badge>
                  ),
                },
                {
                  header: "Ações",
                  cell: (item) => (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          void handlePublicContact(item, "em_atendimento")
                        }
                      >
                        Atender
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() =>
                          void handlePublicContact(item, "respondido")
                        }
                      >
                        Respondido
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          void handlePublicContact(item, "arquivado")
                        }
                      >
                        Arquivar
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </>
      ) : null}

      {activeModule === "access" ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <Card>
            <CardHeader>
              <h2 className="font-display text-xl font-semibold">
                Contas da plataforma
              </h2>
              <p className="mt-1 text-sm text-arena-muted">
                Selecione uma conta para revisar papeis e jogos vinculados.
              </p>
            </CardHeader>
            <DataTable
              data={filteredAccessAccounts}
              empty={
                <div className="p-6 text-sm text-arena-muted">
                  Nenhuma conta encontrada.
                </div>
              }
              columns={[
                {
                  header: "Conta",
                  cell: (item) => (
                    <button
                      className="text-left"
                      onClick={() => selectAccessAccount(item)}
                    >
                      <p className="font-semibold text-cyan-100">
                        {item.nickname || item.nome}
                      </p>
                      <p className="text-xs text-arena-muted">{item.email}</p>
                    </button>
                  ),
                },
                {
                  header: "Papeis",
                  cell: (item) => (
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {item.roles.map((role) => (
                        <Badge key={role} tone="info">
                          {roleLabel(role)}
                        </Badge>
                      ))}
                    </div>
                  ),
                },
                { header: "Jogos", cell: (item) => item.game_ids.length },
                {
                  header: "Acesso",
                  cell: (item) => (
                    <Badge tone={item.is_banned ? "danger" : "success"}>
                      {item.banned_permanent
                        ? "Ban permanente"
                        : item.is_banned
                          ? `Ban ate ${formatDateTime(item.banned_until)}`
                          : "Ativa"}
                    </Badge>
                  ),
                },
                {
                  header: "Email",
                  cell: (item) => (
                    <Badge tone={item.email_verified ? "success" : "warning"}>
                      {item.email_verified ? "Verificado" : "Pendente"}
                    </Badge>
                  ),
                },
                {
                  header: "Ações",
                  cell: (item) => (
                    <Button
                      variant="secondary"
                      onClick={() => selectAccessAccount(item)}
                    >
                      Gerenciar
                    </Button>
                  ),
                },
              ]}
            />
          </Card>
          <Card>
            <CardHeader>
              <h2 className="font-display text-xl font-semibold">
                Permissões da conta
              </h2>
              <p className="mt-1 text-sm text-arena-muted">
                Papeis de equipe também sao concedidos automaticamente pelo
                elenco.
              </p>
            </CardHeader>
            <CardContent>
              {selectedAccessId ? (
                <div className="space-y-6">
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase text-arena-muted">
                      Papeis
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        "jogador",
                        "lider",
                        "capitao",
                        "admin",
                      ].map((role) => (
                        <label
                          className={`flex items-center gap-3 border p-3 text-sm font-semibold ${accessForm.roles.includes(role) ? "border-cyan-400/40 bg-cyan-400/10" : "border-arena-line"}`}
                          key={role}
                        >
                          <input
                            type="checkbox"
                            checked={accessForm.roles.includes(role)}
                            onChange={() => toggleAccessRole(role)}
                          />
                          {roleLabel(role)}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase text-arena-muted">
                      Jogos vinculados
                    </p>
                    <div className="space-y-2">
                      {games.map((game) => (
                        <div
                          className={`grid grid-cols-[1fr_auto] items-center gap-3 border p-3 ${accessForm.game_ids.includes(game.id) ? "border-cyan-400/40" : "border-arena-line"}`}
                          key={game.id}
                        >
                          <label className="flex items-center gap-3 text-sm font-semibold">
                            <input
                              type="checkbox"
                              checked={accessForm.game_ids.includes(game.id)}
                              onChange={() => toggleAccessGame(game.id)}
                            />
                            {game.nome}
                          </label>
                          {accessForm.game_ids.includes(game.id) ? (
                            <label className="flex items-center gap-2 text-xs text-arena-muted">
                              <input
                                name="primary-game"
                                type="radio"
                                checked={accessForm.primary_game_id === game.id}
                                onChange={() =>
                                  setAccessForm((state) => ({
                                    ...state,
                                    primary_game_id: game.id,
                                  }))
                                }
                              />
                              Principal
                            </label>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    icon={<ShieldCheck className="h-4 w-4" />}
                    onClick={() => void handleSaveAccessAccount()}
                  >
                    Salvar acessos
                  </Button>
                  <div className="border-t border-arena-line pt-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Moderacao da conta</p>
                        <p className="mt-1 text-xs text-arena-muted">
                          O banimento encerra todas as sessoes e bloqueia novos acessos.
                        </p>
                      </div>
                      {accessAccounts.find((item) => item.id === selectedAccessId)?.is_banned ? (
                        <Badge tone="danger">Bloqueada</Badge>
                      ) : (
                        <Badge tone="success">Ativa</Badge>
                      )}
                    </div>
                    {accessAccounts.find((item) => item.id === selectedAccessId)?.is_banned ? (
                      <div className="space-y-4">
                        <div className="border border-red-400/30 bg-red-400/5 p-4 text-sm">
                          <p className="font-semibold text-red-200">
                            {accessAccounts.find((item) => item.id === selectedAccessId)?.banned_permanent
                              ? "Banimento permanente"
                              : `Banida ate ${formatDateTime(accessAccounts.find((item) => item.id === selectedAccessId)?.banned_until)}`}
                          </p>
                          <p className="mt-1 text-arena-muted">
                            {accessAccounts.find((item) => item.id === selectedAccessId)?.ban_reason || "Motivo não informado."}
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          loading={moderatingAccess}
                          icon={<ShieldCheck className="h-4 w-4" />}
                          onClick={() => void handleUnbanAccessAccount()}
                        >
                          Remover banimento
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="ban-duration">Duracao</Label>
                          <Select
                            id="ban-duration"
                            className="mt-2"
                            value={banForm.duration}
                            onChange={(event) => setBanForm((state) => ({ ...state, duration: event.target.value }))}
                          >
                            <option value="1_day">1 dia</option>
                            <option value="7_days">1 semana</option>
                            <option value="30_days">1 mes</option>
                            <option value="90_days">3 meses</option>
                            <option value="180_days">6 meses</option>
                            <option value="365_days">1 ano</option>
                            <option value="permanent">Permanente</option>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="ban-reason">Motivo</Label>
                          <Input
                            id="ban-reason"
                            className="mt-2"
                            placeholder="Ex.: conduta antidesportiva"
                            value={banForm.reason}
                            onChange={(event) => setBanForm((state) => ({ ...state, reason: event.target.value }))}
                          />
                        </div>
                        <Button
                          className="sm:col-span-2"
                          variant="danger"
                          loading={moderatingAccess}
                          icon={<Ban className="h-4 w-4" />}
                          onClick={() => void handleBanAccessAccount()}
                        >
                          Banir e encerrar sessoes
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-arena-line pt-6">
                    <p className="text-sm font-semibold">Excluir cadastro</p>
                    <p className="mt-1 text-xs text-arena-muted">
                      Disponivel apenas para contas sem equipe, partidas, inscrições ou outro histórico.
                    </p>
                    <Button
                      className="mt-4"
                      variant="danger"
                      loading={moderatingAccess}
                      icon={<Trash2 className="h-4 w-4" />}
                      onClick={() => void handleDeleteAccessAccount()}
                    >
                      Excluir conta definitivamente
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-arena-muted">
                  Selecione uma conta na tabela.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeModule === "official" ? <OfficialTournamentsWorkspace /> : null}

      {activeModule === "finance" ? (
        <Card className="mt-6">
          <CardHeader>
            <h2 className="font-display text-xl font-semibold">
              Backoffice de pagamentos
            </h2>
          </CardHeader>
          <DataTable
            data={filteredPayments}
            empty={
              <div className="p-6 text-sm text-arena-muted">
                Nenhum pagamento encontrado.
              </div>
            }
            columns={[
              { header: "Equipe", cell: (item) => item.team_name },
              { header: "Torneio", cell: (item) => item.tournament_name },
              { header: "Valor", cell: (item) => formatCurrency(item.valor) },
              {
                header: "Gateway",
                cell: (item) => (
                  <Badge tone={paymentTone(item.status)}>{item.status}</Badge>
                ),
              },
              {
                header: "Inscrição",
                cell: (item) => (
                  <Badge
                    tone={
                      item.entry_payment_status === "pago"
                        ? "success"
                        : "warning"
                    }
                  >
                    {item.entry_payment_status}
                  </Badge>
                ),
              },
              {
                header: "Ações",
                cell: (item) => (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        void handlePaymentStatus(item.id, "aprovado")
                      }
                    >
                      Aprovar
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        void handlePaymentStatus(item.id, "pendente")
                      }
                    >
                      Pendente
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() =>
                        void handlePaymentStatus(item.id, "cancelado")
                      }
                    >
                      Cancelar
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      ) : null}

      {activeModule === "audit" ? (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold">
                Auditoria administrativa
              </h2>
              <Button
                variant="secondary"
                icon={<FileSpreadsheet className="h-4 w-4" />}
                onClick={() => void loadAdminWorkspace()}
              >
                Recarregar logs
              </Button>
            </div>
          </CardHeader>
          <DataTable
            data={auditLogs}
            empty={
              <div className="p-6 text-sm text-arena-muted">
                {loadingAdmin
                  ? "Carregando auditoria..."
                  : "Nenhum log encontrado."}
              </div>
            }
            columns={[
              {
                header: "Quando",
                cell: (item) => formatDateTime(item.created_at),
              },
              {
                header: "Admin",
                cell: (item) =>
                  item.actor_name ?? `Usuario ${item.actor_user_id}`,
              },
              { header: "Ação", cell: (item) => item.action },
              {
                header: "Entidade",
                cell: (item) =>
                  `${item.entity_type}${item.entity_id ? ` #${item.entity_id}` : ""}`,
              },
              {
                header: "Detalhes",
                cell: (item) => (
                  <span className="line-clamp-2 text-xs text-arena-muted">
                    {stringifyDetails(item.details)}
                  </span>
                ),
              },
            ]}
          />
        </Card>
      ) : null}
    </section>
  );
}

function blankTournamentForm() {
  return {
    nome: "",
    descricao: "",
    valor: "",
    max_teams: "",
    titulares: "",
    reservas: "",
    premiacao: "",
    inicio: "",
    fim: "",
  };
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function toApiDate(value: string) {
  return new Date(value).toISOString().slice(0, 19).replace("T", " ");
}

function buildTournamentForm(tournament: Tournament) {
  return {
    nome: tournament.nome,
    descricao: tournament.descricao ?? "",
    valor: String(tournament.valor ?? ""),
    max_teams: String(tournament.max_teams ?? ""),
    titulares: String(tournament.titulares ?? ""),
    reservas: String(tournament.reservas ?? ""),
    premiacao: tournament.premiacao ?? "",
    inicio: toDatetimeLocal(tournament.inicio),
    fim: toDatetimeLocal(tournament.fim),
  };
}

function parseIds(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item))
    .filter((item) => !Number.isNaN(item));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString("pt-BR") : "data não informada";
}

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return formatter.format(days, "day");
  return date.toLocaleDateString("pt-BR");
}

function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    "payment.updated": "Pagamento atualizado",
    "entry.approved": "Inscrição aprovada",
    "entry.cancelled": "Inscrição cancelada",
    "player.updated": "Jogador atualizado",
    "team.updated": "Equipe atualizada",
    "game.map.created": "Mapa cadastrado",
    "game.map.updated": "Mapa atualizado",
    "game.map.deleted": "Mapa excluido",
    "game.deleted": "Jogo excluido",
    "account.banned": "Conta banida",
    "account.unbanned": "Banimento removido",
    "tournament.updated": "Torneio atualizado",
  };
  return labels[action] || action.replaceAll(".", " · ").replaceAll("_", " ");
}

function stringifyDetails(value: unknown) {
  if (!value) {
    return "-";
  }

  return typeof value === "string" ? value : JSON.stringify(value);
}

function paymentTone(status: AdminPayment["status"]) {
  if (status === "aprovado") {
    return "success";
  }

  if (status === "cancelado" || status === "rejeitado") {
    return "danger";
  }

  return "warning";
}

function playerTone(status: AdminPlayer["status"]) {
  if (status === "ativo") {
    return "success";
  }

  if (status === "banido") {
    return "danger";
  }

  if (status === "reserva") {
    return "info";
  }

  return "warning";
}

function achievementMetricLabel(metric: AchievementDefinition["metric"]) {
  const labels: Record<AchievementDefinition["metric"], string> = {
    wins: "Vitorias",
    kills: "Eliminacoes",
    assists: "Assistencias",
    headshots: "Headshots",
    mvps: "MVPs",
    matches: "Partidas",
    win_streak: "Sequencia",
    global_rank: "Ranking",
  };
  return labels[metric];
}

function publicContentTypeLabel(type: PublicContent["type"]) {
  return (
    {
      noticia: "Noticia",
      parceiro: "Parceiro",
      depoimento: "Depoimento",
      faq: "FAQ",
    } as Record<PublicContent["type"], string>
  )[type];
}

function roleLabel(role: string) {
  return (
    (
      {
        jogador: "Jogador",
        lider: "Líder",
        capitao: "Capitão",
        admin: "Administrador",
      } as Record<string, string>
    )[role] ?? role
  );
}

function MetricTile({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-arena border border-arena-line bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-arena-muted">
          {title}
        </p>
        <div className="text-cyan-200">{icon}</div>
      </div>
      <p className="mt-3 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function QueueLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-arena border border-arena-line bg-black/20 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="text-cyan-200">{icon}</div>
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-semibold text-arena-text">{value}</span>
    </div>
  );
}
