import pool from "../config/database.js";
import { createNotification } from "../models/notification.model.js";

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
    await validateOfficialLineups(context, members);
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
    await notifyOfficialLineups(context, members, shared.id, voiceA.id, voiceB.id);
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

export async function closeMatchDiscordRooms(matchId, options = {}) {
  if (!discordConfigured()) return { configured:false, skipped:true };

  const context = await matchContext(matchId);
  const [[room]] = await pool.query(
    `SELECT * FROM match_discord_rooms WHERE match_id=? LIMIT 1`,
    [matchId]
  );
  if (!context || !room || room.status !== "ativo") {
    return { configured:true, skipped:true };
  }
  if (!options.force && (context.status !== "finalizada" || !context.winner_team_id)) {
    throw new Error("As salas so podem ser encerradas depois da finalizacao oficial da partida.");
  }

  const winner = context.winner_team_id
    ? (Number(context.winner_team_id) === Number(context.team_a_id) ? context.team_a : context.team_b)
    : null;
  const result = winner
    ? `**Partida finalizada**\n${context.team_a} ${context.score_team_a} x ${context.score_team_b} ${context.team_b}\nVencedor: **${winner}**\n${publicUrl(`/torneios/${context.tournament_id}?tab=matches`)}`
    : null;

  if (result && process.env.DISCORD_PUBLIC_CHANNEL_ID) {
    await deliverOnce({
      provider:"discord",
      eventType:"match_finished",
      dedupeKey:`match-finished:${matchId}`,
      matchId,
      destination:process.env.DISCORD_PUBLIC_CHANNEL_ID,
      payload:{ content:result }
    }, () => sendChannelMessage(process.env.DISCORD_PUBLIC_CHANNEL_ID, result));
  }

  const channelIds = [
    room.text_channel_id,
    room.team_a_voice_channel_id,
    room.team_b_voice_channel_id
  ].filter(Boolean);
  const removals = await Promise.allSettled(channelIds.map(deleteChannel));
  const failures = removals
    .filter((item) => item.status === "rejected")
    .map((item) => String(item.reason?.message || item.reason));

  await pool.query(
    `UPDATE match_discord_rooms SET status=?,error_message=? WHERE match_id=?`,
    [failures.length ? "falhou" : "arquivado", failures.join(" | ").slice(0, 1000) || null, matchId]
  );
  if (failures.length) throw new Error(failures.join(" | "));
  return { configured:true, archived:true, deleted_channels:channelIds.length };
}

async function matchContext(matchId) {
  const [[row]] = await pool.query(`SELECT m.id,m.status,m.tournament_id,m.team_a_id,m.team_b_id,m.winner_team_id,m.score_team_a,m.score_team_b,t.nome tournament_name,t.titulares required_starters,ta.nome team_a,tb.nome team_b FROM matches m INNER JOIN tournaments t ON t.id=m.tournament_id INNER JOIN teams ta ON ta.id=m.team_a_id INNER JOIN teams tb ON tb.id=m.team_b_id WHERE m.id=? LIMIT 1`, [matchId]);
  return row ?? null;
}

async function discordMembers(context) {
  const [rows] = await pool.query(`
    SELECT e.team_id,p.user_id,p.nick,oa.provider_user_id
    FROM entries e
    INNER JOIN entry_players ep ON ep.entry_id=e.id
    INNER JOIN players p ON p.id=ep.player_id
    LEFT JOIN oauth_accounts oa ON oa.user_id=p.user_id AND oa.provider='discord'
    WHERE e.tournament_id=? AND e.team_id IN (?,?) AND ep.titular=1
    ORDER BY e.team_id,ep.ordem`, [context.tournament_id,context.team_a_id,context.team_b_id]);
  return {
    teamA:rows.filter((row)=>Number(row.team_id)===Number(context.team_a_id)),
    teamB:rows.filter((row)=>Number(row.team_id)===Number(context.team_b_id))
  };
}

