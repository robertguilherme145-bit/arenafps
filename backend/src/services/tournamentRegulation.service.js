import pool from "../config/database.js";
import { notify } from "./notification.service.js";

const FORMAT_LABELS = {
  single_elimination: "Eliminacao simples",
  double_elimination: "Eliminacao dupla",
  swiss: "Sistema suico",
  round_robin: "Todos contra todos",
  league: "Liga",
  group_playoffs: "Grupos e eliminatorias",
  mix_single_elimination: "Mix em eliminacao simples",
  custom: "Formato personalizado"
};

export function buildTournamentRegulationSummary(tournament) {
  const format = FORMAT_LABELS[tournament.format] || tournament.format || "Formato definido pela organizacao";
  const series = String(tournament.best_of || "bo3").toUpperCase();
  return `${format}, serie ${series}. Cada vitoria vale 3 pontos. Partidas encerradas antes do ultimo mapa mantem apenas os mapas realmente jogados. Desempates: pontos, confronto direto, aproveitamento e saldo medio por mapa jogado.`;
}

export async function notifyTournamentRegulationToTeam(tournamentId, teamId) {
  const [[tournament]] = await pool.query(
    `SELECT t.id, t.nome, tcs.format, COALESCE(tcs.best_of, 'bo3') best_of
     FROM tournaments t
     LEFT JOIN tournament_competition_settings tcs ON tcs.tournament_id=t.id
     WHERE t.id=? LIMIT 1`,
    [tournamentId]
  );
  if (!tournament) return;

  const [recipients] = await pool.query(
    `SELECT DISTINCT recipient.user_id
     FROM (
       SELECT user_id FROM team_members WHERE team_id=? AND status='ativo'
       UNION
       SELECT creator_id AS user_id FROM teams WHERE id=?
     ) recipient
     WHERE recipient.user_id IS NOT NULL`,
    [teamId, teamId]
  );
  const summary = buildTournamentRegulationSummary(tournament);
  await Promise.all(recipients.map(({ user_id }) => notify({
    user_id,
    titulo: `Regulamento confirmado: ${tournament.nome}`,
    mensagem: `${summary} O regulamento completo permanece disponivel na central do torneio.`,
    tipo: "tournament_regulation",
    link: `/torneios/${tournament.id}?tab=rules`,
    dedupe_key: `tournament-regulation:${tournament.id}:team:${teamId}:user:${user_id}`
  })));
}
