import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  adminNavigation,
  captainControlNavigation,
  captainNavigation,
  captainTeamNavigation,
  leaderNavigation,
  playerNavigation,
  publicNavigation
} from "../../constants/navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useUiStore } from "../../stores/uiStore";
import { Input } from "../ui/Form";
import { searchPublicPortal } from "../../services/api";
import type { PublicSearchResult } from "../../types/api";
import { Badge } from "../ui/Badge";

export function CommandPalette() {
  const { user } = useAuth();
  const open = useUiStore((state) => state.commandOpen);
  const setOpen = useUiStore((state) => state.setCommandOpen);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicSearchResult[]>([]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  useEffect(() => {
    if (!open || query.trim().length < 2) { setResults([]); return; }
    const timer = window.setTimeout(() => void searchPublicPortal(query, user?.active_game_id).then(setResults).catch(() => setResults([])), 250);
    return () => window.clearTimeout(timer);
  }, [open, query, user?.active_game_id]);

  const commands = useMemo(() => {
    const workspace =
      user?.active_role === "admin"
        ? adminNavigation
        : user?.active_role === "lider"
          ? leaderNavigation
          : user?.active_role === "capitao"
            ? [...captainNavigation, ...captainTeamNavigation, ...captainControlNavigation]
          : user
            ? playerNavigation
            : [];

    return [...publicNavigation, ...workspace];
  }, [user]);
  const filtered = commands.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="mx-auto mt-24 max-w-xl rounded-arena border border-arena-line bg-arena-panel shadow-panel">
        <div className="flex items-center gap-3 border-b border-arena-line p-4">
          <Search className="h-5 w-5 text-arena-muted" />
          <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Digite para navegar" />
        </div>
        <div className="max-h-[28rem] overflow-y-auto p-2 scrollbar-thin">
          {results.length ? <><p className="px-3 py-2 text-xs font-semibold uppercase text-arena-muted">Resultados da plataforma</p>{results.map((item) => <button className="flex w-full items-center gap-3 rounded-arena px-3 py-3 text-left text-sm transition hover:bg-white/[.07]" key={`${item.type}-${item.id}`} onClick={() => { navigate(item.url); setOpen(false); setQuery(""); }}><Search className="h-4 w-4 text-cyan-200" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{item.title}</span><span className="block truncate text-xs text-arena-muted">{item.subtitle || item.game}</span></span><Badge tone="neutral">{item.type}</Badge></button>)}</> : null}
          <p className="px-3 py-2 text-xs font-semibold uppercase text-arena-muted">Navegacao</p>
          {filtered.map((item) => (
            <button
              key={item.href}
              className="flex w-full items-center gap-3 rounded-arena px-3 py-3 text-left text-sm text-arena-muted transition hover:bg-white/[.07] hover:text-arena-text"
              onClick={() => {
                navigate(item.href);
                setOpen(false);
                setQuery("");
              }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
