export type Tournament = {
  id: number;
  nome: string;
  descricao: string | null;
  game: string;
  game_id?: number | null;
  game_name?: string | null;
  game_short_name?: string | null;
  game_slug?: string | null;
  valor: string;
  max_teams: number;
  titulares: number;
  reservas: number;
  premiacao: string | null;
  banner: string | null;
  status: "criado" | "aberto" | "fechado" | "em_andamento" | "finalizado" | "cancelado";
  inicio: string;
  fim: string;
  created_at: string;
};

export type Game = {
  id: number;
  nome: string;
  nome_curto: string;
  slug: string;
  descricao: string | null;
  logo: string | null;
  banner: string | null;
  cor_primaria: string | null;
  ativo?: number | boolean;
  created_at?: string;
  maps?: GameMap[];
};

export type Match = {
  id: number;
  tournament_id: number;
  round: number;
  team_a_id: number;
  team_b_id: number;
  winner_team_id: number | null;
  score_team_a: number;
  score_team_b: number;
  status: "agendada" | "andamento" | "finalizada";
  scheduled_at: string | null;
  finished_at: string | null;
  created_at?: string;
  team_a?: string;
  team_b?: string;
  winner?: string | null;
};

export type AdminCompetitionGame = Game & {
  player_id_label: string;
  player_id_required: boolean;
  default_best_of: "bo1" | "bo3" | "bo5";
  maps_count: number;
  active_maps_count: number;
};

export type AchievementDefinition = {
  id: number;
  game_id: number | null;
  game_name: string | null;
  game_short_name: string | null;
  code: string;
  title: string;
  description: string;
  icon: string;
  metric: "wins" | "kills" | "mvps" | "win_streak" | "matches" | "global_rank" | "headshots" | "assists";
  comparator: "gte" | "lte";
  target: number;
  tier: "bronze" | "prata" | "ouro" | "diamante" | "lendaria";
  xp_reward: number;
  active: boolean;
  players_count: number;
  unlocked_count: number;
};

export type AdminAccessAccount = {
  id:number; nome:string; email:string; nickname:string | null; avatar:string | null;
  email_verified:boolean; onboarding_completed:boolean; roles:string[]; game_ids:number[];
  team_roles:Array<{ team_id:number; role:string }>;
  banned_until:string|null; banned_permanent:boolean; ban_reason:string|null; banned_at:string|null; is_banned:boolean;
};

export type OfficialMatch={id:number;official_tournament_id:number;stage_label:string|null;team_a:string;team_a_logo:string|null;team_b:string;team_b_logo:string|null;score_a:number|null;score_b:number|null;best_of:"bo1"|"bo3"|"bo5";map_summary:string|null;winner_name:string|null;scheduled_at:string|null;status:"agendada"|"ao_vivo"|"finalizada"|"cancelada";stream_url:string|null};
export type OfficialTournament={id:number;name:string;organizer:string;game_name:string;logo_url:string|null;banner_url:string|null;description:string|null;location:string|null;prize_pool:string|null;format_label:string|null;official_url:string|null;starts_at:string|null;ends_at:string|null;status:"anunciado"|"em_andamento"|"finalizado"|"cancelado";featured:boolean;published:boolean;matches_count?:number;matches?:OfficialMatch[]};

export type GameMap = {
  id: number;
  game_id: number;
  nome: string;
  slug: string;
  imagem: string | null;
  ativo: boolean;
  ordem: number;
  created_at?: string;
  updated_at?: string;
};

export type VetoStep = {
  action: "ban" | "pick" | "decider";
  team: "A" | "B" | "SYSTEM";
};

export type TournamentCompetition = {
  tournament_id: number;
  tournament_name: string;
  tournament_status: Tournament["status"];
  game_id: number | null;
  game_name: string | null;
  game_short_name: string | null;
  format: "single_elimination" | "double_elimination" | "swiss" | "round_robin" | "group_playoffs" | "league" | "custom" | "mix_single_elimination";
  best_of: "bo1" | "bo3" | "bo5";
  pick_ban_enabled: boolean;
  veto_order: VetoStep[];
  auto_decider: boolean;
  overtime_enabled: boolean;
  initial_side: string;
  pause_minutes: number;
  walkover_minutes: number;
  tiebreakers: string;
  seed_mode: "automatic" | "manual";
  registration_approval: "automatic" | "manual";
  map_ids: number[];
  map_pool: GameMap[];
  available_maps: GameMap[];
};

