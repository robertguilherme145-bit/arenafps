import axios from "axios";
import type {
  AdminDashboardData,
  AdminCompetitionGame,
  AdminEntry,
  AdminPayment,
  AdminPlayer,
  AdminPenalty,
  AdminTeam,
  AchievementDefinition,
  AdminAccessAccount,
  AuditLog,
  AuthUser,
  CaptainMatchRoom,
  CaptainWorkspace,
  Dispute,
  AuthResponse,
  AuthProviderStatus,
  OAuthProfileCompletion,
  DashboardData,
  EntryPlayer,
  Game,
  GameMap,
  LoginInput,
  LeaderPreferences,
  LeaderTournamentCenter,
  LeaderWorkspace,
  Match,
  MatchOperations,
  NotificationItem,
  PlayerStatistics,
  PlayerMatchRoom,
  PlayerPublicProfile,
  PlayerTeamSearchResult,
  PlayerWorkspace,
  PublicPortalData,
  PublicSearchResult,
  PublicTournamentCenter,
  PublicTeamProfile,
  PublicContent,
  PublicContactMessage,
  RegisterInput,
  RegisterResponse,
  SupportTicket,
  TeamRanking,
  TournamentCompetition,
  TournamentTeam,
  Tournament,
  UserProfile
  ,MixTournament
} from "../types/api";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:4000" : ""),
  timeout: 8000
});

api.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("arena-camp-token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.erro ??
      error?.message ??
      "Nao foi possivel concluir a requisicao.";

    return Promise.reject(new Error(message));
  }
);

export async function getTournaments() {
  const { data } = await api.get<Tournament[]>("/tournament/all");
  return data;
}

export async function getPublicPortal(gameId?: number | null) {
  const { data } = await api.get<PublicPortalData>("/public/portal", { params:gameId ? { game_id:gameId } : undefined });
  return data;
}

export async function searchPublicPortal(query: string, gameId?: number | null) {
  const { data } = await api.get<PublicSearchResult[]>("/public/search", { params:{ q:query, ...(gameId ? { game_id:gameId } : {}) } });
  return data;
}

export async function getPublicTournamentCenter(tournamentId: number) {
  const { data } = await api.get<PublicTournamentCenter>(`/public/tournaments/${tournamentId}`);
  return data;
}

export async function getPublicTeamProfile(slug: string) {
  const { data } = await api.get<PublicTeamProfile>(`/public/teams/${encodeURIComponent(slug)}`);
  return data;
}

export async function getAdminPublicContent() {
  const { data } = await api.get<PublicContent[]>("/admin/public-content");
  return data;
}

export async function sendPublicContact(input:{ name:string; email:string; subject:string; message:string }) {
  const { data } = await api.post<{ id:number; mensagem:string }>("/public/contact", input);
  return data;
}

export async function getAdminPublicContacts() {
  const { data } = await api.get<PublicContactMessage[]>("/admin/public-contacts");
  return data;
}

export async function updateAdminPublicContact(id:number, input:{ status:PublicContactMessage["status"]; admin_notes?:string }) {
  const { data } = await api.put<PublicContactMessage>(`/admin/public-contacts/${id}`, input);
  return data;
}

export async function createAdminPublicContent(input: Partial<PublicContent>) {
  const { data } = await api.post<PublicContent>("/admin/public-content", input);
  return data;
}

export async function updateAdminPublicContent(id: number, input: Partial<PublicContent>) {
  const { data } = await api.put<PublicContent>(`/admin/public-content/${id}`, input);
  return data;
}

export async function getTournamentRanking(tournamentId: number) {
  const { data } = await api.get<TeamRanking[]>(`/tournament/${tournamentId}/ranking`);
  return data;
}

export async function getTournamentStatistics(tournamentId: number) {
  const { data } = await api.get<PlayerStatistics[]>(`/tournament/${tournamentId}/statistics`);
  return data;
}

export async function login(input: LoginInput) {
  const { data } = await api.post<AuthResponse>("/auth/login", input);
  return data;
}

export async function register(input: RegisterInput) {
  const { data } = await api.post<RegisterResponse>("/auth/register", input);
  return data;
}

export async function getAuthProviders() {
  const { data } = await api.get<AuthProviderStatus>("/auth/providers");
  return data;
}

