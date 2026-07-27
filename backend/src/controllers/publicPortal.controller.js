import { adminContacts, adminContent, getPortal, getPublicTeam, getPublicTournament, globalSearch, saveAdminContent, sendContact, updateAdminContact } from "../services/publicPortal.service.js";
export async function portal(req,res){return handle(res,()=>getPortal(req.query.game_id?Number(req.query.game_id):null));}
export async function search(req,res){return handle(res,()=>globalSearch(req.query.q,req.query.game_id?Number(req.query.game_id):null));}
export async function tournament(req,res){return handle(res,()=>getPublicTournament(Number(req.params.id)));}
export async function team(req,res){return handle(res,()=>getPublicTeam(req.params.slug));}
export async function content(req,res){return handle(res,()=>adminContent());}
export async function createContent(req,res){return handle(res,()=>saveAdminContent(req.user,null,req.body),201);}
export async function updateContent(req,res){return handle(res,()=>saveAdminContent(req.user,Number(req.params.id),req.body));}
export async function contact(req,res){return handle(res,()=>sendContact(req.body),201);}
export async function contacts(req,res){return handle(res,()=>adminContacts());}
export async function updateContact(req,res){return handle(res,()=>updateAdminContact(req.user,Number(req.params.id),req.body));}
async function handle(res,action,status=200){try{return res.status(status).json(await action());}catch(error){return res.status(error.status||400).json({erro:error.message});}}
