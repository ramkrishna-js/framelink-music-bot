# FrameLink Music Bot

A simple Discord music bot built using the `@ramkrishna-js/framelink` library.

## Features
- Play music from YouTube, Spotify, and more.
- Advanced queue management.
- Autoplay support.
- Volume control and skipping.

## Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your details:
   ```bash
   cp .env.example .env
   ```
4. Start the bot:
   ```bash
   npm run dev
   ```

## Commands
- `/play <query>` - Play a song or playlist.
- `/skip` - Skip the current song.
- `/stop` - Stop playback and leave the voice channel.
- `/queue` - View the current queue.
- `/volume <0-1000>` - Change the volume.

## License
MIT
