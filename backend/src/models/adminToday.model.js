import pool from "../config/database.js";

// Dados crus da fila "Hoje". Somente leitura; cada lista tem limite para a tela continuar leve.
export async function findTodayData() {
  const [
    [disputes],
    [payments],
    [matches],
    [tickets],
    [[contacts]],
    [tournaments],
    [[numbers]]
  ] = await Promise.all([
    pool.query(
      `SELECT d.id, d.title, d.match_id, t.nome AS tournament_name
       FROM disputes d LEFT JOIN tournaments t ON t.id = d.tournament_id
       WHERE d.status IN ('aberta','em_analise') ORDER BY d.created_at ASC LIMIT 10`
    ),
    pool.query(
      `SELECT p.id, p.created_at, tm.nome AS team_name
       FROM payments p
       INNER JOIN entries e ON e.id = p.entry_id
       INNER JOIN teams tm ON tm.id = e.team_id
       WHERE p.status = 'pendente' AND p.created_at >= NOW() - INTERVAL 3 DAY
       ORDER BY p.created_at ASC LIMIT 20`
    ),
    pool.query(
      `SELECT m.id, m.scheduled_at, ta.nome AS team_a, tb.nome AS team_b, t.nome AS tournament_name
       FROM matches m
       INNER JOIN tournaments t ON t.id = m.tournament_id
       LEFT JOIN teams ta ON ta.id = m.team_a_id
       LEFT JOIN teams tb ON tb.id = m.team_b_id
       LEFT JOIN match_competition_settings mcs ON mcs.match_id = m.id
       LEFT JOIN match_discord_rooms mdr ON mdr.match_id = m.id AND mdr.status = 'ativo'
       WHERE m.status = 'agendada'
         AND m.scheduled_at IS NOT NULL
         AND m.scheduled_at BETWEEN NOW() - INTERVAL 1 DAY AND NOW() + INTERVAL 1 DAY
         AND (mcs.server_address IS NULL OR mcs.server_address = '')
         AND mdr.match_id IS NULL
       ORDER BY m.scheduled_at ASC LIMIT 10`
    ),
    pool.query("SELECT id, priority FROM support_tickets WHERE status IN ('aberto','em_analise') LIMIT 200"),
    pool.query("SELECT COUNT(*) total FROM public_contact_messages WHERE status = 'novo'"),
    pool.query(
      `SELECT t.id, t.nome, t.status,
         (SELECT COUNT(*) FROM entries e WHERE e.tournament_id = t.id AND e.status = 'pendente') pending_entries,
         (SELECT COUNT(*) FROM matches m WHERE m.tournament_id = t.id) match_count
       FROM tournaments t
       WHERE t.status IN ('criado','aberto','fechado')
       ORDER BY t.inicio ASC LIMIT 20`
    ),
    pool.query(
      `SELECT
         (SELECT COUNT(*) FROM matches WHERE DATE(scheduled_at) = CURDATE()) matches_today,
         (SELECT COUNT(*) FROM matches WHERE status = 'andamento') live_matches,
         (SELECT COUNT(*) FROM entries WHERE DATE(rules_accepted_at) = CURDATE()) registrations_today,
         (SELECT COALESCE(SUM(valor), 0) FROM payments WHERE status = 'aprovado' AND DATE(paid_at) = CURDATE()) revenue_today`
    )
  ]);
  return { disputes, payments, matches, tickets, contacts:Number(contacts.total), tournaments, numbers };
}
