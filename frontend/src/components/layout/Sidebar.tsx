import { Link, NavLink, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Compass, LayoutDashboard } from "lucide-react";
import { cn } from "../../utils/cn";
import {
  adminActionNavigation,
  adminControlNavigation,
  adminNavigation,
  arenaNavigation,
  footerNavigation,
  publicNavigation
} from "../../constants/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useUiStore } from "../../stores/uiStore";
import { Button } from "../ui/Button";

export function Sidebar() {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const location = useLocation();
  const { user } = useAuth();

  const area = getArea(location.pathname, user?.role ?? null);
  const sections = getSections(area, Boolean(user?.roles.includes("admin")));

  return (
    <aside
      className={cn(
        "fixed bottom-0 left-0 top-16 z-30 hidden overflow-y-auto border-r border-arena-line bg-arena-bg/92 p-3 backdrop-blur-xl transition-[width] scrollbar-thin lg:block",
        collapsed ? "w-[76px]" : "w-64"
      )}
    >
      <div className="flex h-full flex-col gap-6">
        {!collapsed && area === "public" ? (
          <div className="rounded-arena border border-arena-line bg-white/[.03] p-3">
            <p className="text-sm text-arena-muted">Explore torneios, rankings e calendários da Arena Camp.</p>
          </div>
        ) : null}

        {sections.map((section) => (
          <NavGroup
            key={section.title ?? "main"}
            title={section.title}
            items={section.items}
            collapsed={collapsed}
          />
        ))}

        <div className="mt-auto space-y-3">
          {area !== "public" ? (
            <NavLink
              to="/"
              className="flex items-center gap-3 rounded-arena border border-arena-line bg-white/[.04] px-3 py-3 text-sm font-semibold text-arena-muted transition hover:bg-white/[.08] hover:text-arena-text"
              title={collapsed ? "Voltar para plataforma" : undefined}
            >
              <Compass className="h-4 w-4 shrink-0" />
              {!collapsed ? "Voltar para plataforma" : null}
            </NavLink>
          ) : user ? (
            <NavLink
              to="/minha-arena"
              className="flex items-center gap-3 rounded-arena border border-cyan-400/25 bg-cyan-400/10 px-3 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
              title={collapsed ? "Minha Arena" : undefined}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              {!collapsed ? "Minha Arena" : null}
            </NavLink>
          ) : null}

          <Button
            variant="ghost"
            className="w-full justify-start"
            icon={collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            onClick={toggleSidebar}
          >
            {!collapsed ? "Recolher" : null}
          </Button>
        </div>
      </div>
    </aside>
  );
}

function NavGroup({
  title,
  items,
  collapsed
}: {
  title?: string;
  items: Array<{ label: string; href: string; icon: React.ComponentType<{ className?: string }>; module?: string }>;
  collapsed: boolean;
}) {
  const location = useLocation();
  const activeWorkspaceModule = new URLSearchParams(location.search).get("module") ?? "dashboard";
  const linkClass = (active: boolean) => cn(
    "flex h-10 items-center gap-3 rounded-arena px-3 text-sm font-semibold text-arena-muted transition hover:bg-white/[.07] hover:text-arena-text",
    active && "bg-arena-panel text-arena-text shadow-[inset_3px_0_0_#3d8bff]"
  );

  return (
    <nav className="space-y-2" aria-label={title ?? "Navegacao principal"}>
      {title && !collapsed ? (
        <p className="px-3 text-xs font-semibold uppercase tracking-[.16em] text-arena-muted">{title}</p>
      ) : null}
      {items.map((item) => {
        const content = <><item.icon className="h-4 w-4 shrink-0" />{!collapsed ? item.label : null}</>;

        if (item.module) {
          const workspacePath = item.href.split("?")[0];
          const active = location.pathname === workspacePath && activeWorkspaceModule === item.module;
          return (
            <Link aria-current={active ? "page" : undefined} className={linkClass(active)} key={`${item.href}-${item.label}`} title={collapsed ? item.label : undefined} to={item.href}>
              {content}
            </Link>
          );
        }

        return (
          <NavLink
            key={`${item.href}-${item.label}`}
            to={item.href}
            end={item.href === "/" || item.href === "/admin" || item.href === "/minha-arena"}
            className={({ isActive }) => linkClass(isActive)}
            title={collapsed ? item.label : undefined}
          >
            {content}
          </NavLink>
        );
      })}
    </nav>
  );
}

function getArea(pathname: string, role: string | null) {
  if (pathname.startsWith("/admin")) {
    return "admin";
  }

  if (pathname.startsWith("/minha-arena")) {
    return "arena";
  }

  return "public";
}

function getSections(area: string, isAdmin = false) {
  switch (area) {
    case "admin":
      return [
        { title: "Competição", items: adminNavigation },
        { title: "Plataforma", items: adminControlNavigation },
        { title: "Ações", items: adminActionNavigation }
      ];
    case "arena":
      return [
        { title: "Minha Arena", items: arenaNavigation },
        ...(isAdmin ? [{ title: "Organização", items: [{ label: "Painel da organização", href: "/admin", icon: LayoutDashboard }] }] : [])
      ];
    default:
      return [
        { title: undefined, items: publicNavigation },
        { title: "Suporte", items: footerNavigation }
      ];
  }
}