export type MixTournament = {
  tournament_id:number; nome:string; descricao:string | null; tournament_status:string; game_name:string | null;
  inicio:string; fim:string; banner:string | null; premiacao:string | null; payment_mode:"free"|"paid";
  price_per_player:number; max_players:number; players_per_team:number; team_count:number; draw_status:"pending"|"completed";
  registered_players:number; confirmed_players:number; registration_id?:number|null; registration_status?:string|null; payment_status?:string|null;
  qr_code_base64?:string|null; copia_cola?:string|null; gateway_status?:string|null;
  teams?:Array<{team_id:number;nome:string;color_name:string;color_hex:string;seed_number:number}>;
  registrations?:Array<{id:number;user_id:number;nome:string;nickname:string|null;avatar:string|null;status:string;payment_status:string;assigned_team_id:number|null;payment_id:number|null;gateway_status:string|null;valor:number|null;qr_code:string|null;qr_code_base64:string|null;copia_cola:string|null}>;
};

export type TournamentTeam = {
  entry_id: number;
  team_id: number;
  entry_status: AdminEntry["status"];
  payment_status: AdminEntry["payment_status"];
  team_name: string;
  team_tag: string | null;
  game_id: number;
  lineup_size: number;
};

export type MatchRosterPlayer = {
  id: number;
  team_id: number;
  nick: string;
  game_uid: string | null;
  status: AdminPlayer["status"];
  team_name: string;
  in_lineup: boolean;
  titular: boolean;
};

export type MatchMap = {
  id: number;
  match_id: number;
  game_map_id: number;
  map_number: number;
  selected_by_team_id: number | null;
  selection_type: "pick" | "decider" | "manual";
  status: "pendente" | "andamento" | "finalizado" | "cancelado";
  score_team_a: number;
  score_team_b: number;
  winner_team_id: number | null;
  map_name: string;
  map_slug: string;
  map_image: string | null;
  selected_by_team: string | null;
  winner_team: string | null;
};

export type VetoAction = {
  id: number;
  session_id: number;
  sequence_number: number;
  team_id: number | null;
  game_map_id: number;
  action: "ban" | "pick" | "decider" | "manual";
  admin_forced: number | boolean;
  map_name: string;
  team_name: string | null;
  performed_by_name: string | null;
  created_at: string;
};

export type MatchPlayerStat = {
  id?: number;
  match_id: number;
  player_id: number;
  team_id: number;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  mvp: boolean;
  nick?: string;
  game_uid?: string | null;
  team_name?: string;
};

export type MatchMapPlayerStat = MatchPlayerStat & {
  match_map_id: number;
  map_number: number;
  map_name: string;
};

export type MatchOperations = {
  match: Match & {
    team_a: string;
    team_b: string;
    team_a_tag: string | null;
    team_b_tag: string | null;
    best_of: "bo1" | "bo3" | "bo5";
    pick_ban_enabled: boolean;
    auto_decider: boolean;
    server_address: string | null;
    server_password: string | null;
    responsible_admin_id: number | null;
    responsible_admin_name: string | null;
    captain_confirmation_enabled: boolean;
    veto_action_seconds: number;
    game_id: number | null;
    tournament_name: string;
  };
  map_pool: GameMap[];
  maps: MatchMap[];
  rosters: MatchRosterPlayer[];
  player_stats: MatchPlayerStat[];
  map_player_stats: MatchMapPlayerStat[];
  veto: {
    id?: number;
    status: "aguardando" | "liberado" | "finalizado" | "cancelado";
    current_step: number;
    action_seconds?: number;
    action_deadline?: string | null;
    actions: VetoAction[];
    expected_step: VetoStep | null;
    order: VetoStep[];
  };
};

export type UserProfile = {
  id: number;
  nome: string;
  email: string;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
  pais: string | null;
  estado: string | null;
  cidade: string | null;
  discord: string | null;
  role: string | null;
  created_at: string;
};

export type AuthUser = {
  id: number;
  nome: string;
  email: string;
  role: string | null;
  active_role: string;
  roles: string[];
  active_game_id: number | null;
  active_team_id: number | null;
  email_verified: boolean;
  onboarding_completed: boolean;
  needs_email: boolean;
  nickname?: string | null;
  avatar?: string | null;
  games: IdentityGame[];
  team_contexts: IdentityTeamContext[];
  organization_contexts: IdentityOrganizationContext[];
};

export type IdentityGame = Game & {
  is_primary: boolean;
};

export type IdentityTeamContext = {
  team_id: number;
  team_name: string;
  team_slug: string;
  team_tag: string | null;
  team_logo: string | null;
  game_id: number;
  game_name: string;
  game_slug: string;
  cargo: "leader" | "captain" | "player";
  role: "lider" | "capitao" | "jogador";
};

export type IdentityOrganizationContext = {
  organization_id: number;
  organization_name: string;
  organization_slug: string;
  role: string;
};

export type AuthResponse = {
  token: string;
  usuario: AuthUser;
  requires_two_factor?: false;
} | { requires_two_factor: true };

export type LoginInput = {
  email: string;
  password: string;
  two_factor_code?: string;
};

export type RegisterInput = {
  name: string;
  nickname?: string;
  email: string;
  cpf?: string;
  password: string;
  game_ids?: number[];
  primary_game_id?: number;
  steam?: string;
  discord?: string;
  intended_role?: "jogador" | "lider";
};

