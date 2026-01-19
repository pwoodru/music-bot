# WoodyBot - Discord Music Bot

## Overview
WoodyBot is a Discord music bot built with TypeScript and Discord.js v14. It uses yt-dlp with FFmpeg for YouTube audio extraction and playback, providing a clean, interactive dashboard UI. This architecture eliminates the blocking issues associated with YouTube's bot detection that were present with Lavalink and youtube-source.

## Hosting Environment
- **Platform**: Windows 11 Home Server (Gaming PC)
- **IP Type**: Residential IP (no data center anti-bot restrictions)
- **Runtime**: Docker Desktop for Windows
- **Resources**: Minimal overhead - direct yt-dlp/FFmpeg processing

## Tech Stack
- **Bot Framework**: Discord.js v14
- **Audio Extraction**: yt-dlp (2026 golden standard)
- **Audio Processing**: FFmpeg
- **Language**: TypeScript
- **Containerization**: Docker Compose
- **Voice Library**: @discordjs/voice

## Architecture
```
┌─────────────────┐
│   Discord.js    │
│   (Bot Logic)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  @discordjs/    │
│     voice       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│   yt-dlp        │────▶│   FFmpeg     │
│  (Extraction)   │     │ (Processing) │
└─────────────────┘     └──────────────┘
         │
         ▼
┌─────────────────┐
│    YouTube      │
└─────────────────┘
```

## Audio Strategy
**Direct yt-dlp + FFmpeg** - No intermediate audio server
- Search: yt-dlp with `ytsearch5:` prefix
- Download: yt-dlp extracts best audio quality
- Format: Opus (optimized for Discord)
- Caching: Local file cache to avoid re-downloading
- Residential IP eliminates data center IP blocking issues

## Features
- `/play <query>` - Search and play songs from YouTube
- **Interactive Dashboard** - Persistent message showing:
  - Currently playing song (title and artist in author section)
  - Numbered queue list in description
  - Large album artwork image
  - Control buttons: STOP, PAUSE/PLAY, SKIP (with dummy buttons for spacing)
- **Mini-Dashboard** - Appears when a user queues a song:
  - Song title and artist
  - User who queued it (with profile picture)
  - Small thumbnail of album art
- Queue management
- Pause/Resume, Skip, Stop controls via dashboard buttons
- Album artwork display
- Automatic dashboard updates when tracks change

## Files Structure
```
music-bot/
├── src/
│   ├── index.ts              # Main bot logic and interaction handlers
│   ├── config.ts             # Configuration loader from application.yml
│   ├── dashboard.ts          # Dashboard embed and button builders
│   ├── commands/
│   │   └── play.ts           # Play command autocomplete
│   └── player/
│       ├── Cache.ts          # Audio file cache management
│       ├── GuildPlayer.ts    # Per-guild audio player
│       ├── Queue.ts          # Queue data structure
│       ├── Track.ts          # Track metadata interface
│       └── YouTube.ts        # yt-dlp search and download functions
├── application.yml           # Bot configuration
├── docker-compose.yml        # Container orchestration
├── Dockerfile                # Bot container build
├── package.json              # Node.js dependencies
├── tsconfig.json             # TypeScript configuration
└── .env                      # Environment variables (not in repo)
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

### Main Dashboard
- **Author section**: "Now Playing: [Song Title] - [Artist Name]"
- **Description**: Numbered queue list in code block format
- **Image**: Large album artwork (full-size image, not thumbnail)
- **Action Row**: 5 buttons
  - Dummy button (disabled, for spacing)
  - STOP button (red/danger style)
  - PAUSE/PLAY button (primary style, toggles based on state)
  - SKIP button (primary style)
  - Dummy button (disabled, for spacing)

### Mini-Dashboard
- **Title**: Song title
- **Description**: Artist name
- **Author**: "[Username] queued this song" with user's profile picture
- **Thumbnail**: Small album artwork thumbnail
- **No buttons** - Information only

## Notes
- Residential IP from home network bypasses YouTube's data center restrictions
- No OAuth or PoToken needed with residential IP
- yt-dlp handles all YouTube functionality directly
- FFmpeg processes audio to Opus format for Discord
- Dashboard message persists and updates automatically
- Cache directory stores downloaded audio files locally
