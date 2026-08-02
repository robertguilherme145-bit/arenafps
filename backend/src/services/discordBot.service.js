import {
  ActionRowBuilder,
  ActivityType,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  ModalBuilder,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import pool from "../config/database.js";

const COLOR = 0x22d3ee;
const SUCCESS = 0x34d399;
let client = null;

const commands = [
  new SlashCommandBuilder().setName("ajuda").setDescription("Mostra os recursos oficiais da Arena Camp."),
  new SlashCommandBuilder().setName("perfil").setDescription("Consulta sua conta vinculada na Arena Camp."),
  new SlashCommandBuilder().setName("partidas").setDescription("Mostra suas próximas partidas oficiais."),
  new SlashCommandBuilder().setName("suporte").setDescription("Abre um atendimento oficial com a organização.")
].map((command) => command.toJSON());

export async function startDiscordBot() {
  if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_GUILD_ID) {
    console.log("Discord bot desativado: credenciais ausentes.");
    return null;
  }
  if (client) return client;

  client = new Client({
    intents:[GatewayIntentBits.Guilds],
    partials:[Partials.Channel]
  });

  client.once("ready", async () => {
    client.user.setPresence({
      activities:[{ name:"arenafps.com.br", type:ActivityType.Competing }],
      status:"online"
    });
    await registerCommands();
    await publishCommunityPanels().catch((error) => console.warn(`Conteúdo do Discord: ${error.message}`));
    await publishSupportPanel().catch((error) => console.warn(`Painel do Discord: ${error.message}`));
    console.log(`Discord conectado como ${client.user.tag}`);
  });
  client.on("interactionCreate", (interaction) => void handleInteraction(interaction));
  client.on("error", (error) => console.error("Discord bot:", error));
  await client.login(process.env.DISCORD_BOT_TOKEN);
  return client;
}

export async function stopDiscordBot() {
  if (!client) return;
  client.destroy();
  client = null;
}

export async function notifyDiscordSupportReply(ticketId, message) {
  if (!client?.isReady()) return { sent:false, reason:"bot_offline" };
  const [[row]] = await pool.query(`
    SELECT st.id,st.subject,oa.provider_user_id
    FROM support_tickets st
    LEFT JOIN oauth_accounts oa ON oa.user_id=st.user_id AND oa.provider='discord'
    WHERE st.id=? LIMIT 1`, [ticketId]);
  if (!row?.provider_user_id) return { sent:false, reason:"discord_not_linked" };
  const user = await client.users.fetch(String(row.provider_user_id));
  await user.send({
    embeds:[baseEmbed()
      .setColor(SUCCESS)
      .setTitle(`Resposta no chamado #${row.id}`)
      .setDescription(String(message).slice(0, 4000))
      .addFields({ name:"Assunto", value:row.subject })],
    components:[siteButtons("/jogador?module=support")]
  });
  return { sent:true };
}

async function registerCommands() {
  const applicationId = process.env.DISCORD_CLIENT_ID || client.user.id;
  const rest = new REST({ version:"10" }).setToken(process.env.DISCORD_BOT_TOKEN);
  await rest.put(Routes.applicationGuildCommands(applicationId, process.env.DISCORD_GUILD_ID), { body:commands });
}

async function handleInteraction(interaction) {
  try {
    if (interaction.isButton() && interaction.customId === "arena_support") return showSupportModal(interaction);
    if (interaction.isModalSubmit() && interaction.customId === "arena_support_modal") return createDiscordTicket(interaction);
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === "ajuda") return showHelp(interaction);
    if (interaction.commandName === "perfil") return showProfile(interaction);
    if (interaction.commandName === "partidas") return showMatches(interaction);
    if (interaction.commandName === "suporte") return showSupportModal(interaction);
  } catch (error) {
    console.error("Interação Discord:", error);
    const payload = { content:"Não foi possível concluir esta ação. Tente novamente ou use o suporte pelo site.", ephemeral:true };
    if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
}