export type RegisterResponse = {
  id: number;
  email: string;
  verification_required: boolean;
  email_sent: boolean;
};

export type AuthProviderStatus = {
  password: boolean;
  google: boolean;
  discord: boolean;
  steam: boolean;
};

export type OAuthProfileCompletion = {
  mensagem: string;
  email_sent?: boolean;
};

export type PublicPortalData = {
  stats: { players:number; teams:number; tournaments:number; matches:number; live_matches:number; open_tournaments:number; prize_pool:number };
  games: Array<Game & { tournament_count:number; open_count:number; live_count:number }>;
  tournaments: Array<Tournament & { game_name:string; game_short_name:string; game_slug:string; format:string | null; best_of:string | null; entry_count:number }>;
  results: Array<{ id:number; tournament_id:number; round:number; score_team_a:number; score_team_b:number; finished_at:string; tournament_name:string; game_short_name:string; team_a:string; team_a_logo:string | null; team_b:string; team_b_logo:string | null; winner:string }>;
  players: Array<{ id:number; nickname:string | null; nome:string; avatar:string | null; player_id:number; nick:string; foto:string | null; team_id:number; team_name:string; team_tag:string | null; game_id:number; game_short_name:string; matches:number; wins:number; kills:number; deaths:number; assists:number; headshots:number; mvps:number; kd:number; hs_percent:number; win_rate:number }>;
  teams: Array<{ id:number; nome:string; tag:string | null; slug:string; logo:string | null; banner:string | null; game_id:number; game_short_name:string; members:number; matches:number; wins:number; losses:number; win_rate:number }>;
  champions: Array<{ tournament_id:number; tournament_name:string; fim:string; team_id:number; team_name:string; tag:string | null; logo:string | null; game_short_name:string }>;
  content: { news:PublicContent[]; partners:PublicContent[]; testimonials:PublicContent[]; faq:PublicContent[] };
};

export type PublicContent = {
  id:number; type:"noticia"|"parceiro"|"depoimento"|"faq"; title:string; subtitle:string | null; body:string | null;
  image_url:string | null; link_url:string | null; author_name:string | null; sort_order:number; published:boolean; published_at:string | null;
};

export type PublicSearchResult = { type:"torneio"|"equipe"|"jogador"|"organizacao"; id:number; title:string; subtitle:string | null; url:string; game:string | null };

export type PublicContactMessage = { id:number; name:string; email:string; subject:string; message:string; status:"novo"|"em_atendimento"|"respondido"|"arquivado"; assigned_to:number|null; assigned_name:string|null; admin_notes:string|null; created_at:string; updated_at:string };

export type PublicTournamentCenter = {
  tournament: Tournament & { game_name:string; game_short_name:string; game_slug:string; format:string; best_of:string; overtime_enabled:boolean; walkover_minutes:number };
  participants:Array<{ entry_id:number; status:string; payment_status:string; team_id:number; team_name:string; tag:string | null; logo:string | null }>;
  matches:Array<Match & { team_a:string; team_a_logo:string | null; team_b:string; team_b_logo:string | null; winner:string | null; current_map_name:string | null; current_map_image:string | null }>;
  map_pool:GameMap[];
  match_maps:Array<{ id:number; match_id:number; map_number:number; status:string; score_team_a:number; score_team_b:number; winner_team_id:number | null; map_name:string; map_image:string | null; winner:string | null }>;
  map_player_stats:Array<{ id:number; match_map_id:number; match_id:number; player_id:number; team_id:number; kills:number; deaths:number; assists:number; headshots:number; mvp:boolean; nick:string; foto:string | null; team_name:string; team_logo:string | null }>;
  result:{ tournament_id:number; champion_team_id:number; champion_name:string; champion_tag:string | null; champion_logo:string | null; runner_up_team_id:number | null; runner_up_name:string | null; runner_up_tag:string | null; runner_up_logo:string | null; final_match_id:number | null; decided_at:string } | null;
  standings:TeamRanking[];
};

export type PublicTeamProfile = {
  team:{ id:number; nome:string; tag:string | null; slug:string; logo:string | null; banner:string | null; descricao:string | null; game_name:string; game_short_name:string; members:number; matches:number; wins:number };
  titles:Array<{ id:number; awarded_at:string; tournament_id:number; tournament_name:string; tournament_banner:string | null; game_short_name:string; final_match_id:number | null }>;
};

export type NotificationItem = {
  id: number;
  user_id: number;
  titulo: string;
  mensagem: string;
  tipo: string;
  link: string | null;
  lida: number;
  created_at: string;
};

export type DashboardData = {
  profile: UserProfile | null;
  games: Array<{
    id: number;
    game_id: number;
    nickname: string;
    rank_name: string | null;
    elo: number | null;
    level: number | null;
  }>;
  teams: Array<{
    id: number;
    nome: string;
    tag: string | null;
    slug: string;
    cargo: string;
    game: string;
  }>;
  team_rankings: Array<TeamPlayerRanking & {
    team_name: string;
    team_tag: string | null;
    game: string;
  }>;
};

