import { Client, GatewayIntentBits, Interaction, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel, Message } from 'discord.js';
import { Shoukaku, Connectors, Player } from 'shoukaku';
import dotenv from 'dotenv';

dotenv.config();

// --- CRASH PREVENTION ---
process.on('unhandledRejection', (error: any) => {
    if (error && (error.code === 10062 || error.code === 40060)) return;
    console.error('Unhandled promise rejection:', error);
});
process.on('uncaughtException', (error: any) => {
    console.error('Uncaught exception:', error);
});

// --- CONFIGURATION ---
const LAVALINK_HOST = process.env.LAVALINK_HOST || 'localhost';
const DISCORD_COLOR = 0x8B5A2B; // Earthy Brown

const Nodes = [{
    name: 'LocalNode',
    url: `${LAVALINK_HOST}:2333`,
    auth: 'youshallnotpass'
}];

// --- CLIENT & SHOUKAKU INIT ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), Nodes, {
    moveOnDisconnect: false,
    resume: true,
    reconnectTries: 30,
    reconnectInterval: 5000,
    restTimeout: 10000
});

// --- QUEUE SYSTEM ---
class GuildQueue {
    public player: Player | null = null;
    public tracks: any[] = [];
    public current: any | null = null;
    public dashboard: Message | null = null;
    public channel: TextChannel | null = null;
    public loop: boolean = false;
    public isPaused: boolean = false;

    constructor(player: Player, channel: TextChannel) {
        this.player = player;
        this.channel = channel;
    }

    async playNext() {
        if (!this.player) return;

        if (this.loop && this.current) {
            this.tracks.push(this.current);
        }

        this.current = this.tracks.shift();

        if (!this.current) {
            this.destroy();
            return;
        }

        try {
            await this.player.playTrack({ track: { encoded: this.current.encoded } });
            await this.updateDashboard(true);
        } catch (e) {
            console.error("Play error:", e);
            this.playNext();
        }
    }

    async updateDashboard(forceResend = false) {
        if (!this.channel || !this.current) return;

        // --- UI BUILDER ---
        
        let queueContent = 'Queue is empty';
        if (this.tracks.length > 0) {
            queueContent = this.tracks.slice(0, 8).map((t, i) => {
                const title = t.info.title.substring(0, 30);
                const author = t.info.author.substring(0, 20);
                return `${i + 1}. ${title} - ${author}`;
            }).join('\n');
            
            if (this.tracks.length > 8) queueContent += `\n+ ${this.tracks.length - 8} more`;
        }

        const artUrl = this.current.info.artworkUrl || 'https://i.imgur.com/7PH83kH.png';

        const embed = new EmbedBuilder()
            .setColor(DISCORD_COLOR)
            .setAuthor({ name: `Now Playing: ${this.current.info.title.substring(0, 50)} - ${this.current.info.author.substring(0, 30)}`, iconURL: artUrl })
            .setThumbnail(this.current.info.artworkUrl || 'https://i.imgur.com/7PH83kH.png')
            .addFields(
                { 
                    name: 'Up Next', 
                    value: `\`\`\`\n${queueContent}\n\`\`\``, 
                    inline: true 
                },
                { 
                    name: 'Track Info', 
                    value: `**[${this.current.info.title}](${this.current.info.uri})**\n*${this.current.info.author}*`, 
                    inline: true 
                }
            );

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder().setCustomId('dummy_left').setLabel('⠀').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('stop').setEmoji('⏹️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('pause').setEmoji(this.isPaused ? '▶️' : '⏸️').setStyle(this.isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('dummy_right').setLabel('⠀').setStyle(ButtonStyle.Secondary).setDisabled(true)
            );

        try {
            if (this.dashboard && !forceResend) {
                await this.dashboard.edit({ embeds: [embed], components: [row] });
            } else {
                if (this.dashboard) await this.dashboard.delete().catch(() => {});
                this.dashboard = await this.channel.send({ embeds: [embed], components: [row] });
            }
        } catch (e) {
            this.dashboard = await this.channel.send({ embeds: [embed], components: [row] });
        }
    }

    destroy() {
        if (this.channel?.guild?.id) {
            shoukaku.leaveVoiceChannel(this.channel.guild.id);
        }
        this.dashboard?.delete().catch(() => {});
        queues.delete(this.channel!.guild.id);
    }
}

const queues = new Map<string, GuildQueue>();

shoukaku.on('error', (_, error) => {
    if (!error.message.includes('ECONNREFUSED')) console.error('Lavalink error:', error);
});
shoukaku.on('ready', (name) => {
    console.log(`Lavalink Node: ${name} is ready`);
    setTimeout(() => {
        console.log('🔥 Warming up Lavalink search...');
        const node = shoukaku.options.nodeResolver(shoukaku.nodes);
        if (node) {
            node.rest.resolve('ytmsearch:warmup_query').catch(() => {});
        }
    }, 5000);
});

