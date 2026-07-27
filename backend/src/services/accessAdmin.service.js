import { listIdentityAccounts, replaceSelectedGames, replaceUserRoles } from "../models/identity.model.js";
import { resolveUserAccess } from "./identity.service.js";

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
      roles:ALLOWED_ROLES.filter((role)=>roles.has(role)),game_ids:split(item.game_ids).map(Number),team_roles:teamRoles };
  });
}
export async function updateAccessAccount(admin,userId,payload) {
  const roles=[...new Set((Array.isArray(payload.roles)?payload.roles:[]).map(String).filter((role)=>ALLOWED_ROLES.includes(role)))];
  if(!roles.length) roles.push("jogador");
  if(Number(admin.id)===Number(userId)&&!roles.includes("admin")) throw new Error("Voce nao pode remover seu proprio acesso administrativo.");
  const games=[...new Set((Array.isArray(payload.game_ids)?payload.game_ids:[]).map(Number).filter(Number.isInteger))];
  await replaceUserRoles(userId,roles,admin.id);
  if(games.length) await replaceSelectedGames(userId,games,games.includes(Number(payload.primary_game_id))?Number(payload.primary_game_id):games[0]);
  return await resolveUserAccess(userId,roles[0]);
}
function split(value){return String(value||"").split(",").filter(Boolean);}
