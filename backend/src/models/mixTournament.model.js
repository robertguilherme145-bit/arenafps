import pool from "../config/database.js";

export async function saveMixSettings(tournamentId, data) {
  await pool.query(`INSERT INTO mix_tournament_settings
    (tournament_id,payment_mode,price_per_player,max_players,players_per_team,team_count,team_labels)
    VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE payment_mode=VALUES(payment_mode),price_per_player=VALUES(price_per_player),max_players=VALUES(max_players),players_per_team=VALUES(players_per_team),team_count=VALUES(team_count),team_labels=VALUES(team_labels)`,
    [tournamentId,data.payment_mode,data.price_per_player,data.max_players,data.players_per_team,data.team_count,JSON.stringify(data.team_labels)]);
  return getMixTournament(tournamentId);
}

export async function getMixTournament(tournamentId, userId = null) {
  const [[settings]] = await pool.query(`SELECT ms.*,t.nome,t.descricao,t.status tournament_status,t.game,t.inicio,t.fim,t.banner,t.premiacao,g.nome game_name,
    (SELECT COUNT(*) FROM mix_registrations mr WHERE mr.tournament_id=t.id AND mr.status<>'cancelled') registered_players,
    (SELECT COUNT(*) FROM mix_registrations mr WHERE mr.tournament_id=t.id AND mr.status IN ('confirmed','assigned')) confirmed_players
    FROM mix_tournament_settings ms INNER JOIN tournaments t ON t.id=ms.tournament_id LEFT JOIN games g ON g.id=CAST(t.game AS UNSIGNED) WHERE ms.tournament_id=?`, [tournamentId]);
  if (!settings) return null;
  const [teams] = await pool.query(`SELECT mgt.*,t.nome,t.tag,t.logo FROM mix_generated_teams mgt INNER JOIN teams t ON t.id=mgt.team_id WHERE mgt.tournament_id=? ORDER BY mgt.seed_number`, [tournamentId]);
  const [registrations] = await pool.query(`SELECT mr.id,mr.user_id,mr.status,mr.payment_status,mr.assigned_team_id,mr.created_at,u.nome,u.nickname,u.avatar,mp.id payment_id,mp.status gateway_status,mp.valor,mp.qr_code,mp.qr_code_base64,mp.copia_cola
    FROM mix_registrations mr INNER JOIN users u ON u.id=mr.user_id LEFT JOIN mix_payments mp ON mp.registration_id=mr.id WHERE mr.tournament_id=? ORDER BY mr.created_at`, [tournamentId]);
  return { ...settings, teams, registrations:userId ? registrations.filter((item) => Number(item.user_id) === Number(userId)) : registrations };
}

export async function listAvailableMixTournaments(userId) {
  const [rows] = await pool.query(`SELECT ms.*,t.nome,t.descricao,t.status tournament_status,t.inicio,t.fim,t.banner,t.premiacao,g.nome game_name,mr.id registration_id,mr.status registration_status,mr.payment_status,mp.qr_code_base64,mp.copia_cola,mp.status gateway_status,
    (SELECT COUNT(*) FROM mix_registrations c WHERE c.tournament_id=t.id AND c.status<>'cancelled') registered_players,
    (SELECT COUNT(*) FROM mix_registrations c WHERE c.tournament_id=t.id AND c.status IN ('confirmed','assigned')) confirmed_players
    FROM mix_tournament_settings ms INNER JOIN tournaments t ON t.id=ms.tournament_id LEFT JOIN games g ON g.id=CAST(t.game AS UNSIGNED) LEFT JOIN mix_registrations mr ON mr.tournament_id=t.id AND mr.user_id=? LEFT JOIN mix_payments mp ON mp.registration_id=mr.id ORDER BY t.inicio`, [userId]);
  return rows;
}

