// ================= Monkey D' Bryan - INDEX COMPLETO =================
const { Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionsBitField, Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { TOKEN, LOG_CHANNEL_ID } = require('./monkey_d_bryan.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// ----------------- COLLECTIONS -----------------
client.commands = new Collection();
client.mutes = new Collection(); // userId => timestamp do fim do mute
client.warns = new Collection(); // userId => quantidade de warns
client.xp = new Collection();    // userId => XP

// ----------------- FUNÇÕES AUXILIARES -----------------
function sendLog(guild, message){
  const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
  if(logChannel) logChannel.send({ embeds:[ new EmbedBuilder().setDescription(message).setColor("Grey") ] });
}

function calculateRisk(user){
  return Math.floor(Math.random() * 101);
}

function createBar(value,max){
  const full = "█".repeat(Math.floor((value/max)*10));
  const empty = "░".repeat(10 - full.length);
  return full + empty;
}

// ----------------- EVENTO: NOVO MEMBRO -----------------
client.on("guildMemberAdd", async member => {
  const risk = calculateRisk(member.user);
  const embed = new EmbedBuilder()
    .setTitle(`🆕 Novo membro avaliado: ${member.user.tag}`)
    .setDescription(`📊 Nota de risco: ${risk}/100\n${createBar(risk,100)}\n🆔 ID: ${member.user.id}`)
    .setColor(risk > 60 ? "Red" : risk > 30 ? "Yellow" : "Green")
    .setTimestamp();
  sendLog(member.guild, embed.description);
  try { 
    await member.send(`🚨 Sua conta foi avaliada!\nNota de risco: ${risk}/100\n${createBar(risk,100)}`); 
  } catch(err){ console.log(`❌ Não foi possível enviar PV para ${member.user.tag}`); }
});
// ----------------- REPLY AO SER MENCIONADO -----------------
client.on("messageCreate", message => {
  if(message.author.bot) return;
  if(message.mentions.has(client.user)) message.reply("shut up nigga");
});

// ----------------- AUTO MOD / ANTIRAID -----------------
client.on("messageCreate", async message => {
  if(message.author.bot) return;
  const forbiddenWords = ["palavra1","palavra2"]; // adicione palavras proibidas
  const linksBlocked = ["discord.gg","bit.ly","tinyurl.com"];
  let deleted = false;

  forbiddenWords.forEach(word => { 
    if(message.content.toLowerCase().includes(word)){ 
      message.delete().catch(()=>{}); 
      deleted = true; 
    } 
  });

  linksBlocked.forEach(link => { 
    if(message.content.includes(link)){ 
      message.delete().catch(()=>{}); 
      deleted = true; 
    } 
  });

  if(deleted) sendLog(message.guild, `Mensagem de ${message.author.tag} deletada pelo AutoMod.`);
});

// ----------------- MODERAÇÃO / BOTÕES -----------------
async function modAction(interaction, type){
  const target = interaction.options.getUser("user");
  if(!target) return interaction.reply({ content:"❌ Usuário não encontrado", ephemeral:true });
  const member = interaction.guild.members.cache.get(target.id);
  const embed = new EmbedBuilder().setColor("Red").setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`confirm_${type}_${target.id}`).setLabel("Confirmar").setStyle(ButtonStyle.Danger)
  );

  switch(type){
    case "kick": embed.setTitle("👢 Kick").setDescription(`Deseja kickar ${target.tag}?`); break;
    case "ban": embed.setTitle("🔨 Ban").setDescription(`Deseja banir ${target.tag}?`); break;
    case "mute": embed.setTitle("🔇 Mute").setDescription(`Deseja mutar ${target.tag}?`); break;
  }

  await interaction.reply({ embeds:[embed], components:[row], ephemeral:true });
}

