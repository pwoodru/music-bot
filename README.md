# 🎵 WoodyBot - Discord Music Bot

A YouTube Music bot for Discord with a sleek dashboard UI, built with TypeScript and Lavalink.

## 🚀 Quick Start (Windows 11)

### Prerequisites
1. **Docker Desktop for Windows** - [Download here](https://www.docker.com/products/docker-desktop/)
2. **Discord Bot Token** - [Create a bot](https://discord.com/developers/applications)

### Setup Steps

1. **Clone the repository**
   ```powershell
   git clone <your-repo-url>
   cd music-bot
   ```

2. **Create environment file**
   
   Create a `.env` file in the project root:
   ```
   DISCORD_TOKEN=your_discord_bot_token_here
   ```

3. **Start the bot**
   ```powershell
   docker compose up -d --build
   ```

4. **Check logs**
   ```powershell
   docker compose logs -f
   ```

5. **Invite bot to your server**
   
   Use this URL template (replace `YOUR_CLIENT_ID`):
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=3147776&scope=bot%20applications.commands
   ```

## 🎮 Usage

### Commands
| Command | Description |
|---------|-------------|
| `/play <query>` | Search and play a song from YouTube Music |
| `/play <url>` | Play directly from a YouTube URL |

### Dashboard Controls
- ⏹️ **Stop** - Stop playback and clear queue
- ⏸️ **Pause/▶️ Resume** - Toggle playback
- ⏭️ **Skip** - Skip to next track

## 🔧 Management Commands

```powershell
# Start the bot
docker compose up -d

# Stop the bot
docker compose down

# View logs
docker compose logs -f

# Restart the bot
docker compose restart

# Rebuild after code changes
docker compose up -d --build

# Full reset (clear plugins, rebuild)
docker compose down
Remove-Item -Recurse -Force plugins
docker compose up -d --build
```

## 📁 Project Structure

```
music-bot/
├── src/index.ts          # Bot logic
├── application.yml       # Lavalink config
├── docker-compose.yml    # Container setup
├── Dockerfile            # Bot container
├── package.json          # Dependencies
├── .env                  # Your bot token (create this)
└── plugins/              # Auto-downloaded
```

## ⚙️ Configuration

### Lavalink Memory (docker-compose.yml)
Adjust based on your system:
```yaml
environment:
  - _JAVA_OPTIONS=-Xmx1G  # 1GB for Lavalink
```

### YouTube Clients (application.yml)
Default clients optimized for residential IP:
```yaml
clients: ["MUSIC", "WEB", "TVHTML5EMBEDDED"]
```

## 🔒 Discord Bot Permissions

Required permissions:
- Send Messages
- Embed Links
- Connect (Voice)
- Speak (Voice)
- Use Slash Commands

## 🐛 Troubleshooting

### Bot not responding to commands
- Ensure bot has proper permissions in Discord
- Check if slash commands are registered: restart bot and wait ~1 minute

### No audio playing
- Check Lavalink logs: `docker compose logs lavalink`
- Ensure you're in a voice channel
- Try a different song/URL

### "System starting up" message
- Lavalink takes ~30 seconds to fully start
- Wait and try again

### Plugin download issues
```powershell
# Clear plugins and restart
Remove-Item -Recurse -Force plugins
docker compose down
docker compose up -d --build
```

## 📝 License

MIT License - Feel free to modify and use as you wish!
