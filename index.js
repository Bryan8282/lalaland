// ================= Monkey D' Bryan - Index.js =================
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const mongoose = require("mongoose");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");

// ----------------- CONFIGURAÇÃO -----------------
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;
const MONGO_URI = process.env.MONGO_URI;

const botName = "Monkey D' Bryan";

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
const blockedWords = ["estrupado","estrupada"];
const pornLinks = ["porn.com","xxx.com"];

// ----------------- LOGS -----------------
function log(message){ console.log(`[LOG] ${new Date().toLocaleString()}: ${message}`); }
async function sendLog(guild, description){
  const logChannelId = guild.settings?.logChannelId;
  if(!logChannelId) return;
  const channel = guild.channels.cache.get(logChannelId);
  if(!channel) return;
  const embed = new EmbedBuilder().setTitle(`${botName} Logs`).setDescription(description).setColor("Red").setTimestamp();
  await channel.send({content:`<@${OWNER_ID}>`, embeds:[embed]});
}

// ----------------- MONGODB -----------------
mongoose.connect(MONGO_URI).then(()=>log("✅ Conectado ao MongoDB")).catch(err=>console.error("🚨 Erro ao conectar MongoDB:",err));

// ----------------- FUNÇÃO DE RISCO -----------------
function calculateRisk(user){
  let risk = 0;
  const name = user.username.toLowerCase();
  if(!user.avatar) risk+=20;
  if(!user.banner) risk+=20;
  if(user.createdAt > new Date(Date.now()-7*24*60*60*1000)) risk+=40;
  if(name.length<3) risk+=10;
  if(/^[0-9]+$/.test(name)) risk+=20;
  if(/[^a-z0-9]/i.test(name)) risk+=10;
  if(name.length>3 && name.split("").every(c=>Math.random()<0.5)) risk+=30; // nome aleatório sintético
  return risk>100?100:risk;
}
function isNameRandom(name){ return name.length>3 && name.split("").every(c=>Math.random()<0.5); }

// ----------------- COMANDOS SLASH -----------------
const slashCommands = [
  {data:{name:"ping", description:"Responde com Pong!"}, execute: async (interaction)=>await interaction.reply("🏓 Pong!")},
  
  {data:{name:"profile", description:"Avalia risco de perfil de um usuário",
    options:[{type:6,name:"user",description:"Usuário para avaliar",required:true}]
  },
  execute: async (interaction)=>{
    const user = interaction.options.getUser("user");
    const risk = calculateRisk(user);
    const embed = new EmbedBuilder()
      .setTitle(`Perfil de ${user.tag}`)
      .setDescription(`📊 Nota de risco: ${risk}/100`)
      .addFields({name:"Conta criada em", value:`${user.createdAt}`})
      .setColor(risk>60?"Red":risk>30?"Yellow":"Green");
    await interaction.reply({embeds:[embed]});
    sendLog(interaction.guild, `Comando /profile usado em ${user.tag}. Nota de risco: ${risk}`);
  }},

  {data:{name:"compare", description:"Compara duas contas e mostra semelhanças",
    options:[
      {type:6,name:"user1",description:"Primeiro usuário",required:true},
      {type:6,name:"user2",description:"Segundo usuário",required:true}
    ]
  },
  execute: async (interaction)=>{
    const u1 = interaction.options.getUser("user1");
    const u2 = interaction.options.getUser("user2");
    const embed = new EmbedBuilder().setTitle(`Comparação: ${u1.tag} x ${u2.tag}`).setColor("Blue");
    let texto = "";
    texto += `Avatar: ${u1.avatar && u2.avatar ? "mesmo" : "diferente ou ausente"}\n`;
    texto += `Banner: ${u1.banner && u2.banner ? "mesmo" : "diferente ou ausente"}\n`;
    texto += `Nome suspeito: ${isNameRandom(u1.username) && isNameRandom(u2.username) ? "ambos aleatórios" : "diferença"}\n`;
    texto += `Bio: ${(u1.bio && u2.bio) ? "ambos têm" : "diferença"}\n`;
    texto += `Idade da conta: ${u1.createdAt.toDateString() === u2.createdAt.toDateString() ? "mesma" : "diferente"}\n`;
    embed.setDescription(texto);
    await interaction.reply({embeds:[embed]});
    sendLog(interaction.guild, `/compare usado entre ${u1.tag} e ${u2.tag}`);
  }},

  // ---------------- OUTROS COMANDOS PLANEJADOS ----------------
  // mute, unmute, warn, kick, banconfirm, mutelist, setlog, showlogs, config, userinfo, stats, finduser, filterlogs
  // Para cada um você adicionaria data e execute como os exemplos acima
];

