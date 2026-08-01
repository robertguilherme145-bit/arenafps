import pool from "../config/database.js";

export function whatsappConfigured() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_MATCH_TEMPLATE
  );
}

export async function announceMatchOnWhatsApp(matchId, eventType) {
  if (!whatsappConfigured()) return { configured: false, skipped: true };

  const context = await matchContext(matchId);
  if (!context) throw new Error("Partida nao encontrada para integracao com WhatsApp.");

  const recipients = await matchRecipients(context.team_a_id, context.team_b_id);
  const eventLabel = eventType === "veto_opened" ? "Pick & Ban liberado" : "Nova partida criada";
  const link = publicUrl(eventType === "veto_opened" ? "/capitao?module=matches" : `/torneios/${context.tournament_id}`);

  const results = await Promise.allSettled(recipients.map((recipient) => deliverTemplateOnce({
    matchId,
    eventType,
    recipient,
    parameters: [
      eventLabel,
      `${context.team_a} x ${context.team_b}`,
      context.tournament_name,
      link
    ]
  })));

  return {
    configured: true,
    recipients: recipients.length,
    sent: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length
  };
}

async function deliverTemplateOnce({ matchId, eventType, recipient, parameters }) {
  const dedupeKey = `${eventType}:match:${matchId}:user:${recipient.user_id}`;
  const [insert] = await pool.query(
    `INSERT IGNORE INTO integration_deliveries (provider,event_type,dedupe_key,match_id,user_id,destination,payload_json) VALUES ('whatsapp',?,?,?,?,?,?)`,
    [eventType, dedupeKey, matchId, recipient.user_id, recipient.phone, JSON.stringify({ parameters })]
  );
  if (!insert.affectedRows) return { skipped: true };

  try {
    const response = await sendTemplate(recipient.phone, parameters);
    await pool.query(
      `UPDATE integration_deliveries SET status='enviado',provider_message_id=?,sent_at=NOW() WHERE provider='whatsapp' AND dedupe_key=?`,
      [response.messages?.[0]?.id ?? null, dedupeKey]
    );
    return response;
  } catch (error) {
    await pool.query(
      `UPDATE integration_deliveries SET status='falhou',error_message=? WHERE provider='whatsapp' AND dedupe_key=?`,
      [String(error.message).slice(0, 1000), dedupeKey]
    );
    throw error;
  }
}

async function sendTemplate(phone, parameters) {
  const version = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
  const response = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizePhone(phone),
      type: "template",
      template: {
        name: process.env.WHATSAPP_MATCH_TEMPLATE,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "pt_BR" },
        components: [{
          type: "body",
          parameters: parameters.map((text) => ({ type: "text", text: String(text) }))
        }]
      }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`WhatsApp ${response.status}: ${data.error?.message || "falha na integracao"}`);
  return data;
}

async function matchContext(matchId) {
  const [[row]] = await pool.query(
    `SELECT m.id,m.tournament_id,m.team_a_id,m.team_b_id,t.nome tournament_name,ta.nome team_a,tb.nome team_b FROM matches m INNER JOIN tournaments t ON t.id=m.tournament_id INNER JOIN teams ta ON ta.id=m.team_a_id INNER JOIN teams tb ON tb.id=m.team_b_id WHERE m.id=? LIMIT 1`,
    [matchId]
  );
  return row ?? null;
}

async function matchRecipients(teamAId, teamBId) {
  const [rows] = await pool.query(
    `SELECT DISTINCT u.id user_id,u.phone FROM team_members tm INNER JOIN users u ON u.id=tm.user_id WHERE tm.team_id IN (?,?) AND tm.status='ativo' AND tm.cargo IN ('leader','captain') AND u.whatsapp_opt_in=1 AND u.phone IS NOT NULL AND TRIM(u.phone)<>''`,
    [teamAId, teamBId]
  );
  return rows;
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function publicUrl(path) {
  return `${String(process.env.FRONTEND_URL || "").split(",")[0].replace(/\/$/, "")}${path}`;
}
