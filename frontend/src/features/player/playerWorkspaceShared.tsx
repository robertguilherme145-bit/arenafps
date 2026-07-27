import type { ReactNode, TextareaHTMLAttributes } from "react";
import { Badge } from "../../components/ui/Badge";
import { Label } from "../../components/ui/Form";
import type { PlayerWorkspace } from "../../types/api";

export type PlayerRunner = (key: string, action: () => Promise<unknown>, success: string, refresh?: boolean) => Promise<boolean>;
export type PlayerModuleProps = { data: PlayerWorkspace; busy: string | null; run: PlayerRunner };

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`min-h-24 w-full rounded-arena border border-arena-line bg-black/25 px-3 py-2 text-sm text-arena-text placeholder:text-arena-muted focus:border-arena-cyan ${className}`} {...props} />;
}

export function StatusBadge({ value }: { value: string | null | undefined }) {
  const normalized = String(value || "pendente").toLowerCase();
  const tone = ["confirmado", "finalizada", "ativo", "aberto", "pago", "accepted", "respondido"].includes(normalized) ? "success" : ["ausente", "cancelado", "cancelled", "rejected", "fechado"].includes(normalized) ? "danger" : ["andamento", "em_analise", "talvez", "liberado"].includes(normalized) ? "info" : "neutral";
  return <Badge tone={tone}>{statusLabel(normalized)}</Badge>;
}

export function InlineEmpty({ text }: { text: string }) {
  return <div className="border border-dashed border-arena-line p-6 text-center text-sm text-arena-muted">{text}</div>;
}

export function Metric({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return <div className="border border-arena-line bg-black/20 p-4"><p className="text-xs font-semibold uppercase text-arena-muted">{label}</p><p className="mt-2 font-display text-2xl font-semibold">{value}</p>{helper ? <p className="mt-1 text-xs text-arena-muted">{helper}</p> : null}</div>;
}

export function formatDate(value: string | null | undefined, includeTime = true) {
  if (!value) return "A definir";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "A definir";
  return new Intl.DateTimeFormat("pt-BR", includeTime ? { dateStyle: "short", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
}

export function formatDecimal(value: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(Number(value ?? 0));
}

export function statusLabel(value: string) {
  const labels: Record<string, string> = { agendada: "Agendada", andamento: "Em andamento", finalizada: "Finalizada", confirmado: "Confirmado", ausente: "Ausente", talvez: "Talvez", pendente: "Pendente", pending: "Pendente", accepted: "Aceito", rejected: "Recusado", cancelled: "Cancelado", aberto: "Aberto", em_analise: "Em analise", respondido: "Respondido", fechado: "Fechado", liberado: "Liberado", aguardando: "Aguardando", ativo: "Ativo", reserva: "Reserva", titular: "Titular" };
  return labels[value] ?? value.replaceAll("_", " ");
}

export function roleLabel(value: string) {
  return ({ leader: "Lider", captain: "Capitao", manager: "Gerente", player: "Jogador" } as Record<string, string>)[value] ?? value;
}

export function confirmAction(message: string, action: () => void) {
  if (window.confirm(message)) action();
}
