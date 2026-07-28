import { Bell, LoaderCircle, LogOut, MailWarning, Menu, Search, Shield, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSessionStore } from "../../stores/sessionStore";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { useUiStore } from "../../stores/uiStore";
import { Logo } from "./Logo";
import { useLocation } from "react-router-dom";
import { useToast } from "../../hooks/useToast";
import { resendAccountVerification } from "../../services/api";

const ROLE_LABELS: Record<string, string> = {
  jogador: "Jogador",
  lider: "Lider",
  capitao: "Capitao",
  admin: "Administrador"
};

function roleHref(role?: string | null) {
  if (role === "admin") return "/admin";
  if (role === "lider") return "/lider";
  if (role === "capitao") return "/capitao";
  return "/jogador";
}

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  const setNotificationsOpen = useSessionStore((state) => state.setNotificationsOpen);
  const { user, notifications, logout, switchContext } = useAuth();
  const { error, success } = useToast();
  const [switching, setSwitching] = useState(false);

  const unreadCount = notifications.filter((item) => item.lida === 0).length;
  const dashboardHref = roleHref(user?.active_role);
  const availableTeams = user?.team_contexts.filter((team) => user.active_role === "jogador" || team.role === user.active_role) ?? [];

  async function changeContext(input: { role?: string; game_id?: number; team_id?: number }) {
    if (!user) return;
    setSwitching(true);
    try {
      const role = input.role ?? user.active_role;
      await switchContext({ role, game_id: input.game_id, team_id: input.team_id });
      if (input.role) navigate(roleHref(role));
    } catch (reason) {
      error("Nao foi possivel trocar o contexto", reason instanceof Error ? reason.message : "Tente novamente.");
    } finally {
      setSwitching(false);
    }
  }

  async function resendVerification() {
    setSwitching(true);
    try {
      const response = await resendAccountVerification();
      if (response.email_sent) success("Email enviado", "Confira sua caixa de entrada e a pasta de spam.");
      else error("Email nao enviado", "O servico de email esta indisponivel. Tente novamente em alguns minutos.");
    } catch (reason) { error("Falha ao reenviar verificacao", reason instanceof Error ? reason.message : "Tente novamente."); }
    finally { setSwitching(false); }
  }
  const inWorkspace =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/lider") ||
    location.pathname.startsWith("/capitao") ||
    /^\/jogador\/?$/.test(location.pathname) ||
    location.pathname.startsWith("/design-system");

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-arena-line bg-arena-bg/86 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          {inWorkspace ? <Button aria-label="Alternar menu" variant="ghost" className="h-10 w-10 px-0" icon={<Menu className="h-5 w-5" />} onClick={toggleSidebar} /> : null}
          <Link to="/" aria-label="Arena Camp Home">
            <Logo />
          </Link>
          <div className="hidden xl:block">
            <Badge tone={inWorkspace ? "info" : "neutral"} className="h-7">
              {inWorkspace ? "Workspace" : "Plataforma"}
            </Badge>
          </div>
          {!inWorkspace ? <nav className="ml-4 hidden items-center gap-5 xl:flex" aria-label="Navegacao publica">{[["Inicio","/"],["Campeonatos","/torneios"],["Circuito oficial","/circuito-oficial"],["Ranking","/ranking"],["Equipes","/equipes"],["Jogadores","/jogadores"],["Noticias","/noticias"]].map(([label,href]) => <Link className="text-sm font-semibold text-arena-muted transition hover:text-white" key={href} to={href}>{label}</Link>)}</nav> : null}
        </div>

        <button
          className="hidden h-10 min-w-80 items-center justify-between rounded-arena border border-arena-line bg-white/[.05] px-3 text-sm text-arena-muted transition hover:bg-white/[.08] 2xl:flex"
          onClick={() => setCommandOpen(true)}
        >
          <span className="flex items-center gap-2"><Search className="h-4 w-4" /> Buscar torneios, equipes, jogadores</span>
          <kbd className="rounded border border-arena-line px-2 py-0.5 text-[11px]">Ctrl K</kbd>
        </button>

        <div className="flex items-center gap-2">
          <Button aria-label="Abrir pesquisa" className="hidden h-10 w-10 px-0 md:inline-flex 2xl:hidden" variant="ghost" icon={<Search className="h-5 w-5" />} onClick={() => setCommandOpen(true)} />
          {user ? <div className="relative">
            <Button
              aria-label="Notificacoes"
              variant="ghost"
              className="h-10 w-10 px-0"
              icon={<Bell className="h-5 w-5" />}
              onClick={() => setNotificationsOpen(true)}
            />
            {user && unreadCount ? (
              <span className="pointer-events-none absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            ) : null}
          </div> : null}
          {user ? (
            <div className="flex items-center gap-2">
              {!user.email_verified ? <Button className="hidden sm:inline-flex" variant="secondary" icon={<MailWarning className="h-4 w-4" />} loading={switching} onClick={() => void resendVerification()}>Verificar email</Button> : null}
              <div className="hidden items-center gap-2 lg:flex">
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-arena-muted" />
                  <select
                    aria-label="Perfil atual"
                    className="h-10 min-w-40 rounded-arena border border-arena-line bg-arena-panel pl-9 pr-3 text-sm font-semibold text-white outline-none focus:border-cyan-400"
                    disabled={switching}
                    value={user.active_role}
                    onChange={(event) => void changeContext({ role: event.target.value })}
                  >
                    {user.roles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role] ?? role}</option>)}
                  </select>
                </div>
                {user.games.length > 1 ? (
                  <select
                    aria-label="Jogo atual"
                    className="h-10 max-w-40 rounded-arena border border-arena-line bg-arena-panel px-3 text-sm text-white outline-none focus:border-cyan-400"
                    disabled={switching}
                    value={user.active_game_id ?? ""}
                    onChange={(event) => void changeContext({ game_id: Number(event.target.value) })}
                  >
                    {user.games.map((game) => <option key={game.id} value={game.id}>{game.nome_curto}</option>)}
                  </select>
                ) : null}
                {availableTeams.length > 1 ? (
                  <select
                    aria-label="Equipe atual"
                    className="h-10 max-w-44 rounded-arena border border-arena-line bg-arena-panel px-3 text-sm text-white outline-none focus:border-cyan-400"
                    disabled={switching}
                    value={user.active_team_id ?? ""}
                    onChange={(event) => void changeContext({ team_id: Number(event.target.value) })}
                  >
                    {availableTeams.map((team) => <option key={team.team_id} value={team.team_id}>{team.team_name}</option>)}
                  </select>
                ) : null}
              </div>
              <Button variant="secondary" icon={<Shield className="h-4 w-4" />} onClick={() => navigate(dashboardHref ?? "/jogador")}>
                {switching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Workspace"}
              </Button>
              <Button variant="ghost" className="h-10 w-10 px-0" icon={<LogOut className="h-4 w-4" />} onClick={logout} />
            </div>
          ) : (
            <div className="flex items-center gap-2"><Link to="/entrar"><Button variant="secondary" icon={<UserRound className="h-4 w-4" />}>Entrar</Button></Link><Link className="hidden sm:block" to="/criar-conta"><Button>Criar conta</Button></Link></div>
          )}
        </div>
      </div>
    </header>
  );
}
