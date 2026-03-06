const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const mongoose = require("mongoose");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;
const MONGO_URI = process.env.MONGO_URI;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

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
client.guildLogs = new Map();
client.userXP = new Map();
client.userWarns = new Map();

const blockedWords = ["estrupado","estrupada"];
const pornLinks = ["porn.com","xxx.com"];

// ----------------- LOGS -----------------
function log(message){ console.log(`[LOG] ${new Date().toLocaleString()}: ${message}`); }
async function sendLog(guild, description){
  const logChannelId = client.guildLogs.get(guild.id) || LOG_CHANNEL_ID;
  if(!logChannelId) return;
  const channel = guild.channels.cache.get(logChannelId);
  if(!channel) return;
  const embed = new EmbedBuilder().setTitle(`${botName} Logs`).setDescription(description).setColor("Red").setTimestamp();
  await channel.send({content:`<@${OWNER_ID}>`, embeds:[embed]});
}

// ----------------- MONGODB -----------------
mongoose.connect(MONGO_URI).then(()=>log("✅ Conectado ao MongoDB")).catch(err=>console.error("🚨 Erro ao conectar MongoDB:",err));

// ----------------- RISCO -----------------
function calculateRisk(user){
  let risk = 0;
  const name = user.username.toLowerCase();
  if(!user.avatar) risk+=20;
  if(!user.banner) risk+=20;
  if(user.createdAt > new Date(Date.now()-7*24*60*60*1000)) risk+=40;
  if(name.length<3) risk+=10;
  if(/^[0-9]+$/.test(name)) risk+=20;
  if(/[^a-z0-9]/i.test(name)) risk+=10;
  if(name.length>3 && name.split("").every(c=>Math.random()<0.5)) risk+=30;
  return risk>100?100:risk;
}
function isNameRandom(name){ return name.length>3 && name.split("").every(c=>Math.random()<0.5); }

// ----------------- BARRAS VISUAIS -----------------
function createBar(value,max,length=20){
  const filled = Math.round(value/max*length);
  const empty = length-filled;
  return "🟩".repeat(filled)+"⬜".repeat(empty);
}

