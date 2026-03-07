const { Client, GatewayIntentBits, Partials } = require('discord.js');
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

// ----------------- LOGS DE CARGO -----------------
client.on('guildMemberAdd', member => {
  if(member.roles.cache.has(config.TARGET_ROLE_ID)){
    const channel = member.guild.channels.cache.get(config.LOG_CHANNEL_ID);
    if(channel) channel.send(`🟢 <@${member.id}> entrou no servidor com o cargo <@&${config.TARGET_ROLE_ID}>.`);
  }
});

client.on('guildMemberRemove', member => {
  if(member.roles.cache.has(config.TARGET_ROLE_ID)){
    const channel = member.guild.channels.cache.get(config.LOG_CHANNEL_ID);
    if(channel) channel.send(`🔴 <@${member.id}> saiu do servidor com o cargo <@&${config.TARGET_ROLE_ID}>.`);
  }
});

// ----------------- LOGIN -----------------
client.login(TOKEN).then(() => console.log(`✅ Bot online como ${client.user.tag}`))
.catch(err => console.error('❌ Erro ao logar o bot:', err));
