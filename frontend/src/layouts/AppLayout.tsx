import { Outlet, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { AuthDialog } from "../components/layout/AuthDialog";
import { CommandPalette } from "../components/layout/CommandPalette";
import { isWorkspacePath, Navbar } from "../components/layout/Navbar";
import { SiteFooter } from "../components/layout/SiteFooter";
import { NotificationsDrawer } from "../components/layout/NotificationsDrawer";
import { DiscordLinkGate } from "../components/layout/DiscordLinkGate";
import { Sidebar } from "../components/layout/Sidebar";
import { ToastViewport } from "../components/ui/ToastViewport";
import { useUiStore } from "../stores/uiStore";
import { cn } from "../utils/cn";

export function AppLayout() {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const location = useLocation();
  const crumbs = location.pathname.split("/").filter(Boolean);
  const workspace = isWorkspacePath(location.pathname);

  return (
    <div className="min-h-screen">
      <Navbar />
      {workspace ? <Sidebar /> : null}
      <main className={cn("pt-16 transition-[padding]", workspace && (collapsed ? "lg:pl-[76px]" : "lg:pl-64"))}>
        {workspace ? <div className="border-b border-arena-line bg-arena-bg/55 px-4 py-3 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-arena-muted">
            <span>Arena Camp</span>
            {crumbs.map((crumb) => (
              <span className="flex items-center gap-2 " key={crumb}>
                <ChevronRight className="h-3 w-3" />
                {crumbLabel(crumb)}
              </span>
            ))}
          </div>
        </div> : null}
        <Outlet />
      </main>
      {workspace ? null : <SiteFooter />}
      <CommandPalette />
      <AuthDialog />
      <NotificationsDrawer />
      <DiscordLinkGate />
      <ToastViewport />
    </div>
  );
}

const CRUMBS: Record<string, string> = { admin:"Painel da organização", "minha-arena":"Minha Arena", partidas:"Partidas", time:"Meu time", carreira:"Carreira", suporte:"Suporte", configuracoes:"Configurações", torneios:"Torneios", novo:"Novo torneio", mix:"Torneio Mix" };
// Numeros na trilha (ex.: /admin/torneios/7) viram "Torneio".
const NUMERIC = /^[0-9]+$/;
function crumbLabel(crumb: string) {
  if (NUMERIC.test(crumb)) return "Torneio";
  return CRUMBS[crumb] ?? decodeURIComponent(crumb).replaceAll("-", " ");
}
