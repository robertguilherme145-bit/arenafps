import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState
} from "react";
import type { AuthUser, DashboardData, LoginInput, NotificationItem, RegisterInput, RegisterResponse, UserProfile } from "../types/api";
import { exchangeOAuthLogin, getDashboard, getIdentity, getNotifications, getProfile, login, logoutPlayerSession, register, switchIdentityContext, updateIdentityGames } from "../services/api";
import { useSessionStore } from "../stores/sessionStore";
import { useToast } from "../hooks/useToast";

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  profile: UserProfile | null;
  dashboard: DashboardData | null;
  notifications: NotificationItem[];
  loading: boolean;
  loginWithPassword: (input: LoginInput) => Promise<boolean>;
  loginWithOAuthCode: (code:string) => Promise<void>;
  registerAccount: (input: RegisterInput) => Promise<RegisterResponse>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  switchContext: (input: { role: string; game_id?: number | null; team_id?: number | null }) => Promise<void>;
  updateGames: (gameIds: number[], primaryGameId?: number) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const { success, error } = useToast();
  const token = useSessionStore((state) => state.token);
  const user = useSessionStore((state) => state.user);
  const profile = useSessionStore((state) => state.profile);
  const dashboard = useSessionStore((state) => state.dashboard);
  const notifications = useSessionStore((state) => state.notifications);
  const setSession = useSessionStore((state) => state.setSession);
  const clearSession = useSessionStore((state) => state.clearSession);
  const setProfile = useSessionStore((state) => state.setProfile);
  const setDashboard = useSessionStore((state) => state.setDashboard);
  const setNotifications = useSessionStore((state) => state.setNotifications);
  const setAuthModalOpen = useSessionStore((state) => state.setAuthModalOpen);
  const [loading, setLoading] = useState(Boolean(token));

  async function refreshSession(sessionToken = token) {
    if (!sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [identityData, profileData, dashboardData, notificationsData] = await Promise.all([
        getIdentity(),
        getProfile(),
        getDashboard(),
        getNotifications()
      ]);

      setProfile(profileData);
      setDashboard(dashboardData);
      setNotifications(notificationsData);
      setSession(sessionToken, identityData);
    } catch (err) {
      clearSession();
      error("Sessao encerrada", err instanceof Error ? err.message : "Faca login novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function loginWithPassword(input: LoginInput) {
    const response = await login(input);
    if (response.requires_two_factor) return true;
    setSession(response.token, response.usuario);
    setAuthModalOpen(false);
    success("Login realizado", `Bem-vindo de volta, ${response.usuario.nome}.`);
    await refreshSession(response.token);
    return false;
  }

  async function registerAccount(input: RegisterInput) {
    const response = await register(input);
    success("Conta criada", "Agora faca login para entrar na plataforma.");
    return response;
  }

  async function loginWithOAuthCode(code: string) {
    const response = await exchangeOAuthLogin(code);
    if (response.requires_two_factor) throw new Error("Conclua o acesso com email e senha para validar o segundo fator.");
    setSession(response.token, response.usuario);
    setAuthModalOpen(false);
    success("Conta conectada", `Bem-vindo, ${response.usuario.nome}.`);
    await refreshSession(response.token);
  }

  function logout() {
    void logoutPlayerSession().catch(() => undefined);
    clearSession();
    success("Sessao encerrada", "Sua conta foi desconectada com seguranca.");
  }

  async function switchContext(input: { role: string; game_id?: number | null; team_id?: number | null }) {
    if (!token) return;
    const identity = await switchIdentityContext(input);
    setSession(token, identity);
    await refreshSession(token);
  }

  async function updateGames(gameIds: number[], primaryGameId?: number) {
    if (!token) return;
    const identity = await updateIdentityGames({ game_ids: gameIds, primary_game_id: primaryGameId });
    setSession(token, identity);
    await refreshSession(token);
  }

  useEffect(() => {
    void refreshSession();
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const timer = window.setInterval(() => {
      void getNotifications()
        .then(setNotifications)
        .catch(() => undefined);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [token, setNotifications]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        profile,
        dashboard,
        notifications,
        loading,
        loginWithPassword,
        loginWithOAuthCode,
        registerAccount,
        logout,
        refreshSession,
        switchContext,
        updateGames
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return context;
}
