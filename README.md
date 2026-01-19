# 🎵 WoodyBot - Discord Music Bot

A YouTube music bot for Discord with a sleek dashboard UI, built with TypeScript, yt-dlp, and FFmpeg. This architecture uses the 2026 golden standard for YouTube audio extraction, eliminating blocking issues associated with previous solutions.

## 🚀 Quick Start (Windows 11)

### Prerequisites
1. **Docker Desktop for Windows** - [Download here](https://www.docker.com/products/docker-desktop/)
2. **Discord Bot Token** - [Create a bot](https://discord.com/developers/applications)
3. **Git** (optional, if cloning from repository)

### Setup Steps

1. **Clone or download the repository**
   ```powershell
   git clone <your-repo-url>
   cd music-bot
   ```
   Or extract the project files to a directory.

2. **Create environment file**
   
   Create a `.env` file in the project root:
   ```
   DISCORD_TOKEN=your_discord_bot_token_here
   ```
   
   Replace `your_discord_bot_token_here` with your actual Discord bot token from the [Discord Developer Portal](https://discord.com/developers/applications).

3. **Build and start the bot**
   ```powershell
   docker compose up -d --build
   ```
   
   This command will:
   - Build the Docker image with Node.js, FFmpeg, Python, and yt-dlp
   - Install all npm dependencies
   - Start the bot container in detached mode

4. **Verify the bot is running**
   ```powershell
   docker compose logs -f
   ```
   
   You should see:
   - "Logged in as [YourBotName]#[Discriminator]"
   - No error messages
   
   Press `Ctrl+C` to exit the log view.

5. **Invite bot to your server**
   
   Use this URL template (replace `YOUR_CLIENT_ID` with your bot's Client ID from the Discord Developer Portal):
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=3147776&scope=bot%20applications.commands
   ```
   
   Required permissions:
   - Send Messages
   - Embed Links
   - Connect (Voice)
   - Speak (Voice)
   - Use Slash Commands

## 🎮 Usage

### Commands

| Command | Description |
|---------|-------------|
| `/play <query>` | Search and play a song from YouTube. The bot will search YouTube and play the first result. |

### Dashboard Features

When you use `/play`, two things happen:

1. **Mini-Dashboard** - A message appears showing:
   - The song that was queued
   - Who queued it (with their profile picture)
   - A thumbnail of the album art

2. **Main Dashboard** - A persistent message at the bottom of the channel showing:
   - **Now Playing**: Current song title and artist
   - **Queue**: Numbered list of upcoming songs
   - **Album Art**: Large image of the current song's artwork
   - **Control Buttons**:
     - **STOP** - Stops playback and clears the queue
     - **PAUSE/PLAY** - Toggles between pause and play
     - **SKIP** - Skips to the next song in queue

The main dashboard automatically updates whenever:
- A new song is queued
- A song finishes and the next one starts
- You use any of the control buttons
- The queue changes

## 🔧 Management Commands

### Docker Compose Commands

```powershell
# Start the bot (if stopped)
docker compose up -d

# Stop the bot
docker compose down

# View logs (follow mode)
docker compose logs -f

# View logs (last 100 lines)
docker compose logs --tail=100

# Restart the bot
docker compose restart

# Rebuild after code changes
docker compose up -d --build

# Stop and remove everything (including volumes)
docker compose down -v
```

### Development Commands

If you want to run the bot locally without Docker:

```powershell
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Run in production mode
npm start
```

**Note**: For local development, you'll need to install:
- Node.js 20+
- FFmpeg
- Python 3
- yt-dlp (`pip install yt-dlp`)

## 📁 Project Structure

```
music-bot/
├── src/
│   ├── index.ts              # Main bot logic, interaction handlers, dashboard management
│   ├── config.ts             # Configuration loader from application.yml
│   ├── dashboard.ts          # Dashboard embed builders and button components
│   ├── commands/
│   │   └── play.ts           # Play command autocomplete handler
│   └── player/
│       ├── Cache.ts          # Audio file cache management
│       ├── GuildPlayer.ts    # Per-guild audio player with queue management
│       ├── Queue.ts          # Queue data structure
│       ├── Track.ts          # Track metadata interface
│       └── YouTube.ts        # yt-dlp search and download functions
├── application.yml           # Bot configuration (cache, audio settings, etc.)
├── docker-compose.yml        # Docker container configuration
├── Dockerfile                # Bot container build instructions
├── package.json              # Node.js dependencies and scripts
├── tsconfig.json             # TypeScript compiler configuration
├── .env                      # Your bot token (create this, not in repo)
└── cache/                    # Audio file cache (created automatically)
```

## ⚙️ Configuration

### Application Configuration (application.yml)

The bot reads configuration from `application.yml`:

```yaml
audio:
  cache:
    directory: "./cache"        # Where downloaded audio files are stored
    max_size_mb: 5120          # 5 GB cache limit (soft limit)
  
  behavior:
    idle_timeout_seconds: 300  # Disconnect after 5 minutes of inactivity
```

### Environment Variables (.env)

```
DISCORD_TOKEN=your_discord_bot_token_here
```

The token can also be set in `application.yml` under `discord.token`, but using `.env` is recommended for security.

### Docker Configuration

The `docker-compose.yml` file handles:
- Volume mounting for the cache directory (persists between restarts)
- Environment variable injection
- Logging configuration
- Graceful shutdown handling

## 🔒 Discord Bot Permissions

Required permissions (permission integer: 3147776):
- ✅ Send Messages
- ✅ Embed Links
- ✅ Connect (Voice Channel)
- ✅ Speak (Voice Channel)
- ✅ Use Slash Commands

## 🐛 Troubleshooting

### Bot not responding to commands
- **Check bot is online**: Look for the bot in your server member list
- **Verify permissions**: Ensure the bot has proper permissions in the channel
- **Check slash commands**: Slash commands may take up to 1 minute to register after bot startup
- **View logs**: `docker compose logs -f` to see any errors

### No audio playing
- **Check voice channel**: Make sure you're in a voice channel
- **Check bot permissions**: Bot needs "Connect" and "Speak" permissions
- **Check logs**: `docker compose logs -f` for error messages
- **Try different song**: Some videos may be unavailable or region-locked

### Dashboard not appearing
- **Check message permissions**: Bot needs "Send Messages" and "Embed Links"
- **Check logs**: Look for errors in `docker compose logs -f`
- **Try queuing a song**: Dashboard is created when first song is queued

### "Cannot find module" or build errors
- **Rebuild container**: `docker compose up -d --build`
- **Check Node version**: Ensure Dockerfile uses compatible Node version
- **Clear cache and rebuild**: 
  ```powershell
  docker compose down
  docker compose up -d --build
  ```

### yt-dlp errors
- **Update yt-dlp**: The Dockerfile installs the latest version on build
- **Check internet connection**: yt-dlp needs internet to download
- **Residential IP**: If using a data center IP, you may encounter YouTube blocking

### Container won't start
- **Check Docker Desktop**: Ensure Docker Desktop is running
- **Check port conflicts**: Ensure no other services are using required ports
- **Check disk space**: Ensure you have enough space for cache
- **View detailed logs**: `docker compose logs` without `-f` flag

### Cache issues
- **Clear cache**: Stop bot, delete `cache/` directory, restart
- **Check disk space**: Cache can grow to 5GB (configurable in application.yml)
- **Cache location**: Default is `./cache` relative to project root

## 📝 Development

### Making Changes

1. **Edit source files** in `src/`
2. **Rebuild container**: `docker compose up -d --build`
3. **Check logs**: `docker compose logs -f` to verify changes

### Adding New Features

The codebase is organized into:
- **Commands**: Add new slash commands in `src/commands/`
- **Player logic**: Modify `src/player/` for audio handling
- **Dashboard**: Update `src/dashboard.ts` for UI changes
- **Main logic**: `src/index.ts` handles interactions and orchestration

## 🎯 Features

- ✅ YouTube search and playback
- ✅ Interactive dashboard with real-time updates
- ✅ Queue management
- ✅ Playback controls (play, pause, skip, stop)
- ✅ Album artwork display
- ✅ Per-guild player instances
- ✅ Audio file caching
- ✅ Docker containerization
- ✅ Graceful shutdown handling

## 📄 License

MIT License - Feel free to modify and use as you wish!
