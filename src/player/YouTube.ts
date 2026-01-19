import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function search(query: string) {
  const { stdout } = await execAsync(
    `yt-dlp "ytsearch5:${query}" --print "%(title)s|||%(id)s" --quiet`
  );

  return stdout
    .trim()
    .split('\n')
    .map(line => {
      const [title, id] = line.split('|||');
      return { title, id };
    });
}

export async function download(url: string, output: string) {
  await execAsync(
    `yt-dlp -f bestaudio --extract-audio --audio-format opus -o "${output}" ${url}`
  );
}