export type TeamPlayerMapStatistics = {
  map_id: number;
  map_name: string;
  map_image: string | null;
  maps: number;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  mvps: number;
  kd: number;
  kda: number;
  hs_percent: number;
  kills_per_map: number;
};

export type TeamPlayerRankingRow = {
  position: number;
  player_id: number;
  user_id: number;
  nick: string;
  game_uid: string | null;
  photo: string | null;
  role: "leader" | "captain" | "manager" | "player";
  lineup_status: "titular" | "reserva";
  status: "ativo" | "inativo";
  matches: number;
  maps: number;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  mvps: number;
  kd: number;
  kda: number;
  hs_percent: number;
  win_rate: number;
  kills_per_map: number;
  best_map: Pick<TeamPlayerMapStatistics, "map_id" | "map_name" | "kills_per_map" | "kd"> | null;
  map_statistics: TeamPlayerMapStatistics[];
};

export type TeamPlayerRanking = {
  team_id: number;
  generated_at: string;
  players: TeamPlayerRankingRow[];
};

export type PlayerWorkspaceProfile = {
  id: number;
  nome: string;
  email: string;
  avatar: string | null;
  banner: string | null;
  nickname: string;
  bio: string | null;
  pais: string | null;
  estado: string | null;
  cidade: string | null;
  birth_date: string | null;
  languages: string[];
  phone: string | null;
  whatsapp_opt_in: boolean;
  pix_key: string | null;
  pix_key_type: "cpf" | "cnpj" | "email" | "telefone" | "aleatoria" | null;
  created_at: string;
  links: Record<"steam" | "faceit" | "discord" | "riot_id" | "xbox" | "playstation" | "epic_games" | "battlenet" | "twitch" | "youtube" | "kick" | "instagram" | "x" | "tiktok", string | null>;
  preferences: Omit<LeaderPreferences, "user_id">;
};

export type PlayerWorkspaceGame = {
  game_id: number;
  nome: string;
  nome_curto: string;
  slug: string;
  logo: string | null;
  banner: string | null;
  profile_id: number | null;
  nickname: string | null;
  game_player_id: string | null;
  rank_name: string | null;
  elo: number | null;
  level: number | null;
  selected: boolean;
};

export type PlayerTeamContext = {
  membership_id: number;
  team_id: number;
  cargo: "manager" | "player";
  lineup_status: "titular" | "reserva";
  status: "ativo";
  joined_at: string;
  team_name: string;
  team_tag: string | null;
  team_slug: string;
  team_logo: string | null;
  team_banner: string | null;
  team_description: string | null;
  team_region: string | null;
  game_id: number;
  game_name: string;
  player_id: number | null;
  nick: string | null;
  game_uid: string | null;
  foto: string | null;
};

export type PlayerTeamSearchResult = {
  id: number;
  nome: string;
  tag: string | null;
  slug: string;
  logo: string | null;
  banner: string | null;
  descricao: string | null;
  regiao: string | null;
  recruiting: boolean;
  private: boolean;
  game_id: number;
  game_name: string;
  game_short_name: string;
  member_count: number;
  pending_request_id: number | null;
};

export type PlayerTeamRequest = {
  id: number;
  team_id: number;
  user_id: number;
  tipo: "invite" | "request";
  status: "pending" | "accepted" | "rejected" | "cancelled";
  message: string | null;
  created_at: string;
  team_name: string;
  team_tag: string | null;
  team_slug: string;
  team_logo: string | null;
  team_region: string | null;
  game_name: string;
  invited_by_name: string | null;
};

export type PlayerWorkspaceMember = {
  id: number;
  user_id: number;
  cargo: "leader" | "captain" | "manager" | "player";
  lineup_status: "titular" | "reserva";
  status: string;
  joined_at: string;
  nome: string;
  nickname: string | null;
  avatar: string | null;
  player_id: number | null;
  nick: string | null;
  game_uid: string | null;
  foto: string | null;
};

export type PlayerWorkspaceLineup = {
  entry_id: number;
  tournament_id: number;
  tournament_name: string;
  entry_status: string;
  lineup_id: number | null;
  lineup_name: string;
  my_position: "titular" | "reserva" | null;
  players: Array<{ player_id: number; titular: boolean; confirmado: boolean; ordem: number; nick: string; game_uid: string | null; foto: string | null; is_me: boolean }>;
};

export type PlayerWorkspaceMatch = Match & {
  tournament_name: string;
  team_a: string;
  team_b: string;
  opponent: string;
  best_of: "bo1" | "bo3" | "bo5";
  server_address: string | null;
  server_password: null;
  responsible_admin_name: string | null;
  veto_status: string | null;
  current_step: number | null;
  attendance_status: "confirmado" | "ausente" | "talvez" | null;
  attendance_note: string | null;
  maps: string | null;
  in_official_lineup: boolean;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  headshots: number | null;
  mvp: boolean;
};

