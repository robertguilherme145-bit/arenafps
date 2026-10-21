import { findSetting, saveSetting } from "../models/platformSettings.model.js";
import { createAuditLog } from "../models/auditLog.model.js";
import { isManualPixReady, mergePaymentSettings, validatePaymentSettings } from "./paymentSettings.js";

const KEY = "payment";

export async function getPaymentSettings() {
  const saved = await findSetting(KEY);
  return mergePaymentSettings(saved?.value);
}

// Para o painel: a configuracao e se o PIX proprio esta pronto para uso.
export async function getAdminPaymentSettings() {
  const settings = await getPaymentSettings();
  return { ...settings, manual_ready:isManualPixReady(settings), mercadopago_ready:Boolean(process.env.MP_ACCESS_TOKEN) };
}

export async function saveAdminPaymentSettings(adminUser, payload) {
  const previous = await getPaymentSettings();
  const settings = validatePaymentSettings(payload);
  if (settings.mode === "mercadopago" && !process.env.MP_ACCESS_TOKEN) {
    throw new Error("O Mercado Pago não está configurado no servidor (MP_ACCESS_TOKEN). Use o PIX próprio por enquanto.");
  }
  await saveSetting(KEY, settings, adminUser.id);
  await createAuditLog({ actor_user_id:adminUser.id, action:"payment.settings.updated", entity_type:"platform_settings", details:{ previous_mode:previous.mode, mode:settings.mode, pix_key_type:settings.pix_key_type } });
  return { ...settings, manual_ready:isManualPixReady(settings), mercadopago_ready:Boolean(process.env.MP_ACCESS_TOKEN) };
}
