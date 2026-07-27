import { createContactMessage, findPortalSnapshot, findPublicTeamProfile, findPublicTournamentCenter, listContactMessages, listPublicContentAdmin, savePublicContentAdmin, searchPortal, updateContactMessage } from "../models/publicPortal.model.js";
import { getTournamentTeamRanking } from "./ranking.service.js";

export async function getPortal(gameId) {
  const data = await findPortalSnapshot(gameId || null);
  return {
    ...data,
    stats:Object.fromEntries(Object.entries(data.stats).map(([key,value]) => [key,Number(value || 0)])),
    games:data.games.map(numbers), tournaments:data.tournaments.map(numbers), results:data.results.map(numbers),
    players:data.players.map((item) => ({ ...numbers(item), kd:ratio(item.kills,item.deaths), hs_percent:percent(item.headshots,item.kills), win_rate:percent(item.wins,item.matches) })),
    teams:data.teams.map((item) => ({ ...numbers(item), losses:Math.max(0,Number(item.matches)-Number(item.wins)), win_rate:percent(item.wins,item.matches) })),
    content:groupContent(data.content)
  };
}
export async function globalSearch(query, gameId) { if (String(query || "").trim().length < 2) return []; return await searchPortal(query, gameId || null); }
export async function getPublicTournament(tournamentId) { const center=await findPublicTournamentCenter(tournamentId); if(!center.tournament){const error=new Error("Torneio nao encontrado.");error.status=404;throw error;} return { ...center, standings:await getTournamentTeamRanking(tournamentId) }; }
export async function getPublicTeam(slug) { const profile=await findPublicTeamProfile(String(slug||"").trim()); if(!profile){const error=new Error("Equipe nao encontrada.");error.status=404;throw error;} return profile; }
export async function adminContent() { return await listPublicContentAdmin(); }
export async function saveAdminContent(user,id,payload) { const input=validateContent(payload); const savedId=await savePublicContentAdmin(id,user.id,input); return (await listPublicContentAdmin()).find((item)=>Number(item.id)===savedId); }
export async function sendContact(payload){const name=required(payload.name,"Informe seu nome.",120);const email=required(payload.email,"Informe seu email.",255);if(!/^\S+@\S+\.\S+$/.test(email))throw new Error("Informe um email valido.");const subject=required(payload.subject,"Informe o assunto.",180);const message=required(payload.message,"Escreva sua mensagem.",5000);const id=await createContactMessage({name,email,subject,message});return{id,mensagem:"Mensagem recebida. Nossa equipe respondera pelo email informado."};}
export async function adminContacts(){return await listContactMessages();}
export async function updateAdminContact(user,id,payload){const status=["novo","em_atendimento","respondido","arquivado"].includes(payload.status)?payload.status:"em_atendimento";await updateContactMessage(id,user.id,{status,admin_notes:optional(payload.admin_notes,5000)});return(await listContactMessages()).find((item)=>Number(item.id)===Number(id));}
function validateContent(payload){const type=["noticia","parceiro","depoimento","faq"].includes(payload.type)?payload.type:null;if(!type)throw new Error("Tipo de conteudo invalido.");const title=String(payload.title||"").trim().slice(0,180);if(!title)throw new Error("Informe o titulo.");return{type,title,subtitle:optional(payload.subtitle,255),body:optional(payload.body,10000),image_url:optional(payload.image_url,500),link_url:optional(payload.link_url,500),author_name:optional(payload.author_name,120),sort_order:Number(payload.sort_order||0),published:payload.published!==false,published_at:payload.published_at?new Date(payload.published_at):new Date()};}
function groupContent(rows){return rows.reduce((all,item)=>{const key=item.type==="noticia"?"news":item.type==="parceiro"?"partners":item.type==="depoimento"?"testimonials":"faq";(all[key]??=[]).push(item);return all;},{news:[],partners:[],testimonials:[],faq:[]});}
function numbers(item){const copy={...item};for(const key of ["id","game_id","entry_count","tournament_count","open_count","live_count","matches","wins","kills","deaths","assists","headshots","mvps","members"])if(copy[key]!==undefined)copy[key]=Number(copy[key]||0);return copy;}
function ratio(a,b){return Number(b)?Number((Number(a)/Number(b)).toFixed(2)):Number(a||0);}
function percent(a,b){return Number(b)?Number((Number(a)/Number(b)*100).toFixed(1)):0;}
function optional(value,max){const text=String(value||"").trim();return text?text.slice(0,max):null;}
function required(value,message,max){const text=String(value||"").trim();if(!text)throw new Error(message);return text.slice(0,max);}
