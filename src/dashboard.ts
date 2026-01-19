import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Message,
  User
} from 'discord.js';
import { Track } from './player/Track';
import { AudioPlayerStatus } from '@discordjs/voice';

export function createDashboardEmbed(
  currentTrack: Track | null,
  queue: Track[],
  playerStatus: AudioPlayerStatus
): EmbedBuilder {
  const embed = new EmbedBuilder();

  if (currentTrack) {
    embed.setAuthor({
      name: `Now Playing: ${currentTrack.title} - ${currentTrack.artist}`
    });

    if (currentTrack.thumbnail) {
      embed.setImage(currentTrack.thumbnail);
    }

    let description = '';
    if (queue.length > 0) {
      description = '**Queue:**\n```\n';
      queue.forEach((track, index) => {
        description += `${index + 1}. ${track.title} - ${track.artist}\n`;
      });
      description += '```';
    } else {
      description = '**Queue:** Empty';
    }

    embed.setDescription(description);
  } else {
    embed.setAuthor({
      name: 'Now Playing: Nothing'
    });
    embed.setDescription('**Queue:** Empty');
  }

  return embed;
}

export function createDashboardButtons(
  playerStatus: AudioPlayerStatus
): ActionRowBuilder<ButtonBuilder> {
  const stopButton = new ButtonBuilder()
    .setCustomId('dashboard_stop')
    .setLabel('STOP')
    .setStyle(ButtonStyle.Danger);

  const pausePlayButton = new ButtonBuilder()
    .setCustomId('dashboard_pause_play')
    .setLabel(playerStatus === AudioPlayerStatus.Playing ? 'PAUSE' : 'PLAY')
    .setStyle(ButtonStyle.Primary);

  const skipButton = new ButtonBuilder()
    .setCustomId('dashboard_skip')
    .setLabel('SKIP')
    .setStyle(ButtonStyle.Primary);

  const dummyButton1 = new ButtonBuilder()
    .setCustomId('dashboard_dummy1')
    .setLabel('\u200b')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const dummyButton2 = new ButtonBuilder()
    .setCustomId('dashboard_dummy2')
    .setLabel('\u200b')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    dummyButton1,
    stopButton,
    pausePlayButton,
    skipButton,
    dummyButton2
  );
}

export function createMiniDashboardEmbed(
  track: Track,
  user: User
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(track.title)
    .setDescription(`**Artist:** ${track.artist}`)
    .setAuthor({
      name: `${user.displayName} queued this song`,
      iconURL: user.displayAvatarURL()
    });

  if (track.thumbnail) {
    embed.setThumbnail(track.thumbnail);
  }

  return embed;
}
