import { Client, Intents } from "discord.js";

export const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]});
export const BOT_ID = "888858431392481312";

export const login = () => client.login(config.discordToken);

export const getDiscordUserById = (discordId) => client.users.cache.get(discordId);

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});