// ----------------- COMANDOS SLASH -----------------
const slashCommands = [
  {
    data: { name:"help", description:"Mostra todos os comandos disponíveis do bot" },
    execute: async (interaction) => {
      const embed = new EmbedBuilder().setTitle(`${botName} - Comandos`).setColor("Blue").setTimestamp();
      const commandList = slashCommands.map(c=>`**/${c.data.name}**: ${c.data.description}`).join("\n");
      embed.setDescription(commandList);
      await interaction.reply({embeds:[embed], ephemeral:true});
      sendLog(interaction.guild, `/help usado por ${interaction.user.tag}`);
    }
  },
  {
    data: { name:"profile", description:"Avalia risco de perfil de um usuário",
      options:[{type:6,name:"user",description:"Usuário para avaliar",required:true}]
    },
    execute: async (interaction)=>{
      const user = interaction.options.getUser("user");
      const risk = calculateRisk(user);
      const embed = new EmbedBuilder()
        .setTitle(`Perfil de ${user.tag}`)
        .setDescription(`📊 Nota de risco: ${risk}/100\n${createBar(risk,100)}`)
        .addFields({name:"Conta criada em", value:`${user.createdAt}`})
        .setColor(risk>60?"Red":risk>30?"Yellow":"Green");
      await interaction.reply({embeds:[embed]});
      sendLog(interaction.guild, `/profile usado em ${user.tag}. Nota: ${risk}`);
    }
  },
  {
    data: { name:"compare", description:"Compara duas contas e mostra semelhanças",
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
      texto += `Avatar: ${u1.avatar && u2.avatar ? "✅ Mesmo" : "❌ Diferente"}\n`;
      texto += `Banner: ${u1.banner && u2.banner ? "✅ Mesmo" : "❌ Diferente"}\n`;
      texto += `Nome aleatório: ${isNameRandom(u1.username) && isNameRandom(u2.username) ? "⚠️ Ambos aleatórios" : "✅ Normal"}\n`;
      texto += `Idade da conta: ${u1.createdAt.toDateString()===u2.createdAt.toDateString() ? "✅ Mesma" : "❌ Diferente"}\n`;
      embed.setDescription(texto);
      await interaction.reply({embeds:[embed]});
      sendLog(interaction.guild, `/compare usado entre ${u1.tag} e ${u2.tag}`);
    }
  },
  {
    data:{name:"mute", description:"Silencia um usuário",
      options:[
        {type:6,name:"user",description:"Usuário a mutar",required:true},
        {type:4,name:"duration",description:"Duração em minutos",required:false}
      ]
    },
    execute: async (interaction)=>{
      const user = interaction.options.getUser("user");
      const duration = interaction.options.getInteger("duration") || 60;
      const member = await interaction.guild.members.fetch(user.id);
      const muteRole = interaction.guild.roles.cache.find(r=>r.name==="Muted");
      if(muteRole) await member.roles.add(muteRole);
      client.mutedUsers.set(user.id,Date.now()+duration*60*1000);
      const embed = new EmbedBuilder().setTitle(`🔇 Usuário Mutado`).setColor("Orange")
        .addFields({name:"Usuário", value:user.tag},{name:"Duração", value:`${duration} minutos`})
        .setTimestamp();
      await interaction.reply({embeds:[embed]});
      try{ await user.send(`🚨 Você foi mutado por ${duration} minutos.`); } catch{}
      sendLog(interaction.guild, `${user.tag} mutado por ${duration} minutos`);
    }
  },
  {
    data:{name:"unmute", description:"Desmutar usuário", options:[{type:6,name:"user",description:"Usuário a desmutar",required:true}]},
    execute: async (interaction)=>{
      const user = interaction.options.getUser("user");
      const member = await interaction.guild.members.fetch(user.id);
      const muteRole = interaction.guild.roles.cache.find(r=>r.name==="Muted");
      if(muteRole && member.roles.cache.has(muteRole.id)) await member.roles.remove(muteRole);
      client.mutedUsers.delete(user.id);
      const embed = new EmbedBuilder().setTitle(`🔊 Usuário Desmutado`).setColor("Green")
        .addFields({name:"Usuário", value:user.tag}).setTimestamp();
      await interaction.reply({embeds:[embed]});
      try{ await user.send(`✅ Você foi desmutado.`); } catch{}
      sendLog(interaction.guild, `${user.tag} desmutado`);
    }
  },
  {
    data:{name:"warn", description:"Aviso para usuário",
      options:[{type:6,name:"user",description:"Usuário a avisar",required:true},{type:3,name:"reason",description:"Motivo",required:false}]
    },
    execute: async (interaction)=>{
      const user = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason") || "Não especificado";
      client.userWarns.set(user.id,(client.userWarns.get(user.id)||0)+1);
      const embed = new EmbedBuilder().setTitle(`⚠️ Aviso`).setColor("Yellow")
        .addFields({name:"Usuário", value:user.tag},{name:"Motivo", value:reason})
        .setTimestamp();
      await interaction.reply({embeds:[embed]});
      try{ await user.send(`⚠️ Você recebeu um aviso. Motivo: ${reason}`); } catch{}
      sendLog(interaction.guild, `Aviso aplicado em ${user.tag}. Motivo: ${reason}`);
    }
  },
  {
    data:{name:"kick", description:"Expulsa usuário do servidor",
      options:[{type:6,name:"user",description:"Usuário a expulsar",required:true},{type:3,name:"reason",description:"Motivo",required:false}]
    },
    execute: async (interaction)=>{
      const user = interaction.options.getUser("user");
      const reason = interaction.options.getString("reason") || "Não especificado";
      const member = await interaction.guild.members.fetch(user.id);
      await member.kick(reason);
      const embed = new EmbedBuilder().setTitle(`👢 Usuário Expulso`).setColor("Red")
        .addFields({name:"Usuário", value:user.tag},{name:"Motivo", value:reason}).setTimestamp();
      await interaction.reply({embeds:[embed]});
      try{ await user.send(`❌ Você foi expulso. Motivo: ${reason}`); } catch{}
      sendLog(interaction.guild, `Kick aplicado em ${user.tag}. Motivo: ${reason}`);
    }
  },
  {
    data:{name:"ban", description:"Bane usuário com botão de confirmação",
      options:[{type:6,name:"user",description:"Usuário a banir",required:true}]
    },
    execute: async (interaction)=>{
      const user = interaction.options.getUser("user");
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ban_${user.id}`).setLabel("Confirmar Ban").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`noban_${user.id}`).setLabel("Cancelar").setStyle(ButtonStyle.Secondary)
      );
      await interaction.reply({content:`Você deseja banir ${user.tag}?`, components:[row]});
    }
  },
  {
    data:{name:"mutelist", description:"Mostra ranking de mutados"},
    execute: async (interaction)=>{
      const sorted = Array.from(client.mutedUsers.entries()).sort((a,b)=>b[1]-a[1]);
      const texto = sorted.map(([id, time],i)=>`**#${i+1}** <@${id}> - termina em <t:${Math.floor(time/1000)}:R> ${createBar(time/1000,86400)}`).join("\n") || "Nenhum usuário mutado";
      const embed = new EmbedBuilder().setTitle(`🔇 Ranking de Mutados`).setDescription(texto).setColor("Purple").setTimestamp();
      await interaction.reply({embeds:[embed]});
    }
  },
  {
    data:{name:"warnlist", description:"Mostra ranking de warns"},
    execute: async (interaction)=>{
      const sorted = Array.from(client.userWarns.entries()).sort((a,b)=>b[1]-a[1]);
      const texto = sorted.map(([id, count],i)=>`**#${i+1}** <@${id}> - ${count} warn(s)`).join("\n") || "Nenhum usuário avisado";
      const embed = new EmbedBuilder().setTitle(`⚠️ Ranking de Warns`).setDescription(texto).setColor("Yellow").setTimestamp();
      await interaction.reply({embeds:[embed]});
    }
  },
  {
    data:{name:"rank", description:"Painel completo de XP, mutes e warns"},
    execute: async (interaction)=>{
      const embed = new EmbedBuilder().setTitle("📊 Painel Completo").setColor("Blue").setTimestamp();
      const mutelist = Array.from(client.mutedUsers.entries()).sort((a,b)=>b[1]-a[1]).map(([id,time],i)=>`**#${i+1}** <@${id}> - termina em <t:${Math.floor(time/1000)}:R>`);
      const warnlist = Array.from(client.userWarns.entries()).sort((a,b)=>b[1]-a[1]).map(([id,count],i)=>`**#${i+1}** <@${id}> - ${count} warn(s)`);
      embed.setDescription(`🔇 Mutados:\n${mutelist.join("\n")||"Nenhum"}\n\n⚠️ Warns:\n${warnlist.join("\n")||"Nenhum"}`);
      await interaction.reply({embeds:[embed]});
    }
  },
  {
    data:{name:"setlog", description:"Define canal de logs", options:[{type:7,name:"channel",description:"Canal de logs",required:true}]},
    execute: async (interaction)=>{
      const channel = interaction.options.getChannel("channel");
      client.guildLogs.set(interaction.guild.id, channel.id);
      await interaction.reply({content:`✅ Canal de logs definido para ${channel}`});
      log(`Canal de logs do servidor ${interaction.guild.name} definido para ${channel.name}`);
    }
  }
];

