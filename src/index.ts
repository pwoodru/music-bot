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
const DISCORD_COLOR = 0x8B5A2B; // Earthy Brown - Woody theme
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

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
    restTimeout: 15000
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
    
    // Prevent race conditions
    private isProcessing: boolean = false;
    private queueLock: boolean = false;
    
    // Idle timeout - disconnect after 5 minutes of no activity
    private idleTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(player: Player, channel: TextChannel) {
        this.player = player;
        this.channel = channel;
    }

    // Start the idle disconnect countdown
    startIdleTimeout() {
        this.clearIdleTimeout(); // Clear any existing timeout
        
        this.idleTimeout = setTimeout(() => {
            console.log(`⏰ Idle timeout reached, disconnecting from guild`);
            this.destroy();
        }, IDLE_TIMEOUT_MS);
        
        // Update dashboard to show idle state
        this.showIdleDashboard();
    }

    // Cancel the idle timeout (called when new track is added)
    clearIdleTimeout() {
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
            this.idleTimeout = null;
        }
    }

    // Show idle/waiting state on dashboard
    async showIdleDashboard() {
        if (!this.channel) return;

        const embed = new EmbedBuilder()
            .setColor(DISCORD_COLOR)
            .setAuthor({ name: '⏸️ Queue Complete - Waiting for songs...' })
            .setDescription(`\`\`\`\nNo songs in queue\n\nUse /play to add more songs!\nDisconnecting in 5 minutes if idle...\n\`\`\``)
            .setThumbnail('https://i.imgur.com/7PH83kH.png');

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder().setCustomId('dummy_left').setLabel('⠀').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('stop').setEmoji('⏹️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('pause').setEmoji('⏸️').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('dummy_right').setLabel('⠀').setStyle(ButtonStyle.Secondary).setDisabled(true)
            );

        try {
            if (this.dashboard) {
                await this.dashboard.edit({ embeds: [embed], components: [row] });
            } else {
                this.dashboard = await this.channel.send({ embeds: [embed], components: [row] });
            }
        } catch (e) {
            this.dashboard = await this.channel.send({ embeds: [embed], components: [row] });
        }
    }

    async playNext(): Promise<boolean> {
        // Prevent concurrent playNext calls
        if (this.isProcessing) {
            return false;
        }
        this.isProcessing = true;

        try {
            if (!this.player) {
                this.isProcessing = false;
                return false;
            }

            if (this.loop && this.current) {
                this.tracks.push(this.current);
            }

            this.current = this.tracks.shift() || null;

            if (!this.current) {
                this.isProcessing = false;
                // Start idle timeout instead of immediate disconnect
                this.startIdleTimeout();
                return false;
            }
            
            // Clear any existing idle timeout since we're playing
            this.clearIdleTimeout();

            await this.player.playTrack({ track: { encoded: this.current.encoded } });
            await this.updateDashboard(true);
            this.isProcessing = false;
            return true;
        } catch (e) {
            console.error("Play error:", e);
            this.current = null; // Clear failed track
            this.isProcessing = false;
            
            // Small delay before trying next to prevent rapid cascade
            if (this.tracks.length > 0) {
                setTimeout(() => this.playNext(), 500);
            } else {
                // Start idle timeout instead of immediate disconnect
                this.startIdleTimeout();
            }
            return false;
        }
    }

    // Thread-safe method to add tracks
    async addTracks(tracks: any[]): Promise<void> {
        while (this.queueLock) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        this.queueLock = true;
        
        // Clear idle timeout - new tracks are being added
        this.clearIdleTimeout();
        
        for (const track of tracks) {
            this.tracks.push(track);
        }
        
        this.queueLock = false;
    }

    async updateDashboard(forceResend = false) {
        if (!this.channel || !this.current || !this.current.info) return;

        let queueContent = 'Queue is empty';
        if (this.tracks.length > 0) {
            queueContent = this.tracks.slice(0, 8).map((t, i) => {
                const title = t.info.title.substring(0, 35);
                const author = t.info.author.substring(0, 20);
                return `${i + 1}. ${title} - ${author}`;
            }).join('\n');
            
            if (this.tracks.length > 8) queueContent += `\n+ ${this.tracks.length - 8} more`;
        }

        const artUrl = this.current.info.artworkUrl || 'https://i.imgur.com/7PH83kH.png';

        const embed = new EmbedBuilder()
            .setColor(DISCORD_COLOR)
            .setAuthor({ name: `Now Playing: ${this.current.info.title.substring(0, 45)} - ${this.current.info.author.substring(0, 25)}` })
            .setDescription(`\`\`\`\n${queueContent}\n\`\`\``)
            .setImage(artUrl);

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
        // Clear any pending idle timeout
        this.clearIdleTimeout();
        
        const guildId = this.channel?.guild?.id;
        if (guildId) {
            shoukaku.leaveVoiceChannel(guildId);
            queues.delete(guildId);
        }
        this.dashboard?.delete().catch(() => {});
    }
}

const queues = new Map<string, GuildQueue>();

shoukaku.on('error', (_, error) => {
    if (!error.message.includes('ECONNREFUSED')) console.error('Lavalink error:', error);
});

shoukaku.on('ready', (name) => {
    console.log(`✅ Lavalink Node: ${name} is ready`);
});

