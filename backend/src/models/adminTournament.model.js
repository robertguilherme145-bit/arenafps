import pool from "../config/database.js";

export async function findTournamentOverviewData(tournamentId) {
  const [[tournament]] = await pool.query("SELECT id, nome, status, inicio, fim, max_teams, titulares, reservas, valor, premiacao, banner, descricao, game, stream_url FROM tournaments WHERE id = ? LIMIT 1", [tournamentId]);
  if (!tournament) return null;
  const [[settings], [[maps]], [[entries]], [[matches]]] = await Promise.all([
    pool.query("SELECT format, best_of, pick_ban_enabled, registration_closes_at FROM tournament_competition_settings WHERE tournament_id = ? LIMIT 1", [tournamentId]).then(([rows]) => [rows[0] ?? null]),
    pool.query("SELECT COUNT(*) total FROM tournament_map_pool WHERE tournament_id = ?", [tournamentId]),
    pool.query("SELECT COUNT(*) total, SUM(status = 'confirmado') confirmed, SUM(payment_status NOT IN ('pago','aprovado','isento')) pending_payment FROM entries WHERE tournament_id = ? AND status <> 'cancelado'", [tournamentId]),
    pool.query("SELECT COUNT(*) total FROM matches WHERE tournament_id = ?", [tournamentId])
  ]);
  return {
    tournament,
    settings,
    mapCount:Number(maps.total),
    entries:{ total:Number(entries.total), confirmed:Number(entries.confirmed ?? 0), pending_payment:Number(entries.pending_payment ?? 0) },
    matchCount:Number(matches.total)
  };
}

// Desfaz um rascunho que nao terminou de ser criado. As tabelas filhas caem junto (ON DELETE CASCADE).
export async function deleteDraftTournament(tournamentId) {
  await pool.query("DELETE FROM tournaments WHERE id = ? AND status = 'criado'", [tournamentId]);
}

export async function setRegistrationClosesAt(tournamentId, closesAt) {
  await pool.query("UPDATE tournament_competition_settings SET registration_closes_at = ? WHERE tournament_id = ?", [closesAt, tournamentId]);
}

export async function findTournamentCopySource(tournamentId) {
  const [[tournament]] = await pool.query("SELECT * FROM tournaments WHERE id = ? LIMIT 1", [tournamentId]);
  if (!tournament) return null;
  const [[settings]] = await pool.query("SELECT * FROM tournament_competition_settings WHERE tournament_id = ? LIMIT 1", [tournamentId]);
  const [maps] = await pool.query("SELECT game_map_id FROM tournament_map_pool WHERE tournament_id = ?", [tournamentId]);
  const [[mix]] = await pool.query("SELECT payment_mode, price_per_player, team_count, players_per_team, team_labels FROM mix_tournament_settings WHERE tournament_id = ? LIMIT 1", [tournamentId]);
  return { tournament, settings:settings ?? null, mapIds:maps.map((row) => Number(row.game_map_id)), mix:mix ?? null };
}

export async function findTournamentsWithExpiredRegistration() {
  const [rows] = await pool.query(
    `SELECT t.id, t.nome,
       (SELECT COUNT(*) FROM entries e WHERE e.tournament_id = t.id AND e.status <> 'cancelado' AND e.payment_status NOT IN ('pago','aprovado','isento')) pending
     FROM tournaments t
     INNER JOIN tournament_competition_settings tcs ON tcs.tournament_id = t.id
     WHERE t.status = 'aberto' AND tcs.format <> 'mix_single_elimination'
       AND tcs.registration_closes_at IS NOT NULL AND tcs.registration_closes_at <= NOW()`
  );
  return rows.map((row) => ({ id:Number(row.id), nome:row.nome, pending:Number(row.pending) }));
}
