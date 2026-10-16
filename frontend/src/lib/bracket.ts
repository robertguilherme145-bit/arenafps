// Sem dependencias: monta as colunas do chaveamento a partir das partidas que existem no banco.
export type BracketMatch = {
  id:number; round:number; stage?:string | null; status:string;
  team_a?:string | null; team_b?:string | null; team_a_id:number; team_b_id:number;
  winner_team_id:number | null; score_team_a:number | null; score_team_b:number | null; scheduled_at:string | null;
};
export type BracketSlot = { match:BracketMatch } | { placeholder:true };
export type BracketColumn = { key:string; title:string; slots:BracketSlot[] };

const STAGE_LABELS: Record<string, string> = { group:"Grupos", playoff:"Playoffs", swiss:"Suíço", league:"Liga", bracket:"Chave", main:"Chave" };
const STAGE_ORDER = ["group", "swiss", "league", "main", "bracket", "playoff"];
const FINAL_ROUND_NAMES = ["Final", "Semifinal", "Quartas de final", "Oitavas de final"];

export function buildBracketColumns(input: { format:string | null; teamCount:number; matches:BracketMatch[] }): BracketColumn[] {
  const matches = [...input.matches].sort((a, b) => stageRank(a) - stageRank(b) || a.round - b.round || a.id - b.id);
  if (input.format === "single_elimination") return singleElimination(input.teamCount, matches);

  const stages = [...new Set(matches.map((item) => item.stage || "main"))];
  const keys = [...new Set(matches.map((item) => `${item.stage || "main"}-${item.round}`))];
  return keys.map((key) => {
    const [stage, round] = splitKey(key);
    const prefix = stages.length > 1 ? `${STAGE_LABELS[stage] ?? stage} · ` : "";
    return {
      key,
      title:`${prefix}Rodada ${round}`,
      slots:matches.filter((item) => (item.stage || "main") === stage && item.round === round).map((item) => ({ match:item }))
    };
  });
}

function singleElimination(teamCount: number, matches: BracketMatch[]): BracketColumn[] {
  const highestRound = matches.reduce((max, item) => Math.max(max, item.round), 0);
  const totalRounds = Math.max(teamCount > 1 ? Math.ceil(Math.log2(teamCount)) : 0, highestRound);
  const columns: BracketColumn[] = [];
  for (let round = 1; round <= totalRounds; round++) {
    const fromEnd = totalRounds - round;
    const size = 2 ** fromEnd;
    const existing: BracketSlot[] = matches.filter((item) => item.round === round).map((item) => ({ match:item }));
    const placeholders: BracketSlot[] = Array.from({ length:Math.max(0, size - existing.length) }, () => ({ placeholder:true }));
    columns.push({ key:`round-${round}`, title:FINAL_ROUND_NAMES[fromEnd] ?? `Rodada ${round}`, slots:[...existing, ...placeholders] });
  }
  return columns;
}

function stageRank(item: BracketMatch) {
  const index = STAGE_ORDER.indexOf(item.stage || "main");
  return index === -1 ? STAGE_ORDER.length : index;
}

function splitKey(key: string): [string, number] {
  const index = key.lastIndexOf("-");
  return [key.slice(0, index), Number(key.slice(index + 1))];
}
