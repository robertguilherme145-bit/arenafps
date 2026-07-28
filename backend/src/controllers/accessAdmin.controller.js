import { banAccessAccount, deleteAccessAccount, listAccessAccounts, unbanAccessAccount, updateAccessAccount } from "../services/accessAdmin.service.js";
export async function index(req,res){try{return res.json(await listAccessAccounts());}catch(error){return res.status(400).json({erro:error.message});}}
export async function update(req,res){try{return res.json(await updateAccessAccount(req.user,Number(req.params.id),req.body));}catch(error){return res.status(400).json({erro:error.message});}}
export async function ban(req,res){try{return res.json(await banAccessAccount(req.user,Number(req.params.id),req.body));}catch(error){return res.status(400).json({erro:error.message});}}
export async function unban(req,res){try{return res.json(await unbanAccessAccount(req.user,Number(req.params.id)));}catch(error){return res.status(400).json({erro:error.message});}}
export async function remove(req,res){try{return res.json(await deleteAccessAccount(req.user,Number(req.params.id)));}catch(error){return res.status(400).json({erro:error.message});}}
