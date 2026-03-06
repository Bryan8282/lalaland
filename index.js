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

// ----------------- COMANDOS SLASH -----------------
const slashCommands = [
  {data:{name:"ping", description:"Responde com Pong!"}, execute: async (interaction)=>await interaction.reply("🏓 Pong!")},

  {data:{
    name:"profile", description:"Avalia risco de perfil de um usuário",
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

  {data:{
    name:"compare", description:"Compara duas contas e mostra semelhanças",
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

  {data:{name:"mute", description:"Muta um usuário manualmente",
    options:[{type:6,name:"user",description:"Usuário a mutar",required:true},{type:4,name:"tempo",description:"Tempo em horas",required:false}]
  },
  execute: async (interaction)=>{
    const member = interaction.options.getMember("user");
    const tempo = interaction.options.getInteger("tempo")||24;
    const muteRole = interaction.guild.roles.cache.find(r=>r.name==="Muted");
    if(muteRole) await member.roles.add(muteRole);
    client.mutedUsers.set(member.id,Date.now()+tempo*60*60*1000);
    await interaction.reply(`✅ ${member.user.tag} mutado por ${tempo}h`);
    sendLog(interaction.guild, `${member.user.tag} mutado manualmente por ${tempo}h`);
  }},

  {data:{name:"unmute", description:"Desmuta um usuário manualmente",
    options:[{type:6,name:"user",description:"Usuário a desmutar",required:true}]
  },
  execute: async (interaction)=>{
    const member = interaction.options.getMember("user");
    const muteRole = interaction.guild.roles.cache.find(r=>r.name==="Muted");
    if(muteRole && member.roles.cache.has(muteRole.id)){
      await member.roles.remove(muteRole);
      client.mutedUsers.delete(member.id);
      await interaction.reply(`✅ ${member.user.tag} desmutado!`);
      sendLog(interaction.guild, `${member.user.tag} desmutado manualmente`);
    }
  }},

  {data:{name:"warn", description:"Registra um aviso para um usuário",
    options:[{type:6,name:"user",description:"Usuário a avisar",required:true},{type:3,name:"motivo",description:"Motivo do aviso",required:true}]
  },
  execute: async (interaction)=>{
    const member = interaction.options.getMember("user");
    const motivo = interaction.options.getString("motivo");
    await interaction.reply(`⚠️ ${member.user.tag} recebeu aviso: ${motivo}`);
    sendLog(interaction.guild, `/warn usado em ${member.user.tag}: ${motivo}`);
  }},

  {data:{name:"kick", description:"Kicka um usuário",
    options:[{type:6,name:"user",description:"Usuário a kickar",required:true}]
  },
  execute: async (interaction)=>{
    const member = interaction.options.getMember("user");
    await member.kick();
    await interaction.reply(`✅ ${member.user.tag} kickado!`);
    sendLog(interaction.guild, `/kick usado em ${member.user.tag}`);
  }},

  {data:{name:"banconfirm", description:"Botão para confirmar banimento de alertas Anti-Raid",
    options:[{type:6,name:"user",description:"Usuário a banir",required:true}]
  },
  execute: async (interaction)=>{
    const member = interaction.options.getMember("user");
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId(`ban_${member.id}`).setLabel("Confirmar Ban").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`noban_${member.id}`).setLabel("Não Ban").setStyle(ButtonStyle.Secondary)
      );
    await interaction.reply({content:`Alerta Anti-Raid! Deseja banir ${member.user.tag}?`, components:[row]});
  }},

  {data:{name:"mutelist", description:"Lista de usuários mutados"},
  execute: async (interaction)=>{
    let texto = "Usuários mutados:\n";
    client.mutedUsers.forEach((time,id)=>texto+=`<@${id}> - desmute em ${new Date(time).toLocaleString()}\n`);
    await interaction.reply(texto);
  }},

  {data:{name:"setlog", description:"Define canal de logs",
    options:[{type:7,name:"canal",description:"Canal de logs",required:true}]
  },
  execute: async (interaction)=>{
    const channel = interaction.options.getChannel("canal");
    interaction.guild.settings = interaction.guild.settings||{};
    interaction.guild.settings.logChannelId = channel.id;
    await interaction.reply(`✅ Canal de logs definido para ${channel}`);
    log(`Canal de logs atualizado: ${channel.name}`);
  }},

  {data:{name:"showlogs", description:"Mostra últimos logs do servidor"},
  execute: async (interaction)=>{ await interaction.reply("📄 Exibindo logs (simulação)"); }},

  {data:{name:"config", description:"Mostra configurações do servidor"},
  execute: async (interaction)=>{
    const settings = interaction.guild.settings||{};
    await interaction.reply(`📋 Configurações:\nCanal de logs: ${settings.logChannelId||"não definido"}\nPalavras bloqueadas: ${blockedWords.join(", ")||"nenhuma"}`);
  }},

  {data:{name:"userinfo", description:"Exibe informações básicas de um usuário",
    options:[{type:6,name:"user",description:"Usuário a verificar",required:true}]
  },
  execute: async (interaction)=>{
    const user = interaction.options.getUser("user");
    const member = await interaction.guild.members.fetch(user.id);
    await interaction.reply(`👤 Usuário: ${user.tag}\nID: ${user.id}\nConta criada em: ${user.createdAt}\nCargo mais alto: ${member.roles.highest.name}`);
  }},

  {data:{name:"stats", description:"Mostra estatísticas do servidor"},
  execute: async (interaction)=>{
    const mutados = client.mutedUsers.size;
    const embed = new EmbedBuilder()
      .setTitle("📊 Estatísticas")
      .addFields({name:"Usuários mutados", value:`${mutados}`})
      .setColor("Blue");
    await interaction.reply({embeds:[embed]});
  }},

  {data:{name:"finduser", description:"Busca usuários por nome ou ID",
    options:[{type:3,name:"termo",description:"Nome ou ID do usuário",required:true}]
  },
  execute: async (interaction)=>{
    const termo = interaction.options.getString("termo").toLowerCase();
    const members = interaction.guild.members.cache.filter(m=>m.user.username.toLowerCase().includes(termo) || m.user.id===termo);
    if(!members.size) return interaction.reply("❌ Nenhum usuário encontrado.");
    await interaction.reply(`🔍 Usuários encontrados:\n${members.map(m=>m.user.tag).join("\n")}`);
  }},

  {data:{name:"filterlogs", description:"Filtra logs por tipo",
    options:[{type:3,name:"tipo",description:"Tipo de log: AutoMod, Mute, Ban",required:true}]
  },
  execute: async (interaction)=>{ await interaction.reply("📄 Filtrando logs (simulação)"); }},
];

// ----------------- AUX -----------------
function isNameRandom(name){ return name.length>3 && name.split("").every(c=>Math.random()<0.5); }

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

  // resposta ao marcar o bot
  if(message.mentions.has(client.user)) return message.reply("shut up nigga");

  // filtragem AutoMod
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
client.on("guildMemberAdd", async member=>{
  const risk = calculateRisk(member.user);
  sendLog(member.guild, `Novo membro: ${member.user.tag}. Nota de risco: ${risk}/100`);
  log(`Avaliação de perfil do novo membro: ${member.user.tag}, risco: ${risk}`);
});

// ----------------- LOGIN -----------------
client.login(TOKEN).then(()=>log("✅ Tentativa de login enviada ao Discord")).catch(err=>console.error("🚨 Erro ao conectar:",err));