// ----------------- REGISTRAR COMANDOS -----------------
client.once("ready", async ()=>{
  log(`✅ BOT ONLINE: ${botName}`);
  const rest = new REST({version:"10"}).setToken(TOKEN);
  try{
    const commandData = slashCommands.map(c=>c.data);
    await rest.put(Routes.applicationCommands(CLIENT_ID), {body:commandData});
    log("✅ Todos os comandos slash registrados!");
  }catch(err){console.error("🚨 Erro ao registrar comandos slash:",err);}
});

// ----------------- INTERAÇÕES -----------------
client.on("interactionCreate", async (interaction)=>{
  if(interaction.isButton()){
    const [action, userId] = interaction.customId.split("_");
    const member = await interaction.guild.members.fetch(userId).catch(()=>null);
    if(!member) return;
    if(action==="ban"){
      await member.ban({reason:"Ban confirmado pelo Owner"});
      interaction.update({content:`✅ ${member.user.tag} banido!`, components:[]});
      sendLog(interaction.guild, `Ban confirmado: ${member.user.tag}`);
    }else if(action==="noban"){
      interaction.update({content:`❌ Ban cancelado: ${member.user.tag}`, components:[]});
    }
  }

  if(!interaction.isCommand()) return;
  const command = slashCommands.find(c=>c.data.name===interaction.commandName);
  if(!command) return;
  try{ await command.execute(interaction); log(`✅ /${interaction.commandName} usado por ${interaction.user.tag}`);}
  catch(err){ console.error(err); await interaction.reply({content:"❌ Ocorreu um erro", ephemeral:true}); }
});

// ----------------- AUTOMOD -----------------
client.on("messageCreate", async (message)=>{
  if(message.author.bot) return;
  if(message.mentions.has(client.user)) return message.reply("shut up nigga");

  if(pornLinks.some(l=>message.content.toLowerCase().includes(l)) || blockedWords.some(w=>message.content.toLowerCase().includes(w))){
    try{
      await message.delete();
      const muteRole = message.guild.roles.cache.find(r=>r.name==="Muted");
      if(muteRole) await message.member.roles.add(muteRole);
      client.mutedUsers.set(message.author.id,Date.now()+24*60*60*1000);
      await message.author.send("🚨 Você foi mutado por 1 dia por violar regras do servidor.");
      sendLog(message.guild, `Mutado ${message.author.tag} pelo AutoMod`);
    }catch(err){console.error(err);}
  }
});

// ----------------- DESMUTE AUTOMÁTICO -----------------
setInterval(()=>{
  client.mutedUsers.forEach(async (unmuteAt,userId)=>{
    if(Date.now()>unmuteAt){
      try{
        for(const [,guild] of client.guilds.cache){
          const member = await guild.members.fetch(userId).catch(()=>null);
          if(member){
            const muteRole = guild.roles.cache.find(r=>r.name==="Muted");
            if(muteRole && member.roles.cache.has(muteRole.id)){
              await member.roles.remove(muteRole);
              client.mutedUsers.delete(userId);
              sendLog(guild, `Usuário ${member.user.tag} desmutado automaticamente`);
              log(`Usuário desmutado: ${member.user.tag}`);
            }
          }
        }
      }catch(err){console.error(err);}
    }
  });
},10*1000);

// ----------------- AVALIAÇÃO DE NOVOS MEMBROS -----------------
client.on("guildMemberAdd", async member => {
  const risk = calculateRisk(member.user);

  if(!member.guild.settings || !member.guild.settings.logChannelId) return;
  const logChannel = member.guild.channels.cache.get(member.guild.settings.logChannelId);
  if(!logChannel) return;

  const embed = new EmbedBuilder()
    .setTitle(`Novo membro avaliado: ${member.user.tag}`)
    .setDescription(`📊 Nota de risco: ${risk}/100\n🆔 ID: ${member.user.id}`)
    .setColor(risk > 60 ? "Red" : risk > 30 ? "Yellow" : "Green")
    .setTimestamp();

  logChannel.send({embeds: [embed]});
  log(`Novo membro avaliado: ${member.user.tag}, risco: ${risk}`);
});

// ----------------- LOGIN -----------------
client.login(TOKEN).then(()=>log("✅ Tentativa de login enviada ao Discord")).catch(err=>console.error("🚨 Erro ao conectar:",err));
