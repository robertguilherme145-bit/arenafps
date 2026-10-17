// Sem dependencias: grade mensal (domingo a sabado) com inicio e final de cada torneio.
type CalendarTournament = { id:number; nome:string; inicio:string | null; fim:string | null };
export type CalendarEvent = { id:number; kind:"inicio" | "final"; label:string };
export type CalendarDay = { date:Date; day:number; inMonth:boolean; events:CalendarEvent[] };

export function buildMonthGrid(year: number, month: number, tournaments: CalendarTournament[]): CalendarDay[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const lastDay = new Date(year, month + 1, 0);
  const totalCells = Math.ceil((first.getDay() + lastDay.getDate()) / 7) * 7;

  const events = new Map<string, CalendarEvent[]>();
  const push = (date: Date, event: CalendarEvent) => {
    const key = dayKey(date);
    events.set(key, [...(events.get(key) ?? []), event]);
  };
  for (const tournament of tournaments) {
    const begin = parse(tournament.inicio);
    const end = parse(tournament.fim);
    if (begin && end && dayKey(begin) === dayKey(end)) { push(begin, { id:tournament.id, kind:"inicio", label:tournament.nome }); continue; }
    if (begin) push(begin, { id:tournament.id, kind:"inicio", label:`Início: ${tournament.nome}` });
    if (end) push(end, { id:tournament.id, kind:"final", label:`Final: ${tournament.nome}` });
  }

  return Array.from({ length:totalCells }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return { date, day:date.getDate(), inMonth:date.getMonth() === month, events:date.getMonth() === month ? events.get(dayKey(date)) ?? [] : [] };
  });
}

function parse(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
