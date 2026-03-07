const { Client, GatewayIntentBits, Partials, SlashCommandBuilder } = require('discord.js');
const config = require('./config.json');

// ----------------- CLIENT -----------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

// ----------------- TOKEN -----------------
const TOKEN = process.env.TOKEN;

// ----------------- COLLECTIONS -----------------
client.commands = new Map(); // Para comandos slash

// ----------------- LOGS DE CARGO -----------------
client.on('guildMemberAdd', member => {
  if(member.roles.cache.has(config.TARGET_ROLE_ID)){
    const channel = member.guild.channels.cache.get(config.LOG_CHANNEL_ID);
    if(channel) channel.send(`🟢 <@${member.id}> entrou no servidor com o cargo <@&${config.TARGET_ROLE_ID}>. <@${config.NOTIFY_USER_ID}>`);
  }
});

client.on('guildMemberRemove', member => {
  if(member.roles.cache.has(config.TARGET_ROLE_ID)){
    const channel = member.guild.channels.cache.get(config.LOG_CHANNEL_ID);
    if(channel) channel.send(`🔴 <@${member.id}> saiu do servidor com o cargo <@&${config.TARGET_ROLE_ID}>. <@${config.NOTIFY_USER_ID}>`);
  }
});

// ----------------- COMANDO /LIST -----------------
client.commands.set('list', {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('Lista todos os cargos e canais do servidor'),
  execute: async interaction => {
    const roles = interaction.guild.roles.cache
      .map(r => `• ${r.name} - ${r.id}`)
      .join("\n");

    const channels = interaction.guild.channels.cache
      .map(c => `• ${c.name} (${c.type}) - ${c.id}`)
      .join("\n");

    const embed = {
      title: "📋 Lista de Cargos e Canais",
      color: 0x00FFFF,
      fields: [
        { name: "Cargos", value: roles || "Nenhum cargo", inline: false },
        { name: "Canais", value: channels || "Nenhum canal", inline: false }
      ]
    };

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});

// ----------------- INTERAÇÃO COM SLASH COMMANDS -----------------
client.on('interactionCreate', async interaction => {
  if(!interaction.isCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if(!command) return;
  try { await command.execute(interaction); }
  catch(err){ console.error(err); interaction.reply({ content:"❌ Ocorreu um erro.", ephemeral:true }); }
});

// ----------------- LOGIN -----------------
client.login(TOKEN).then(() => console.log(`✅ Bot online como ${client.user.tag}`))
.catch(err => console.error('❌ Erro ao logar o bot:', err));
