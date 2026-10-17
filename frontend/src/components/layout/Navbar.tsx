import { Bell, LoaderCircle, LogOut, MailWarning, Menu, Search, Shield, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/useToast";
import { resendAccountVerification } from "../../services/api";
import { useSessionStore } from "../../stores/sessionStore";
import { useUiStore } from "../../stores/uiStore";
import { cn } from "../../utils/cn";
import { Button } from "../ui/Button";
import { Logo } from "./Logo";

export const PUBLIC_MENU = [
  { label:"Torneios", href:"/torneios" },
  { label:"Circuito", href:"/circuito" },
  { label:"Ranking", href:"/ranking" },
  { label:"Comunidade", href:"/comunidade" },
  { label:"Notícias", href:"/noticias" }
] as const;

const ROLE_LABELS: Record<string, string> = { jogador:"Jogador", lider:"Líder", capitao:"Capitão", admin:"Organização" };

function roleHref(role?: string | null) {
  if (role === "admin") return "/admin";
  if (role === "lider") return "/lider";
  if (role === "capitao") return "/capitao";
  return "/jogador";
}

export function isWorkspacePath(pathname: string) {
  return pathname.startsWith("/admin") || pathname.startsWith("/lider") || pathname.startsWith("/capitao") || /^\/jogador\/?$/.test(pathname);
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const unreadCount = notifications.filter((item) => item.lida === 0).length;
  const availableTeams = user?.team_contexts.filter((team) => user.active_role === "jogador" || team.role === user.active_role) ?? [];
  const inWorkspace = isWorkspacePath(location.pathname);

  async function changeContext(input: { role?: string; game_id?: number; team_id?: number }) {
    if (!user) return;
    setSwitching(true);
    try {
      const role = input.role ?? user.active_role;
      await switchContext({ role, game_id:input.game_id, team_id:input.team_id });
      if (input.role) navigate(roleHref(role));
    } catch (reason) {
      error("Não foi possível trocar o perfil", reason instanceof Error ? reason.message : "Tente novamente.");
    } finally {
      setSwitching(false);
    }
  }

  async function resendVerification() {
    setSwitching(true);
    try {
      const response = await resendAccountVerification();
      if (response.email_sent) success("Email enviado", "Confira sua caixa de entrada e o spam.");
      else error("Email não enviado", "Tente novamente em alguns minutos.");
    } catch (reason) {
      error("Não foi possível reenviar a confirmação", reason instanceof Error ? reason.message : "Tente novamente.");
    } finally {
      setSwitching(false);
    }
  }

  const selectClass = "h-10 rounded-arena border border-arena-line bg-arena-panel px-3 text-sm font-semibold text-arena-text outline-none focus:border-arena-blue";

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-arena-line bg-arena-bg/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {inWorkspace ? (
            <Button aria-label="Abrir ou fechar o menu do painel" variant="ghost" className="h-10 w-10 px-0" icon={<Menu className="h-5 w-5" />} onClick={toggleSidebar} />
          ) : null}
          <Link to="/" aria-label="Arena Camp, página inicial"><Logo /></Link>
          {!inWorkspace ? (
            <nav className="ml-6 hidden items-center gap-6 lg:flex" aria-label="Menu principal">
              {PUBLIC_MENU.map((item) => (
                <NavLink
                  className={({ isActive }) => cn("text-sm font-semibold transition hover:text-arena-text", isActive ? "text-arena-text" : "text-arena-muted")}
                  key={item.href}
                  to={item.href}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            className="hidden h-10 min-w-56 items-center justify-between gap-3 rounded-arena border border-arena-line bg-arena-panel2 px-3 text-sm text-arena-muted transition hover:border-arena-muted xl:flex"
            onClick={() => setCommandOpen(true)}
            type="button"
          >
            <span className="flex items-center gap-2"><Search className="h-4 w-4" /> Buscar torneios, equipes, jogadores</span>
            <kbd className="rounded border border-arena-line px-1.5 py-0.5 text-[11px]">Ctrl K</kbd>
          </button>
          <Button aria-label="Buscar" className="h-10 w-10 px-0 xl:hidden" variant="ghost" icon={<Search className="h-5 w-5" />} onClick={() => setCommandOpen(true)} />

          {user ? (
            <>
              <div className="relative">
                <Button aria-label="Notificações" variant="ghost" className="h-10 w-10 px-0" icon={<Bell className="h-5 w-5" />} onClick={() => setNotificationsOpen(true)} />
                {unreadCount ? (
                  <span className="pointer-events-none absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-arena-live px-1 text-[10px] font-bold text-white">{unreadCount}</span>
                ) : null}
              </div>
              {!user.email_verified ? (
                <Button className="hidden md:inline-flex" variant="secondary" icon={<MailWarning className="h-4 w-4" />} loading={switching} onClick={() => void resendVerification()}>
                  Confirmar email
                </Button>
              ) : null}
              {inWorkspace ? (
                <div className="hidden items-center gap-2 lg:flex">
                  <select aria-label="Perfil atual" className={cn(selectClass, "min-w-36")} disabled={switching} value={user.active_role} onChange={(event) => void changeContext({ role:event.target.value })}>
                    {user.roles.map((role) => <option key={role} value={role}>{ROLE_LABELS[role] ?? role}</option>)}
                  </select>
                  {user.games.length > 1 ? (
                    <select aria-label="Jogo atual" className={cn(selectClass, "max-w-40")} disabled={switching} value={user.active_game_id ?? ""} onChange={(event) => void changeContext({ game_id:Number(event.target.value) })}>
                      {user.games.map((game) => <option key={game.id} value={game.id}>{game.nome_curto}</option>)}
                    </select>
                  ) : null}
                  {availableTeams.length > 1 ? (
                    <select aria-label="Equipe atual" className={cn(selectClass, "max-w-44")} disabled={switching} value={user.active_team_id ?? ""} onChange={(event) => void changeContext({ team_id:Number(event.target.value) })}>
                      {availableTeams.map((team) => <option key={team.team_id} value={team.team_id}>{team.team_name}</option>)}
                    </select>
                  ) : null}
                </div>
              ) : null}
              <Button className="hidden sm:inline-flex" variant="secondary" icon={switching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />} onClick={() => navigate(inWorkspace ? "/" : roleHref(user.active_role))}>
                {inWorkspace ? "Ver site" : "Meu painel"}
              </Button>
              <Button aria-label="Sair" variant="ghost" className="h-10 w-10 px-0" icon={<LogOut className="h-4 w-4" />} onClick={logout} />
            </>
          ) : (
            <>
              <Link className="hidden sm:block" to="/entrar"><Button variant="secondary" icon={<UserRound className="h-4 w-4" />}>Entrar</Button></Link>
              <Link to="/criar-conta"><Button>Criar conta</Button></Link>
            </>
          )}

          {!inWorkspace ? (
            <Button aria-controls="menu-celular" aria-expanded={menuOpen} aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} className="h-10 w-10 px-0 lg:hidden" variant="ghost" icon={menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />} onClick={() => setMenuOpen((open) => !open)} />
          ) : null}
        </div>
      </div>

      {menuOpen && !inWorkspace ? (
        <nav className="border-t border-arena-line bg-arena-bg px-4 py-3 lg:hidden" id="menu-celular" aria-label="Menu principal">
          {PUBLIC_MENU.map((item) => (
            <NavLink className={({ isActive }) => cn("block py-2.5 font-semibold", isActive ? "text-arena-text" : "text-arena-muted")} key={item.href} to={item.href}>{item.label}</NavLink>
          ))}
          {user ? (
            <Link className="block py-2.5 font-semibold text-cyan-200" to={roleHref(user.active_role)}>Meu painel</Link>
          ) : (
            <Link className="block py-2.5 font-semibold text-cyan-200" to="/entrar">Entrar</Link>
          )}
        </nav>
      ) : null}
    </header>
  );
}
