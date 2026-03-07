const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const CLIENT_ID = "1479572164796747786"; // id do bot
const GUILD_ID = "1012810818468991006"; // id do servidor
const TOKEN = process.env.TOKEN;

const commands = [
  new SlashCommandBuilder()
    .setName("setreply")
    .setDescription("Define a resposta quando mencionarem o bot")
    .addStringOption(option =>
      option.setName("mensagem")
        .setDescription("Mensagem que o bot vai responder")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Ver latência do bot"),

  new SlashCommandBuilder()
    .setName("listroles")
    .setDescription("Lista todos os cargos do servidor"),

  new SlashCommandBuilder()
    .setName("listchannels")
    .setDescription("Lista todos os canais do servidor")
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('Registrando slash commands...');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log('✅ Slash commands registrados no servidor');
  } catch (error) {
    console.error(error);
  }
})();