export type PlayerWorkspaceCareer = {
  level: number;
  xp: number;
  next_level_xp: number;
  totals: { matches: number; wins: number; losses: number; kills: number; deaths: number; assists: number; headshots: number; mvps: number; kd: number; kda: number; hs_percent: number; win_rate: number; global_rank: number | null; longest_win_streak: number; titles: number; runner_ups: number; top_four: number };
  history: Array<{ id: number; match_id: number; team_id: number; team_name: string; tournament_name: string; opponent: string; maps: string | null; kills: number; deaths: number; assists: number; headshots: number; mvp: boolean; won: boolean; kd: number; hs_percent: number; finished_at: string; score_team_a: number; score_team_b: number }>;
  monthly: Array<{ month: string; matches: number; wins: number; kills: number; deaths: number; assists: number; headshots: number; mvps: number; kd: number; hs_percent: number; win_rate: number }>;
  tournaments: Array<{ tournament_id: number; tournament_name: string; matches: number; wins: number; kills: number; deaths: number; assists: number; mvps: number; kd: number; win_rate: number }>;
  achievements: Array<{ code: string; title: string; description: string; progress: number; target: number; unlocked: boolean }>;
  feed: Array<{ id: string; type: string; title: string; description: string; created_at: string }>;
};

export type PlayerTicket = SupportTicket & {
  messages: Array<{ id: number; ticket_id: number; user_id: number; nome: string; role: string; message: string; created_at: string }>;
};

export type PlayerMatchRoom = MatchOperations & {
  attendance_status: "confirmado" | "ausente" | "talvez" | null;
  in_official_lineup: boolean;
  read_only: true;
};

export type PlayerWorkspace = {
  profile: PlayerWorkspaceProfile;
  games: PlayerWorkspaceGame[];
  teams: PlayerTeamContext[];
  current_team: PlayerTeamContext | null;
  requests: PlayerTeamRequest[];
  recommended_teams: PlayerTeamSearchResult[];
  notifications: NotificationItem[];
  tickets: PlayerTicket[];
  members: PlayerWorkspaceMember[];
  lineups: PlayerWorkspaceLineup[];
  matches: PlayerWorkspaceMatch[];
  events: CaptainEvent[];
  messages: { team: LeaderMessage[] };
  upcoming_tournaments: LeaderTournament[];
  team_ranking: TeamPlayerRanking;
  career: PlayerWorkspaceCareer;
  permissions: Record<string, boolean>;
  security: {
    two_factor_enabled: boolean;
    sessions: Array<{ id: number; user_agent: string | null; ip_address: string | null; last_seen_at: string; expires_at: string; revoked_at: string | null; created_at: string; is_current: boolean; active: boolean }>;
  };
};

export type PlayerPublicProfile = {
  profile: Omit<PlayerWorkspaceProfile, "email" | "birth_date" | "phone" | "whatsapp_opt_in" | "pix_key" | "pix_key_type">;
  games: PlayerWorkspaceGame[];
  current_team: PlayerTeamContext | null;
  team_ranking: TeamPlayerRanking;
  career: PlayerWorkspaceCareer;
};

export type TeamRanking = {
  position: number;
  team_id: number;
  matches: number;
  wins: number;
  losses: number;
  score_for: number;
  score_against: number;
  score_balance: number;
  win_rate: number;
  team_name?: string | null;
  points?: number;
  maps_played?: number;
  rounds_for?: number;
  rounds_against?: number;
  round_balance?: number;
  round_balance_per_map?: number;
  rounds_for_per_map?: number;
  head_to_head_points?: number;
  byes?: number;
};

export type PlayerStatistics = {
  player_id: number;
  nick: string;
  team_id: number;
  team: string;
  matches: number;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  mvps: number;
  kd: number;
  hs_percent: number;
  win_rate: number;
};

export type EntryPlayer = {
  id: number;
  entry_id: number;
  player_id: number;
  titular: number | boolean;
  ordem: number;
  confirmado: number | boolean;
  nick: string;
  game: string;
  game_uid: string | null;
};

export type AdminEntry = {
  id: number;
  tournament_id: number;
  team_id: number;
  status: "pendente" | "pago" | "confirmado" | "cancelado";
  payment_status: "aguardando" | "pago" | "falhou";
  created_at: string;
  tournament_name: string;
  tournament_status: Tournament["status"];
  team_name: string;
  team_slug: string;
  game_name: string | null;
  lineup_size: number;
  starters_count: number;
  payment_id: number | null;
  payment_gateway_status: "pendente" | "aprovado" | "cancelado" | "rejeitado" | null;
  payment_amount: number | null;
  payment_created_at: string | null;
  payment_paid_at: string | null;
};

