import { Client, GatewayIntentBits, Partials, ApplicationCommandOptionType, ChatInputCommandInteraction, AttachmentBuilder } from 'discord.js';
import { LavalinkManager } from '@ramkrishna-js/framelink';
import { ClassicCard } from '@ramkrishna-js/framecard';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Channel, Partials.GuildMember],
});

// Initialize Lavalink Manager
const manager = new LavalinkManager({
    nodes: [
        {
            host: process.env.LAVALINK_HOST || 'lavalink.jirayu.net',
            port: parseInt(process.env.LAVALINK_PORT || '443'),
            password: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
            secure: process.env.LAVALINK_PORT === '443',
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

manager.on('trackStart', async (player, track) => {
    const channel = client.channels.cache.get(player.textChannelId!) as any;
    if (channel) {
        try {
            const card = new ClassicCard()
                .setTitle(track.info.title)
                .setAuthor(track.info.author)
                .setThumbnail(track.displayThumbnail || `https://img.youtube.com/vi/${track.info.identifier}/hqdefault.jpg`)
                .setColor('#6fb8ff')
                .setStartTime('0:00')
                .setEndTime(formatTime(track.info.length))
                .setProgress(0);

            const buffer = await card.build();
            const attachment = new AttachmentBuilder(buffer, { name: 'card.png' });

            channel.send({ 
                content: `🎶 Now playing: **${track.info.title}**`,
                files: [attachment] 
            });
        } catch (error) {
            console.error('[Bot] Failed to generate card:', error);
            channel.send(`🎶 Now playing: **${track.info.title}** by ​${track.info.author}​`);
        }
    }
});

function formatTime(ms: number) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Handle raw voice updates for Lavalink
client.on('raw', (d) => manager.handleVoiceUpdate(d));

client.on('ready', async () => {
    console.log(`[Bot] Logged in as ${client.user?.tag}`);
    manager.init(client.user?.id!); 

    // Register Slash Commands
    const commands: any[] = [
        {
            name: 'play',
            description: 'Play a song or playlist',
            options: [
                {
                    name: 'query',
                    description: 'The song name or link',
                    type: ApplicationCommandOptionType.String,
                    required: true,
                },
            ],
        },
        {
            name: 'skip',
            description: 'Skip the current song',
        },
        {
            name: 'stop',
            description: 'Stop playback and leave',
        },
        {
            name: 'queue',
            description: 'View the current queue',
        },
        {
            name: 'volume',
            description: 'Change the volume',
            options: [
                {
                    name: 'amount',
                    description: 'Volume level (0-1000)',
                    type: ApplicationCommandOptionType.Integer,
                    required: true,
                },
            ],
        },
    ];

    try {
        await client.application?.commands.set(commands);
        console.log('[Bot] Slash commands registered.');
    } catch (error) {
        console.error('[Bot] Failed to register slash commands:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.guildId) return;

    const { commandName, options, member, guildId, channelId } = interaction;
    const memberVoiceChannel = (member as any)?.voice.channel;

    try {
        if (commandName === 'play') {
            await interaction.deferReply();
            const query = options.getString('query', true);

            if (!memberVoiceChannel) {
                return interaction.editReply('You need to be in a voice channel!');
            }

            let player = manager.players.get(guildId);

            if (!player) {
                player = manager.createPlayer({
                    guildId: guildId,
                    voiceChannelId: memberVoiceChannel.id,
                    textChannelId: channelId!,
                    autoplay: true
                });
                player.connect({ voiceChannelId: memberVoiceChannel.id });
            }

            const res = await manager.search(query, 'yt');
            
            if (!res || !res.tracks || !res.tracks.length) {
                return interaction.editReply('No results found.');
            }

            if (res.loadType === 'playlist' || res.loadType === 'PLAYLIST_LOADED') {
                player.queue.add(res.tracks);
                await interaction.editReply(`Added playlist **${res.playlistInfo?.name || 'Unknown'}** with ${res.tracks.length} tracks.`);
            } else {
                player.queue.add(res.tracks[0]);
                await interaction.editReply(`Added to queue: **${res.tracks[0].info.title}**`);
            }

            if (!player.isPlaying) await player.play();
        }

        if (commandName === 'skip') {
            const player = manager.players.get(guildId);
            if (!player) return interaction.reply({ content: 'No music playing.', ephemeral: true });
            player.skip();
            await interaction.reply('⏭️ Skipped.');
        }

        if (commandName === 'stop') {
            const player = manager.players.get(guildId);
            if (!player) return interaction.reply({ content: 'No music playing.', ephemeral: true });
            player.destroy();
            await interaction.reply('🛑 Stopped and left.');
        }

        if (commandName === 'volume') {
            const player = manager.players.get(guildId);
            if (!player) return interaction.reply({ content: 'No music playing.', ephemeral: true });
            
            const amount = options.getInteger('amount', true);
            if (amount < 0 || amount > 1000) {
                return interaction.reply({ content: 'Please provide a volume between 0 and 1000.', ephemeral: true });
            }
            
            player.setVolume(amount);
            await interaction.reply(`🔊 Volume set to ${amount}.`);
        }

        if (commandName === 'queue') {
            const player = manager.players.get(guildId);
            if (!player) return interaction.reply({ content: 'No music playing.', ephemeral: true });
            
            const queueList = player.queue.tracks
                .map((t, i) => `${i + 1}. ${t.info.title}`)
                .slice(0, 10)
                .join('\n');

            const current = player.queue.current 
                ? `Now Playing: **${player.queue.current.info.title}**\n\n` 
                : '';

            await interaction.reply(`**Current Queue:**\n${current}${queueList || 'Empty'}`);
        }
    } catch (error: any) {
        console.error(`[Error] Command ${commandName} failed:`, error);
        const content = `An error occurred: ${error.message}`;
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(content);
        } else {
            await interaction.reply({ content, ephemeral: true });
        }
    }
});

client.on('error', (error) => console.error('[Discord] Client Error:', error));
process.on('unhandledRejection', (error) => console.error('[Process] Unhandled Rejection:', error));

client.login(process.env.DISCORD_TOKEN);