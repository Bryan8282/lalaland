// index.js - Monkey D' Bryan completo

const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder } = require("discord.js");
const mongoose = require("mongoose");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");

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
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel],
});

client.mutedUsers = new Map();
const blockedWords = ["estrupado", "estrupada"];
const pornLinks = ["porn.com", "xxx.com"];

// ----------------- LOGS -----------------
function log(message) {
  console.log(`[LOG] ${new Date().toLocaleString()}: ${message}`);
}

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

// ----------------- MONGODB -----------------
mongoose.connect(MONGO_URI)
  .then(() => log("✅ Conectado ao MongoDB"))
  .catch(err => console.error("🚨 Erro ao conectar MongoDB:", err));

// ----------------- COMANDOS SLASH -----------------
const slashCommands = [
  {
    data: { name: "ping", description: "Responde com Pong!" },
    execute: async (interaction) => { await interaction.reply("🏓 Pong!"); }
  },
  {
    data: {
      name: "profile",
      description: "Avalia risco de perfil de um usuário",
      options: [
        { type: 6, name: "user", description: "Usuário para avaliar", required: true }
      ]
    },
    execute: async (interaction) => {
      const user = interaction.options.getUser("user");
      let risk = 0;
      if (!user.avatar) risk += 20;
      if (!user.banner) risk += 20;
      if (user.createdAt > new Date(Date.now() - 7*24*60*60*1000)) risk += 40;
      await interaction.reply(`Usuário: ${user.tag}\nNota de risco: ${risk}/100`);
      sendLog(interaction.guild, `Comando /profile usado em ${user.tag}. Nota de risco: ${risk}`);
    }
  },
  {
    data: {
      name: "mute",
      description: "Muta um usuário manualmente",
      options: [
        { type: 6, name: "user", description: "Usuário a mutar", required: true },
        { type: 4, name: "tempo", description: "Tempo em horas", required: false }
      ]
    },
    execute: async (interaction) => {
      const member = interaction.options.getMember("user");
      const tempo = interaction.options.getInteger("tempo") || 24;
      const muteRole = interaction.guild.roles.cache.find(r => r.name === "Muted");
      if (muteRole) await member.roles.add(muteRole);
      client.mutedUsers.set(member.id, Date.now() + tempo*60*60*1000);
      await interaction.reply(`✅ Usuário ${member.user.tag} mutado por ${tempo}h`);
      sendLog(interaction.guild, `${member.user.tag} mutado manualmente por ${tempo}h`);
    }
  },
  {
    data: {
      name: "unmute",
      description: "Desmuta um usuário manualmente",
      options: [
        { type: 6, name: "user", description: "Usuário a desmutar", required: true }
      ]
    },
    execute: async (interaction) => {
      const member = interaction.options.getMember("user");
      const muteRole = interaction.guild.roles.cache.find(r => r.name === "Muted");
      if (muteRole && member.roles.cache.has(muteRole.id)) {
        await member.roles.remove(muteRole);
        client.mutedUsers.delete(member.id);
        await interaction.reply(`✅ Usuário ${member.user.tag} desmutado!`);
        sendLog(interaction.guild, `${member.user.tag} desmutado manualmente`);
      }
    }
  },
  {
    data: {
      name: "setlog",
      description: "Define o canal de logs do servidor",
      options: [
        { type: 7, name: "canal", description: "Canal de logs", required: true }
      ]
    },
    execute: async (interaction) => {
      const channel = interaction.options.getChannel("canal");
      interaction.guild.settings = interaction.guild.settings || {};
      interaction.guild.settings.logChannelId = channel.id;
      await interaction.reply(`✅ Canal de logs definido para ${channel}`);
      log(`Canal de logs atualizado: ${channel.name}`);
    }
  },
  {
    data: { name: "showlogs", description: "Mostra últimos logs do servidor" },
    execute: async (interaction) => {
      await interaction.reply("📄 Exibindo logs (simulação, logs reais vão no canal configurado).");
    }
  },
  {
    data: {
      name: "blockword",
      description: "Adiciona uma palavra à lista de bloqueio",
      options: [
        { type: 3, name: "palavra", description: "Palavra a bloquear", required: true }
      ]
    },
    execute: async (interaction) => {
      const word = interaction.options.getString("palavra").toLowerCase();
      if (!blockedWords.includes(word)) blockedWords.push(word);
      await interaction.reply(`🚫 Palavra bloqueada: ${word}`);
      log(`Palavra adicionada à lista de bloqueio: ${word}`);
    }
  },
  {
    data: {
      name: "unblockword",
      description: "Remove uma palavra da lista de bloqueio",
      options: [
        { type: 3, name: "palavra", description: "Palavra a desbloquear", required: true }
      ]
    },
    execute: async (interaction) => {
      const word = interaction.options.getString("palavra").toLowerCase();
      const index = blockedWords.indexOf(word);
      if (index !== -1) blockedWords.splice(index, 1);
      await interaction.reply(`✅ Palavra desbloqueada: ${word}`);
      log(`Palavra removida da lista de bloqueio: ${word}`);
    }
  },
  {
    data: { name: "config", description: "Mostra as configurações do servidor" },
    execute: async (interaction) => {
      const settings = interaction.guild.settings || {};
      await interaction.reply(`📋 Configurações:\nCanal de logs: ${settings.logChannelId || "não definido"}\nPalavras bloqueadas: ${blockedWords.join(", ") || "nenhuma"}`);
    }
  },
  {
    data: {
      name: "userinfo",
      description: "Exibe informações básicas de um usuário",
      options: [
        { type: 6, name: "user", description: "Usuário a verificar", required: true }
      ]
    },
    execute: async (interaction) => {
      const user = interaction.options.getUser("user");
      const member = await interaction.guild.members.fetch(user.id);
      await interaction.reply(`👤 Usuário: ${user.tag}\nID: ${user.id}\nConta criada em: ${user.createdAt}\nCargo mais alto: ${member.roles.highest.name}`);
    }
  }
];

