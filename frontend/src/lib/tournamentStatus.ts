// Sem dependencias: rotulos, cores e abas de status de torneio usados em todo o site.
export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info" | "live";
export type TournamentTab = "abertos" | "andamento" | "encerrados";

const LABELS: Record<string, { label:string; tone:StatusTone }> = {
  criado:{ label:"Rascunho", tone:"neutral" },
  aberto:{ label:"Inscrições abertas", tone:"warning" },
  fechado:{ label:"Inscrições encerradas", tone:"neutral" },
  em_andamento:{ label:"Ao vivo", tone:"live" },
  finalizado:{ label:"Encerrado", tone:"success" },
  cancelado:{ label:"Cancelado", tone:"danger" }
};

export function tournamentStatusLabel(status: string): { label:string; tone:StatusTone } {
  return LABELS[status] ?? { label:status, tone:"neutral" };
}

export function isPublicTournament(status: string): boolean {
  return status !== "criado" && status !== "cancelado";
}

export function tournamentTab(status: string): TournamentTab {
  if (status === "aberto") return "abertos";
  if (status === "fechado" || status === "em_andamento") return "andamento";
  return "encerrados";
}
