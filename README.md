# Framelink Music Bot

🚀 A robust and feature-rich Discord music bot built with **@ramkrishna-js/framelink** and **@ramkrishna-js/framecard**.

## Features

- 🎵 **High-Quality Audio**: Powered by Lavalink (v3/v4 support).
- 🎨 **Beautiful Music Cards**: Dynamic image generation for every song using **@ramkrishna-js/framecard**.
- ⚡ **Slash Commands**: Modern interaction using Discord slash commands.
- 🔁 **Autoplay & Queue**: Advanced queue management and smart autoplay.
- 🔊 **Filters & Volume**: Support for volume control and audio filters.

## Commands

- `/play <query>` - Play a song or playlist.
- `/skip` - Skip the current song.
- `/stop` - Stop playback and leave the voice channel.
- `/queue` - View the current music queue.
- `/volume <0-1000>` - Change the playback volume.

## Setup

1.  **Clone the repository**.
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Configure environment variables**:
    Create a `.env` file based on `.env.example`:
    ```env
    DISCORD_TOKEN=your_token
    LAVALINK_HOST=your_host
    LAVALINK_PORT=443
    LAVALINK_PASSWORD=youshallnotpass
    ```
4.  **Run the bot**:
    ```bash
    npm run dev
    ```

## Powered By

- [@ramkrishna-js/framelink](https://www.npmjs.com/package/@ramkrishna-js/framelink)
- [@ramkrishna-js/framecard](https://www.npmjs.com/package/@ramkrishna-js/framecard)

## License

MIT © [Ramkrishna](https://github.com/ramkrishna-js)