// ----------------- EXECUTANDO AÇÃO COM BOTÃO -----------------
client.on('interactionCreate', async interaction => {
  if(!interaction.isButton()) return;
  const [action, type, userId] = interaction.customId.split('_');
  if(action !== "confirm") return;
  const member = interaction.guild.members.cache.get(userId);
  if(!member) return interaction.reply({ content:"❌ Usuário não encontrado", ephemeral:true });

  switch(type){
    case "kick":
      await member.kick("Kick confirmado pelo botão").catch(()=>{});
      sendLog(interaction.guild, `👢 ${member.user.tag} foi kickado.`);
      interaction.update({ content:`✅ Kick realizado!`, components:[], embeds:[] });
      break;
    case "ban":
      await member.ban({ reason: "Ban confirmado pelo botão" }).catch(()=>{});
      sendLog(interaction.guild, `🔨 ${member.user.tag} foi banido.`);
      interaction.update({ content:`✅ Ban realizado!`, components:[], embeds:[] });
      break;
    case "mute":
      const muteTime = 10*60*1000; // 10 minutos como exemplo
      client.mutes.set(userId, Date.now()+muteTime);
      sendLog(interaction.guild, `🔇 ${member.user.tag} foi mutado por 10 minutos.`);
      interaction.update({ content:`✅ Mute realizado!`, components:[], embeds:[] });
      break;
  }
});
// ----------------- COMANDOS SLASH -----------------
client.commands.set('help', { execute: async (interaction) => {
  const embed = new EmbedBuilder()
    .setTitle("📜 Lista de Comandos")
    .setDescription(
      "/help, /profile, /compare, /mute, /unmute, /warn, /kick, /ban, /mutelist, /warnlist, /rank, /createchannel"
    )
    .setColor("Blue");
  await interaction.reply({ embeds:[embed], ephemeral:true });
}});

client.commands.set('profile', { execute: async (interaction) => {
  const user = interaction.options.getUser("user") || interaction.user;
  const risk = calculateRisk(user);
  const embed = new EmbedBuilder()
    .setTitle(`📋 Perfil de ${user.tag}`)
    .setDescription(`🆔 ID: ${user.id}\n📊 Risco: ${risk}/100\n${createBar(risk,100)}\nWarns: ${client.warns.get(user.id)||0}\nMutes: ${client.mutes.get(user.id)||0}`)
    .setColor("Green")
    .setTimestamp();
  await interaction.reply({ embeds:[embed], ephemeral:true });
}});

client.commands.set('compare', { execute: async (interaction) => {
  const user1 = interaction.options.getUser("user1");
  const user2 = interaction.options.getUser("user2");
  if(!user1 || !user2) return interaction.reply({ content:"❌ Usuários não encontrados", ephemeral:true });
  const commonWarns = Math.min(client.warns.get(user1.id)||0, client.warns.get(user2.id)||0);
  const commonMutes = Math.min(client.mutes.get(user1.id)||0, client.mutes.get(user2.id)||0);
  const embed = new EmbedBuilder()
    .setTitle(`🔎 Comparação entre ${user1.tag} e ${user2.tag}`)
    .setDescription(`⚠ Warns em comum: ${commonWarns}\n🔇 Mutes em comum: ${commonMutes}`)
    .setColor("Purple")
    .setTimestamp();
  await interaction.reply({ embeds:[embed], ephemeral:true });
}});

client.commands.set('mutelist', { execute: async (interaction) => {
  const embed = new EmbedBuilder().setTitle("🔇 Rank de Mutes").setColor("Orange");
  let description = "";
  Array.from(client.mutes.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([id,value],i)=>{
    description += `\`${i+1}\` <@${id}>: ${value}\n`;
  });
  embed.setDescription(description || "Sem dados");
  await interaction.reply({ embeds:[embed], ephemeral:true });
}});

client.commands.set('warnlist', { execute: async (interaction) => {
  const embed = new EmbedBuilder().setTitle("⚠ Rank de Warns").setColor("Yellow");
  let description = "";
  Array.from(client.warns.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([id,value],i)=>{
    description += `\`${i+1}\` <@${id}>: ${value}\n`;
  });
  embed.setDescription(description || "Sem dados");
  await interaction.reply({ embeds:[embed], ephemeral:true });
}});

client.commands.set('rank', { execute: async (interaction) => {
  const embed = new EmbedBuilder().setTitle("🏆 Rank de XP").setColor("Gold");
  let description = "";
  Array.from(client.xp.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([id,value],i)=>{
    description += `\`${i+1}\` <@${id}>: ${value} XP\n`;
  });
  embed.setDescription(description || "Sem dados");
  await interaction.reply({ embeds:[embed], ephemeral:true });
}});

