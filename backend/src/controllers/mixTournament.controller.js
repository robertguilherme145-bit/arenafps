import { availableMixTournaments, configureMixTournament, createMixPix, drawMixTournament, joinMixTournament, leaveMixTournament, mixTournamentDetails, updateMixRegistrationAdmin } from "../services/mixTournament.service.js";

export async function configure(req,res){return handle(res,()=>configureMixTournament(Number(req.params.id),req.body));}
export async function draw(req,res){return handle(res,()=>drawMixTournament(Number(req.params.id),Number(req.user.id)));}
export async function adminDetails(req,res){return handle(res,()=>mixTournamentDetails(Number(req.params.id),req.user.id,true));}
export async function index(req,res){return handle(res,()=>availableMixTournaments(req.user.id));}
export async function details(req,res){return handle(res,()=>mixTournamentDetails(Number(req.params.id),req.user.id));}
export async function join(req,res){return handle(res,()=>joinMixTournament(Number(req.params.id),req.user.id),201);}
export async function leave(req,res){return handle(res,()=>leaveMixTournament(Number(req.params.id),req.user.id));}
export async function payment(req,res){return handle(res,()=>createMixPix(Number(req.params.id),req.user.id),201);}
export async function adminRegistration(req,res){return handle(res,()=>updateMixRegistrationAdmin(Number(req.params.id),Number(req.params.registrationId),req.body));}
async function handle(res,action,status=200){try{return res.status(status).json(await action());}catch(error){return res.status(error.status||400).json({erro:error.message});}}
