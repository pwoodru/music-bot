import {
    Client,
    GatewayIntentBits,
    Interaction
  } from 'discord.js';
  import dotenv from 'dotenv';
  import { config } from './config';
  import { Cache } from './player/Cache';
  import { search, download } from './player/YouTube';
  import { GuildPlayer } from './player/GuildPlayer';
  
  dotenv.config();
  
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates
    ]
  });
  
  const players = new Map<string, GuildPlayer>();
  const cache = new Cache(config.audio.cacheDir);
  
  client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}`);
  });
  
  client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;
  
    const guildId = interaction.guildId!;
    let player = players.get(guildId);
  
    if (!player) {
      player = new GuildPlayer();
      players.set(guildId, player);
    }
  
    if (interaction.commandName === 'play') {
      const query = interaction.options.getString('query', true);
      const member = interaction.guild!.members.cache.get(interaction.user.id);
      const channel = member?.voice.channel;
  
      if (!channel) {
        await interaction.reply('Join a voice channel first.');
        return;
      }
  
      player.connect(channel);
  
      const results = await search(query);
      const track = results[0];
      const file = cache.pathFor(track.id);
  
      if (!cache.has(track.id)) {
        await download(`https://youtube.com/watch?v=${track.id}`, file);
      }
  
      player.enqueue(file);
      await interaction.reply(`Queued **${track.title}**`);
    }
  
    if (interaction.commandName === 'skip') {
      player.skip();
      await interaction.reply('Skipped.');
    }
  
    if (interaction.commandName === 'pause') {
      player.pause();
      await interaction.reply('Paused.');
    }
  
    if (interaction.commandName === 'resume') {
      player.resume();
      await interaction.reply('Resumed.');
    }
  });
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  
  function shutdown() {
    console.log('Shutting down cleanly...');
    for (const player of players.values()) {
      player.destroy();
    }
    process.exit(0);
  }
  
  client.login(config.discord.token);
  