// ================= Monkey D' Bryan - INDEX BLOCO 1 =================
const { Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionsBitField, Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { LOG_CHANNEL_ID } = require('./monkey_d_bryan.json');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// ----------------- TOKEN VIA ENV -----------------
const TOKEN = process.env.TOKEN;

// ----------------- COLLECTIONS -----------------
client.commands = new Collection();
client.mutes = new Collection();
client.warns = new Collection();
client.xp = new Collection();

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
  const forbiddenWords = ["palavra1","palavra2"];
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
const { SlashCommandBuilder } = require('discord.js');

// ----------------- HELP -----------------
client.commands.set('help', {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Lista todos os comandos disponíveis'),
  execute: async (interaction) => {
    const cmds = Array.from(client.commands.keys()).join('\n• ');
    const embed = new EmbedBuilder()
      .setTitle('📜 Comandos Disponíveis')
      .setDescription(`• ${cmds}`)
      .setColor("Blue")
      .setTimestamp();
    await interaction.reply({ embeds:[embed], ephemeral:true });
  }
});

// ----------------- PROFILE -----------------
client.commands.set('profile', {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Avalia o perfil de um usuário')
    .addUserOption(opt => opt.setName('user').setDescription('Usuário a avaliar')),
  execute: async (interaction) => {
    const user = interaction.options.getUser('user') || interaction.user;
    const risk = calculateRisk(user);
    const embed = new EmbedBuilder()
      .setTitle(`📊 Avaliação de Perfil: ${user.tag}`)
      .setDescription(`Nota de risco: ${risk}/100\n${createBar(risk,100)}\nID: ${user.id}`)
      .setColor(risk > 60 ? "Red" : risk > 30 ? "Yellow" : "Green")
      .setTimestamp();
    sendLog(interaction.guild, `Usuário avaliado: ${user.tag}, risco: ${risk}`);
    await interaction.reply({ embeds:[embed] });
  }
});

// ----------------- COMPARE -----------------
client.commands.set('compare', {
  data: new SlashCommandBuilder()
    .setName('compare')
    .setDescription('Compara duas contas e mostra pontos em comum')
    .addUserOption(opt => opt.setName('user1').setDescription('Primeira conta').setRequired(true))
    .addUserOption(opt => opt.setName('user2').setDescription('Segunda conta').setRequired(true)),
  execute: async (interaction) => {
    const user1 = interaction.options.getUser('user1');
    const user2 = interaction.options.getUser('user2');
    // Aqui podemos comparar XP, warns, mutes ou outros dados que temos
    const common = [];
    if(client.mutes.has(user1.id) && client.mutes.has(user2.id)) common.push("Ambos estão mutados");
    if(client.warns.get(user1.id) && client.warns.get(user2.id)) common.push("Ambos têm warns");
    const embed = new EmbedBuilder()
      .setTitle(`🔍 Comparação: ${user1.tag} vs ${user2.tag}`)
      .setDescription(common.length ? common.join("\n") : "Nenhum ponto em comum encontrado")
      .setColor("Purple")
      .setTimestamp();
    await interaction.reply({ embeds:[embed] });
  }
});

// ----------------- MUTE LIST -----------------
client.commands.set('mutelist', {
  data: new SlashCommandBuilder()
    .setName('mutelist')
    .setDescription('Mostra ranking de mutes'),
  execute: async (interaction) => {
    let desc = '';
    client.mutes.forEach((v,k) => { desc += `<@${k}> - Mutado até ${new Date(v).toLocaleString()}\n`; });
    if(!desc) desc = "Nenhum usuário mutado.";
    const embed = new EmbedBuilder()
      .setTitle('🔇 Ranking de Mutes')
      .setDescription(desc)
      .setColor("Orange")
      .setTimestamp();
    await interaction.reply({ embeds:[embed] });
  }
});

// ----------------- WARN LIST -----------------
client.commands.set('warnlist', {
  data: new SlashCommandBuilder()
    .setName('warnlist')
    .setDescription('Mostra ranking de warns'),
  execute: async (interaction) => {
    let desc = '';
    client.warns.forEach((v,k) => { desc += `<@${k}> - ${v} warns\n`; });
    if(!desc) desc = "Nenhum usuário com warns.";
    const embed = new EmbedBuilder()
      .setTitle('⚠ Ranking de Warns')
      .setDescription(desc)
      .setColor("Yellow")
      .setTimestamp();
    await interaction.reply({ embeds:[embed] });
  }
});

// ----------------- RANK -----------------
client.commands.set('rank', {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Mostra ranking de XP'),
  execute: async (interaction) => {
    let desc = '';
    const sorted = Array.from(client.xp.entries()).sort((a,b)=>b[1]-a[1]);
    sorted.forEach(([id, xp], i) => { desc += `${i+1}. <@${id}> - ${xp} XP\n`; });
    if(!desc) desc = "Nenhum usuário com XP registrado.";
    const embed = new EmbedBuilder()
      .setTitle('🏆 Ranking de XP')
      .setDescription(desc)
      .setColor("Green")
      .setTimestamp();
    await interaction.reply({ embeds:[embed] });
  }
});

// ----------------- CREATE CHANNEL -----------------
client.commands.set('createchannel', {
  data: new SlashCommandBuilder()
    .setName('createchannel')
    .setDescription('Cria um canal de texto ou voz')
    .addStringOption(opt => opt.setName('name').setDescription('Nome do canal').setRequired(true))
    .addStringOption(opt => opt.setName('type').setDescription('Tipo: text ou voice').setRequired(true))
    .addBooleanOption(opt => opt.setName('private').setDescription('Privado?').setRequired(false))
    .addStringOption(opt => opt.setName('category').setDescription('ID da categoria').setRequired(false)),
  execute: async (interaction) => {
    const name = interaction.options.getString('name');
    const type = interaction.options.getString('type') === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;
    const isPrivate = interaction.options.getBoolean('private') || false;
    const category = interaction.options.getString('category') || null;
    const perms = isPrivate ? [{ id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }] : [];
    const channel = await interaction.guild.channels.create({ name, type, parent: category || undefined, permissionOverwrites: perms }).catch(()=>null);
    if(channel) interaction.reply({ content:`✅ Canal ${name} criado!`, ephemeral:true });
    else interaction.reply({ content:"❌ Não foi possível criar o canal.", ephemeral:true });
  }
});
// ================= MODERAÇÃO / BOTÕES ==================
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

// ----------------- BOTÃO DE CONFIRMAÇÃO -----------------
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
      const muteTime = 10*60*1000;
      client.mutes.set(userId, Date.now()+muteTime);
      sendLog(interaction.guild, `🔇 ${member.user.tag} foi mutado por 10 minutos.`);
      interaction.update({ content:`✅ Mute realizado!`, components:[], embeds:[] });
      break;
  }
});

