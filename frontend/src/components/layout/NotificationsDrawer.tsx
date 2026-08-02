import { Bell, CheckCheck, ExternalLink, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { clearNotifications, deleteNotification, markAllNotificationsAsRead, markNotificationAsRead } from "../../services/api";
import { useSessionStore } from "../../stores/sessionStore";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

export function NotificationsDrawer() {
  const open = useSessionStore((state) => state.notificationsOpen);
  const setOpen = useSessionStore((state) => state.setNotificationsOpen);
  const setNotifications = useSessionStore((state) => state.setNotifications);
  const { notifications, token } = useAuth();
  const navigate = useNavigate();
  if (!open) return null;

  function read(item: typeof notifications[number]) {
    void markNotificationAsRead(item.id);
    setNotifications(notifications.map((entry) => entry.id === item.id ? { ...entry, lida:1 } : entry));
    setOpen(false);
    if (item.link) navigate(item.link);
  }

  return <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm">
    <div className="absolute right-0 top-0 h-full w-full max-w-md border-l border-arena-line bg-arena-panel shadow-panel">
      <div className="flex items-center justify-between border-b border-arena-line p-5"><div><h2 className="font-display text-2xl font-semibold">Notificações</h2><p className="mt-1 text-sm text-arena-muted">{token ? "Feed de atividades e alertas da conta." : "Faça login para ver suas notificações."}</p></div><Button variant="ghost" onClick={() => setOpen(false)}>Fechar</Button></div>
      <div className="h-[calc(100%-92px)] overflow-y-auto p-4 scrollbar-thin">
        {!token ? <EmptyState title="Sessão necessária" description="O painel de notificações fica ativo depois do login." /> : notifications.length ? <div className="space-y-3">
          <div className="flex justify-end gap-2"><Button icon={<CheckCheck className="h-4 w-4" />} variant="ghost" onClick={() => void markAllNotificationsAsRead().then(() => setNotifications(notifications.map((item) => ({ ...item, lida:1 }))))}>Marcar lidas</Button><Button icon={<Trash2 className="h-4 w-4" />} variant="danger" onClick={() => void clearNotifications().then(() => setNotifications([]))}>Limpar tudo</Button></div>
          {notifications.map((item) => <div className={`w-full border p-4 ${item.lida ? "border-arena-line bg-black/20" : "border-cyan-400/40 bg-cyan-400/[.05]"}`} key={item.id}><div className="flex items-start justify-between gap-3"><button className="min-w-0 flex-1 text-left" onClick={() => read(item)}><p className="font-semibold">{item.titulo}</p><p className="mt-2 text-sm text-arena-muted">{item.mensagem}</p></button><div className="flex items-center gap-2">{item.link ? <ExternalLink className="h-4 w-4 text-arena-muted" /> : <Bell className="h-4 w-4 text-cyan-200" />}<button aria-label="Excluir notificação" className="p-1 text-arena-muted hover:text-red-300" onClick={() => void deleteNotification(item.id).then(() => setNotifications(notifications.filter((entry) => entry.id !== item.id)))}><Trash2 className="h-4 w-4" /></button></div></div></div>)}
        </div> : <EmptyState title="Sem notificações" description="Seus novos alertas aparecerão aqui." />}
      </div>
    </div>
  </div>;
}
