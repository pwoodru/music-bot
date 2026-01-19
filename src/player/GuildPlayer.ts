import {
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    joinVoiceChannel,
    VoiceConnection
  } from '@discordjs/voice';
  import fs from 'fs';
  import { Queue } from './Queue';
  
  export class GuildPlayer {
    private queue = new Queue<string>();
    private player = createAudioPlayer();
    private connection?: VoiceConnection;
  
    constructor() {
      this.player.on(AudioPlayerStatus.Idle, () => this.playNext());
    }
  
    connect(channel: any) {
      if (!this.connection) {
        this.connection = joinVoiceChannel({
          channelId: channel.id,
          guildId: channel.guild.id,
          adapterCreator: channel.guild.voiceAdapterCreator
        });
        this.connection.subscribe(this.player);
      }
    }
  
    enqueue(file: string) {
      this.queue.enqueue(file);
      if (this.player.state.status === AudioPlayerStatus.Idle) {
        this.playNext();
      }
    }
  
    playNext() {
      const next = this.queue.dequeue();
      if (!next) return;
  
      const resource = createAudioResource(
        fs.createReadStream(next),
        { inputType: 1 } // Opus
      );
  
      this.player.play(resource);
    }
  
    skip() {
      this.player.stop();
    }
  
    pause() {
      this.player.pause();
    }
  
    resume() {
      this.player.unpause();
    }
  
    destroy() {
      this.queue.clear();
      this.player.stop();
      this.connection?.destroy();
    }
  }
  