import { resolveUserAccess, switchUserContext, updateUserGames } from "../services/identity.service.js";

export async function me(req, res) { return handle(res, () => resolveUserAccess(req.user.id, req.user.role)); }
export async function context(req, res) { return handle(res, () => switchUserContext(req.user, req.body)); }
export async function games(req, res) { return handle(res, () => updateUserGames(req.user, req.body)); }

async function handle(res, action, status = 200) { try { return res.status(status).json(await action()); } catch (error) { return res.status(error.status ?? 400).json({ erro: error.message }); } }
