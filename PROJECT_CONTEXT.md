# WoodyBot - Discord Music Bot

## Overview
WoodyBot is a Discord music bot built with TypeScript, Discord.js v14, and Lavalink. It provides YouTube Music search and playback with a clean, interactive dashboard UI.

## Hosting Environment
- **Platform**: Windows 11 Home Server (Gaming PC)
- **IP Type**: Residential IP (no data center anti-bot restrictions)
- **Runtime**: Docker Desktop for Windows
- **Resources**: 1GB RAM allocated to Lavalink (adjustable based on system)

## Tech Stack
- **Bot Framework**: Discord.js v14
- **Audio Server**: Lavalink v4 (Docker container)
- **Lavalink Client**: Shoukaku v4
- **Language**: TypeScript
- **Containerization**: Docker Compose

## Architecture
```
┌─────────────────┐     ┌─────────────────┐
│   Discord.js    │────▶│    Shoukaku     │
│   (Bot Logic)   │     │  (Lavalink API) │
└─────────────────┘     └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │    Lavalink     │
                        │  (Audio Server) │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │  YouTube Music  │
                        │   (via Plugin)  │
                        └─────────────────┘
```

## Audio Strategy
**Full YouTube Native** - Search and playback directly from YouTube Music
- Search: `ytmsearch:` prefix via youtube-plugin MUSIC client
- Playback: WEB and TVHTML5EMBEDDED clients
- Residential IP eliminates data center IP blocking issues

## Features
- `/play <query>` - Play songs with autocomplete search
- Interactive dashboard with playback controls
- Queue management (up to 8 tracks displayed)
- Pause/Resume, Skip, Stop controls
- Album artwork display
- Playlist support

## Files Structure
```
music-bot/
├── src/
│   └── index.ts          # Main bot logic
├── application.yml       # Lavalink configuration
├── docker-compose.yml    # Container orchestration
├── Dockerfile            # Bot container build
├── package.json          # Node.js dependencies
├── tsconfig.json         # TypeScript configuration
├── .env                  # Environment variables (not in repo)
└── plugins/              # Lavalink plugins (auto-downloaded)
```

## Environment Variables
Create a `.env` file with:
```
DISCORD_TOKEN=your_discord_bot_token_here
```

## Quick Start
1. Install Docker Desktop for Windows
2. Clone the repository
3. Create `.env` file with your Discord bot token
4. Run: `docker compose up -d --build`
5. Check logs: `docker compose logs -f`

## Dashboard UI Design
- Author line: "Now Playing: Song Title - Artist"
- Description: Code block with queue list
- Image: Album artwork (large)
- Buttons: [blank] [⏹️ Stop] [⏸️ Pause] [⏭️ Skip] [blank]

## Notes
- Residential IP from home network bypasses YouTube's data center restrictions
- No OAuth or PoToken needed with residential IP
- youtube-plugin handles all YouTube/YouTube Music functionality
- Lavalink auto-downloads required plugins on first start