export type AdminPayment = {
  id: number;
  entry_id: number;
  provider: string;
  payment_id: string | null;
  external_reference: string | null;
  status: "pendente" | "aprovado" | "cancelado" | "rejeitado";
  valor: number;
  qr_code: string | null;
  qr_code_base64: string | null;
  copia_cola: string | null;
  paid_at: string | null;
  created_at: string;
  entry_status: AdminEntry["status"];
  entry_payment_status: AdminEntry["payment_status"];
  team_id: number;
  tournament_id: number;
  tournament_name: string;
  team_name: string;
};

export type AdminTeam = {
  id: number;
  game_id: number;
  creator_id: number;
  nome: string;
  tag: string | null;
  slug: string;
  descricao: string | null;
  recrutando: number | boolean;
  privada: number | boolean;
  ativo: number | boolean;
  created_at: string;
  game_name: string;
  game_short_name: string;
  creator_name: string;
  members_count: number;
  players_count: number;
};

export type AdminPlayer = {
  id: number;
  team_id: number;
  game_id: number;
  nick: string;
  game: string;
  game_uid: string | null;
  foto: string | null;
  kills: number;
  deaths: number;
  assists: number;
  torneios_vencidos: number;
  status: "ativo" | "reserva" | "banido" | "inativo";
  created_at: string;
  team_name: string;
  team_slug: string;
  game_name: string | null;
};

export type AuditLog = {
  id: number;
  actor_user_id: number;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: unknown;
  created_at: string;
  actor_name: string | null;
  actor_email: string | null;
};

export type AdminDashboardData = {
  upcoming_tournaments: number;
  live_tournaments: number;
  finished_tournaments: number;
  pending_entries: number;
  confirmed_entries: number;
  cancelled_entries: number;
  approved_revenue: number;
  pending_payments: number;
  approved_payments: number;
  matches_waiting_result: number;
  finished_matches: number;
  active_teams: number;
  recruiting_teams: number;
  active_players: number;
  banned_players: number;
  open_disputes: number;
  open_tickets: number;
  active_penalties: number;
  total_notifications: number;
  unread_notifications: number;
  latest_payments: Array<{
    id: number;
    status: string;
    valor: number;
    provider: string;
    created_at: string;
    paid_at: string | null;
    entry_id: number;
    tournament_name: string;
    team_name: string;
  }>;
};

export type AdminPenalty = {
  id: number;
  player_id: number;
  tournament_id: number | null;
  type: "warning" | "suspension" | "temporary_ban" | "permanent_ban" | "tournament_ban" | "season_ban" | "global_ban";
  scope: "player" | "tournament" | "season" | "global";
  status: "ativa" | "encerrada";
  reason: string;
  evidence: string | null;
  duration_days: number | null;
  notes: string | null;
  created_by: number;
  resolved_by: number | null;
  created_at: string;
  resolved_at: string | null;
  player_nick: string;
  team_name: string;
  tournament_name: string | null;
  created_by_name: string;
  resolved_by_name: string | null;
};

export type SupportTicket = {
  id: number;
  user_id: number | null;
  category: string;
  priority: "baixa" | "media" | "alta" | "critica";
  status: "aberto" | "em_analise" | "respondido" | "fechado";
  subject: string;
  message: string;
  response: string | null;
  assigned_admin_id: number | null;
  created_at: string;
  updated_at: string;
  user_name: string | null;
  user_email: string | null;
  assigned_admin_name: string | null;
  messages?: Array<{ id: number; ticket_id: number; user_id: number; nome: string; role: string; message: string; created_at: string }>;
};

export type Dispute = {
  id: number;
  match_id: number | null;
  tournament_id: number | null;
  team_id: number | null;
  created_by: number | null;
  title: string;
  description: string;
  evidence: string | null;
  status: "aberta" | "em_analise" | "aceita" | "rejeitada";
  resolution_notes: string | null;
  resolved_by: number | null;
  created_at: string;
  updated_at: string;
  team_name: string | null;
  tournament_name: string | null;
  match_round: number | null;
  created_by_name: string | null;
  resolved_by_name: string | null;
};

export type LeaderTeam = {
  id: number;
  game_id: number;
  creator_id: number;
  nome: string;
  tag: string | null;
  slug: string;
  logo: string | null;
  banner: string | null;
  descricao: string | null;
  regiao: string | null;
  discord: string | null;
  steam: string | null;
  instagram: string | null;
  youtube: string | null;
  twitch: string | null;
  tiktok: string | null;
  website: string | null;
  recrutando: boolean;
  privada: boolean;
  ativo: boolean;
  archived_at: string | null;
  created_at: string;
  game_name: string;
  game_short_name: string;
  membership_role: "leader";
  age_days: number;
};

export type LeaderMember = {
  id: number;
  user_id: number;
  cargo: "leader" | "captain" | "manager" | "player";
  lineup_status: "titular" | "reserva";
  status: "ativo" | "inativo";
  joined_at: string;
  last_seen_at: string | null;
  nome: string;
  email: string;
  avatar: string | null;
  nickname: string | null;
  player_id: number | null;
  nick: string | null;
  game_uid: string | null;
  foto: string | null;
  player_status: string | null;
  can_invite_players: boolean;
  can_remove_players: boolean;
};