async function showHelp(interaction) {
  const embed = baseEmbed()
    .setTitle("Central Arena Camp")
    .setDescription("Acompanhe competições, consulte sua agenda e fale com a organização sem sair do Discord.")
    .addFields(
      { name:"/perfil", value:"Confere sua conta e o vínculo oficial.", inline:true },
      { name:"/partidas", value:"Lista seus próximos confrontos.", inline:true },
      { name:"/suporte", value:"Abre um protocolo com a organização.", inline:true }
    );
  await interaction.reply({ embeds:[embed], components:[siteButtons()], ephemeral:true });
}

async function showProfile(interaction) {
  const account = await linkedAccount(interaction.user.id);
  if (!account) return interaction.reply({
    embeds:[baseEmbed().setTitle("Discord ainda não vinculado").setDescription("Entre na sua conta da Arena Camp e vincule este Discord nas configurações do perfil.")],
    components:[siteButtons("/jogador?module=settings")], ephemeral:true
  });
  const embed = baseEmbed().setTitle(account.nickname || account.nome).setDescription("Conta oficial vinculada com sucesso.")
    .addFields(
      { name:"E-mail", value:account.email, inline:true },
      { name:"Situação", value:account.email_verified_at ? "E-mail verificado" : "Verificação pendente", inline:true }
    );
  await interaction.reply({ embeds:[embed], components:[siteButtons("/jogador?module=profile")], ephemeral:true });
}

async function showMatches(interaction) {
  await interaction.deferReply({ ephemeral:true });
  const account = await linkedAccount(interaction.user.id);
  if (!account) return interaction.editReply({ content:"Vincule este Discord à sua conta da Arena Camp para consultar suas partidas." });
  const [rows] = await pool.query(`
    SELECT DISTINCT m.id,m.round,m.scheduled_at,m.status,t.nome tournament_name,ta.nome team_a,tb.nome team_b
    FROM team_members tm
    INNER JOIN matches m ON m.team_a_id=tm.team_id OR m.team_b_id=tm.team_id
    INNER JOIN tournaments t ON t.id=m.tournament_id
    INNER JOIN teams ta ON ta.id=m.team_a_id
    INNER JOIN teams tb ON tb.id=m.team_b_id
    WHERE tm.user_id=? AND m.status NOT IN ('finalizada','cancelada')
    ORDER BY COALESCE(m.scheduled_at,'2999-12-31') ASC,m.id ASC LIMIT 5`, [account.id]);
  const description = rows.length
    ? rows.map((match) => `**#${match.id} · ${match.team_a} x ${match.team_b}**\n${match.tournament_name} · Rodada ${match.round || "a definir"} · ${formatDiscordDate(match.scheduled_at)}`).join("\n\n")
    : "Você não possui partidas pendentes no momento.";
  await interaction.editReply({ embeds:[baseEmbed().setTitle("Próximas partidas").setDescription(description)], components:[siteButtons("/jogador?module=matches")] });
}

function showSupportModal(interaction) {
  const modal = new ModalBuilder().setCustomId("arena_support_modal").setTitle("Suporte Arena Camp");
  const subject = new TextInputBuilder().setCustomId("subject").setLabel("Assunto").setPlaceholder("Ex.: problema na minha inscrição").setMaxLength(160).setRequired(true).setStyle(TextInputStyle.Short);
  const message = new TextInputBuilder().setCustomId("message").setLabel("Explique o que aconteceu").setPlaceholder("Informe torneio, partida e detalhes importantes.").setMinLength(15).setMaxLength(4000).setRequired(true).setStyle(TextInputStyle.Paragraph);
  modal.addComponents(new ActionRowBuilder().addComponents(subject), new ActionRowBuilder().addComponents(message));
  return interaction.showModal(modal);
}

