import pool from "../config/database.js";

const API = "https://discord.com/api/v10";

export function discordConfigured() {
  return Boolean(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID);
}

export async function provisionMatchDiscordRooms(matchId) {
  if (!discordConfigured()) return { configured:false, skipped:true };
  const context = await matchContext(matchId);
  if (!context) throw new Error("Partida nao encontrada para integracao com Discord.");

  const [[existing]] = await pool.query(`SELECT * FROM match_discord_rooms WHERE match_id=? LIMIT 1`, [matchId]);
  if (existing?.status === "ativo") return existing;

  try {
    const bot = await discordRequest("/users/@me", { method:"GET" });
    const members = await discordMembers(context);
    const sharedPermissions = permissionOverwrites([...members.teamA, ...members.teamB], "68608", bot.id, "68624");
    const shared = await createChannel({
      name:`partida-${matchId}-${slug(context.team_a)}-x-${slug(context.team_b)}`,
      type:0,
      parent_id:process.env.DISCORD_MATCH_CATEGORY_ID || undefined,
      topic:`${context.tournament_name} | ${context.team_a} x ${context.team_b}`,
      permission_overwrites:sharedPermissions
    });
    const voiceA = await createChannel({ name:`${context.team_a} | Partida ${matchId}`, type:2, parent_id:process.env.DISCORD_MATCH_CATEGORY_ID || undefined, permission_overwrites:permissionOverwrites(members.teamA,"3146752",bot.id,"1040") });
    const voiceB = await createChannel({ name:`${context.team_b} | Partida ${matchId}`, type:2, parent_id:process.env.DISCORD_MATCH_CATEGORY_ID || undefined, permission_overwrites:permissionOverwrites(members.teamB,"3146752",bot.id,"1040") });
    await pool.query(
      `INSERT INTO match_discord_rooms (match_id,text_channel_id,team_a_voice_channel_id,team_b_voice_channel_id,status,error_message) VALUES (?,?,?,?,'ativo',NULL) ON DUPLICATE KEY UPDATE text_channel_id=VALUES(text_channel_id),team_a_voice_channel_id=VALUES(team_a_voice_channel_id),team_b_voice_channel_id=VALUES(team_b_voice_channel_id),status='ativo',error_message=NULL`,
      [matchId, shared.id, voiceA.id, voiceB.id]
    );
    await sendChannelMessage(shared.id, `**Partida oficial criada**\n${context.team_a} x ${context.team_b}\nCampeonato: ${context.tournament_name}\nAcompanhe: ${publicUrl(`/torneios/${context.tournament_id}`)}`);
    return { configured:true, text_channel_id:shared.id, team_a_voice_channel_id:voiceA.id, team_b_voice_channel_id:voiceB.id };
  } catch (error) {
    await pool.query(`INSERT INTO match_discord_rooms (match_id,status,error_message) VALUES (?,'falhou',?) ON DUPLICATE KEY UPDATE status='falhou',error_message=VALUES(error_message)`, [matchId, String(error.message).slice(0,1000)]);
    throw error;
  }
}

export async function announceMatchEvent(matchId, eventType) {
  if (!discordConfigured()) return { configured:false, skipped:true };
  const room = await provisionMatchDiscordRooms(matchId);
  const context = await matchContext(matchId);
  const messages = {
    match_created:`Nova partida: **${context.team_a} x ${context.team_b}** em ${context.tournament_name}.`,
    veto_opened:`Pick & Ban liberado para **${context.team_a} x ${context.team_b}**. Capitaes, acessem ${publicUrl("/capitao?module=matches")}.`
  };
  const content = messages[eventType];
  if (!content) return { configured:true, skipped:true };
  await deliverOnce({ provider:"discord", eventType, dedupeKey:`${eventType}:match:${matchId}`, matchId, destination:room.text_channel_id, payload:{ content } }, () => sendChannelMessage(room.text_channel_id, content));
  if (eventType === "match_created" && process.env.DISCORD_PUBLIC_CHANNEL_ID) {
    await deliverOnce({ provider:"discord", eventType:"public_match_created", dedupeKey:`public-match:${matchId}`, matchId, destination:process.env.DISCORD_PUBLIC_CHANNEL_ID, payload:{ content } }, () => sendChannelMessage(process.env.DISCORD_PUBLIC_CHANNEL_ID, `${content}\n${publicUrl(`/torneios/${context.tournament_id}`)}`));
  }
  return { configured:true };
}

async function matchContext(matchId) {
  const [[row]] = await pool.query(`SELECT m.id,m.tournament_id,m.team_a_id,m.team_b_id,t.nome tournament_name,ta.nome team_a,tb.nome team_b FROM matches m INNER JOIN tournaments t ON t.id=m.tournament_id INNER JOIN teams ta ON ta.id=m.team_a_id INNER JOIN teams tb ON tb.id=m.team_b_id WHERE m.id=? LIMIT 1`, [matchId]);
  return row ?? null;
}

async function discordMembers(context) {
  const [rows] = await pool.query(`SELECT tm.team_id,oa.provider_user_id FROM team_members tm INNER JOIN oauth_accounts oa ON oa.user_id=tm.user_id AND oa.provider='discord' WHERE tm.team_id IN (?,?) AND tm.status='ativo'`, [context.team_a_id,context.team_b_id]);
  return {
    teamA:rows.filter((row)=>Number(row.team_id)===Number(context.team_a_id)).map((row)=>row.provider_user_id),
    teamB:rows.filter((row)=>Number(row.team_id)===Number(context.team_b_id)).map((row)=>row.provider_user_id)
  };
}

function permissionOverwrites(memberIds, allow, botId, botAllow) {
  return [
    { id:String(process.env.DISCORD_GUILD_ID), type:0, deny:"1024", allow:"0" },
    { id:String(botId), type:1, allow:String(botAllow), deny:"0" },
    ...[...new Set(memberIds.map(String))].map((id)=>({ id,type:1,allow,deny:"0" }))
  ];
}

async function createChannel(payload) {
  return discordRequest(`/guilds/${process.env.DISCORD_GUILD_ID}/channels`, { method:"POST", body:payload });
}

async function sendChannelMessage(channelId, content) {
  return discordRequest(`/channels/${channelId}/messages`, { method:"POST", body:{ content, allowed_mentions:{ parse:[] } } });
}

async function discordRequest(path, { method, body }) {
  const response = await fetch(`${API}${path}`, { method, headers:{ Authorization:`Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type":"application/json" }, body:body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Discord ${response.status}: ${data.message || "falha na integracao"}`);
  return data;
}

async function deliverOnce({ provider,eventType,dedupeKey,matchId,destination,payload }, send) {
  const [result] = await pool.query(`INSERT IGNORE INTO integration_deliveries (provider,event_type,dedupe_key,match_id,destination,payload_json) VALUES (?,?,?,?,?,?)`, [provider,eventType,dedupeKey,matchId,destination,JSON.stringify(payload)]);
  if (!result.affectedRows) return;
  try {
    const sent = await send();
    await pool.query(`UPDATE integration_deliveries SET status='enviado',provider_message_id=?,sent_at=NOW() WHERE provider=? AND dedupe_key=?`, [sent?.id ?? null,provider,dedupeKey]);
  } catch (error) {
    await pool.query(`UPDATE integration_deliveries SET status='falhou',error_message=? WHERE provider=? AND dedupe_key=?`, [String(error.message).slice(0,1000),provider,dedupeKey]);
    throw error;
  }
}

function publicUrl(path) { return `${String(process.env.FRONTEND_URL || "").split(",")[0].replace(/\/$/,"")}${path}`; }
function slug(value) { return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,30); }