async function validateOfficialLineups(context, members) {
  const allMembers = [...members.teamA, ...members.teamB];
  const expectedPerTeam = Number(context.required_starters || 0);
  if (expectedPerTeam && (members.teamA.length < expectedPerTeam || members.teamB.length < expectedPerTeam)) {
    throw new Error(`A sala do Discord exige ${expectedPerTeam} titulares confirmados em cada lineup.`);
  }

  const withoutAccount = allMembers.filter((member) => !member.user_id);
  if (withoutAccount.length) {
    throw new Error(`Estes titulares ainda nao possuem uma conta ativa na Arena Camp: ${memberNames(withoutAccount)}.`);
  }

  const withoutDiscord = allMembers.filter((member) => !member.provider_user_id);
  if (withoutDiscord.length) {
    throw new Error(`Vincule o Discord oficial destes titulares antes de criar a sala: ${memberNames(withoutDiscord)}.`);
  }

  const outsideGuild = [];
  for (const member of allMembers) {
    try {
      await discordRequest(`/guilds/${process.env.DISCORD_GUILD_ID}/members/${member.provider_user_id}`, { method:"GET" });
    } catch (error) {
      if (/Discord 404:/.test(error.message)) outsideGuild.push(member);
      else throw error;
    }
  }
  if (outsideGuild.length) {
    throw new Error(`Estes titulares precisam entrar no servidor oficial da Arena Camp: ${memberNames(outsideGuild)}.`);
  }
}

async function notifyOfficialLineups(context, members, textChannelId, voiceAId, voiceBId) {
  const guildId = process.env.DISCORD_GUILD_ID;
  for (const [teamKey, voiceId] of [["teamA",voiceAId],["teamB",voiceBId]]) {
    for (const member of members[teamKey]) {
      if (!member.user_id) continue;
      const message = `Sua sala oficial para ${context.team_a} x ${context.team_b} foi criada. Texto: https://discord.com/channels/${guildId}/${textChannelId} | Voz da equipe: https://discord.com/channels/${guildId}/${voiceId}`;
      await createNotification({ user_id:member.user_id, titulo:"Sala oficial no Discord", mensagem:message, tipo:"discord_match_room", link:"/jogador?module=matches", dedupe_key:`discord-room:${context.id}:user:${member.user_id}` });
      if (!member.provider_user_id) continue;
      try {
        await discordRequest(`/guilds/${guildId}/members/${member.provider_user_id}`, { method:"GET" });
        const dm = await discordRequest("/users/@me/channels", { method:"POST", body:{ recipient_id:String(member.provider_user_id) } });
        await sendChannelMessage(dm.id, `**Arena Camp | Sala oficial**\n${message}`);
      } catch (error) {
        console.warn(`Discord DM nao enviada ao usuario ${member.user_id}: ${error.message}`);
      }
    }
  }
}

function permissionOverwrites(memberIds, allow, botId, botAllow) {
  return [
    { id:String(process.env.DISCORD_GUILD_ID), type:0, deny:"1024", allow:"0" },
    { id:String(botId), type:1, allow:String(botAllow), deny:"0" },
    ...[...new Set(memberIds.map((member)=>member.provider_user_id).filter(Boolean).map(String))].map((id)=>({ id,type:1,allow,deny:"0" }))
  ];
}

async function createChannel(payload) {
  return discordRequest(`/guilds/${process.env.DISCORD_GUILD_ID}/channels`, { method:"POST", body:payload });
}

async function sendChannelMessage(channelId, content) {
  return discordRequest(`/channels/${channelId}/messages`, { method:"POST", body:{ content, allowed_mentions:{ parse:[] } } });
}

async function deleteChannel(channelId) {
  return discordRequest(`/channels/${channelId}`, { method:"DELETE" });
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
function memberNames(members) { return members.map((member) => member.nick || `jogador #${member.user_id || "sem conta"}`).join(", "); }