// ----------------- COMANDOS DE MODERAÇÃO -----------------
// /mute
client.commands.set('mute', {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mutar um usuário')
    .addUserOption(opt => opt.setName('user').setDescription('Usuário a mutar').setRequired(true)),
  execute: async interaction => modAction(interaction,'mute')
});
// /unmute
client.commands.set('unmute', {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Desmutar um usuário')
    .addUserOption(opt => opt.setName('user').setDescription('Usuário a desmutar').setRequired(true)),
  execute: async interaction => {
    const target = interaction.options.getUser('user');
    if(client.mutes.has(target.id)){
      client.mutes.delete(target.id);
      sendLog(interaction.guild, `🔊 ${target.tag} foi desmutado.`);
      interaction.reply({ content:`✅ ${target.tag} desmutado!`, ephemeral:true });
    } else interaction.reply({ content:`❌ ${target.tag} não estava mutado.`, ephemeral:true });
  }
});
// /warn
client.commands.set('warn', {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Adicionar warn a um usuário')
    .addUserOption(opt => opt.setName('user').setDescription('Usuário a warnar').setRequired(true)),
  execute: async interaction => {
    const user = interaction.options.getUser('user');
    const warns = client.warns.get(user.id) || 0;
    client.warns.set(user.id, warns+1);
    sendLog(interaction.guild, `⚠ ${user.tag} recebeu warn. Total: ${warns+1}`);
    interaction.reply({ content:`✅ ${user.tag} agora tem ${warns+1} warns.`, ephemeral:true });
  }
});
// /kick
client.commands.set('kick', {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kickar um usuário')
    .addUserOption(opt => opt.setName('user').setDescription('Usuário a kickar').setRequired(true)),
  execute: async interaction => modAction(interaction,'kick')
});
// /ban
client.commands.set('ban', {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banir um usuário')
    .addUserOption(opt => opt.setName('user').setDescription('Usuário a banir').setRequired(true)),
  execute: async interaction => modAction(interaction,'ban')
});

// ----------------- LOGIN DO BOT -----------------
client.login(TOKEN).catch(err => console.error("🚨 Erro ao logar o bot:",err));
