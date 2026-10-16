// Escolhe a partida do placar da home: ao vivo > agendada futura > agendada sem data
// de torneio em andamento. Sem candidatas, devolve null e a home esconde o placar.
export function pickFeaturedMatch(rows, now = new Date()) {
  const live = rows.filter((item) => item.status === "andamento").sort((a, b) => recency(b) - recency(a));
  if (live.length) return toFeatured(live[0], "ao_vivo");

  const scheduled = rows.filter((item) => item.status === "agendada");
  const upcoming = scheduled
    .filter((item) => item.scheduled_at && new Date(item.scheduled_at).getTime() > now.getTime())
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
  if (upcoming.length) return toFeatured(upcoming[0], "agendada");

  const undated = scheduled
    .filter((item) => !item.scheduled_at && item.tournament_status === "em_andamento")
    .sort((a, b) => Number(a.id) - Number(b.id));
  return undated.length ? toFeatured(undated[0], "agendada") : null;
}

function recency(item) {
  return item.updated_at ? new Date(item.updated_at).getTime() : Number(item.id);
}

function toFeatured(item, status) {
  return {
    id:Number(item.id),
    tournament_id:Number(item.tournament_id),
    tournament_name:item.tournament_name,
    status,
    team_a:{ name:item.team_a ?? "A definir", tag:item.team_a_tag ?? null, logo:item.team_a_logo ?? null },
    team_b:{ name:item.team_b ?? "A definir", tag:item.team_b_tag ?? null, logo:item.team_b_logo ?? null },
    score_a:Number(item.score_team_a ?? 0),
    score_b:Number(item.score_team_b ?? 0),
    map_name:item.current_map_name ?? null,
    map_number:item.current_map_number == null ? null : Number(item.current_map_number),
    best_of:item.best_of ?? null,
    scheduled_at:item.scheduled_at ? new Date(item.scheduled_at).toISOString() : null
  };
}
