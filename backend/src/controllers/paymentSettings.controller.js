import { getAdminPaymentSettings, saveAdminPaymentSettings } from "../services/paymentSettings.service.js";

export async function show(req, res) { return handle(res, () => getAdminPaymentSettings()); }
export async function save(req, res) { return handle(res, () => saveAdminPaymentSettings(req.user, req.body)); }

async function handle(res, action) {
  try { return res.json(await action()); }
  catch (error) { return res.status(error.status || 400).json({ erro:error.message }); }
}
