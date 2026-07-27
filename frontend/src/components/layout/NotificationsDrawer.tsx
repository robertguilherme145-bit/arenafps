import { Bell, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSessionStore } from "../../stores/sessionStore";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

export function NotificationsDrawer() {
  const open = useSessionStore((state) => state.notificationsOpen);
  const setOpen = useSessionStore((state) => state.setNotificationsOpen);
  const { notifications, token } = useAuth();
  const navigate = useNavigate();

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm">
      <div className="absolute right-0 top-0 h-full w-full max-w-md border-l border-arena-line bg-arena-panel shadow-panel">
        <div className="flex items-center justify-between border-b border-arena-line p-5">
          <div>
            <h2 className="font-display text-2xl font-semibold">Notificacoes</h2>
            <p className="mt-1 text-sm text-arena-muted">
              {token ? "Feed de atividades e alertas da conta." : "Faca login para ver suas notificacoes."}
            </p>
          </div>
          <Button variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
        </div>
        <div className="h-[calc(100%-92px)] overflow-y-auto p-4 scrollbar-thin">
          {!token ? (
            <EmptyState title="Sessao necessaria" description="O painel de notificacoes fica ativo depois do login." />
          ) : notifications.length ? (
            <div className="space-y-3">
              {notifications.map((item) => (
                <button
                  className="w-full rounded-arena border border-arena-line bg-black/20 p-4 text-left transition hover:border-cyan-400/40 hover:bg-white/[.04]"
                  key={item.id}
                  onClick={() => {
                    setOpen(false);
                    if (item.link) {
                      navigate(item.link);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.titulo}</p>
                      <p className="mt-2 text-sm text-arena-muted">{item.mensagem}</p>
                    </div>
                    {item.link ? <ExternalLink className="h-4 w-4 shrink-0 text-arena-muted" /> : <Bell className="h-4 w-4 shrink-0 text-cyan-200" />}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState title="Sem novas notificacoes" description="Quando a API retornar alertas, eles aparecem aqui em tempo real." />
          )}
        </div>
      </div>
    </div>
  );
}
