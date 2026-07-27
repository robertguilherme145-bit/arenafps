import { listAccessAccounts, updateAccessAccount } from "../services/accessAdmin.service.js";
export async function index(req,res){try{return res.json(await listAccessAccounts());}catch(error){return res.status(400).json({erro:error.message});}}
export async function update(req,res){try{return res.json(await updateAccessAccount(req.user,Number(req.params.id),req.body));}catch(error){return res.status(400).json({erro:error.message});}}
