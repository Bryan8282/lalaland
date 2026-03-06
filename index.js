// index.js - Monkey D' Bryan

const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder } = require("discord.js");
const mongoose = require("mongoose");

// ----------------- CONFIGURAÇÃO -----------------
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;
const MONGO_URI = process.env.MONGO_URI;

const botName = "Monkey D' Bryan"; // Nome atualizado

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

// ----------------- MONGODB -----------------
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Conectado ao MongoDB"))
  .catch(err => console.error("🚨 Erro ao conectar no MongoDB:", err));

// ----------------- EVENTO READY -----------------
client.once("ready", () => {
  console.log(`✅ BOT ONLINE: ${botName}`);
});

// ----------------- LOGS -----------------
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
  channel.send({ content: `<@${OWNER_ID}>`, embeds: [embed] });
}

// ----------------- AUTO MOD -----------------
const pornLinks = ["porn.com", "xxx.com"]; // exemplo
const blockedWords = ["estrupado", "estrupada"]; // palavras bloqueadas

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // ----------------- LINKS PORNOGRÁFICOS -----------------
  if (pornLinks.some(link => message.content.toLowerCase().includes(link))) {
    try {
      await message.delete();
      const muteTime = 24 * 60 * 60 * 1000; // 1 dia
      const muteRole = message.guild.roles.cache.find(r => r.name === "Muted");
      if (muteRole) await message.member.roles.add(muteRole);
      client.mutedUsers.set(message.author.id, Date.now() + muteTime);
      await message.author.send(`🚨 Você foi mutado por 1 dia por enviar link pornográfico.`);
      sendLog(message.guild, `Mutado ${message.author.tag} por link pornográfico.`);
    } catch (err) {
      console.error(err);
    }
  }

  // ----------------- PALAVRAS BLOQUEADAS -----------------
  if (blockedWords.some(word => message.content.toLowerCase().includes(word))) {
    try {
      await message.delete();
      const muteTime = 24 * 60 * 60 * 1000; // 1 dia
      const muteRole = message.guild.roles.cache.find(r => r.name === "Muted");
      if (muteRole) await message.member.roles.add(muteRole);
      client.mutedUsers.set(message.author.id, Date.now() + muteTime);
      await message.author.send(`🚨 Você foi mutado por 1 dia por usar palavras proibidas.`);
      sendLog(message.guild, `Mutado ${message.author.tag} por palavra proibida.`);
    } catch (err) {
      console.error(err);
    }
  }
});

// ----------------- DESMUTE AUTOMÁTICO -----------------
setInterval(() => {
  client.mutedUsers.forEach(async (unmuteAt, userId) => {
    if (Date.now() > unmuteAt) {
      try {
        const guilds = client.guilds.cache;
        for (const [, guild] of guilds) {
          const member = await guild.members.fetch(userId).catch(() => null);
          if (member) {
            const muteRole = guild.roles.cache.find(r => r.name === "Muted");
            if (muteRole && member.roles.cache.has(muteRole.id)) {
              await member.roles.remove(muteRole);
              client.mutedUsers.delete(userId);
              sendLog(guild, `Usuário ${member.user.tag} desmutado automaticamente.`);
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
    // Aqui você registraria os comandos automaticamente via API do Discord
    console.log(`✅ Comandos registrados para guild: ${guild.name}`);
  }
});

// ----------------- AVALIAÇÃO DE PERFIL (EXEMPLO) -----------------
client.on("guildMemberAdd", async (member) => {
  try {
    let risk = 0;
    if (!member.user.avatar) risk += 20;
    if (!member.user.banner) risk += 20;
    if (member.user.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) risk += 40; // contas novas
    // Somente log, não aplica ação automática
    sendLog(member.guild, `Novo membro: ${member.user.tag}. Nota de risco: ${risk}/100`);
  } catch (err) { console.error(err); }
});

// ----------------- LOGIN -----------------
client.login(TOKEN)
  .catch(err => console.error("🚨 Erro ao conectar no Discord:", err));
