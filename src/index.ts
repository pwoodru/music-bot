import { Client, GatewayIntentBits, Interaction } from 'discord.js';
import { Shoukaku, Connectors } from 'shoukaku';
import dotenv from 'dotenv';

dotenv.config();

const LAVALINK_HOST = process.env.LAVALINK_HOST || 'localhost';

const Nodes = [{
    name: 'LocalNode',
    url: `${LAVALINK_HOST}:2333`,
    auth: 'youshallnotpass'
}];

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), Nodes);

shoukaku.on('error', (_, error) => console.error('Lavalink error:', error));
shoukaku.on('ready', (name) => console.log(`Lavalink Node: ${name} is ready`));

client.login(process.env.DISCORD_TOKEN);

client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}`);
    client.application?.commands.create({
        name: 'play',
        description: 'Play a song from YouTube Music',
        options: [{
            name: 'query',
            type: 3, // STRING
            description: 'Song name or YouTube URL',
            required: true
        }]
    });
});

client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'play') {
        await interaction.deferReply();
        
        const guild = interaction.guild;
        const member = interaction.member as any;
        const voiceChannel = member.voice.channel;
        let query = interaction.options.getString('query')!;

        if (!voiceChannel) {
            await interaction.editReply('You need to be in a voice channel!');
            return;
        }

        // Detect if the input is a URL. If NOT, force a YouTube Music search.
        const isUrl = /^https?:\/\//.test(query);
        if (!isUrl) {
            // 'ytmsearch:' tells Lavalink to search YouTube Music specifically
            query = `ytmsearch:${query}`;
        }

        try {
            const player = await shoukaku.joinVoiceChannel({
                guildId: guild!.id,
                channelId: voiceChannel.id,
                shardId: 0
            });

            const result = await player.node.rest.resolve(query);

            if (!result || result.loadType === 'empty') {
                await interaction.editReply('No results found.');
                return;
            }

            let track;
            let message = '';

            if (result.loadType === 'playlist') {
                track = result.data.tracks[0];
                message = `Queued playlist **${result.data.info.name}** (${result.data.tracks.length} tracks)`;
            } else {
                track = result.data;
                message = `Playing **${track.info.title}**`;
            }

            await player.playTrack({ track: track.encoded });
            await interaction.editReply(message);

        } catch (error) {
            console.error(error);
            await interaction.editReply('Something went wrong trying to play music.');
        }
    }
});