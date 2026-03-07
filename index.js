const { Client, GatewayIntentBits } = require('discord.js');

// -------- CONFIG --------
const TOKEN = process.env.TOKEN;

const LOG_CHANNEL_ID = "1350550462218113044";
const TARGET_ROLE_ID = "1479667422679138444";
const NOTIFY_USER_ID = "1465203429864374476";

// -------- CLIENT --------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// -------- READY --------
client.once('ready', () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

// -------- RESPOSTA AO SER MENCIONADO --------
client.on('messageCreate', message => {

  if (message.author.bot) return;

  if (message.mentions.has(client.user)) {
    message.reply("shut up nigga");
  }

});

// -------- MEMBRO ENTROU --------
client.on('guildMemberAdd', member => {

  if (member.roles.cache.has(TARGET_ROLE_ID)) {

    const channel = member.guild.channels.cache.get(LOG_CHANNEL_ID);

    if (channel) {
      channel.send(
        `🟢 Entrou com o cargo\nUsuário: <@${member.id}>\nCargo: <@&${TARGET_ROLE_ID}>\n<@${NOTIFY_USER_ID}>`
      );
    }

  }

});

// -------- MEMBRO SAIU --------
client.on('guildMemberRemove', member => {

  if (member.roles.cache.has(TARGET_ROLE_ID)) {

    const channel = member.guild.channels.cache.get(LOG_CHANNEL_ID);

    if (channel) {
      channel.send(
        `🔴 Saiu do servidor com o cargo\nUsuário: <@${member.id}>\nCargo: <@&${TARGET_ROLE_ID}>\n<@${NOTIFY_USER_ID}>`
      );
    }

  }

});

// -------- GANHOU / PERDEU CARGO --------
client.on('guildMemberUpdate', (oldMember, newMember) => {

  const hadRole = oldMember.roles.cache.has(TARGET_ROLE_ID);
  const hasRole = newMember.roles.cache.has(TARGET_ROLE_ID);

  const channel = newMember.guild.channels.cache.get(LOG_CHANNEL_ID);

  if (!channel) return;

  if (!hadRole && hasRole) {

    channel.send(
      `🟢 Ganhou o cargo\nUsuário: <@${newMember.id}>\nCargo: <@&${TARGET_ROLE_ID}>\n<@${NOTIFY_USER_ID}>`
    );

  }

  if (hadRole && !hasRole) {

    channel.send(
      `🔴 Perdeu o cargo\nUsuário: <@${newMember.id}>\nCargo: <@&${TARGET_ROLE_ID}>\n<@${NOTIFY_USER_ID}>`
    );

  }

});

// -------- LOGIN --------
client.login(TOKEN);