export function getOAuthStartUrl(provider: "google" | "discord" | "steam") {
  return `${String(api.defaults.baseURL || window.location.origin).replace(/\/$/, "")}/auth/oauth/${provider}`;
}

export async function exchangeOAuthLogin(code: string) {
  const { data } = await api.post<AuthResponse>("/auth/oauth/exchange", { code });
  return data;
}

export async function completeOAuthAccountProfile(input: { email:string; nickname?:string }) {
  const { data } = await api.post<OAuthProfileCompletion>("/auth/oauth/complete-profile", input);
  return data;
}

export async function verifyAccountEmail(token: string) {
  const { data } = await api.post<{ mensagem: string }>("/auth/verify-email", { token });
  return data;
}

export async function resendAccountVerification() {
  const { data } = await api.post<{ mensagem: string; email_sent?: boolean }>("/auth/resend-verification");
  return data;
}

export async function requestAccountPasswordReset(email: string) {
  const { data } = await api.post<{ mensagem: string; email_sent?: boolean }>("/auth/forgot-password", { email });
  return data;
}

export async function resetAccountPassword(token: string, password: string) {
  const { data } = await api.post<{ mensagem: string }>("/auth/reset-password", { token, password });
  return data;
}

export async function completeAccountOnboarding(role: "jogador" | "lider") {
  const { data } = await api.post<AuthUser>("/auth/onboarding", { role });
  return data;
}

export async function getProfile() {
  const { data } = await api.get<UserProfile>("/profile");
  return data;
}

export async function getIdentity() {
  const { data } = await api.get<AuthUser>("/identity/me");
  return data;
}

export async function switchIdentityContext(input: { role: string; game_id?: number | null; team_id?: number | null }) {
  const { data } = await api.put<AuthUser>("/identity/context", input);
  return data;
}

export async function updateIdentityGames(input: { game_ids: number[]; primary_game_id?: number }) {
  const { data } = await api.put<AuthUser>("/identity/games", input);
  return data;
}

export async function getNotifications() {
  const { data } = await api.get<NotificationItem[]>("/notifications");
  return data;
}

export async function getDashboard() {
  const { data } = await api.get<DashboardData>("/dashboard");
  return data;
}

export async function createTournament(input: {
  nome: string;
  descricao: string;
  game: string;
  valor: number;
  max_teams: number;
  titulares: number;
  reservas: number;
  premiacao: string;
  banner: string | null;
  inicio: string;
  fim: string;
}) {
  const { data } = await api.post<Tournament>("/tournament/create", input);
  return data;
}

export async function updateTournament(
  tournamentId: number,
  input: Partial<{
    nome: string;
    descricao: string;
    game: string;
    valor: number;
    max_teams: number;
    titulares: number;
    reservas: number;
    premiacao: string;
    banner: string | null;
    inicio: string;
    fim: string;
  }>
) {
  const { data } = await api.put<{ mensagem: string }>(`/tournament/${tournamentId}`, input);
  return data;
}

export async function updateTournamentStatus(tournamentId: number, status: string) {
  const { data } = await api.patch<{ mensagem: string }>(`/tournament/${tournamentId}/status`, { status });
  return data;
}

export async function getGames() {
  const { data } = await api.get<Game[]>("/game");
  return data;
}

export async function createGame(input: {
  nome: string;
  nome_curto: string;
  slug: string;
  descricao?: string;
  logo?: string | null;
  banner?: string | null;
  cor_primaria?: string | null;
}) {
  const { data } = await api.post<Game>("/game", input);
  return data;
}

export async function updateGame(gameId: number, input: Partial<{
  nome: string;
  nome_curto: string;
  slug: string;
  descricao: string | null;
  logo: string | null;
  banner: string | null;
  cor_primaria: string | null;
  ativo: boolean;
}>) {
  const { data } = await api.put<Game>(`/game/${gameId}`, input);
  return data;
}

export async function getAdminCompetitionGames() {
  const { data } = await api.get<AdminCompetitionGame[]>("/admin/competition/games");
  return data;
}

export async function updateGameCompetitionSettings(gameId: number, input: {
  player_id_label: string;
  player_id_required: boolean;
  default_best_of: "bo1" | "bo3" | "bo5";
}) {
  const { data } = await api.put(`/admin/competition/games/${gameId}/settings`, input);
  return data;
}

