// Sem dependencias: este modulo roda no app e direto no node --test.
export function formatCountdown(target: Date, now: Date): string {
  const totalSeconds = Math.floor((target.getTime() - now.getTime()) / 1000);
  if (totalSeconds <= 0) return "Agora";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  if (days >= 1) return `${days}d ${pad(hours)}h`;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${pad(hours)}:${pad(minutes)}:${pad(totalSeconds % 60)}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
