import {
    Client,
    GatewayIntentBits,
    Interaction,
    Message,
    TextChannel
  } from 'discord.js';
  import { AudioPlayerStatus } from '@discordjs/voice';
  import dotenv from 'dotenv';
  import { config } from './config';
  import { Cache } from './player/Cache';
  import { search, download } from './player/YouTube';
  import { GuildPlayer } from './player/GuildPlayer';
  import {
    createDashboardEmbed,
    createDashboardButtons,
    createMiniDashboardEmbed
  } from './dashboard';
  
  dotenv.config();
  
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.MessageContent
    ]
  });
  
  const players = new Map<string, GuildPlayer>();
  const dashboards = new Map<string, Message>();
  const cache = new Cache(config.audio.cacheDir);
  
  client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}`);
  });
  
  function ensurePlayerSetup(guildId: string, channel: TextChannel) {
    let player = players.get(guildId);
    if (!player) {
      player = new GuildPlayer();
      players.set(guildId, player);
    }

    player.setOnTrackChange(() => {
      updateDashboard(guildId, channel);
    });

    return player;
  }

  async function updateDashboard(guildId: string, channel: TextChannel) {
    const player = players.get(guildId);
    if (!player) return;
  
    const currentTrack = player.getCurrentTrack();
    const queue = player.getQueue();
    const playerStatus = player.getPlayerStatus();
  
    const embed = createDashboardEmbed(currentTrack, queue, playerStatus);
    const buttons = createDashboardButtons(playerStatus);
  
    let dashboard = dashboards.get(guildId);
  
    if (!dashboard) {
      dashboard = await channel.send({
        embeds: [embed],
        components: [buttons]
      });
      dashboards.set(guildId, dashboard);
    } else {
      try {
        await dashboard.edit({
          embeds: [embed],
          components: [buttons]
        });
      } catch (error) {
        dashboards.delete(guildId);
        dashboard = await channel.send({
          embeds: [embed],
          components: [buttons]
        });
        dashboards.set(guildId, dashboard);
      }
    }
  }
  
  client.on('interactionCreate', async (interaction: Interaction) => {
    if (interaction.isChatInputCommand()) {
      const guildId = interaction.guildId!;
      const textChannel = interaction.channel as TextChannel;
      
      if (!textChannel) return;

      if (interaction.commandName === 'play') {
        const query = interaction.options.getString('query', true);
        const member = interaction.guild!.members.cache.get(interaction.user.id);
        const channel = member?.voice.channel;
  
        if (!channel) {
          await interaction.reply('Join a voice channel first.');
          return;
        }
  
        const player = ensurePlayerSetup(guildId, textChannel);
        player.connect(channel);
  
        await interaction.deferReply();
  
        const results = await search(query);
        const track = results[0];
        const file = cache.pathFor(track.id);
        track.file = file;
  
        if (!cache.has(track.id)) {
          await download(`https://youtube.com/watch?v=${track.id}`, file);
        }
        
        player.enqueue(track);
  
        const miniEmbed = createMiniDashboardEmbed(track, interaction.user);
        await interaction.editReply({
          embeds: [miniEmbed]
        });
  
        await updateDashboard(guildId, textChannel);
      }
    }
  
    if (interaction.isButton()) {
      const guildId = interaction.guildId!;
      const textChannel = interaction.channel as TextChannel;
      
      if (!textChannel) return;

      const player = ensurePlayerSetup(guildId, textChannel);
  
      if (interaction.customId === 'dashboard_stop') {
        player.stop();
        await interaction.deferUpdate();
        await updateDashboard(guildId, textChannel);
      }
  
      if (interaction.customId === 'dashboard_pause_play') {
        const status = player.getPlayerStatus();
        if (status === AudioPlayerStatus.Playing) {
          player.pause();
        } else {
          player.resume();
        }
        await interaction.deferUpdate();
        await updateDashboard(guildId, textChannel);
      }
  
      if (interaction.customId === 'dashboard_skip') {
        player.skip();
        await interaction.deferUpdate();
        await updateDashboard(guildId, textChannel);
      }
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
  