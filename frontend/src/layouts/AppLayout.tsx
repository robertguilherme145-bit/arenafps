import { Outlet, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { AuthDialog } from "../components/layout/AuthDialog";
import { CommandPalette } from "../components/layout/CommandPalette";
import { Navbar } from "../components/layout/Navbar";
import { NotificationsDrawer } from "../components/layout/NotificationsDrawer";
import { Sidebar } from "../components/layout/Sidebar";
import { ToastViewport } from "../components/ui/ToastViewport";
import { useUiStore } from "../stores/uiStore";
import { cn } from "../utils/cn";

export function AppLayout() {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const location = useLocation();
  const crumbs = location.pathname.split("/").filter(Boolean);
  const workspace = location.pathname.startsWith("/admin") || location.pathname.startsWith("/lider") || location.pathname.startsWith("/capitao") || /^\/jogador\/?$/.test(location.pathname) || location.pathname.startsWith("/design-system");

  return (
    <div className="min-h-screen">
      <Navbar />
      {workspace ? <Sidebar /> : null}
      <main className={cn("pt-16 transition-[padding]", workspace && (collapsed ? "lg:pl-[76px]" : "lg:pl-64"))}>
        {workspace ? <div className="border-b border-arena-line bg-arena-bg/55 px-4 py-3 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-arena-muted">
            <span>Arena Camp</span>
            {crumbs.map((crumb) => (
              <span className="flex items-center gap-2 capitalize" key={crumb}>
                <ChevronRight className="h-3 w-3" />
                {crumb.replaceAll("-", " ")}
              </span>
            ))}
          </div>
        </div> : null}
        <Outlet />
      </main>
      <CommandPalette />
      <AuthDialog />
      <NotificationsDrawer />
      <ToastViewport />
    </div>
  );
}