// ----------------- REGISTRAR COMANDOS AUTOMATICAMENTE -----------------
client.once("ready", async () => {
  log(`✅ BOT ONLINE: ${botName}`);
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    const commandData = slashCommands.map(c => c.data);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commandData });
    log("✅ Todos os comandos slash foram registrados automaticamente!");
  } catch (err) { console.error("🚨 Erro ao registrar comandos slash:", err); }
});

// ----------------- INTERAÇÕES SLASH -----------------
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = slashCommands.find(c => c.data.name === interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
    log(`✅ Comando /${interaction.commandName} usado por ${interaction.user.tag}`);
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: "❌ Ocorreu um erro ao executar o comando.", ephemeral: true });
  }
});

// ----------------- AUTOMOD -----------------
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // LINKS PORNOGRÁFICOS
  if (pornLinks.some(link => message.content.toLowerCase().includes(link))) {
    try {
      await message.delete();
      const muteRole = message.guild.roles.cache.find(r => r.name === "Muted");
      if (muteRole) await message.member.roles.add(muteRole);
      client.mutedUsers.set(message.author.id, Date.now() + 24 * 60 * 60 * 1000);
      await message.author.send("🚨 Você foi mutado por 1 dia por enviar link pornográfico.");
      sendLog(message.guild, `Mutado ${message.author.tag} por link pornográfico.`);
    } catch (err) { console.error(err); }
  }

  // PALAVRAS BLOQUEADAS
  if (blockedWords.some(word => message.content.toLowerCase().includes(word))) {
    try {
      await message.delete();
      const muteRole = message.guild.roles.cache.find(r => r.name === "Muted");
      if (muteRole) await message.member.roles.add(muteRole);
      client.mutedUsers.set(message.author.id, Date.now() + 24 * 60 * 60 * 1000);
      await message.author.send("🚨 Você foi mutado por 1 dia por usar palavras proibidas.");
      sendLog(message.guild, `Mutado ${message.author.tag} por palavra proibida.`);
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