client.login(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
    console.log(`🤖 Logged in as ${client.user?.tag}`);
    await client.application?.commands.set([]); 

    const playCommand = {
        name: 'play',
        description: 'Play a song from YouTube Music',
        options: [{
            name: 'query',
            type: 3,
            description: 'Song name or YouTube URL',
            required: true,
            autocomplete: true
        }]
    };

    for (const [, guild] of client.guilds.cache) {
        try { await guild.commands.create(playCommand); } catch (e) {}
    }
    console.log(`📝 Slash commands registered for ${client.guilds.cache.size} guild(s)`);
});

client.on('guildCreate', async (guild) => {
    const playCommand = {
        name: 'play',
        description: 'Play a song from YouTube Music',
        options: [{
            name: 'query',
            type: 3,
            description: 'Song name or YouTube URL',
            required: true,
            autocomplete: true
        }]
    };
    await guild.commands.create(playCommand);
    console.log(`📝 Registered commands for new guild: ${guild.name}`);
});

client.on('interactionCreate', async (interaction: Interaction) => {
    // --- AUTOCOMPLETE HANDLER ---
    if (interaction.isAutocomplete()) {
        const focusedValue = interaction.options.getFocused();
        if (!focusedValue || focusedValue.length < 3) return interaction.respond([]);
        
        const node = shoukaku.options.nodeResolver(shoukaku.nodes);
        if (!node) return interaction.respond([]);

        try {
            const result = await node.rest.resolve(`ytmsearch:${focusedValue}`);
            if (!result || result.loadType === 'empty') return interaction.respond([]);
            
            const data = result.data as any[];
            const choices = data.slice(0, 5).map(track => ({
                name: `${track.info.title.substring(0, 50)} - ${track.info.author.substring(0, 45)}`,
                value: track.info.uri
            }));
            await interaction.respond(choices);
        } catch (error) {
            return interaction.respond([]);
        }
        return;
    }

    // --- BUTTON HANDLER ---
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
            console.error('Button interaction error:', error);
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;

    // --- PLAY COMMAND ---
    if (interaction.commandName === 'play') {
        await interaction.deferReply();
        const guild = interaction.guild;
        const member = interaction.member as any;
        const voiceChannel = member.voice.channel;
        let query = interaction.options.getString('query')!;

        if (!voiceChannel) {
            await interaction.editReply('🎤 You need to be in a voice channel!');
            return;
        }

        let queue = queues.get(guild!.id);
        const node = shoukaku.options.nodeResolver(shoukaku.nodes);
        if (!node) { 
            await interaction.editReply('⏳ System starting up, please try again...'); 
            return; 
        }

        // Create new queue if needed
        if (!queue) {
            try {
                const player = await shoukaku.joinVoiceChannel({
                    guildId: guild!.id,
                    channelId: voiceChannel.id,
                    shardId: 0
                });
                
                player.on('end', (data) => {
                    const reason = (data.reason as string).toLowerCase();
                    
                    // Only advance to next track on natural finish
                    // Ignore: replaced (new track started), stopped (manual stop), 
                    // cleanup (player destroyed), loadFailed (handled in playNext catch)
                    if (reason === 'replaced' || reason === 'stopped' || 
                        reason === 'cleanup' || reason === 'loadfailed') {
                        return;
                    }
                    
                    // Track finished naturally - play next
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
                await interaction.editReply("❌ Failed to join voice channel.");
                return;
            }
        }

        // Use ytmsearch for text queries, direct URL for links
        const isUrl = /^https?:\/\//.test(query);
        if (!isUrl) {
            query = `ytmsearch:${query}`;
        }

        let result;
        try {
            result = await node.rest.resolve(query);
        } catch (e) {
            console.error('Track resolve error:', e);
            await interaction.editReply('❌ Failed to search. Please try again.');
            return;
        }
        
        if (!result || result.loadType === 'empty') {
            await interaction.editReply('❌ No results found.');
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

        // Check if we need to start playing or just add to queue
        const shouldStartPlaying = !queue.current;
        
        // Use thread-safe method to add tracks
        await queue.addTracks(tracksToAdd);

        // Always show "Added to Queue" confirmation message (never delete it)
        const track = tracksToAdd[0];
        const embed = new EmbedBuilder()
            .setColor(DISCORD_COLOR)
            .setAuthor({ name: tracksToAdd.length > 1 ? '📋 Playlist Added' : '➕ Added to Queue', iconURL: interaction.user.displayAvatarURL() })
            .setThumbnail(track.info.artworkUrl || 'https://i.imgur.com/7PH83kH.png');

        if (tracksToAdd.length > 1) {
            embed.setDescription(`**${tracksToAdd.length}** tracks added to queue.\nFirst: **[${track.info.title}](${track.info.uri})**`);
        } else {
            embed.setDescription(`**[${track.info.title}](${track.info.uri})**\n*${track.info.author}*`);
        }

        // Send confirmation message (stays in chat)
        await interaction.editReply({ content: '', embeds: [embed] });

        // Start playing if needed, then update dashboard
        if (shouldStartPlaying) {
            await queue.playNext();
        } else {
            queue.updateDashboard(true);
        }
    }
});
