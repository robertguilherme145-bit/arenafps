import pool from "../config/database.js";
import { createNotification } from "../models/notification.model.js";

const API = "https://discord.com/api/v10";

export function discordConfigured() {
  return Boolean(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_GUILD_ID);
}

const SERVER_BLUEPRINT = [
  {
    name:"COMECE AQUI",
    channels:[
      { name:"boas-vindas", topic:"Apresentacao oficial da Arena Camp e primeiros passos." },
      { name:"regras", topic:"Regras de convivencia e conduta da comunidade Arena Camp." },
      { name:"como-competir", topic:"Guia para criar conta, montar equipe e participar dos campeonatos." }
    ]
  },
  {
    name:"COMPETICOES",
    channels:[
      { name:"anuncios-de-partidas", topic:"Agenda e avisos automaticos das partidas oficiais." },
      { name:"calendario", topic:"Datas, horarios e etapas das competicoes Arena Camp." },
      { name:"resultados", topic:"Placares e vencedores confirmados pela organizacao." }
    ]
  },
  {
    name:"COMUNIDADE",
    channels:[
      { name:"geral", topic:"Conversa geral da comunidade Arena Camp." },
      { name:"encontre-equipe", topic:"Jogadores e equipes podem divulgar vagas e disponibilidade." },
      { name:"suporte", topic:"Orientacoes para abrir um chamado oficial pelo site." }
    ]
  },
  { name:"PARTIDAS OFICIAIS", channels:[] }
];

export async function getDiscordServerStatus() {
  if (!discordConfigured()) return { configured:false, connected:false, categories:[], channels:[] };
  const [guild, channels] = await Promise.all([
    discordRequest(`/guilds/${process.env.DISCORD_GUILD_ID}`, { method:"GET" }),
    listGuildChannels()
  ]);
  return {
    configured:true,
    connected:true,
    guild:{ id:guild.id, name:guild.name, icon:guild.icon },
    categories:channels.filter((channel)=>channel.type === 4).map(channelSummary),
    channels:channels.filter((channel)=>channel.type !== 4).map(channelSummary),
    blueprint:blueprintStatus(channels)
  };
}

export async function setupDiscordServer() {
  if (!discordConfigured()) throw new Error("Configure o token e o servidor do Discord antes de sincronizar.");
  const guildId = String(process.env.DISCORD_GUILD_ID);
  const bot = await discordRequest("/users/@me", { method:"GET" });
  let channels = await listGuildChannels();
  const report = { created:[], reused:[], messages:[] };

  for (const definition of SERVER_BLUEPRINT) {
    let category = findChannel(channels, definition.name, 4);
    if (!category) {
      category = await createChannel({ name:definition.name, type:4 });
      channels.push(category);
      report.created.push(`Categoria: ${definition.name}`);
    } else report.reused.push(`Categoria: ${definition.name}`);

    for (const channelDefinition of definition.channels) {
      let channel = findChannel(channels, channelDefinition.name, 0);
      if (!channel) {
        channel = await createChannel({
          name:channelDefinition.name,
          type:0,
          parent_id:category.id,
          topic:channelDefinition.topic
        });
        channels.push(channel);
        report.created.push(`#${channelDefinition.name}`);
      } else {
        await updateChannel(channel.id, { parent_id:category.id, topic:channelDefinition.topic });
        report.reused.push(`#${channelDefinition.name}`);
      }
    }
  }

  const welcome = findChannel(channels,"boas-vindas",0);
  const rules = findChannel(channels,"regras",0);
  const guide = findChannel(channels,"como-competir",0);
  const support = findChannel(channels,"suporte",0);
  const introductions = [
    [welcome,"**Bem-vindo a Arena Camp**\nA plataforma oficial para organizar, competir e construir sua historia nos eSports. Vincule sua conta no site, acompanhe seus campeonatos e fique atento aos avisos da organizacao."],
    [rules,"**Regras da comunidade**\n1. Respeite jogadores, equipes e organizadores.\n2. Nao compartilhe dados privados das salas oficiais.\n3. Fraudes, discriminacao e manipulacao de resultados geram penalidades.\n4. Decisoes competitivas seguem o regulamento publicado em cada torneio.\n5. Use o suporte oficial para contestacoes e denuncias."],
    [guide,`**Como competir**\n1. Crie e confirme sua conta em ${publicUrl("/criar-conta")}\n2. Vincule seu Discord oficial.\n3. Entre em uma equipe e confirme sua lineup.\n4. Inscreva-se em um campeonato.\n5. Acompanhe Pick & Ban, sala e resultados pelo painel.`],
    [support,`**Atendimento Arena Camp**\nAbra e acompanhe seu chamado dentro da plataforma. Assim a conversa fica registrada e protegida: ${publicUrl("/entrar")}`]
  ];
  for (const [channel, content] of introductions) {
    if (!channel) continue;
    const result = await publishSetupMessageOnce(channel.id, content);
    if (result) report.messages.push(channel.name);
  }

  const matchCategory = findChannel(channels,"PARTIDAS OFICIAIS",4);
  const publicChannel = process.env.DISCORD_PUBLIC_CHANNEL_ID
    ? channels.find((channel)=>String(channel.id) === String(process.env.DISCORD_PUBLIC_CHANNEL_ID))
    : findChannel(channels,"anuncios-de-partidas",0);
  return {
    configured:true,
    connected:true,
    bot:{ id:bot.id, username:bot.username },
    guild_id:guildId,
    match_category_id:matchCategory?.id ?? null,
    public_channel_id:publicChannel?.id ?? null,
    ...report
  };
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

async function updateChannel(channelId, payload) {
  return discordRequest(`/channels/${channelId}`, { method:"PATCH", body:payload });
}

async function listGuildChannels() {
  return discordRequest(`/guilds/${process.env.DISCORD_GUILD_ID}/channels`, { method:"GET" });
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
function normalizedName(value) { return slug(value).replace(/-/g,""); }
function findChannel(channels,name,type) { return channels.find((channel)=>channel.type === type && normalizedName(channel.name) === normalizedName(name)); }
function channelSummary(channel) { return { id:channel.id,name:channel.name,type:channel.type,parent_id:channel.parent_id ?? null,topic:channel.topic ?? null }; }
function blueprintStatus(channels) { return SERVER_BLUEPRINT.map((category)=>({ name:category.name,ready:Boolean(findChannel(channels,category.name,4)),channels:category.channels.map((item)=>({ name:item.name,ready:Boolean(findChannel(channels,item.name,0)) })) })); }
async function publishSetupMessageOnce(channelId,content) {
  const dedupeKey = `discord-server-setup:${channelId}:v1`;
  const [result] = await pool.query(`INSERT IGNORE INTO integration_deliveries (provider,event_type,dedupe_key,destination,payload_json) VALUES ('discord','server_setup',?,?,?)`,[dedupeKey,channelId,JSON.stringify({content})]);
  if (!result.affectedRows) return false;
  try {
    const message = await sendChannelMessage(channelId,content);
    await pool.query(`UPDATE integration_deliveries SET status='enviado',provider_message_id=?,sent_at=NOW() WHERE provider='discord' AND dedupe_key=?`,[message.id,dedupeKey]);
    return true;
  } catch (error) {
    await pool.query(`UPDATE integration_deliveries SET status='falhou',error_message=? WHERE provider='discord' AND dedupe_key=?`,[String(error.message).slice(0,1000),dedupeKey]);
    throw error;
  }
}
