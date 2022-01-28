import { client, BOT_ID, login } from "./discord.js"
import * as osu from "./osu.js";

const funnies = {
    "greg": "greg",
    "gtnh": "greg",
    "gt:nh": "greg",
    "united": "we kicked a kid",
    "727": "wysi",
    "new horizons": "greg",
    "neat": "neat is a mod by Vazkii",
    "wysi": "wyfsi"
}

const funny_words = {
    "rat": "haha funny rat mod",
    "rats": "haha funny rat mod"
}

async function handleMessage(msg) {
    if (msg.author.id == BOT_ID) return;

    for (let funny in funnies) {
        if (msg.content.toLowerCase().includes(funny)) {
            return msg.reply(funnies[funny]);
        }
    }

    for (let word of msg.content.toLowerCase().split(' ')) {
        for (let funny in funny_words) {
            if (word == funny) {
                return msg.reply(funny_words[funny]);
            }
        }
    }

    if (msg.content == "!score") {
        const play = await osu.latestPlay(osu.osuIdFromDiscordId(msg.author.id));

        try {
            return msg.channel.send(await osu.summaryImage(play));
        } catch (e) {
            return msg.channel.send(e.message);
        }
    }
}

client.on("messageCreate", handleMessage);
client.on("messageUpdate", (oldMsg, newMsg) => handleMessage(newMsg));

login();