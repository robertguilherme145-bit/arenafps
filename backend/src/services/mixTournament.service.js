import crypto from "node:crypto";
import pool from "../config/database.js";
import { findUserById, findUserIdsByRole } from "../models/user.model.js";
import { createMixPaymentRecord, findMixPaymentByGateway, getMixTournament, listAvailableMixTournaments, reconcileMixPayment, registerMixPlayer, saveMixSettings, cancelMixRegistration } from "../models/mixTournament.model.js";
import { createPixPayment, getPayment } from "./mercadopago.service.js";
import { normalizeGatewayPaymentStatus, preparePixData, resolvePaymentStatusTransition } from "../utils/pix.js";
import { notify } from "./notification.service.js";

const DEFAULT_TEAMS = [
  ["Vermelha","#ef4444"],["Azul","#3b82f6"],["Verde","#22c55e"],["Amarela","#eab308"],
  ["Roxa","#a855f7"],["Laranja","#f97316"],["Rosa","#ec4899"],["Ciano","#06b6d4"],
  ["Branca","#e5e7eb"],["Preta","#374151"],["Prata","#94a3b8"],["Dourada","#f59e0b"],
  ["Lima","#84cc16"],["Indigo","#6366f1"],["Coral","#fb7185"],["Turquesa","#14b8a6"]
];

export async function configureMixTournament(tournamentId, payload) {
  const [[current]] = await pool.query(`SELECT ms.draw_status,(SELECT COUNT(*) FROM mix_registrations mr WHERE mr.tournament_id=ms.tournament_id AND mr.status<>'cancelled') registrations FROM mix_tournament_settings ms WHERE ms.tournament_id=?`,[tournamentId]);
  if(current&&(current.draw_status!=="pending"||Number(current.registrations)>0))throw new Error("Modelo e valor nao podem ser alterados depois da primeira inscricao.");
  const teamCount = Number(payload.team_count);
  const playersPerTeam = Number(payload.players_per_team);
  if (![2,4,8,16].includes(teamCount)) throw new Error("O Mix aceita 2, 4, 8 ou 16 equipes.");
  if (!Number.isInteger(playersPerTeam) || playersPerTeam < 1 || playersPerTeam > 10) throw new Error("Jogadores por equipe deve ficar entre 1 e 10.");
  if (!['free','paid'].includes(payload.payment_mode)) throw new Error("Modelo de pagamento invalido.");
  const price = payload.payment_mode === 'free' ? 0 : Number(payload.price_per_player);
  if (payload.payment_mode === 'paid' && (!Number.isFinite(price) || price <= 0)) throw new Error("Informe o valor por jogador.");
  const labels = Array.from({length:teamCount},(_,index) => ({ name:String(payload.team_labels?.[index]?.name || `Equipe ${DEFAULT_TEAMS[index][0]}`).trim(), color:String(payload.team_labels?.[index]?.color || DEFAULT_TEAMS[index][1]) }));
  return saveMixSettings(tournamentId,{ payment_mode:payload.payment_mode,price_per_player:price,max_players:teamCount*playersPerTeam,players_per_team:playersPerTeam,team_count:teamCount,team_labels:labels });
}

export async function availableMixTournaments(userId) { return listAvailableMixTournaments(userId); }
export async function mixTournamentDetails(tournamentId, userId, admin = false) { const data=await getMixTournament(tournamentId,admin?null:userId);if(!data)throw new Error("Torneio Mix nao encontrado.");return data; }
export async function joinMixTournament(tournamentId,userId) {
  const [[eligible]] = await pool.query(`SELECT 1 FROM mix_tournament_settings ms INNER JOIN tournaments t ON t.id=ms.tournament_id INNER JOIN user_games ug ON ug.game_id=CAST(t.game AS UNSIGNED) AND ug.user_id=? WHERE ms.tournament_id=?`,[userId,tournamentId]);
  if(!eligible) throw new Error("Adicione este jogo ao seu perfil antes de participar.");
  return registerMixPlayer(tournamentId,userId);
}
export async function leaveMixTournament(tournamentId,userId){await cancelMixRegistration(tournamentId,userId);return{mensagem:"Inscricao cancelada."};}
export async function updateMixRegistrationAdmin(tournamentId,registrationId,payload){const status=String(payload.status);if(!["confirmed","cancelled","waitlist"].includes(status))throw new Error("Status administrativo invalido.");const[[mix]]=await pool.query(`SELECT draw_status,payment_mode FROM mix_tournament_settings WHERE tournament_id=?`,[tournamentId]);if(!mix||mix.draw_status!=="pending")throw new Error("O sorteio ja foi realizado.");const paymentStatus=status==="confirmed"?(mix.payment_mode==="free"?"free":"paid"):status==="cancelled"?"failed":"pending";const[result]=await pool.query(`UPDATE mix_registrations SET status=?,payment_status=? WHERE id=? AND tournament_id=?`,[status,paymentStatus,registrationId,tournamentId]);if(!result.affectedRows)throw new Error("Inscricao Mix nao encontrada.");return getMixTournament(tournamentId);}

