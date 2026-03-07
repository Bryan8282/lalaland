const { 
Client,
GatewayIntentBits,
SlashCommandBuilder,
REST,
Routes,
Events
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1479572164796747786";

const ROLE_ID = "1479888687033483294";
const LOG_CHANNEL_ID = "1479521982356652194";
const NOTIFY_USER_ID = "1465203429864374476";

let mentionReply = "me mencionou?";

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent
]
});

client.once("ready", () => {
console.log(`✅ Bot online como ${client.user.tag}`);
});


// COMANDOS SLASH

const commands = [

new SlashCommandBuilder()
.setName("setreply")
.setDescription("Define a resposta quando mencionarem o bot")
.addStringOption(option =>
option.setName("frase")
.setDescription("Frase que o bot vai responder")
.setRequired(true)
)

].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
try {

await rest.put(
Routes.applicationCommands(CLIENT_ID),
{ body: commands }
);

console.log("✅ Slash commands registrados");

} catch (error) {
console.error(error);
}
})();


// EXECUTAR COMANDOS

client.on(Events.InteractionCreate, async interaction => {

if (!interaction.isChatInputCommand()) return;

if (interaction.commandName === "setreply") {

const frase = interaction.options.getString("frase");

mentionReply = frase;

await interaction.reply("✅ Resposta de menção atualizada.");

}

});


// RESPONDER MENÇÃO

client.on("messageCreate", message => {

if (message.author.bot) return;

if (message.mentions.has(client.user)) {

message.reply(mentionReply);

}

});


// LOG DE CARGO

client.on("guildMemberUpdate", (oldMember,newMember)=>{

const hadRole = oldMember.roles.cache.has(ROLE_ID);
const hasRole = newMember.roles.cache.has(ROLE_ID);

const channel = newMember.guild.channels.cache.get(LOG_CHANNEL_ID);

if(!channel) return;

if(!hadRole && hasRole){

channel.send(`🟢 <@${newMember.id}> ganhou o cargo <@&${ROLE_ID}> <@${NOTIFY_USER_ID}>`);

}

if(hadRole && !hasRole){

channel.send(`🔴 <@${newMember.id}> perdeu o cargo <@&${ROLE_ID}> <@${NOTIFY_USER_ID}>`);

}

});

client.login(TOKEN);
