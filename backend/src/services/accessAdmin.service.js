import { listIdentityAccounts, replaceSelectedGames, replaceUserRoles } from "../models/identity.model.js";
import { resolveUserAccess } from "./identity.service.js";
import pool from "../config/database.js";
import { revokeAllUserSessions } from "../models/security.model.js";
import { createAuditLog } from "../models/auditLog.model.js";

const ALLOWED_ROLES = ["jogador","lider","capitao","admin"];
export async function listAccessAccounts() {
  return (await listIdentityAccounts()).map((item) => {
    const teamRoles=split(item.team_roles).map((value)=>{const [teamId,role]=value.split(":");return{team_id:Number(teamId),role};});
    const roles=new Set(split(item.roles));
    if(teamRoles.length)roles.add("jogador");
    if(teamRoles.some((entry)=>entry.role==="leader"))roles.add("lider");
    if(teamRoles.some((entry)=>entry.role==="captain"))roles.add("capitao");
    return { id:Number(item.id),nome:item.nome,email:item.email,nickname:item.nickname,avatar:item.avatar,
      email_verified:Boolean(item.email_verified_at),onboarding_completed:Boolean(item.onboarding_completed_at),
      roles:ALLOWED_ROLES.filter((role)=>roles.has(role)),game_ids:split(item.game_ids).map(Number),team_roles:teamRoles,
      banned_until:item.banned_until,banned_permanent:Boolean(item.banned_permanent),ban_reason:item.ban_reason,banned_at:item.banned_at,
      is_banned:Boolean(item.banned_permanent)||(item.banned_until&&new Date(item.banned_until).getTime()>Date.now()) };
  });
}
export async function banAccessAccount(admin,userId,payload) {
  if(Number(admin.id)===Number(userId)) throw new Error("Voce nao pode banir sua propria conta.");
  const permanent=payload.permanent===true;
  const until=permanent?null:new Date(payload.banned_until);
  if(!permanent&&(!Number.isFinite(until.getTime())||until.getTime()<=Date.now())) throw new Error("Informe uma data futura para o fim do banimento.");
  const reason=String(payload.reason||"").trim().slice(0,500);
  if(!reason)throw new Error("Informe o motivo do banimento.");
  const[result]=await pool.query(`UPDATE users SET banned_permanent=?,banned_until=?,ban_reason=?,banned_at=NOW(),banned_by=? WHERE id=?`,[permanent?1:0,until,reason,admin.id,userId]);
  if(!result.affectedRows)throw new Error("Conta nao encontrada.");
  await revokeAllUserSessions(userId);
  await createAuditLog({actor_user_id:admin.id,action:"account.banned",entity_type:"user",entity_id:userId,details:{permanent,banned_until:until,reason}});
  return {message:"Conta banida e sessoes encerradas."};
}
export async function unbanAccessAccount(admin,userId) {
  const[result]=await pool.query(`UPDATE users SET banned_permanent=0,banned_until=NULL,ban_reason=NULL,banned_at=NULL,banned_by=NULL WHERE id=?`,[userId]);
  if(!result.affectedRows)throw new Error("Conta nao encontrada.");
  await createAuditLog({actor_user_id:admin.id,action:"account.unbanned",entity_type:"user",entity_id:userId,details:null});
  return {message:"Banimento removido."};
}
export async function deleteAccessAccount(admin,userId) {
  if(Number(admin.id)===Number(userId))throw new Error("Voce nao pode excluir sua propria conta.");
  const[[usage]]=await pool.query(`SELECT (SELECT COUNT(*) FROM players WHERE user_id=?)+(SELECT COUNT(*) FROM team_members WHERE user_id=?)+(SELECT COUNT(*) FROM mix_registrations WHERE user_id=?) total`,[userId,userId,userId]);
  if(Number(usage.total)>0)throw new Error("Esta conta possui historico competitivo e nao pode ser excluida. Use o banimento para preservar resultados e auditoria.");
  try{const[result]=await pool.query(`DELETE FROM users WHERE id=?`,[userId]);if(!result.affectedRows)throw new Error("Conta nao encontrada.");}
  catch(error){if(error.code==="ER_ROW_IS_REFERENCED_2")throw new Error("Esta conta possui registros vinculados e nao pode ser excluida. Use o banimento.");throw error;}
  return {message:"Conta excluida definitivamente."};
}
export async function updateAccessAccount(admin,userId,payload) {
  const roles=[...new Set((Array.isArray(payload.roles)?payload.roles:[]).map(String).filter((role)=>ALLOWED_ROLES.includes(role)))];
  if(!roles.length) roles.push("jogador");
  if(Number(admin.id)===Number(userId)&&!roles.includes("admin")) throw new Error("Voce nao pode remover seu proprio acesso administrativo.");
  const games=[...new Set((Array.isArray(payload.game_ids)?payload.game_ids:[]).map(Number).filter(Number.isInteger))];
  await replaceUserRoles(userId,roles,admin.id);
  await replaceSelectedGames(userId,games,games.includes(Number(payload.primary_game_id))?Number(payload.primary_game_id):(games[0]??null));
  return await resolveUserAccess(userId,roles[0]);
}
function split(value){return String(value||"").split(",").filter(Boolean);}