export type LeaderRequest = {
  id: number;
  team_id: number;
  user_id: number;
  tipo: "request" | "invite";
  status: "pending" | "accepted" | "rejected" | "cancelled";
  created_by: number | null;
  created_at: string;
  nome: string;
  email: string;
  avatar: string | null;
  nickname: string | null;
};

export type LeaderLineupPlayer = {
  id: number;
  lineup_id: number;
  player_id: number;
  titular: boolean;
  ordem: number;
  nick: string;
  game_uid: string | null;
  foto: string | null;
  status: string;
};

export type LeaderLineup = {
  id: number;
  team_id: number;
  name: string;
  status: "rascunho" | "ativa" | "congelada" | "arquivada";
  created_by: number;
  created_at: string;
  updated_at: string;
  players: LeaderLineupPlayer[];
};

export type LeaderTournament = Tournament & {
  game_name: string | null;
  format: string | null;
  best_of: string | null;
  entry_id: number | null;
  entry_status: string | null;
  payment_status: string | null;
  lineup_id: number | null;
  registered_teams: number;
};

export type LeaderEntry = {
  id: number;
  tournament_id: number;
  team_id: number;
  lineup_id: number | null;
  status: string;
  payment_status: string;
  rules_accepted_at: string | null;
  created_at: string;
  tournament_name: string;
  banner: string | null;
  inicio: string;
  fim: string;
  valor: number | string;
  premiacao: string | null;
  lineup_name: string | null;
  lineup_size: number;
};

export type LeaderPayment = {
  id: number;
  entry_id: number;
  tournament_id: number;
  tournament_name: string;
  provider: string;
  payment_id: string | null;
  external_reference: string | null;
  status: string;
  valor: number | string;
  qr_code: string | null;
  qr_code_base64: string | null;
  copia_cola: string | null;
  paid_at: string | null;
  created_at: string;
};

export type LeaderMatch = Match & {
  tournament_name: string;
  opponent: string;
  best_of: string | null;
  server_address: string | null;
  veto_status: string | null;
  current_step: number | null;
};

export type LeaderStatistics = {
  matches: number;
  wins: number;
  losses: number;
  win_rate: number;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  hs_percent: number;
  mvps: number;
  platform_rank: number | null;
  seasons: Array<{ season: string; matches: number; wins: number; losses: number }>;
  achievements: Array<{ code: string; title: string; description: string }>;
};

export type LeaderEvent = {
  id: number;
  team_id: number;
  title: string;
  type: "treino" | "partida" | "evento" | "reuniao";
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  notes: string | null;
  confirmed_count: number;
  declined_count: number;
  my_attendance: "confirmado" | "ausente" | "talvez" | null;
};

export type LeaderCompetitionRequest = {
  id: number;
  type: "substituicao" | "adiamento" | "reembolso" | "outro";
  subject: string;
  description: string;
  status: "aberta" | "em_analise" | "aprovada" | "rejeitada" | "cancelada";
  tournament_id: number | null;
  tournament_name: string | null;
  match_id: number | null;
  requested_for: string | null;
  outgoing_player: string | null;
  incoming_player: string | null;
  evidence_url: string | null;
  admin_response: string | null;
  created_at: string;
};

export type LeaderMemberHistory = {
  id: number;
  action: string;
  actor_name: string;
  subject_name: string | null;
  details: string | Record<string, unknown> | null;
  created_at: string;
};

export type LeaderTournamentCenter = {
  tournament: LeaderTournament & {
    pick_ban_enabled: boolean;
    overtime_enabled: boolean;
    initial_side: string | null;
    pause_minutes: number | null;
    walkover_minutes: number | null;
    tiebreakers: string | null;
    seed_mode: string | null;
    registration_approval: string | null;
  };
  map_pool: Array<{ id: number; nome: string; nome_curto: string | null; imagem: string | null; ordem: number }>;
  participants: Array<{ entry_id: number; team_id: number; team_name: string; tag: string | null; logo: string | null; status: string; payment_status: string; lineup_name: string | null; player_count: number }>;
  matches: Array<LeaderMatch & { team_a: string; team_b: string; winner: string | null }>;
  lineup: Array<{ id: number; player_id: number; titular: boolean; ordem: number; confirmado: boolean; nick: string; game_uid: string | null; foto: string | null }>;
  standings: Array<{ team_id: number; team_name: string; played: number; wins: number; losses: number; score_for: number; score_against: number; points: number }>;
};

export type LeaderMessage = {
  id: number;
  user_id: number;
  nome: string;
  nickname: string | null;
  avatar: string | null;
  role?: string;
  message: string;
  attachment_url: string | null;
  tournament_id?: number;
  tournament_name?: string;
  created_at: string;
};

export type LeaderDocument = {
  id: number;
  name: string;
  type: string;
  url: string;
  created_at: string;
};

