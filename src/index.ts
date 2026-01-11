import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { LavalinkManager } from '@ramkrishna-js/framelink';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

// Initialize Lavalink Manager
const manager = new LavalinkManager({
    nodes: [
        {
            host: process.env.LAVALINK_HOST || 'localhost',
            port: parseInt(process.env.LAVALINK_PORT || '2333'),
            password: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
            secure: false,
            version: 'v4'
        }
    ],
    send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
    }
});

// Event Handlers
manager.on('nodeConnect', (node) => {
    console.log(`[Lavalink] Node ${node.options.host} connected.`);
});

manager.on('nodeError', (node, error) => {
    console.log(`[Lavalink] Node ${node.options.host} error:`, error.message);
});

manager.on('trackStart', (player, track) => {
    const channel = client.channels.cache.get(player.textChannelId!) as any;
    if (channel) {
        channel.send(`🎶 Now playing: **${track.info.title}** by ⁠${track.info.author}⁠`);
    }
});

manager.on('queueEnd', (player) => {
    const channel = client.channels.cache.get(player.textChannelId!) as any;
    if (channel) {
        channel.send('✅ Queue ended.');
    }
    player.destroy();
});

// Handle raw voice updates for Lavalink
client.on('raw', (d) => manager.handleVoiceUpdate(d));

client.on('ready', () => {
    console.log(`[Bot] Logged in as ${client.user?.tag}`);
    manager.init(client.user?.id!);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const prefix = '!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift()?.toLowerCase();

    if (command === 'play') {
        const query = args.join(' ');
        if (!query) return message.reply('Please provide a song name or link.');

        const vc = message.member?.voice.channel;
        if (!vc) return message.reply('You need to be in a voice channel!');

        let player = manager.players.get(message.guild.id);

        if (!player) {
            player = manager.createPlayer({
                guildId: message.guild.id,
                voiceChannelId: vc.id,
                textChannelId: message.channel.id,
                autoplay: true
            });
            player.connect({ voiceChannelId: vc.id });
        }

        const res = await manager.search(query, 'yt');
        
        if (!res.tracks.length) return message.reply('No results found.');

        if (res.loadType === 'PLAYLIST_LOADED') {
            player.queue.add(res.tracks);
            message.reply(`Added playlist **${res.playlistInfo.name}** with ${res.tracks.length} tracks.`);
        } else {
            player.queue.add(res.tracks[0]);
            message.reply(`Added to queue: **${res.tracks[0].info.title}**`);
        }

        if (!player.isPlaying) player.play();
    }

    if (command === 'skip') {
        const player = manager.players.get(message.guild.id);
        if (!player) return message.reply('No music playing.');
        player.skip();
        message.reply('⏭️ Skipped.');
    }

    if (command === 'stop') {
        const player = manager.players.get(message.guild.id);
        if (!player) return message.reply('No music playing.');
        player.destroy();
        message.reply('🛑 Stopped and left.');
    }

    if (command === 'volume') {
        const player = manager.players.get(message.guild.id);
        if (!player) return message.reply('No music playing.');
        const vol = parseInt(args[0]);
        if (isNaN(vol) || vol < 0 || vol > 1000) return message.reply('Please provide a volume between 0 and 1000.');
        player.setVolume(vol);
        message.reply(`🔊 Volume set to ${vol}.`);
    }

    if (command === 'queue') {
        const player = manager.players.get(message.guild.id);
        if (!player) return message.reply('No music playing.');
        
        const queue = player.queue.tracks.map((t, i) => `${i + 1}. ${t.info.title}`).slice(0, 10).join('\n');
        message.reply(`**Current Queue:**\n${player.queue.current ? `Now Playing: ${player.queue.current.info.title}\n` : ''}${queue || 'Empty'}`);
    }
});

client.login(process.env.DISCORD_TOKEN);