async function createDiscordTicket(interaction) {
  await interaction.deferReply({ ephemeral:true });
  const account = await linkedAccount(interaction.user.id);
  if (!account) return interaction.editReply({ content:"Vincule este Discord à sua conta da Arena Camp antes de abrir um chamado." });
  const subject = interaction.fields.getTextInputValue("subject").trim();
  const message = interaction.fields.getTextInputValue("message").trim();
  const [result] = await pool.query(`INSERT INTO support_tickets (user_id,category,priority,status,subject,message) VALUES (?,'discord','media','aberto',?,?)`, [account.id,subject,message]);
  await interaction.editReply({
    embeds:[baseEmbed().setColor(SUCCESS).setTitle(`Chamado #${result.insertId} aberto`).setDescription("Sua solicitação entrou na fila oficial. A resposta aparecerá no site e será enviada por mensagem direta neste Discord.").addFields({ name:"Assunto", value:subject })],
    components:[siteButtons("/jogador?module=support")]
  });
}

async function linkedAccount(discordId) {
  const [[row]] = await pool.query(`SELECT u.id,u.nome,u.nickname,u.email,u.email_verified_at FROM oauth_accounts oa INNER JOIN users u ON u.id=oa.user_id WHERE oa.provider='discord' AND oa.provider_user_id=? LIMIT 1`, [String(discordId)]);
  return row || null;
}

async function publishSupportPanel() {
  const [channels] = await Promise.all([client.guilds.fetch(process.env.DISCORD_GUILD_ID).then((guild) => guild.channels.fetch())]);
  const support = channels.find((channel) => channel?.isTextBased() && channel.name === "suporte");
  if (!support) return;
  const dedupeKey = `discord-support-panel:${support.id}:v2`;
  const [insert] = await pool.query(`INSERT IGNORE INTO integration_deliveries (provider,event_type,dedupe_key,destination,payload_json) VALUES ('discord','support_panel',?,?,?)`, [dedupeKey,support.id,JSON.stringify({ version:2 })]);
  if (!insert.affectedRows && !await deliveryCanRetry(dedupeKey)) return;
  try {
    const sent = await support.send({
      embeds:[baseEmbed().setTitle("Central de suporte").setDescription("Abra um atendimento privado e acompanhe o mesmo protocolo pelo site. Nunca publique senhas, códigos ou dados de pagamento no canal.").addFields({ name:"Prazo e prioridade", value:"Casos de partida e segurança são priorizados pela organização." })],
      components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("arena_support").setLabel("Abrir chamado").setStyle(ButtonStyle.Primary), new ButtonBuilder().setLabel("Acompanhar no site").setStyle(ButtonStyle.Link).setURL(siteUrl("/jogador?module=support")))]
    });
    await pool.query(`UPDATE integration_deliveries SET status='enviado',provider_message_id=?,sent_at=NOW() WHERE provider='discord' AND dedupe_key=?`, [sent.id,dedupeKey]);
  } catch (error) {
    await pool.query(`UPDATE integration_deliveries SET status='falhou',error_message=? WHERE provider='discord' AND dedupe_key=?`, [String(error.message).slice(0,1000),dedupeKey]);
    throw error;
  }
}

