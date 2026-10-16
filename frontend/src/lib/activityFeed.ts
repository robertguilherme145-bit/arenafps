// Sem dependencias: os tipos abaixo espelham os campos usados de PublicPortalData.
type FeedResult = { id:number; tournament_id:number; team_a:string; team_b:string; score_team_a:number; score_team_b:number; winner:string | null; finished_at:string | null };
type FeedTournament = { id:number; nome:string; status:string; inicio?:string | null; created_at?:string | null };
type FeedChampion = { tournament_id:number; tournament_name:string; team_name:string; fim:string | null };

export type FeedItem = { key:string; kind:"result" | "open" | "champion"; text:string; highlight:string; href:string };

export function buildActivityFeed(
  portal: { results:FeedResult[]; tournaments:FeedTournament[]; champions:FeedChampion[] },
  limit = 6
): FeedItem[] {
  const dated: Array<{ at:number; item:FeedItem }> = [];

  for (const result of portal.results) {
    if (!result.winner) continue;
    const winnerIsA = result.winner === result.team_a;
    const loser = winnerIsA ? result.team_b : result.team_a;
    const [high, low] = winnerIsA ? [result.score_team_a, result.score_team_b] : [result.score_team_b, result.score_team_a];
    dated.push({ at:time(result.finished_at), item:{ key:`result-${result.id}`, kind:"result", highlight:result.winner, text:`venceu ${loser} por ${high}–${low}`, href:`/torneios/${result.tournament_id}` } });
  }

  for (const tournament of portal.tournaments) {
    if (tournament.status !== "aberto") continue;
    dated.push({ at:time(tournament.created_at ?? tournament.inicio ?? null), item:{ key:`open-${tournament.id}`, kind:"open", highlight:tournament.nome, text:"está com inscrições abertas", href:`/torneios/${tournament.id}` } });
  }

  for (const champion of portal.champions) {
    dated.push({ at:time(champion.fim), item:{ key:`champion-${champion.tournament_id}`, kind:"champion", highlight:champion.team_name, text:`é campeã de ${champion.tournament_name}`, href:`/torneios/${champion.tournament_id}` } });
  }

  return dated.sort((a, b) => b.at - a.at).slice(0, limit).map((entry) => entry.item);
}

function time(value: string | null) {
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}