export async function createMixPix(tournamentId,userId) {
  const mix=await getMixTournament(tournamentId); if(!mix)throw new Error("Torneio Mix nao encontrado."); if(mix.payment_mode!=="paid")throw new Error("Este Mix possui inscricao gratuita.");
  const registration=mix.registrations.find(item=>Number(item.user_id)===Number(userId)); if(!registration)throw new Error("Inscricao nao encontrada."); if(registration.status==='waitlist')throw new Error("Jogadores na lista de espera nao realizam pagamento."); if(registration.payment_id)throw new Error("O PIX desta inscricao ja foi gerado.");
  const user=await findUserById(userId); if(!user?.cpf)throw new Error("Informe seu CPF no perfil antes de gerar o PIX.");
  const pix=await createPixPayment({valor:mix.price_per_player,descricao:`Arena Camp | Jogador: ${String(user.nickname||user.nome).slice(0,80)} | Mix: ${String(mix.nome).slice(0,120)}`.slice(0,255),email:user.email,cpf:user.cpf,externalReference:`MIX_${registration.id}`});
  const prepared=await preparePixData(pix);const status=normalizeGatewayPaymentStatus(pix.status);const saved=await createMixPaymentRecord(registration.id,{payment_id:pix.id,external_reference:pix.external_reference,status,valor:pix.transaction_amount,...prepared});return saved;
}

export async function processMixGatewayPayment(gatewayPayment) {
  const local=await findMixPaymentByGateway(gatewayPayment.id)??await findMixPaymentByGateway(gatewayPayment.external_reference);if(!local)return null;
  if(String(local.external_reference)!==String(gatewayPayment.external_reference)||Math.abs(Number(local.valor)-Number(gatewayPayment.transaction_amount))>.001)throw new Error("O pagamento Mix nao corresponde ao registro local.");
  const status=resolvePaymentStatusTransition(local.status,gatewayPayment.status);const result=await reconcileMixPayment(local.id,{payment_id:gatewayPayment.id,status,paid_at:status==='aprovado'?new Date(gatewayPayment.date_approved||Date.now()):null});
  if(status==='aprovado'&&result.status_changed){const admins=await findUserIdsByRole('admin');await Promise.all([notify({user_id:result.user_id,titulo:"Pagamento do Mix confirmado",mensagem:`Sua inscricao em ${local.tournament_name} esta confirmada.`,tipo:"mix_payment",link:"/jogador?module=mix"}),...admins.map(id=>notify({user_id:id,titulo:"Pagamento Mix confirmado",mensagem:`${local.player_name} pagou a inscricao de ${local.tournament_name}.`,tipo:"mix_payment",link:"/admin?module=competitions",dedupe_key:`mix-payment:${local.id}:admin:${id}`}))]);}
  return result;
}

export async function reconcileMixByPaymentId(paymentId){return processMixGatewayPayment(await getPayment(paymentId));}