client.login(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}`);
    await client.application?.commands.set([]); 

    const playCommand = {
        name: 'play',
        description: 'Play a song',
        options: [{
            name: 'query',
            type: 3, // STRING
            description: 'Song name or URL',
            required: true,
            autocomplete: true
        }]
    };

    for (const [, guild] of client.guilds.cache) {
        try { await guild.commands.create(playCommand); } catch (e) {}
    }
});

client.on('guildCreate', async (guild) => {
    const playCommand = {
        name: 'play',
        description: 'Play a song',
        options: [{
            name: 'query',
            type: 3, // STRING
            description: 'Song name or URL',
            required: true,
            autocomplete: true
        }]
    };
    await guild.commands.create(playCommand);
});

client.on('interactionCreate', async (interaction: Interaction) => {
    if (interaction.isAutocomplete()) {
        const focusedValue = interaction.options.getFocused();
        if (!focusedValue || focusedValue.length < 3) return interaction.respond([]);
        const node = shoukaku.options.nodeResolver(shoukaku.nodes);
        if (!node) return interaction.respond([]);

        try {
            // FULL YOUTUBE: Use YouTube Music for Autocomplete
            const result = await node.rest.resolve(`ytmsearch:${focusedValue}`);
            if (!result || result.loadType === 'empty') return interaction.respond([]);
            const data = result.data as any[];
            const choices = data.slice(0, 5).map(track => ({
                name: `${track.info.title.substring(0, 50)} - ${track.info.author.substring(0, 45)}`,
                value: track.info.uri 
            }));
            await interaction.respond(choices);
        } catch (error) {}
        return;
    }

    if (interaction.isButton()) {
        try {
            const guildId = interaction.guildId;
            if (!guildId) return;
            const queue = queues.get(guildId);
            
            if (!queue) {
                if (interaction.message.deletable) await interaction.message.delete();
                await interaction.reply({ content: "Session expired.", ephemeral: true });
                return;
            }

            await interaction.deferUpdate(); 

            switch (interaction.customId) {
                case 'pause':
                    queue.isPaused = !queue.isPaused;
                    queue.player?.setPaused(queue.isPaused);
                    queue.updateDashboard();
                    break;
                case 'skip':
                    queue.playNext(); 
                    break;
                case 'stop':
                    queue.destroy();
                    break;
            }
        } catch (error) {
        }
        return;
    }

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

        let queue = queues.get(guild!.id);
        const node = shoukaku.options.nodeResolver(shoukaku.nodes);
        if (!node) { await interaction.editReply('System starting up...'); return; }

        if (!queue) {
            try {
                const player = await shoukaku.joinVoiceChannel({
                    guildId: guild!.id,
                    channelId: voiceChannel.id,
                    shardId: 0
                });
                
                player.on('end', (data) => {
                    const reason = data.reason as string;
                    if (reason === 'REPLACED' || reason === 'replaced') return; 
                    const q = queues.get(guild!.id);
                    if (q) q.playNext();
                });

                player.on('closed', () => {
                    const q = queues.get(guild!.id);
                    if (q) q.destroy();
                });

                queue = new GuildQueue(player, interaction.channel as TextChannel);
                queues.set(guild!.id, queue);
            } catch (e) {
                console.error(e);
                await interaction.editReply("Failed to join voice channel.");
                return;
            }
        }

        const isUrl = /^https?:\/\//.test(query);
        if (!isUrl) {
            // FULL YOUTUBE: Use ytmsearch for Playback Search
            query = `ytmsearch:${query}`;
        }

        const result = await node.rest.resolve(query);
        if (!result || result.loadType === 'empty') {
            await interaction.editReply('No results found.');
            return;
        }

        let tracksToAdd: any[] = [];
        if (result.loadType === 'playlist') {
            tracksToAdd = (result.data as any).tracks;
        } else if (result.loadType === 'search') {
            tracksToAdd = [(result.data as any)[0]];
        } else {
            tracksToAdd = [(result.data as any)];
        }

        for (const t of tracksToAdd) {
            queue.tracks.push(t);
        }

        if (!queue.current) {
            await queue.playNext();
            await interaction.deleteReply(); 
        } else {
            const track = tracksToAdd[0];
            const embed = new EmbedBuilder()
                .setColor(DISCORD_COLOR)
                .setAuthor({ name: tracksToAdd.length > 1 ? 'Playlist Added' : 'Added to Queue', iconURL: interaction.user.displayAvatarURL() })
                .setThumbnail(track.info.artworkUrl || 'https://i.imgur.com/7PH83kH.png');

            if (tracksToAdd.length > 1) {
                embed.setDescription(`**${tracksToAdd.length}** tracks added to queue.\nFirst: **[${track.info.title}](${track.info.uri})**`);
            } else {
                embed.setDescription(`**[${track.info.title}](${track.info.uri})**\n*${track.info.author}*`);
            }

            await interaction.editReply({ content: '', embeds: [embed] });
            queue.updateDashboard(true); 
        }
    }
});