export async function getGameMaps(gameId: number, includeInactive = true) {
  const { data } = await api.get<GameMap[]>(`/admin/competition/games/${gameId}/maps`, {
    params: { include_inactive: includeInactive }
  });
  return data;
}

export async function createGameMap(gameId: number, input: {
  nome: string;
  slug?: string;
  imagem?: string | null;
  ordem?: number;
}) {
  const { data } = await api.post<GameMap>(`/admin/competition/games/${gameId}/maps`, input);
  return data;
}

export async function updateGameMap(mapId: number, input: Partial<Pick<GameMap, "nome" | "slug" | "imagem" | "ativo" | "ordem">>) {
  const { data } = await api.put<GameMap>(`/admin/competition/maps/${mapId}`, input);
  return data;
}

export async function deactivateGameMap(mapId: number) {
  const { data } = await api.delete<GameMap>(`/admin/competition/maps/${mapId}`);
  return data;
}

export async function getTournamentCompetition(tournamentId: number) {
  const { data } = await api.get<TournamentCompetition>(`/admin/competition/tournaments/${tournamentId}`);
  return data;
}

export async function updateTournamentCompetition(tournamentId: number, input: Omit<TournamentCompetition,
  "tournament_id" | "tournament_name" | "tournament_status" | "game_name" | "game_short_name" | "map_pool" | "available_maps"
>) {
  const { data } = await api.put<TournamentCompetition>(`/admin/competition/tournaments/${tournamentId}`, input);
  return data;
}

export async function getTournamentCompetitionTeams(tournamentId: number) {
  const { data } = await api.get<TournamentTeam[]>(`/admin/competition/tournaments/${tournamentId}/teams`);
  return data;
}

export async function getMatchOperations(matchId: number) {
  const { data } = await api.get<MatchOperations>(`/admin/competition/matches/${matchId}`);
  return data;
}

export async function updateMatchRoomSettings(matchId: number, input: { server_address: string | null; server_password: string | null; responsible_admin_id?: number | null; captain_confirmation_enabled: boolean; veto_action_seconds: number }) {
  const { data } = await api.put<MatchOperations>(`/admin/competition/matches/${matchId}/room`, input);
  return data;
}

export async function sendAdminMatchMessage(matchId: number, input: { message: string; attachment_url?: string | null; type?: "message" | "announcement" }) {
  const { data } = await api.post(`/admin/competition/matches/${matchId}/messages`, input);
  return data;
}

export async function openMatchVeto(matchId: number) {
  const { data } = await api.post<MatchOperations>(`/admin/competition/matches/${matchId}/veto/open`);
  return data;
}

export async function resetMatchVeto(matchId: number) {
  const { data } = await api.post<MatchOperations>(`/admin/competition/matches/${matchId}/veto/reset`);
  return data;
}

export async function performMatchVetoAction(matchId: number, input: {
  action: "ban" | "pick" | "decider";
  team_id?: number | null;
  game_map_id: number;
}) {
  const { data } = await api.post<MatchOperations>(`/admin/competition/matches/${matchId}/veto/actions`, input);
  return data;
}

export async function addManualMatchMap(matchId: number, input: { game_map_id: number; team_id?: number | null }) {
  const { data } = await api.post<MatchOperations>(`/admin/competition/matches/${matchId}/maps`, input);
  return data;
}

export async function saveMatchMapResult(matchMapId: number, input: { score_team_a: number; score_team_b: number }) {
  const { data } = await api.patch<MatchOperations>(`/admin/competition/match-maps/${matchMapId}/result`, input);
  return data;
}

export async function saveMatchPlayerStatistics(matchId: number, player_stats: Array<{
  player_id: number;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  mvp: boolean;
}>) {
  const { data } = await api.put<MatchOperations>(`/admin/competition/matches/${matchId}/player-stats`, { player_stats });
  return data;
}

export async function saveMatchMapPlayerStatistics(matchId: number, matchMapId: number, player_stats: Array<{
  player_id: number;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  mvp: boolean;
}>) {
  const { data } = await api.put<MatchOperations>(
    `/admin/competition/matches/${matchId}/maps/${matchMapId}/player-stats`,
    { player_stats }
  );
  return data;
}

export async function getTournamentMatches(tournamentId: number) {
  const { data } = await api.get<Match[]>(`/match/tournament/${tournamentId}`);
  return data;
}