export async function registerMixPlayer(tournamentId, userId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[mix]] = await connection.query(`SELECT ms.*,t.status tournament_status FROM mix_tournament_settings ms INNER JOIN tournaments t ON t.id=ms.tournament_id WHERE ms.tournament_id=? FOR UPDATE`, [tournamentId]);
    if (!mix) throw new Error("Torneio Mix nao encontrado.");
    if (mix.draw_status !== "pending") throw new Error("O sorteio deste Mix ja foi realizado.");
    if (!["criado","aberto"].includes(mix.tournament_status)) throw new Error("As inscricoes deste Mix nao estao abertas.");
    const [[existing]] = await connection.query(`SELECT * FROM mix_registrations WHERE tournament_id=? AND user_id=?`, [tournamentId,userId]);
    if (existing && existing.status !== "cancelled") throw new Error("Voce ja esta inscrito neste Mix.");
    const [[count]] = await connection.query(`SELECT COUNT(*) total FROM mix_registrations WHERE tournament_id=? AND status IN ('pending_payment','confirmed','assigned')`, [tournamentId]);
    const full = Number(count.total) >= Number(mix.max_players);
    const status = full ? "waitlist" : mix.payment_mode === "free" ? "confirmed" : "pending_payment";
    const paymentStatus = mix.payment_mode === "free" ? "free" : "pending";
    let id;
    if (existing) {
      await connection.query(`UPDATE mix_registrations SET status=?,payment_status=?,assigned_team_id=NULL,rules_accepted_at=NOW() WHERE id=?`, [status,paymentStatus,existing.id]); id=existing.id;
    } else {
      const [result] = await connection.query(`INSERT INTO mix_registrations (tournament_id,user_id,status,payment_status,rules_accepted_at) VALUES (?,?,?,?,NOW())`, [tournamentId,userId,status,paymentStatus]); id=result.insertId;
    }
    await connection.commit(); return { id,status,payment_status:paymentStatus,payment_required:mix.payment_mode === "paid" && !full };
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

export async function cancelMixRegistration(tournamentId, userId) {
  const [result] = await pool.query(`UPDATE mix_registrations mr INNER JOIN mix_tournament_settings ms ON ms.tournament_id=mr.tournament_id SET mr.status='cancelled' WHERE mr.tournament_id=? AND mr.user_id=? AND ms.draw_status='pending' AND NOT EXISTS (SELECT 1 FROM mix_payments mp WHERE mp.registration_id=mr.id AND mp.status IN ('pendente','aprovado'))`, [tournamentId,userId]);
  if (!result.affectedRows) throw new Error("Inscricoes com PIX gerado ou sorteio concluido precisam de atendimento administrativo.");
}

export async function findMixPaymentByGateway(value) {
  const [rows] = await pool.query(`SELECT mp.*,mr.tournament_id,mr.user_id,t.nome tournament_name,u.nome player_name FROM mix_payments mp INNER JOIN mix_registrations mr ON mr.id=mp.registration_id INNER JOIN tournaments t ON t.id=mr.tournament_id INNER JOIN users u ON u.id=mr.user_id WHERE mp.payment_id=? OR mp.external_reference=? LIMIT 1`, [String(value),String(value)]);
  return rows[0];
}

export async function findPendingMixPayments(limit = 50) {
  const safeLimit=Math.min(Math.max(Number(limit)||50,1),200);
  const [rows]=await pool.query(`SELECT * FROM mix_payments WHERE status='pendente' AND payment_id IS NOT NULL ORDER BY created_at LIMIT ?`,[safeLimit]);
  return rows;
}

export async function createMixPaymentRecord(registrationId, data) {
  const [result] = await pool.query(`INSERT INTO mix_payments (registration_id,payment_id,external_reference,status,valor,qr_code,qr_code_base64,copia_cola) VALUES (?,?,?,?,?,?,?,?)`, [registrationId,String(data.payment_id),data.external_reference,data.status,data.valor,data.qr_code,data.qr_code_base64,data.copia_cola]);
  return { id:result.insertId,...data };
}

export async function reconcileMixPayment(id, data) {
  const connection = await pool.getConnection();
  try { await connection.beginTransaction(); const [[current]] = await connection.query(`SELECT mp.*,mr.user_id,mr.tournament_id FROM mix_payments mp INNER JOIN mix_registrations mr ON mr.id=mp.registration_id WHERE mp.id=? FOR UPDATE`, [id]); if(!current) throw new Error("Pagamento Mix nao encontrado.");
    await connection.query(`UPDATE mix_payments SET payment_id=?,status=?,paid_at=? WHERE id=?`, [String(data.payment_id),data.status,data.paid_at,id]);
    await connection.query(`UPDATE mix_registrations SET payment_status=?,status=CASE WHEN ?='aprovado' THEN 'confirmed' WHEN status='assigned' THEN status ELSE 'pending_payment' END WHERE id=?`, [data.status==='aprovado'?'paid':data.status==='pendente'?'pending':'failed',data.status,current.registration_id]);
    await connection.commit(); return {...current,previous_status:current.status,status:data.status,status_changed:current.status!==data.status};
  } catch(error){await connection.rollback();throw error;} finally{connection.release();}
}

export { pool as mixPool };
