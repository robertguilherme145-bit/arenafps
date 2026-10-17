// Funcoes e pecas pequenas do Painel da organizacao, compartilhadas entre as secoes.
import type { ReactNode } from "react";
import { Label } from "../../components/ui/Form";
import type { AchievementDefinition, AdminPayment, AdminPlayer, PublicContent, Tournament } from "../../types/api";

export function blankTournamentForm() {
  return {
    nome: "",
    descricao: "",
    valor: "",
    max_teams: "",
    titulares: "",
    reservas: "",
    premiacao: "",
    inicio: "",
    fim: "",
  };
}

export function toDatetimeLocal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function toApiDate(value: string) {
  return new Date(value).toISOString().slice(0, 19).replace("T", " ");
}

export function buildTournamentForm(tournament: Tournament) {
  return {
    nome: tournament.nome,
    descricao: tournament.descricao ?? "",
    valor: String(tournament.valor ?? ""),
    max_teams: String(tournament.max_teams ?? ""),
    titulares: String(tournament.titulares ?? ""),
    reservas: String(tournament.reservas ?? ""),
    premiacao: tournament.premiacao ?? "",
    inicio: toDatetimeLocal(tournament.inicio),
    fim: toDatetimeLocal(tournament.fim),
  };
}

export function parseIds(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item))
    .filter((item) => !Number.isNaN(item));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString("pt-BR") : "data não informada";
}

export function formatRelativeDate(value: string) {
  const date = new Date(value);
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  if (Math.abs(seconds) < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return formatter.format(days, "day");
  return date.toLocaleDateString("pt-BR");
}

export function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    "payment.updated": "Pagamento atualizado",
    "entry.approved": "Inscrição aprovada",
    "entry.cancelled": "Inscrição cancelada",
    "player.updated": "Jogador atualizado",
    "team.updated": "Equipe atualizada",
    "game.map.created": "Mapa cadastrado",
    "game.map.updated": "Mapa atualizado",
    "game.map.deleted": "Mapa excluido",
    "game.deleted": "Jogo excluido",
    "account.banned": "Conta banida",
    "account.unbanned": "Banimento removido",
    "tournament.updated": "Torneio atualizado",
  };
  return labels[action] || action.replaceAll(".", " · ").replaceAll("_", " ");
}

export function stringifyDetails(value: unknown) {
  if (!value) {
    return "-";
  }

  return typeof value === "string" ? value : JSON.stringify(value);
}

export function paymentTone(status: AdminPayment["status"]) {
  if (status === "aprovado") {
    return "success";
  }

  if (status === "cancelado" || status === "rejeitado") {
    return "danger";
  }

  return "warning";
}

export function playerTone(status: AdminPlayer["status"]) {
  if (status === "ativo") {
    return "success";
  }

  if (status === "banido") {
    return "danger";
  }

  if (status === "reserva") {
    return "info";
  }

  return "warning";
}

export function achievementMetricLabel(metric: AchievementDefinition["metric"]) {
  const labels: Record<AchievementDefinition["metric"], string> = {
    wins: "Vitórias",
    kills: "Eliminacoes",
    assists: "Assistencias",
    headshots: "Headshots",
    mvps: "MVPs",
    matches: "Partidas",
    win_streak: "Sequencia",
    global_rank: "Ranking",
  };
  return labels[metric];
}

export function publicContentTypeLabel(type: PublicContent["type"]) {
  return (
    {
      noticia: "Noticia",
      parceiro: "Parceiro",
      depoimento: "Depoimento",
      faq: "FAQ",
    } as Record<PublicContent["type"], string>
  )[type];
}

export function roleLabel(role: string) {
  return (
    (
      {
        jogador: "Jogador",
        lider: "Líder",
        capitao: "Capitão",
        admin: "Administrador",
      } as Record<string, string>
    )[role] ?? role
  );
}

export function MetricTile({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-arena border border-arena-line bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-arena-muted">
          {title}
        </p>
        <div className="text-cyan-200">{icon}</div>
      </div>
      <p className="mt-3 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function QueueLine({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-arena border border-arena-line bg-black/20 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="text-cyan-200">{icon}</div>
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-semibold text-arena-text">{value}</span>
    </div>
  );
}