export async function createMatch(input: {
  tournament_id: number;
  round: number;
  team_a_id: number;
  team_b_id: number;
  scheduled_at?: string | null;
}) {
  const { data } = await api.post<Match>("/match", input);
  return data;
}

export async function finishMatch(input: {
  matchId: number;
  score_team_a: number;
  score_team_b: number;
}) {
  const { data } = await api.patch<{ mensagem: string; event: string }>(`/match/${input.matchId}/result`, {
    score_team_a: input.score_team_a,
    score_team_b: input.score_team_b
  });
  return data;
}

export async function getAdminDashboard() {
  const { data } = await api.get<AdminDashboardData>("/admin/dashboard");
  return data;
}

export async function getAdminAccessAccounts() {
  const { data } = await api.get<AdminAccessAccount[]>("/admin/access-accounts");
  return data;
}

export async function updateAdminAccessAccount(id:number, input:{ roles:string[]; game_ids:number[]; primary_game_id?:number }) {
  const { data } = await api.put<AuthUser>(`/admin/access-accounts/${id}`, input);
  return data;
}

export async function getAdminAchievements(gameId?: number | null) {
  const { data } = await api.get<AchievementDefinition[]>("/admin/achievements", { params: gameId ? { game_id: gameId } : undefined });
  return data;
}

export async function createAdminAchievement(input: Omit<AchievementDefinition, "id" | "game_name" | "game_short_name" | "players_count" | "unlocked_count">) {
  const { data } = await api.post<AchievementDefinition>("/admin/achievements", input);
  return data;
}

export async function updateAdminAchievement(id: number, input: Partial<AchievementDefinition>) {
  const { data } = await api.put<AchievementDefinition>(`/admin/achievements/${id}`, input);
  return data;
}

export async function getAdminEntries(params?: {
  tournament_id?: number;
  status?: string;
  payment_status?: string;
}) {
  const { data } = await api.get<AdminEntry[]>("/admin/entries", { params });
  return data;
}

export async function approveAdminEntry(entryId: number) {
  const { data } = await api.patch<{ mensagem: string }>(`/admin/entries/${entryId}/approve`);
  return data;
}

export async function cancelAdminEntry(entryId: number) {
  const { data } = await api.patch<{ mensagem: string }>(`/admin/entries/${entryId}/cancel`);
  return data;
}

export async function updateAdminEntryPayment(entryId: number, payment_status: "aguardando" | "pago" | "falhou") {
  const { data } = await api.patch<{ mensagem: string }>(`/admin/entries/${entryId}/payment`, { payment_status });
  return data;
}

export async function getAdminEntryLineup(entryId: number) {
  const { data } = await api.get<EntryPlayer[]>(`/admin/entries/${entryId}/lineup`);
  return data;
}

export async function saveAdminEntryLineup(entryId: number, input: { titulares: number[]; reservas: number[] }) {
  const { data } = await api.put<{ mensagem: string; jogadores: EntryPlayer[] }>(`/admin/entries/${entryId}/lineup`, input);
  return data;
}

export async function getAdminPayments(params?: {
  tournament_id?: number;
  status?: string;
}) {
  const { data } = await api.get<AdminPayment[]>("/admin/payments", { params });
  return data;
}

export async function updateAdminPaymentStatus(paymentId: number, status: "pendente" | "aprovado" | "cancelado" | "rejeitado") {
  const { data } = await api.patch<{ mensagem: string }>(`/admin/payments/${paymentId}/status`, { status });
  return data;
}

export async function getAdminTeams() {
  const { data } = await api.get<AdminTeam[]>("/admin/teams");
  return data;
}

export async function updateAdminTeam(teamId: number, input: Partial<Pick<AdminTeam, "nome" | "tag" | "descricao">> & {
  recrutando?: boolean;
  privada?: boolean;
  ativo?: boolean;
}) {
  const { data } = await api.put<{ mensagem: string }>(`/admin/teams/${teamId}`, input);
  return data;
}

export async function getAdminPlayers(params?: {
  team_id?: number;
  status?: string;
}) {
  const { data } = await api.get<AdminPlayer[]>("/admin/players", { params });
  return data;
}