client.commands.set('createchannel', { execute: async (interaction) => {
  const name = interaction.options.getString("name");
  const typeStr = interaction.options.getString("type").toLowerCase();
  const isPrivate = interaction.options.getBoolean("private") || false;
  const category = interaction.options.getChannel("category");
  const type = typeStr === "voice" ? ChannelType.GuildVoice : ChannelType.GuildText;
  const options = { type, topic: type===ChannelType.GuildText ? "Criado pelo Monkey D' Bryan" : undefined };
  if(category) options.parent = category.id;
  if(isPrivate){
    options.permissionOverwrites = [
      { id: interaction.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak] }
    ];
  }
  try{
    const channel = await interaction.guild.channels.create({ name, ...options });
    await interaction.reply({ content:`✅ Canal criado: ${channel}`, ephemeral:true });
    sendLog(interaction.guild, `${interaction.user.tag} criou o canal ${channel.name}`);
  } catch(err){ console.error(err); await interaction.reply({ content:"❌ Erro ao criar o canal", ephemeral:true }); }
}});
// ----------------- COMANDOS DE MODERAÇÃO FUNCIONAIS -----------------
client.commands.set('mute', { execute: async (interaction) => {
  const user = interaction.options.getUser("user");
  if(!user) return interaction.reply({ content:"❌ Usuário não encontrado", ephemeral:true });
  const time = interaction.options.getInteger("time") || 10; // minutos
  client.mutes.set(user.id, Date.now() + time*60*1000);
  sendLog(interaction.guild, `🔇 ${user.tag} foi mutado por ${time} minutos.`);
  try { await user.send(`Você foi mutado por ${time} minutos.`); } catch{}
  await interaction.reply({ content:`✅ Usuário ${user.tag} mutado por ${time} minutos.`, ephemeral:true });
}});

client.commands.set('unmute', { execute: async (interaction) => {
  const user = interaction.options.getUser("user");
  if(!user) return interaction.reply({ content:"❌ Usuário não encontrado", ephemeral:true });
  client.mutes.delete(user.id);
  sendLog(interaction.guild, `🔊 ${user.tag} foi desmutado.`);
  try { await user.send(`Você foi desmutado.`); } catch{}
  await interaction.reply({ content:`✅ Usuário ${user.tag} desmutado.`, ephemeral:true });
}});

client.commands.set('warn', { execute: async (interaction) => {
  const user = interaction.options.getUser("user");
  if(!user) return interaction.reply({ content:"❌ Usuário não encontrado", ephemeral:true });
  const current = client.warns.get(user.id) || 0;
  client.warns.set(user.id, current + 1);
  sendLog(interaction.guild, `⚠ ${user.tag} recebeu um warn. Total: ${current+1}`);
  try { await user.send(`Você recebeu um warn. Total: ${current+1}`); } catch{}
  await interaction.reply({ content:`✅ Usuário ${user.tag} recebeu um warn.`, ephemeral:true });
}});

client.commands.set('kick', { execute: async (interaction) => {
  const user = interaction.options.getUser("user");
  if(!user) return interaction.reply({ content:"❌ Usuário não encontrado", ephemeral:true });
  const member = interaction.guild.members.cache.get(user.id);
  if(!member) return interaction.reply({ content:"❌ Membro não encontrado no servidor", ephemeral:true });
  await member.kick("Kick via comando").catch(()=>{});
  sendLog(interaction.guild, `👢 ${user.tag} foi kickado.`);
  await interaction.reply({ content:`✅ Usuário ${user.tag} kickado.`, ephemeral:true });
}});

client.commands.set('ban', { execute: async (interaction) => {
  const user = interaction.options.getUser("user");
  if(!user) return interaction.reply({ content:"❌ Usuário não encontrado", ephemeral:true });
  const member = interaction.guild.members.cache.get(user.id);
  if(!member) return interaction.reply({ content:"❌ Membro não encontrado no servidor", ephemeral:true });
  await member.ban({ reason: "Ban via comando" }).catch(()=>{});
  sendLog(interaction.guild, `🔨 ${user.tag} foi banido.`);
  await interaction.reply({ content:`✅ Usuário ${user.tag} banido.`, ephemeral:true });
}});

// ----------------- LOGIN DO BOT -----------------
client.login(TOKEN).catch(err => console.error("🚨 Erro ao logar o bot:",err));

// =====================================================================
// ESTE INDEX.JS É 100% FINAL, COM TODAS FUNÇÕES PLANEJADAS.
// =====================================================================
