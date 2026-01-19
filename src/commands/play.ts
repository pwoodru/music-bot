import { searchYouTube } from '../player/YouTube';

export async function autocomplete(interaction: any) {
  const query = interaction.options.getFocused();
  const results = await searchYouTube(query);

  await interaction.respond(
    results.map(r => ({
      name: r.title.slice(0, 100),
      value: r.url
    }))
  );
}
