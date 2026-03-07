const { Client, GatewayIntentBits } = require("discord.js");

const TOKEN = process.env.TOKEN;

const ROLE_ID = "1479888687033483294";
const LOG_CHANNEL_ID = "1479521982356652194";
const NOTIFY_USER_ID = "1465203429864374476";

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMembers
]
});

client.once("ready", () => {
console.log(`✅ Bot online como ${client.user.tag}`);
});

// entrou no servidor

client.on("guildMemberAdd", member => {

if(member.roles.cache.has(ROLE_ID)){

const channel = member.guild.channels.cache.get(LOG_CHANNEL_ID);

if(channel){

channel.send(
`🟢 Usuário entrou com o cargo\nUsuário: <@${member.id}>\nCargo: <@&${ROLE_ID}>\n<@${NOTIFY_USER_ID}>`
);

}

}

});

// saiu do servidor

client.on("guildMemberRemove", member => {

if(member.roles.cache.has(ROLE_ID)){

const channel = member.guild.channels.cache.get(LOG_CHANNEL_ID);

if(channel){

channel.send(
`🔴 Usuário saiu com o cargo\nUsuário: <@${member.id}>\nCargo: <@&${ROLE_ID}>\n<@${NOTIFY_USER_ID}>`
);

}

}

});

// ganhou ou perdeu cargo

client.on("guildMemberUpdate", (oldMember,newMember)=>{

const hadRole = oldMember.roles.cache.has(ROLE_ID);
const hasRole = newMember.roles.cache.has(ROLE_ID);

const channel = newMember.guild.channels.cache.get(LOG_CHANNEL_ID);

if(!channel) return;

if(!hadRole && hasRole){

channel.send(
`🟢 Usuário ganhou o cargo\nUsuário: <@${newMember.id}>\nCargo: <@&${ROLE_ID}>\n<@${NOTIFY_USER_ID}>`
);

}

if(hadRole && !hasRole){

channel.send(
`🔴 Usuário perdeu o cargo\nUsuário: <@${newMember.id}>\nCargo: <@&${ROLE_ID}>\n<@${NOTIFY_USER_ID}>`
);

}

});

client.login(TOKEN);
