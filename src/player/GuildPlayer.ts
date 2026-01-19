import {
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    joinVoiceChannel,
    VoiceConnection
  } from '@discordjs/voice';
  import fs from 'fs';
  import { Queue } from './Queue';
  import { Track } from './Track';
  
  export class GuildPlayer {
    private queue = new Queue<Track>();
    private player = createAudioPlayer();
    private connection?: VoiceConnection;
    private currentTrack: Track | null = null;
    private onTrackChange?: (track: Track | null) => void;
  
    constructor() {
      this.player.on(AudioPlayerStatus.Idle, () => this.playNext());
      this.player.on(AudioPlayerStatus.Playing, () => {
        if (this.onTrackChange && this.currentTrack) {
          this.onTrackChange(this.currentTrack);
        }
      });
      this.player.on(AudioPlayerStatus.Paused, () => {
        if (this.onTrackChange && this.currentTrack) {
          this.onTrackChange(this.currentTrack);
        }
      });
    }
  
    setOnTrackChange(callback: (track: Track | null) => void) {
      this.onTrackChange = callback;
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
  
    enqueue(track: Track) {
      this.queue.enqueue(track);
      if (this.player.state.status === AudioPlayerStatus.Idle) {
        this.playNext();
      } else if (this.onTrackChange) {
        this.onTrackChange(this.currentTrack);
      }
    }
  
    playNext() {
      const next = this.queue.dequeue();
      if (!next) {
        this.currentTrack = null;
        if (this.onTrackChange) {
          this.onTrackChange(null);
        }
        return;
      }
  
      this.currentTrack = next;
      const resource = createAudioResource(
        fs.createReadStream(next.file),
        { inputType: 1 }
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
  
    getCurrentTrack(): Track | null {
      return this.currentTrack;
    }
  
    getQueue(): Track[] {
      return this.queue.getAll();
    }
  
    getPlayerStatus(): AudioPlayerStatus {
      return this.player.state.status;
    }
  
    stop() {
      this.queue.clear();
      this.currentTrack = null;
      this.player.stop();
      if (this.onTrackChange) {
        this.onTrackChange(null);
      }
    }
  
    destroy() {
      this.queue.clear();
      this.currentTrack = null;
      this.player.stop();
      this.connection?.destroy();
    }
  }
  