export async function updateAdminPlayer(playerId: number, input: Partial<Pick<AdminPlayer, "nick" | "game" | "game_uid" | "foto" | "status">>) {
  const { data } = await api.put<{ mensagem: string }>(`/admin/players/${playerId}`, input);
  return data;
}

export async function sendAdminNotification(input: {
  user_ids: number[];
  titulo: string;
  mensagem: string;
  tipo?: string;
  link?: string | null;
}) {
  const { data } = await api.post<{ mensagem: string }>("/admin/notifications", input);
  return data;
}

export async function getAdminAuditLogs(limit = 50) {
  const { data } = await api.get<AuditLog[]>("/admin/audit-logs", { params: { limit } });
  return data;
}

export async function getAdminPenalties() {
  const { data } = await api.get<AdminPenalty[]>("/admin/penalties");
  return data;
}

export async function createAdminPenalty(input: {
  player_id: number;
  tournament_id?: number | null;
  type: AdminPenalty["type"];
  scope: AdminPenalty["scope"];
  reason: string;
  evidence?: string | null;
  duration_days?: number | null;
  notes?: string | null;
}) {
  const { data } = await api.post<{ mensagem: string }>("/admin/penalties", input);
  return data;
}

export async function resolveAdminPenalty(penaltyId: number, notes?: string) {
  const { data } = await api.patch<{ mensagem: string }>(`/admin/penalties/${penaltyId}/resolve`, { notes });
  return data;
}

export async function getAdminTickets() {
  const { data } = await api.get<SupportTicket[]>("/admin/tickets");
  return data;
}

export async function createAdminTicket(input: {
  user_id?: number | null;
  category?: string;
  priority?: SupportTicket["priority"];
  subject: string;
  message: string;
  assigned_admin_id?: number | null;
}) {
  const { data } = await api.post<{ mensagem: string }>("/admin/tickets", input);
  return data;
}

export async function updateAdminTicket(ticketId: number, input: {
  status?: SupportTicket["status"];
  priority?: SupportTicket["priority"];
  response?: string | null;
  assigned_admin_id?: number | null;
}) {
  const { data } = await api.patch<{ mensagem: string }>(`/admin/tickets/${ticketId}`, input);
  return data;
}

export async function getAdminDisputes() {
  const { data } = await api.get<Dispute[]>("/admin/disputes");
  return data;
}

export async function createAdminDispute(input: {
  match_id?: number | null;
  tournament_id?: number | null;
  team_id?: number | null;
  title: string;
  description: string;
  evidence?: string | null;
}) {
  const { data } = await api.post<{ mensagem: string }>("/admin/disputes", input);
  return data;
}

export async function updateAdminDispute(disputeId: number, input: {
  status?: Dispute["status"];
  resolution_notes?: string | null;
}) {
  const { data } = await api.patch<{ mensagem: string }>(`/admin/disputes/${disputeId}`, input);
  return data;
}

export async function getLeaderWorkspace() {
  const { data } = await api.get<LeaderWorkspace>("/leader/workspace");
  return data;
}

export async function updateLeaderTeam(input: Record<string, unknown>) {
  const { data } = await api.put<LeaderWorkspace>("/leader/team", input);
  return data;
}

export async function archiveLeaderTeam(archived: boolean) {
  const { data } = await api.put<{ mensagem: string }>("/leader/team/archive", { archived });
  return data;
}

export async function createTeam(input: {
  game_id: number;
  nome: string;
  tag: string;
  slug: string;
  descricao?: string;
  logo?: string | null;
  banner?: string | null;
}) {
  const { data } = await api.post<{ id: number; nome: string }>("/team", input);
  return data;
}

export async function inviteLeaderPlayer(email: string) {
  const { data } = await api.post("/leader/invitations", { email });
  return data;
}

export async function decideLeaderRequest(requestId: number, action: "accept" | "reject" | "cancel" | "block" | "resend") {
  const { data } = await api.patch<{ mensagem: string }>(`/leader/requests/${requestId}`, { action });
  return data;
}

export async function updateLeaderMember(memberId: number, input: { cargo: string; lineup_status: string; status: string; can_invite_players: boolean; can_remove_players: boolean }) {
  const { data } = await api.patch<{ mensagem: string }>(`/leader/members/${memberId}`, input);
  return data;
}

