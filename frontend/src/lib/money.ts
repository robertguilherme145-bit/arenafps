// Premiacao chega como texto livre do admin; numeros puros ganham o "R$".
export function formatPrize(value: string | null | undefined): string {
  const text = String(value ?? "").trim();
  if (!text) return "A definir";
  return /^[\d.,\s]+$/.test(text) ? `R$ ${text}` : text;
}
