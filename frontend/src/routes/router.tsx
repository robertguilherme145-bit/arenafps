import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../layouts/AppLayout";
import { RequireRole } from "../components/layout/RequireRole";
import { LegacyPanelRedirect, LegacyRedirect } from "./LegacyRedirect";

const AdminDashboardPage = lazyPage(() => import("../pages/AdminDashboardPage"), "AdminDashboardPage");
const AdminTournamentPage = lazyPage(() => import("../pages/AdminTournamentPage"), "AdminTournamentPage");
const CommunityDirectoryPage = lazyPage(() => import("../pages/CommunityDirectoryPage"), "CommunityDirectoryPage");
const GamesPage = lazyPage(() => import("../pages/GamesPage"), "GamesPage");
const HomePage = lazyPage(() => import("../pages/HomePage"), "HomePage");
const MinhaArenaPage = lazyPage(() => import("../pages/MinhaArenaPage"), "MinhaArenaPage");
const NotFoundPage = lazyPage(() => import("../pages/NotFoundPage"), "NotFoundPage");
const ProfilePage = lazyPage(() => import("../pages/ProfilePage"), "ProfilePage");
const RankingPage = lazyPage(() => import("../pages/RankingPage"), "RankingPage");
const StaticPage = lazyPage(() => import("../pages/StaticPage"), "StaticPage");
const TournamentDetailPage = lazyPage(() => import("../pages/TournamentDetailPage"), "TournamentDetailPage");
const TournamentsPage = lazyPage(() => import("../pages/TournamentsPage"), "TournamentsPage");
const TournamentWizardPage = lazyPage(() => import("../pages/TournamentWizardPage"), "TournamentWizardPage");
const AdminMixTournamentPage = lazyPage(() => import("../pages/AdminMixTournamentPage"), "AdminMixTournamentPage");
const LoginPage = lazyPage(() => import("../pages/AuthPages"), "LoginPage");
const OAuthCallbackPage = lazyPage(() => import("../pages/AuthPages"), "OAuthCallbackPage");
const OnboardingPage = lazyPage(() => import("../pages/AuthPages"), "OnboardingPage");
const OfficialTournamentsPage = lazyPage(() => import("../pages/OfficialTournamentsPage"), "OfficialTournamentsPage");
const PasswordRecoveryPage = lazyPage(() => import("../pages/AuthPages"), "PasswordRecoveryPage");
const RegisterPage = lazyPage(() => import("../pages/AuthPages"), "RegisterPage");
const VerifyEmailPage = lazyPage(() => import("../pages/AuthPages"), "VerifyEmailPage");

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/torneios", element: <TournamentsPage /> },
      { path: "/torneios/:id", element: <TournamentDetailPage /> },
      { path: "/ranking", element: <RankingPage /> },
      { path: "/calendario", element: <LegacyRedirect /> },
      { path: "/resultados", element: <LegacyRedirect /> },
      { path: "/circuito", element: <OfficialTournamentsPage /> },
      { path: "/circuito-oficial", element: <LegacyRedirect /> },
      { path: "/jogos", element: <GamesPage /> },
      { path: "/comunidade", element: <CommunityDirectoryPage /> },
      { path: "/equipes", element: <LegacyRedirect /> },
      { path: "/jogadores", element: <LegacyRedirect /> },
      { path: "/entrar", element: <LoginPage /> },
      { path: "/criar-conta", element: <RegisterPage /> },
      { path: "/recuperar-senha", element: <PasswordRecoveryPage /> },
      { path: "/verificar-email", element: <VerifyEmailPage /> },
      { path: "/oauth/callback", element: <OAuthCallbackPage /> },
      { path: "/onboarding", element: <OnboardingPage /> },
      { path: "/admin", element: <RequireRole role="admin"><AdminDashboardPage /></RequireRole> },
      { path: "/minha-arena/:secao?", element: <MinhaArenaPage /> },
      { path: "/lider", element: <LegacyPanelRedirect panel="lider" /> },
      { path: "/capitao", element: <LegacyPanelRedirect panel="capitao" /> },
      { path: "/jogador", element: <LegacyPanelRedirect panel="jogador" /> },
      { path: "/admin/torneios/novo", element: <RequireRole role="admin"><TournamentWizardPage /></RequireRole> },
      { path: "/admin/torneios/:id", element: <RequireRole role="admin"><AdminTournamentPage /></RequireRole> },
      { path: "/admin/:secao", element: <RequireRole role="admin"><AdminDashboardPage /></RequireRole> },
      { path: "/admin/mix/:id", element: <RequireRole role="admin"><AdminMixTournamentPage /></RequireRole> },
      { path: "/equipe/:slug", element: <ProfilePage type="equipe" /> },
      { path: "/team/:slug", element: <LegacyRedirect /> },
      { path: "/jogador/:slug", element: <ProfilePage type="jogador" /> },
      { path: "/player/:slug", element: <LegacyRedirect /> },
      { path: "/sobre", element: <StaticPage page="sobre" /> },
      { path: "/contato", element: <StaticPage page="contato" /> },
      { path: "/faq", element: <StaticPage page="faq" /> },
      { path: "/privacidade", element: <StaticPage page="privacidade" /> },
      { path: "/termos", element: <StaticPage page="termos" /> },
      { path: "/noticias", element: <StaticPage page="noticias" /> },
      { path: "*", element: <NotFoundPage /> }
    ]
  }
]);

function lazyPage<T extends Record<string, unknown>, K extends keyof T>(loader: () => Promise<T>, name: K) {
  return lazy(async () => ({ default:(await loader())[name] as React.ComponentType<any> }));
}