export type LeaderPreferences = {
  user_id: number;
  language: string;
  theme: "dark" | "light" | "system";
  steam_profile: string | null;
  email_notifications: boolean;
  discord_notifications: boolean;
  profile_public: boolean;
};

export type CaptainContext = {
  membership_id: number;
  team_id: number;
  user_id: number;
  cargo: "captain";
  lineup_status: "titular" | "reserva";
  status: "ativo";
  can_invite_players: boolean;
  can_remove_players: boolean;
  team_name: string;
  team_tag: string | null;
  team_slug: string;
  team_logo: string | null;
  game_id: number;
  game_name: string;
  player_id: number | null;
  nick: string | null;
  game_uid: string | null;
  foto: string | null;
};

export type CaptainMember = {
  id: number;
  user_id: number;
  cargo: "leader" | "captain" | "manager" | "player";
  lineup_status: "titular" | "reserva";
  status: "ativo" | "inativo";
  last_seen_at: string | null;
  nome: string;
  avatar: string | null;
  nickname: string | null;
  player_id: number | null;
  nick: string | null;
  game_uid: string | null;
  foto: string | null;
};

export type CaptainLineup = {
  entry_id: number;
  tournament_id: number;
  tournament_name: string;
  entry_status: string;
  lineup_id: number | null;
  lineup_name: string;
  players: Array<{ player_id: number; titular: boolean; confirmado: boolean; ordem: number; nick: string; game_uid: string | null; foto: string | null }>;
};

export type CaptainMatch = Match & {
  tournament_name: string;
  opponent: string;
  best_of: "bo1" | "bo3" | "bo5";
  server_address: string | null;
  server_password: string | null;
  responsible_admin_id: number | null;
  responsible_admin_name: string | null;
  captain_confirmation_enabled: boolean;
  veto_action_seconds: number;
  veto_status: string | null;
  current_step: number | null;
  action_deadline: string | null;
  attendance_status: "confirmado" | "ausente" | "talvez" | null;
  attendance_note: string | null;
  result_confirmation_status: "correto" | "contestado" | null;
  maps: string | null;
  in_official_lineup: boolean;
};

export type CaptainEvent = {
  id: number;
  title: string;
  type: "treino" | "partida" | "evento" | "reuniao";
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  notes: string | null;
  attendance_status: "confirmado" | "ausente" | "talvez" | null;
};

export type CaptainStatistics = {
  player: { kills: number; deaths: number; assists: number; headshots: number; mvps: number; matches: number; kd: number; hs_percent: number; ranking: number | null };
  team: { matches: number; wins: number; losses: number };
  seasons: Array<{ season: string; matches: number; wins: number; losses: number }>;
  history: Array<{ match_id: number; kills: number; deaths: number; assists: number; headshots: number; mvp: boolean; kd: number; finished_at: string; score_team_a: number; score_team_b: number; winner_team_id: number | null; tournament_name: string; opponent: string; maps: string | null }>;
};

export type CaptainMatchRoom = MatchOperations & {
  captain_team_id: number;
  captain_player_id: number | null;
  attendance: { status: "confirmado" | "ausente" | "talvez"; note: string | null } | null;
  result_confirmation: { status: "correto" | "contestado"; comments: string | null; confirmed_at: string } | null;
  messages: LeaderMessage[];
};

export type CaptainWorkspace = {
  captain: CaptainContext;
  members: CaptainMember[];
  lineups: CaptainLineup[];
  matches: CaptainMatch[];
  events: CaptainEvent[];
  notifications: NotificationItem[];
  statistics: CaptainStatistics;
  penalties: AdminPenalty[];
  disputes: Dispute[];
  messages: { team: LeaderMessage[] };
  preferences: LeaderPreferences;
  tournaments: LeaderTournament[];
  team_ranking: TeamPlayerRanking;
  career: PlayerWorkspaceCareer;
  permissions: Record<string, boolean>;
};

export type LeaderWorkspace = {
  team: LeaderTeam | null;
  games: Array<Pick<Game, "id" | "nome" | "nome_curto" | "slug">>;
  members: LeaderMember[];
  requests: LeaderRequest[];
  lineups: LeaderLineup[];
  tournaments: LeaderTournament[];
  entries: LeaderEntry[];
  payments: LeaderPayment[];
  matches: LeaderMatch[];
  statistics: LeaderStatistics;
  events: LeaderEvent[];
  notifications: NotificationItem[];
  disputes: Dispute[];
  tickets: SupportTicket[];
  messages: { team: LeaderMessage[]; tournaments: LeaderMessage[] };
  documents: LeaderDocument[];
  preferences: LeaderPreferences;
  competition_requests: LeaderCompetitionRequest[];
  member_history: LeaderMemberHistory[];
  team_ranking: TeamPlayerRanking;
  career?: PlayerWorkspaceCareer;
  permissions: Record<string, boolean>;
};