export async function drawMixTournament(tournamentId,adminId) {
  const connection=await pool.getConnection();
  try {await connection.beginTransaction();const [[mix]]=await connection.query(`SELECT ms.*,t.nome,t.game,t.status tournament_status FROM mix_tournament_settings ms INNER JOIN tournaments t ON t.id=ms.tournament_id WHERE ms.tournament_id=? FOR UPDATE`,[tournamentId]);if(!mix)throw new Error("Torneio Mix nao encontrado.");if(mix.draw_status!=="pending")throw new Error("O sorteio ja foi realizado.");
    const [players]=await connection.query(`SELECT mr.id registration_id,mr.user_id,u.nome,u.nickname,u.avatar FROM mix_registrations mr INNER JOIN users u ON u.id=mr.user_id WHERE mr.tournament_id=? AND mr.status='confirmed' ORDER BY mr.id`,[tournamentId]);
    if(players.length!==Number(mix.max_players))throw new Error(`O sorteio exige ${mix.max_players} jogadores confirmados. Confirmados: ${players.length}.`);
    const [maps]=await connection.query(`SELECT gmp.game_map_id FROM tournament_map_pool gmp INNER JOIN game_maps gm ON gm.id=gmp.game_map_id WHERE gmp.tournament_id=? AND gm.ativo=1`,[tournamentId]);if(!maps.length)throw new Error("Cadastre ao menos um mapa no map pool.");
    const labels=parseLabels(mix.team_labels,mix.team_count);const shuffled=shuffle(players);const teamIds=[];
    for(let index=0;index<Number(mix.team_count);index++){const label=labels[index];const slug=`mix-${tournamentId}-${index+1}`;const[result]=await connection.query(`INSERT INTO teams (game_id,creator_id,nome,tag,slug,descricao,recrutando,privada,ativo) VALUES (?,?,?,?,?,'Equipe temporaria gerada pelo Mix',0,1,1)`,[Number(mix.game),adminId,label.name,`M${index+1}`,slug]);const teamId=result.insertId;teamIds.push(teamId);await connection.query(`INSERT INTO mix_generated_teams (tournament_id,team_id,color_name,color_hex,seed_number) VALUES (?,?,?,?,?)`,[tournamentId,teamId,label.name,label.color,index+1]);const[entry]=await connection.query(`INSERT INTO entries (tournament_id,team_id,status,payment_status,rules_accepted_at) VALUES (?,?,'confirmado','pago',NOW())`,[tournamentId,teamId]);const members=shuffled.slice(index*mix.players_per_team,(index+1)*mix.players_per_team);for(let order=0;order<members.length;order++){const member=members[order];const[p]=await connection.query(`INSERT INTO players (team_id,user_id,nick,game,foto,status) VALUES (?,?,?,?,?,'ativo')`,[teamId,member.user_id,member.nickname||member.nome,String(mix.game),member.avatar]);await connection.query(`INSERT INTO entry_players (entry_id,player_id,titular,ordem,confirmado) VALUES (?,?,1,?,1)`,[entry.insertId,p.insertId,order+1]);await connection.query(`UPDATE mix_registrations SET status='assigned',assigned_team_id=? WHERE id=?`,[teamId,member.registration_id]);}}
    const seeds=shuffle(teamIds);for(let i=0;i<seeds.length;i+=2)await createMixMatch(connection,tournamentId,1,seeds[i],seeds[i+1],maps);
    await connection.query(`UPDATE mix_tournament_settings SET draw_status='completed',drawn_at=NOW(),drawn_by=? WHERE tournament_id=?`,[adminId,tournamentId]);await connection.query(`UPDATE tournaments SET status='em_andamento' WHERE id=?`,[tournamentId]);await connection.commit();
    const [assigned]=await pool.query(`SELECT mr.user_id,t.nome team_name FROM mix_registrations mr INNER JOIN teams t ON t.id=mr.assigned_team_id WHERE mr.tournament_id=?`,[tournamentId]);await Promise.all(assigned.map(item=>notify({user_id:item.user_id,titulo:"Equipes do Mix sorteadas",mensagem:`Voce caiu na ${item.team_name}.`,tipo:"mix_draw",link:`/torneios/${tournamentId}`})));return getMixTournament(tournamentId);
  }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}

export async function advanceMixBracket(match) {
  const [[mix]]=await pool.query(`SELECT * FROM mix_tournament_settings WHERE tournament_id=? AND draw_status='completed'`,[match.tournament_id]);if(!mix)return false;
  const [roundMatches]=await pool.query(`SELECT * FROM matches WHERE tournament_id=? AND round=? ORDER BY id`,[match.tournament_id,match.round]);if(roundMatches.some(item=>item.status!=='finalizada'))return false;
  const winners=roundMatches.map(item=>Number(item.winner_team_id)).filter(Boolean);if(winners.length<=1)return true;
  const [[nextExists]]=await pool.query(`SELECT id FROM matches WHERE tournament_id=? AND round=? LIMIT 1`,[match.tournament_id,Number(match.round)+1]);if(nextExists)return true;
  const [maps]=await pool.query(`SELECT game_map_id FROM tournament_map_pool WHERE tournament_id=?`,[match.tournament_id]);const connection=await pool.getConnection();try{await connection.beginTransaction();for(let i=0;i<winners.length;i+=2)await createMixMatch(connection,match.tournament_id,Number(match.round)+1,winners[i],winners[i+1],maps);await connection.commit();}catch(error){await connection.rollback();throw error;}finally{connection.release();}return true;
}

async function createMixMatch(connection,tournamentId,round,teamA,teamB,maps){const[result]=await connection.query(`INSERT INTO matches (tournament_id,round,team_a_id,team_b_id,status) VALUES (?,?,?,?,'agendada')`,[tournamentId,round,teamA,teamB]);const map=maps[crypto.randomInt(maps.length)].game_map_id;await connection.query(`INSERT INTO match_competition_settings (match_id,best_of,pick_ban_enabled) VALUES (?,'bo1',0)`,[result.insertId]);await connection.query(`INSERT INTO match_maps (match_id,game_map_id,map_number,selection_type,status) VALUES (?,?,1,'decider','pendente')`,[result.insertId,map]);}
function shuffle(items){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=crypto.randomInt(i+1);[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
function parseLabels(value,count){try{const parsed=typeof value==='string'?JSON.parse(value):value;if(Array.isArray(parsed)&&parsed.length>=count)return parsed;}catch{}return DEFAULT_TEAMS.slice(0,count).map(([color,hex])=>({name:`Equipe ${color}`,color:hex}));}