async function publishCommunityPanels() {
  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
  const channels = await guild.channels.fetch();
  const panels = [
    {
      channel:"boas-vindas",
      version:2,
      embed:baseEmbed().setTitle("Bem-vindo à Arena Camp").setDescription("Seu centro competitivo para campeonatos, equipes, estatísticas e carreira nos eSports.").addFields(
        { name:"1. Prepare sua conta", value:"Confirme o e-mail, complete o perfil e vincule seu Discord.", inline:false },
        { name:"2. Entre na competição", value:"Participe de uma equipe, confirme a lineup e acompanhe as inscrições.", inline:false },
        { name:"3. Jogue com segurança", value:"Salas, Pick & Ban e resultados oficiais ficam registrados na plataforma.", inline:false }
      ),
      components:[siteButtons("/criar-conta")]
    },
    {
      channel:"regras",
      version:2,
      embed:baseEmbed().setTitle("Regras da comunidade").setDescription("A participação no servidor pressupõe respeito às regras da Arena Camp.").addFields(
        { name:"Respeito", value:"Não são tolerados assédio, discriminação, ameaças ou ataques pessoais." },
        { name:"Integridade competitiva", value:"Fraudes, combinação de resultados, contas compartilhadas e vantagens indevidas geram penalidades." },
        { name:"Privacidade", value:"Não divulgue senhas, IPs privados, chaves PIX ou dados pessoais em canais públicos." },
        { name:"Decisões oficiais", value:"O regulamento de cada torneio e os registros da plataforma prevalecem em disputas." }
      ),
      components:[siteButtons("/faq")]
    },
    {
      channel:"como-competir",
      version:2,
      embed:baseEmbed().setTitle("Como competir").setDescription("Um caminho simples da conta até a partida oficial.").addFields(
        { name:"Conta e equipe", value:"Crie sua conta, vincule o Discord e entre em uma equipe como jogador, capitão ou líder." },
        { name:"Inscrição", value:"O líder seleciona o torneio, envia a lineup e conclui o pagamento quando necessário." },
        { name:"Dia da partida", value:"Confirme presença, acompanhe o Pick & Ban e entre somente na sala oficial enviada pelo bot." },
        { name:"Depois do jogo", value:"Placares, estatísticas, ranking e conquistas são atualizados a partir da súmula oficial." }
      ),
      components:[siteButtons("/campeonatos")]
    }
  ];
  for (const panel of panels) {
    const channel = channels.find((item) => item?.isTextBased() && item.name === panel.channel);
    if (channel) await publishPanelOnce(channel, `discord-panel:${panel.channel}:v${panel.version}`, panel);
  }
}

async function publishPanelOnce(channel, dedupeKey, panel) {
  const [insert] = await pool.query(`INSERT IGNORE INTO integration_deliveries (provider,event_type,dedupe_key,destination,payload_json) VALUES ('discord','community_panel',?,?,?)`, [dedupeKey,channel.id,JSON.stringify({ version:panel.version })]);
  if (!insert.affectedRows && !await deliveryCanRetry(dedupeKey)) return;
  try {
    const sent = await channel.send({ embeds:[panel.embed], components:panel.components });
    await pool.query(`UPDATE integration_deliveries SET status='enviado',provider_message_id=?,sent_at=NOW() WHERE provider='discord' AND dedupe_key=?`, [sent.id,dedupeKey]);
  } catch (error) {
    await pool.query(`UPDATE integration_deliveries SET status='falhou',error_message=? WHERE provider='discord' AND dedupe_key=?`, [String(error.message).slice(0,1000),dedupeKey]);
    throw error;
  }
}

async function deliveryCanRetry(dedupeKey) {
  const [[delivery]] = await pool.query(
    `SELECT status FROM integration_deliveries WHERE provider='discord' AND dedupe_key=? LIMIT 1`,
    [dedupeKey]
  );
  return delivery?.status === "falhou";
}

function baseEmbed() {
  return new EmbedBuilder().setColor(COLOR).setAuthor({ name:"Arena Camp · Competition Engine" }).setFooter({ text:"arenafps.com.br · Dados oficiais da plataforma" }).setTimestamp();
}
function siteButtons(path = "/") {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel("Abrir Arena Camp").setStyle(ButtonStyle.Link).setURL(siteUrl(path)),
    new ButtonBuilder().setCustomId("arena_support").setLabel("Suporte").setStyle(ButtonStyle.Secondary)
  );
}
function siteUrl(path) { return `${String(process.env.FRONTEND_URL || "https://arenafps.com.br").split(",")[0].replace(/\/$/,"")}${path}`; }
function formatDiscordDate(value) { return value ? `<t:${Math.floor(new Date(value).getTime() / 1000)}:F>` : "Data a definir"; }
