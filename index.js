const { 
Client,
GatewayIntentBits,
REST,
Routes,
SlashCommandBuilder
} = require('discord.js');

// -------- CONFIG --------
const TOKEN = process.env.TOKEN;

const CLIENT_ID = process.env.CLIENT_ID; // ID do bot
const GUILD_ID = process.env.GUILD_ID; // ID do servidor

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

// -------- SLASH COMMANDS --------
const commands = [

new SlashCommandBuilder()
.setName('list')
.setDescription('Lista todos os cargos e canais do servidor')

].map(command => command.toJSON());

// -------- REGISTRAR COMANDOS --------
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {

    console.log('Registrando comandos...');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log('Comandos registrados.');

  } catch (error) {
    console.error(error);
  }
})();

// -------- READY --------
client.once('ready', () => {
  console.log(`✅ Bot online como ${client.user.tag}`);
});

// -------- RESPONDER MENCIONADO --------
client.on('messageCreate', message => {

if(message.author.bot) return;

if(message.mentions.has(client.user)){
message.reply("shut up nigga");
}

});

// -------- SLASH COMMAND --------
client.on('interactionCreate', async interaction => {

if(!interaction.isChatInputCommand()) return;

if(interaction.commandName === 'list'){

const roles = interaction.guild.roles.cache
.map(r => `• ${r.name} - ${r.id}`)
.join("\n");

const channels = interaction.guild.channels.cache
.map(c => `• ${c.name} - ${c.id}`)
.join("\n");

interaction.reply({
content:`📋 **CARGOS**\n${roles}\n\n📋 **CANAIS**\n${channels}`,
ephemeral:true
});

}

});

// -------- MEMBRO ENTROU --------
client.on('guildMemberAdd', member => {

if(member.roles.cache.has(TARGET_ROLE_ID)){

const channel = member.guild.channels.cache.get(LOG_CHANNEL_ID);

if(channel){
channel.send(`🟢 Entrou com o cargo\n<@${member.id}>\n<@${NOTIFY_USER_ID}>`);
}

}

});

// -------- MEMBRO SAIU --------
client.on('guildMemberRemove', member => {

if(member.roles.cache.has(TARGET_ROLE_ID)){

const channel = member.guild.channels.cache.get(LOG_CHANNEL_ID);

if(channel){
channel.send(`🔴 Saiu com o cargo\n<@${member.id}>\n<@${NOTIFY_USER_ID}>`);
}

}

});

// -------- GANHOU / PERDEU CARGO --------
client.on('guildMemberUpdate', (oldMember,newMember)=>{

const hadRole = oldMember.roles.cache.has(TARGET_ROLE_ID);
const hasRole = newMember.roles.cache.has(TARGET_ROLE_ID);

const channel = newMember.guild.channels.cache.get(LOG_CHANNEL_ID);

if(!channel) return;

if(!hadRole && hasRole){

channel.send(`🟢 Ganhou o cargo\n<@${newMember.id}>\n<@${NOTIFY_USER_ID}>`);

}

if(hadRole && !hasRole){

channel.send(`🔴 Perdeu o cargo\n<@${newMember.id}>\n<@${NOTIFY_USER_ID}>`);

}

});

// -------- LOGIN --------
client.login(TOKEN);
