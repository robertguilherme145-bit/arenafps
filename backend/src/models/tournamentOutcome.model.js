import pool from "../config/database.js";

export async function getTournamentOutcomeContext(tournamentId) {
  const [[tournament]] = await pool.query(`SELECT t.id,t.status,t.nome,tcs.format FROM tournaments t LEFT JOIN tournament_competition_settings tcs ON tcs.tournament_id=t.id WHERE t.id=?`, [tournamentId]);
  if (!tournament) return null;
  const [matches] = await pool.query(`SELECT * FROM matches WHERE tournament_id=? ORDER BY round,id`, [tournamentId]);
  const [[entries]] = await pool.query(`SELECT COUNT(*) confirmed FROM entries WHERE tournament_id=? AND status='confirmado'`, [tournamentId]);
  return { tournament, matches, confirmed_entries:Number(entries.confirmed) };
}

export async function saveTournamentOutcome({ tournament_id, champion_team_id, runner_up_team_id, final_match_id }) {
  await pool.query(`INSERT INTO tournament_results (tournament_id,champion_team_id,runner_up_team_id,final_match_id,decided_at) VALUES (?,?,?,?,NOW()) ON DUPLICATE KEY UPDATE champion_team_id=VALUES(champion_team_id),runner_up_team_id=VALUES(runner_up_team_id),final_match_id=VALUES(final_match_id),decided_at=VALUES(decided_at)`, [tournament_id,champion_team_id,runner_up_team_id,final_match_id]);
  await pool.query(`INSERT IGNORE INTO team_tournament_titles (team_id,tournament_id,game_id,title_type,awarded_at) SELECT ?,t.id,COALESCE(tcs.game_id,CAST(t.game AS UNSIGNED)),'champion',NOW() FROM tournaments t LEFT JOIN tournament_competition_settings tcs ON tcs.tournament_id=t.id WHERE t.id=?`, [champion_team_id,tournament_id]);
  await pool.query(`UPDATE tournaments SET status='finalizado' WHERE id=?`, [tournament_id]);
}
