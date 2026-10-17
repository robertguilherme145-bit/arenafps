import { createTournamentDraft, duplicateTournament, getTournamentOverview } from "../services/adminTournament.service.js";
import { buildTodayQueue } from "../services/adminToday.js";
import { findTodayData } from "../models/adminToday.model.js";

export async function createDraft(req, res) { return handle(res, () => createTournamentDraft(req.user, req.body), 201); }
export async function overview(req, res) { return handle(res, () => getTournamentOverview(Number(req.params.id))); }
export async function duplicate(req, res) { return handle(res, () => duplicateTournament(req.user, Number(req.params.id)), 201); }

async function handle(res, action, status = 200) {
  try { return res.status(status).json(await action()); }
  catch (error) { return res.status(error.status || 400).json({ erro:error.message }); }
}

export async function today(req, res) { return handle(res, async () => buildTodayQueue(await findTodayData())); }
