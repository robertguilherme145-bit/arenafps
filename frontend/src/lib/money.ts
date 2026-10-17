// Premiacao chega como texto livre do admin; numeros puros ganham o "R$".
export function formatPrize(value: string | null | undefined): string {
  const text = String(value ?? "").trim();
  if (!text) return "A definir";
  return /^[\d.,\s]+$/.test(text) ? `R$ ${text}` : text;
}

// Valor da inscricao: "R$ 10,00 por equipe", "R$ 5,00 por jogador" (Mix) ou "Grátis".
export function formatEntryFee(tournament: { valor?: string | number | null; format?: string | null }): string {
  const amount = Number(String(tournament.valor ?? 0).replace(/[^\d,.-]/g, "").replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return "Grátis";
  const scope = tournament.format === "mix_single_elimination" ? "por jogador" : "por equipe";
  const value = new Intl.NumberFormat("pt-BR", { style:"currency", currency:"BRL" }).format(amount).replace(/\s/g, " ");
  return `${value} ${scope}`;
}
