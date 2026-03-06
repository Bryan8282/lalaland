const { Client, GatewayIntentBits, Partials, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const mongoose = require("mongoose");
require("dotenv").config();

const OWNER_ID = process.env.OWNER_ID;

// MongoDB - Schemas
const guildConfigSchema = new mongoose.Schema({
  guildId: String,
  logChannel: String,
  blockedWords: [String],
  autoMod: Boolean,
  defaultMuteTime: String,
  permissions: Object // {ban: [userIds], mute: [userIds]}
});
const GuildConfig = mongoose.model("GuildConfig", guildConfigSchema);

const commandSchema = new mongoose.Schema({
  name: String,
  description: String,
  guildId: String
});
const Command = mongoose.model("Command", commandSchema);

// Conectar MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Conectado ao MongoDB"))
  .catch(err => console.error("🚨 Erro ao conectar no MongoDB:", err));

// Criar cliente
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

// Registrar comandos dinamicamente
async function registerCommands() {
  const commands = await Command.find({});
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands.map(c => ({ name: c.name, description: c.description })) }
    );
    console.log("✅ Comandos registrados dinamicamente");
  } catch (err) {
    console.error("🚨 Erro ao registrar comandos:", err);
  }
}

client.on("ready", async () => {
  console.log(`✅ BOT ONLINE: ${client.user.tag}`);
  await registerCommands();
});

// Interação de comando
client.on("interactionCreate", async interaction => {
  if (!interaction.isCommand() && !interaction.isButton()) return;

  const guildId = interaction.guildId;
  let config = await GuildConfig.findOne({ guildId });
  if (!config) {
    config = await GuildConfig.create({
      guildId,
      blockedWords: ["estrupado", "estrupada"],
      autoMod: true,
      defaultMuteTime: "1d",
      permissions: {}
    });
  }

  // Comandos
  if (interaction.isCommand()) {
    const { commandName, options, user } = interaction;

    if (commandName === "config") {
      await interaction.reply(`🛠 Configurações:\nCanal de logs: ${config.logChannel || "não definido"}\nAutoMod: ${config.autoMod}`);
    }

    if (commandName === "ban") {
      if (!config.permissions.ban?.includes(user.id) && user.id !== OWNER_ID)
        return interaction.reply("🚫 Você não tem permissão para usar esse comando");

      const member = interaction.options.getMember("user");
      const reason = interaction.options.getString("reason") || "Não especificado";
      if (!member) return interaction.reply("Usuário não encontrado");
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ban_confirm_${member.id}`).setLabel("Confirmar ban").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`ban_cancel_${member.id}`).setLabel("Não banir").setStyle(ButtonStyle.Secondary)
      );
      await interaction.reply({ content: `Deseja banir ${member.user.tag}? Motivo: ${reason}`, components: [row] });
    }

    if (commandName === "mute") {
      if (!config.permissions.mute?.includes(user.id) && user.id !== OWNER_ID)
        return interaction.reply("🚫 Você não tem permissão para usar esse comando");

      const member = interaction.options.getMember("user");
      const time = interaction.options.getString("time") || config.defaultMuteTime;
      if (!member) return interaction.reply("Usuário não encontrado");
      await interaction.reply(`🔇 ${member.user.tag} mutado por ${time}`);
      // Aplicar mute real usando roles/permissions
    }
  }

  // Botões
  if (interaction.isButton()) {
    const [action, type, targetId] = interaction.customId.split("_");
    if (action === "ban" && type === "confirm") {
      const member = interaction.guild.members.cache.get(targetId);
      if (member) {
        await member.ban({ reason: "Confirmado pelo dono" });
        await interaction.update({ content: `${member.user.tag} foi banido ✅`, components: [] });
      }
    }
    if (action === "ban" && type === "cancel") {
      await interaction.update({ content: "Ban cancelado ❌", components: [] });
    }
  }
});

// AutoMod
client.on("messageCreate", async message => {
  if (message.author.bot) return;
  const config = await GuildConfig.findOne({ guildId: message.guild.id });
  if (!config || !config.autoMod) return;

  const lowerMsg = message.content.toLowerCase();
  let blocked = false;

  // Palavras bloqueadas
  for (const word of config.blockedWords) {
    if (lowerMsg.includes(word.toLowerCase())) {
      blocked = true;
      await message.delete().catch(() => {});
      await message.member.timeout(24 * 60 * 60 * 1000, "Palavra bloqueada").catch(() => {});
      break;
    }
  }

  // Links pornográficos
  const pornRegex = /(porn|xxx|sex)/i;
  if (pornRegex.test(message.content)) {
    blocked = true;
    await message.delete().catch(() => {});
    await message.member.timeout(24 * 60 * 60 * 1000, "Link pornográfico").catch(() => {});
  }

  // Log
  if (blocked && config.logChannel) {
    const log = message.guild.channels.cache.get(config.logChannel);
    if (log) log.send(`⚠️ ${message.author.tag} foi mutado por 1 dia. Conteúdo bloqueado: ${message.content}`);
  }
});

// Avaliação de perfil
client.on("guildMemberAdd", async member => {
  const config = await GuildConfig.findOne({ guildId: member.guild.id });
  if (!config || !config.logChannel) return;

  let notes = [];
  const diffDays = (Date.now() - member.user.createdAt) / (1000*60*60*24);
  if (diffDays < 7) notes.push("Conta recém-criada");
  if (/[^a-zA-Z0-9 ]/.test(member.user.username)) notes.push("Nome suspeito");
  if (!member.user.avatar) notes.push("Sem avatar");

  const log = member.guild.channels.cache.get(config.logChannel);
  if (log) log.send(`⚠️ Avaliação de ${member.user.tag}: ${notes.join(", ") || "Tudo OK"} <@${OWNER_ID}>`);
});

client.login(process.env.TOKEN);
