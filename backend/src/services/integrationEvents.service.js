import { announceMatchEvent } from "./discordIntegration.service.js";
import { announceMatchOnWhatsApp } from "./whatsappIntegration.service.js";

export async function announceExternalMatchEvent(matchId, eventType) {
  const [discord, whatsapp] = await Promise.allSettled([
    announceMatchEvent(matchId, eventType),
    announceMatchOnWhatsApp(matchId, eventType)
  ]);

  return {
    discord: resultSummary(discord),
    whatsapp: resultSummary(whatsapp)
  };
}

function resultSummary(result) {
  if (result.status === "fulfilled") return result.value;
  return { configured: true, failed: true, error: String(result.reason?.message || result.reason) };
}
