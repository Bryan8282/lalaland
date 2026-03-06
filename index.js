// index.js - Monkey D' Bryan (atualizado com intents e logs detalhados)

const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder } = require("discord.js");
const mongoose = require("mongoose");

// ----------------- CONFIGURAÇÃO -----------------
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;
const MONGO_URI = process.env.MONGO_URI;

const botName = "Monkey D' Bryan";

// ----------------- CLIENT -----------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();
client.mutedUsers = new Map();

// ----------------- LOGS -----------------
function log(message) {
  console.log(`[LOG] ${new Date().toLocaleString()}: ${message}`);
}

// ----------------- MONGODB -----------------
mongoose.connect(MONGO_URI)
  .then(() => log("✅ Conectado ao MongoDB"))
  .catch(err => console.error("🚨 Erro ao conectar MongoDB:", err));

// ----------------- READY -----------------
client.once("ready", () => {
  log(`✅ BOT ONLINE: ${botName}`);
});

// ----------------- SISTEMA DE LOGS EM CANAL -----------------
async function sendLog(guild, description) {
  const logChannelId = guild.settings?.logChannelId;
  if (!logChannelId) return;
  const channel = guild.channels.cache.get(logChannelId);
  if (!channel) return;
  const embed = new EmbedBuilder()
    .setTitle(`${botName} Logs`)
    .setDescription(description)
    .setColor("Red")
    .setTimestamp();
  await channel.send({ content: `<@${OWNER_ID}>`, embeds: [embed] });
}

// ----------------- AUTOMOD -----------------
const pornLinks = ["porn.com", "xxx.com"];
const blockedWords = ["estrupado", "estrupada"];

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Links pornográficos
  if (pornLinks.some(link => message.content.toLowerCase().includes(link))) {
    try {
      await message.delete();
      const muteRole = message.guild.roles.cache.find(r => r.name === "Muted");
      if (muteRole) await message.member.roles.add(muteRole);
      client.mutedUsers.set(message.author.id, Date.now() + 24 * 60 * 60 * 1000);
      await message.author.send("🚨 Você foi mutado por 1 dia por enviar link pornográfico.");
      sendLog(message.guild, `Mutado ${message.author.tag} por link pornográfico.`);
      log(`Mensagem de link pornográfico deletada e usuário mutado: ${message.author.tag}`);
    } catch (err) { console.error(err); }
  }

  // Palavras bloqueadas
  if (blockedWords.some(word => message.content.toLowerCase().includes(word))) {
    try {
      await message.delete();
      const muteRole = message.guild.roles.cache.find(r => r.name === "Muted");
      if (muteRole) await message.member.roles.add(muteRole);
      client.mutedUsers.set(message.author.id, Date.now() + 24 * 60 * 60 * 1000);
      await message.author.send("🚨 Você foi mutado por 1 dia por usar palavras proibidas.");
      sendLog(message.guild, `Mutado ${message.author.tag} por palavra proibida.`);
      log(`Mensagem com palavra proibida deletada e usuário mutado: ${message.author.tag}`);
    } catch (err) { console.error(err); }
  }
});

// ----------------- DESMUTE AUTOMÁTICO -----------------
setInterval(() => {
  client.mutedUsers.forEach(async (unmuteAt, userId) => {
    if (Date.now() > unmuteAt) {
      try {
        for (const [, guild] of client.guilds.cache) {
          const member = await guild.members.fetch(userId).catch(() => null);
          if (member) {
            const muteRole = guild.roles.cache.find(r => r.name === "Muted");
            if (muteRole && member.roles.cache.has(muteRole.id)) {
              await member.roles.remove(muteRole);
              client.mutedUsers.delete(userId);
              sendLog(guild, `Usuário ${member.user.tag} desmutado automaticamente.`);
              log(`Usuário desmutado: ${member.user.tag}`);
            }
          }
        }
      } catch (err) { console.error(err); }
    }
  });
}, 10 * 1000);

// ----------------- REGISTRO DE COMANDOS -----------------
client.on("ready", async () => {
  const guilds = client.guilds.cache.map(g => g.id);
  for (const guildId of guilds) {
    const guild = client.guilds.cache.get(guildId);
    log(`✅ Comandos registrados para guild: ${guild.name}`);
  }
});

// ----------------- AVALIAÇÃO DE PERFIL -----------------
client.on("guildMemberAdd", async (member) => {
  try {
    let risk = 0;
    if (!member.user.avatar) risk += 20;
    if (!member.user.banner) risk += 20;
    if (member.user.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) risk += 40;
    sendLog(member.guild, `Novo membro: ${member.user.tag}. Nota de risco: ${risk}/100`);
    log(`Avaliação de perfil do novo membro: ${member.user.tag}, risco: ${risk}`);
  } catch (err) { console.error(err); }
});

// ----------------- LOGIN -----------------
client.login(TOKEN)
  .then(() => log("✅ Tentativa de login enviada ao Discord"))
  .catch(err => console.error("🚨 Erro ao conectar no Discord:", err));