export async function transferLeaderLeadership(memberId: number) {
  const { data } = await api.post<{ mensagem: string }>(`/leader/members/${memberId}/transfer`);
  return data;
}

export async function removeLeaderMember(memberId: number) {
  const { data } = await api.delete<{ mensagem: string }>(`/leader/members/${memberId}`);
  return data;
}

export async function saveLeaderLineup(lineupId: number | null, input: { name: string; status: string; titulares: number[]; reservas: number[] }) {
  const request = lineupId ? api.put(`/leader/lineups/${lineupId}`, input) : api.post("/leader/lineups", input);
  const { data } = await request;
  return data;
}

export async function duplicateLeaderLineup(lineupId: number) {
  const { data } = await api.post(`/leader/lineups/${lineupId}/duplicate`);
  return data;
}

export async function freezeLeaderLineup(lineupId: number) {
  const { data } = await api.post(`/leader/lineups/${lineupId}/freeze`);
  return data;
}

export async function registerLeaderTournament(input: { tournament_id: number; lineup_id: number; accepted_rules: boolean }) {
  const { data } = await api.post<{ id: number; mensagem: string }>("/leader/entries", input);
  return data;
}

export async function createLeaderPayment(entryId: number) {
  const { data } = await api.post(`/leader/payments/${entryId}`);
  return data;
}

export async function syncLeaderPayments() {
  const { data } = await api.post<{ checked: number; updated: number; approved: number }>("/leader/payments/sync");
  return data;
}

export async function getLeaderTournamentCenter(tournamentId: number) {
  const { data } = await api.get<LeaderTournamentCenter>(`/leader/tournaments/${tournamentId}/center`);
  return data;
}

export async function getLeaderMatch(matchId: number) {
  const { data } = await api.get<MatchOperations>(`/leader/matches/${matchId}`);
  return data;
}

export async function performLeaderVeto(matchId: number, input: { action: string; game_map_id: number }) {
  const { data } = await api.post<MatchOperations>(`/leader/matches/${matchId}/veto`, input);
  return data;
}

export async function createLeaderEvent(input: Record<string, unknown>) {
  const { data } = await api.post("/leader/events", input);
  return data;
}

export async function deleteLeaderEvent(eventId: number) {
  const { data } = await api.delete(`/leader/events/${eventId}`);
  return data;
}

export async function updateLeaderEventAttendance(eventId: number, status: "confirmado" | "ausente" | "talvez") {
  const { data } = await api.put<{ mensagem: string }>(`/leader/events/${eventId}/attendance`, { status });
  return data;
}

export async function sendLeaderTeamMessage(input: { message: string; attachment_url?: string | null }) {
  const { data } = await api.post("/leader/messages/team", input);
  return data;
}

export async function sendLeaderTournamentMessage(tournamentId: number, input: { message: string; attachment_url?: string | null }) {
  const { data } = await api.post(`/leader/messages/tournament/${tournamentId}`, input);
  return data;
}

export async function createLeaderDispute(input: Record<string, unknown>) {
  const { data } = await api.post("/leader/disputes", input);
  return data;
}

export async function createLeaderTicket(input: Record<string, unknown>) {
  const { data } = await api.post("/leader/tickets", input);
  return data;
}

export async function createLeaderCompetitionRequest(input: Record<string, unknown>) {
  const { data } = await api.post<{ id: number; mensagem: string }>("/leader/competition-requests", input);
  return data;
}

export async function createLeaderDocument(input: { name: string; type: string; url: string }) {
  const { data } = await api.post("/leader/documents", input);
  return data;
}

export async function updateLeaderPreferences(input: Omit<LeaderPreferences, "user_id" | "steam_profile"> & { steam_profile?: string | null }) {
  const { data } = await api.put("/leader/preferences", input);
  return data;
}

export async function getCaptainWorkspace() {
  const { data } = await api.get<CaptainWorkspace>("/captain/workspace");
  return data;
}

export async function getCaptainMatch(matchId: number) {
  const { data } = await api.get<CaptainMatchRoom>(`/captain/matches/${matchId}`);
  return data;
}

export async function updateCaptainMatchAttendance(matchId: number, status: "confirmado" | "ausente" | "talvez", note?: string | null) {
  const { data } = await api.put(`/captain/matches/${matchId}/attendance`, { status, note });
  return data;
}