// ----------------- REGISTRAR COMANDOS -----------------
client.once("ready", async ()=>{
  log(`✅ BOT ONLINE: ${botName}`);
  const rest = new REST({version:"10"}).setToken(TOKEN);
  try{
    const commandData = slashCommands.map(c=>c.data);
    await rest.put(Routes.applicationCommands(CLIENT_ID), {body:commandData});
    log("✅ Todos os comandos slash registrados!");
  }catch(err){ console.error("🚨 Erro ao registrar comandos slash:",err);}
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
  catch(err){console.error(err); await interaction.reply({content:"❌ Ocorreu um erro", ephemeral:true}); }
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
  const logChannelId = client.guildLogs.get(member.guild.id) || LOG_CHANNEL_ID;
  if(!logChannelId) return;
  const logChannel = member.guild.channels.cache.get(logChannelId);
  if(!logChannel) return;

  const embed = new EmbedBuilder()
    .setTitle(`Novo membro avaliado: ${member.user.tag}`)
    .setDescription(`📊 Nota de risco: ${risk}/100\n${createBar(risk,100)}\n🆔 ID: ${member.user.id}`)
    .setColor(risk > 60 ? "Red" : risk > 30 ? "Yellow" : "Green")
    .setTimestamp();

  logChannel.send({embeds:[embed]});
});

// ----------------- LOGIN -----------------
client.login(TOKEN).catch(err=>console.error("🚨 Erro ao logar o bot:",err));
