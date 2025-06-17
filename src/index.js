import { Client, Intents, MessageAttachment } from "discord.js"
import { readFileSync } from "fs"
import { wordle, scheduleWordleReset } from "./wordle.js"
import config from "../config.json" with { type: "json" }
import mentioned from "../resources/mentioned.json" with { type: "json" }
import investments from "../resources/investments.json" with { type: "json" }

const client = new Client({intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.MESSAGE_CONTENT, Intents.FLAGS.GUILD_MESSAGES]})

const funnies = {
    "greg": "greg",
    "gtnh": "greg",
    "gt:nh": "greg",
    "united": "we kicked a kid",
    "727": "wysi",
    "neat": "neat is a mod by Vazkii",
    "new horizons": "greg",
    "wysi": "wyfsi"
}

const funny_words = {
    "rat": "haha funny rat mod",
    "rats": "haha funny rat mod"
}

const reactions = {
    "stand": ['🇸','🇹','🇦','🇳','🇩','🇴']
}

const saaiRegex = new RegExp("sa{2,}i|ga{2,}p|z{3,}");

async function sleep(millis) {
    return await new Promise(resolve => setTimeout(resolve, millis));
}

async function handleMessage(msg) {
    if (msg.author.id == config.botId) return;

    if (msg.channelId == config.wordleChannelId) {
        wordle(msg);
    }

    if (msg.content == "!invest") {
        return await invest(msg);
    }

    if (msg.author.id == config.meesId && saaiRegex.test(msg.content.toLowerCase())) {
        return msg.reply({files: [readFileSync("resources/saai.jpg")]});
    }
    
    if (msg.content.match(/(^|.*\s)28([^\d].*|$)/) != null) {
        return msg.reply({files: [readFileSync("resources/28.jpg")]});
    }

    for (const name in mentioned) {
        if (msg.content.match(new RegExp(`\\b(${mentioned[name]})(\\W|$)`, "i")) != null) {
            return msg.reply({files: [readFileSync(`resources/mentioned/${name}.jpg`)]})
        }
    }

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

        for (let funny in reactions) {
            if (word == funny) {
                return reactWithEmojis(msg, reactions[funny]);
            }
        }
    }
}

let nextInvestTime;
let lastInvest;
const items = investments;

async function invest(msg) {
    const now = new Date();
    if (nextInvestTime && now < nextInvestTime) {
        return msg.channel.send("The investments were recently queried, please wait before doing so again");
    }

    msg.channel.send("Aggregating investment information, sit tight...");

    now.setTime(now.getTime() + 120_000)
    nextInvestTime = now;

    let message = "";
    for (let item of items) {
        try {
            message += await retrieveInvestment(item) + "\n";
        } catch (error) {
            console.log(error);
            return msg.channel.send("Failed to retrieve investment information");
        }
    }
    
    const totalPrice = items.reduce((acc, item) => acc + (item.lastPrice ?? 0) * item.amount, 0);
    let delta = totalPrice - lastInvest;
    const stock = delta >= 0 ? ":chart_with_upwards_trend: " : ":chart_with_downwards_trend: ";
    const sign = delta < 0 ? '-' : '+';
    let content = `${lastInvest ? stock : ""}Total €${totalPrice.toFixed(2)}`;
    if (lastInvest) {
        content += ` (${sign}€${Math.abs(delta).toFixed(2)})`;
    }

    lastInvest = totalPrice;
    msg.channel.send({ content, files: [ new MessageAttachment(Buffer.from(message, "utf-8"), "investments.diff") ]});
}

async function retrieveInvestment(item) {
    const STEAM_API_URL = "https://steamcommunity.com/market/priceoverview/?appid=730&currency=3&market_hash_name=";

    let delay = 30;
    while (delay <= 300) {
        try {
            const response = await fetch(STEAM_API_URL + encodeURIComponent(item.name));
            if (!response.ok) {
                if (response.status == 429) {
                    console.log(`Being rate limited by Steam api, waiting ${delay} seconds...`);
                    await sleep(delay * 1_000);
                    delay *= 2;
                    continue;
                }

                let body = await response.text();
                throw new Error(`Steam api responded with code: ${response.status}\nResponse body: ${body}`);
            } else {
                console.log(`Successfully retrieved investment information for ${item.name}`);
            }

            const resp = await response.json();
            let price = resp.lowest_price.replace(',', '.').replace('-', '0').slice(0, -1);
            price = Number.parseFloat(price);

            let message = "";
            if (item.lastPrice) {
                message += item.lastPrice <= price ? "+" : "-";
                message += `${Math.abs((price - item.lastPrice) / item.lastPrice * 100).toFixed(2)}% `;
            }

            item.lastPrice = price;

            message += `${item.name} | ${item.amount}x €${price} = €${(item.amount * price).toFixed(2)}`

            await sleep(5_000);

            return message;
        } catch (error) {
            console.error(error);
            return `${item.name} | Failed to fetch price information`;
        }
    }

    throw new Error(`Request timed out`);
}

async function reactWithEmojis(msg, emojis) {
    for (const emoji of emojis) {
        await msg.react(emoji);
    }
}

client.on("ready", () => {
    scheduleWordleReset();
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", handleMessage);

client.login(config.discordToken);
