import fs from 'fs';
import yaml from 'js-yaml';

export interface AppConfig {
  discord: {
    token: string;
  };
  audio: {
    cacheDir: string;
    idleTimeoutSeconds: number;
  };
}

const raw = yaml.load(
  fs.readFileSync('application.yml', 'utf8')
) as any;

export const config: AppConfig = {
  discord: {
    token: process.env.DISCORD_TOKEN || raw.discord.token
  },
  audio: {
    cacheDir: raw.audio.cache_dir,
    idleTimeoutSeconds: raw.audio.idle_timeout_seconds
  }
};
