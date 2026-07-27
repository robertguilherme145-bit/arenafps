import { createAchievement, listAchievements, updateAchievement } from "../services/achievement.service.js";

export async function index(req, res) {
  try { return res.json(await listAchievements({ game_id: req.query.game_id ? Number(req.query.game_id) : null })); }
  catch (error) { return res.status(400).json({ erro: error.message }); }
}

export async function create(req, res) {
  try { return res.status(201).json(await createAchievement(req.user, req.body)); }
  catch (error) { return res.status(400).json({ erro: error.message }); }
}

export async function update(req, res) {
  try { return res.json(await updateAchievement(Number(req.params.id), req.body)); }
  catch (error) { return res.status(400).json({ erro: error.message }); }
}