export async function performCaptainVeto(matchId: number, input: { action: string; game_map_id: number }) {
  const { data } = await api.post<CaptainMatchRoom>(`/captain/matches/${matchId}/veto`, input);
  return data;
}

export async function confirmCaptainMatchResult(matchId: number, input: { correct: boolean; comments?: string; title?: string; description?: string; evidence?: string }) {
  const { data } = await api.post(`/captain/matches/${matchId}/result-confirmation`, input);
  return data;
}

export async function sendCaptainMatchMessage(matchId: number, input: { message: string; attachment_url?: string | null }) {
  const { data } = await api.post(`/captain/matches/${matchId}/messages`, input);
  return data;
}

export async function sendCaptainTeamMessage(input: { message: string; attachment_url?: string | null }) {
  const { data } = await api.post("/captain/messages/team", input);
  return data;
}

export async function createCaptainDispute(input: Record<string, unknown>) {
  const { data } = await api.post("/captain/disputes", input);
  return data;
}

export async function getCaptainTournamentCenter(tournamentId: number) {
  const { data } = await api.get<LeaderTournamentCenter>(`/captain/tournaments/${tournamentId}/center`);
  return data;
}

export async function updateCaptainEventAttendance(eventId: number, status: "confirmado" | "ausente" | "talvez") {
  const { data } = await api.put(`/captain/events/${eventId}/attendance`, { status });
  return data;
}

export async function updateCaptainPreferences(input: Omit<LeaderPreferences, "user_id">) {
  const { data } = await api.put("/captain/preferences", input);
  return data;
}

export async function inviteCaptainPlayer(email: string) {
  const { data } = await api.post("/captain/invitations", { email });
  return data;
}

export async function removeCaptainMember(memberId: number) {
  const { data } = await api.delete(`/captain/members/${memberId}`);
  return data;
}

export async function leaveCaptainTeam(teamName: string) {
  const { data } = await api.post<{ mensagem: string; redirect: string; pending_matches: number; active_tournaments: number }>("/captain/team/leave", { team_name: teamName });
  return data;
}

export async function getPlayerWorkspace(teamId?: number | null) {
  const { data } = await api.get<PlayerWorkspace>("/player/workspace", { params: teamId ? { team_id: teamId } : undefined });
  return data;
}

export async function getPublicPlayerProfile(slug: string) {
  const { data } = await api.get<PlayerPublicProfile>(`/player/public/${encodeURIComponent(slug)}`);
  return data;
}

export async function searchPlayerTeams(filters: { query?: string; game_id?: number | null; region?: string; recruiting?: boolean }) {
  const { data } = await api.get<PlayerTeamSearchResult[]>("/player/teams/search", { params: filters });
  return data;
}

export async function updatePlayerWorkspaceProfile(input: Record<string, unknown>) {
  const { data } = await api.put<{ mensagem: string }>("/player/workspace/profile", input);
  return data;
}

export async function updatePlayerGameProfile(gameId: number, input: Record<string, unknown>) {
  const { data } = await api.put<{ mensagem: string }>(`/player/workspace/games/${gameId}`, input);
  return data;
}

export async function requestPlayerTeam(teamId: number, message: string) {
  const { data } = await api.post<{ id: number; mensagem: string }>(`/player/workspace/teams/${teamId}/request`, { message });
  return data;
}

export async function cancelPlayerTeamRequest(requestId: number) {
  const { data } = await api.delete<{ mensagem: string }>(`/player/workspace/requests/${requestId}`);
  return data;
}

export async function respondPlayerInvite(requestId: number, action: "accept" | "reject" | "block") {
  const { data } = await api.post<{ mensagem: string }>(`/player/workspace/invites/${requestId}/${action}`);
  return data;
}

export async function updatePlayerMatchAttendance(matchId: number, status: "confirmado" | "ausente" | "talvez", note?: string | null, teamId?: number | null) {
  const { data } = await api.put<{ mensagem: string }>(`/player/workspace/matches/${matchId}/attendance`, { status, note, team_id: teamId });
  return data;
}

export async function getPlayerMatchRoom(matchId: number, teamId?: number | null) {
  const { data } = await api.get<PlayerMatchRoom>(`/player/workspace/matches/${matchId}/room`, { params: teamId ? { team_id: teamId } : undefined });
  return data;
}

