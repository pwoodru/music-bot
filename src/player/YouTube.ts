import { exec } from 'child_process';
import { promisify } from 'util';
import { Track } from './Track';

const execAsync = promisify(exec);

export async function search(query: string): Promise<Track[]> {
  const { stdout } = await execAsync(
    `yt-dlp "ytsearch5:${query}" --print "%(title)s|||%(id)s|||%(uploader)s|||%(thumbnail)s" --quiet`
  );

  return stdout
    .trim()
    .split('\n')
    .map(line => {
      const [title, id, artist, thumbnail] = line.split('|||');
      return {
        id: id || '',
        title: title || 'Unknown',
        artist: artist || 'Unknown Artist',
        thumbnail: thumbnail || '',
        file: ''
      };
    });
}

export async function getTrackInfo(url: string): Promise<Track> {
  const { stdout } = await execAsync(
    `yt-dlp "${url}" --print "%(title)s|||%(id)s|||%(uploader)s|||%(thumbnail)s" --quiet`
  );

  const [title, id, artist, thumbnail] = stdout.trim().split('|||');
  return {
    id: id || '',
    title: title || 'Unknown',
    artist: artist || 'Unknown Artist',
    thumbnail: thumbnail || '',
    file: ''
  };
}

export async function download(url: string, output: string) {
  await execAsync(
    `yt-dlp -f bestaudio --extract-audio --audio-format opus -o "${output}" ${url}`
  );
}