export async function updatePlayerEventAttendance(eventId: number, status: "confirmado" | "ausente" | "talvez", teamId?: number | null) {
  const { data } = await api.put<{ mensagem: string }>(`/player/workspace/events/${eventId}/attendance`, { status, team_id: teamId });
  return data;
}

export async function sendPlayerWorkspaceTeamMessage(input: { message: string; attachment_url?: string | null; team_id?: number | null }) {
  const { data } = await api.post<{ id: number; mensagem: string }>("/player/workspace/messages/team", input);
  return data;
}

export async function createPlayerSupportTicket(input: { category: string; priority: string; subject: string; message: string }) {
  const { data } = await api.post<{ id: number; mensagem: string }>("/player/workspace/tickets", input);
  return data;
}

export async function replyPlayerSupportTicket(ticketId: number, message: string) {
  const { data } = await api.post<{ mensagem: string }>(`/player/workspace/tickets/${ticketId}/replies`, { message });
  return data;
}

export async function updatePlayerWorkspaceSettings(input: Record<string, unknown>) {
  const { data } = await api.put<{ mensagem: string }>("/player/workspace/settings", input);
  return data;
}

export async function changePlayerWorkspacePassword(input: { current_password: string; new_password: string; confirm_password: string }) {
  const { data } = await api.put<{ mensagem: string }>("/player/workspace/password", input);
  return data;
}

export async function leavePlayerWorkspaceTeam(teamName: string, teamId?: number | null) {
  const { data } = await api.post<{ mensagem: string }>("/player/workspace/team/leave", { team_name: teamName, team_id: teamId });
  return data;
}

export async function setupPlayerTwoFactor() {
  const { data } = await api.post<{ secret: string; manual_key: string; qr_code: string }>("/player/workspace/security/2fa/setup");
  return data;
}

export async function confirmPlayerTwoFactor(code: string) {
  const { data } = await api.post<{ mensagem: string }>("/player/workspace/security/2fa/confirm", { code });
  return data;
}

export async function disablePlayerTwoFactor(password: string, code: string) {
  const { data } = await api.post<{ mensagem: string }>("/player/workspace/security/2fa/disable", { password, code });
  return data;
}

export async function revokePlayerSession(sessionId: number) {
  const { data } = await api.delete<{ mensagem: string }>(`/player/workspace/security/sessions/${sessionId}`);
  return data;
}

export async function logoutPlayerSession() {
  const { data } = await api.post<{ mensagem: string }>("/player/workspace/security/logout");
  return data;
}

export async function uploadImage(file: File) {
  const body = new FormData();
  body.append("image", file);
  const { data } = await api.post<{ url:string; filename:string; mime_type:string; size:number }>("/media/images", body);
  return data;
}

export async function configureMixTournament(tournamentId:number,input:{payment_mode:"free"|"paid";price_per_player:number;team_count:number;players_per_team:number;team_labels?:Array<{name:string;color:string}>}) { const {data}=await api.put<MixTournament>(`/mix/admin/${tournamentId}`,input);return data; }
export async function getAdminMixTournament(tournamentId:number) { const {data}=await api.get<MixTournament>(`/mix/admin/${tournamentId}`);return data; }
export async function drawAdminMixTournament(tournamentId:number) { const {data}=await api.post<MixTournament>(`/mix/admin/${tournamentId}/draw`);return data; }
export async function updateAdminMixRegistration(tournamentId:number,registrationId:number,status:"confirmed"|"cancelled"|"waitlist") { const {data}=await api.patch<MixTournament>(`/mix/admin/${tournamentId}/registrations/${registrationId}`,{status});return data; }
export async function getMixTournaments() { const {data}=await api.get<MixTournament[]>("/mix");return data; }
export async function getMixTournament(tournamentId:number) { const {data}=await api.get<MixTournament>(`/mix/${tournamentId}`);return data; }
export async function registerMixTournament(tournamentId:number) { const {data}=await api.post<{id:number;status:string;payment_status:string;payment_required:boolean}>(`/mix/${tournamentId}/register`);return data; }
export async function cancelMixTournamentRegistration(tournamentId:number) { const {data}=await api.delete(`/mix/${tournamentId}/register`);return data; }
export async function createMixTournamentPayment(tournamentId:number) { const {data}=await api.post(`/mix/${tournamentId}/payment`);return data; }
