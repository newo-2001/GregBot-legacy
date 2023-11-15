import { Client, Intents, MessageAttachment } from "discord.js"
import { createWriteStream, readFileSync } from "fs"
import { wordle, scheduleWordleReset } from "./wordle.js"
import config from "../config.json" assert { type: "json" }
import request from "request"
import got from "got";

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

async function sleep(millis) {
    return await new Promise(resolve => setTimeout(resolve, millis));
}

async function handleMessage(msg) {
    if (msg.author.id == config.botId) return;

    if (msg.channelId == config.wordleChannelId) {
        wordle(msg);
    }

    if (msg.content == "!invest") {
        return await furia(msg);
    }

    if (msg.author.id == config.meesId && msg.content.toLowerCase() == "saai") {
        return msg.reply({files: [readFileSync("resources/saai.jpg")]});
    }
    
    if (msg.content.match(/(^|.*\s)28([^\d].*|$)/) != null) {
        return msg.reply({files: [readFileSync("resources/28.jpg")]});
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

let lastFuria;
const items = [
    {
        name: "FURIA (Holo) Katowice 2019",
        amount: 2,
        url: "Sticker%20%7C%20FURIA%20%28Holo%29%20%7C%20Katowice%202019"
    },
    {
        name: "FURIA (Holo) Antwerp 2022",
        amount: 8,
        url: "Sticker%20%7C%20FURIA%20%28Holo%29%20%7C%20Antwerp%202022"
    },
    {
        name: "FURIA (Holo) Stockholm 2021",
        amount: 8,
        url: "Sticker%20%7C%20FURIA%20%28Holo%29%20%7C%20Stockholm%202021"
    },
    {
        name: "Team Liquid (Holo) Stockholm 2021",
        amount: 4,
        url: "Sticker%20%7C%20Team%20Liquid%20%28Holo%29%20%7C%20Stockholm%202021"
    },
    {
        name: "G2 esports (Holo) Stockholm 2021",
        amount: 1,
        url: "Sticker%20%7C%20G2%20Esports%20%28Holo%29%20%7C%20Stockholm%202021"
    },
    {
        name: "Evil Geniuses (Holo) Stockholm 2021",
        amount: 1,
        url: "Sticker%20%7C%20Evil%20Geniuses%20%28Holo%29%20%7C%20Stockholm%202021"
    },
    {
        name: "Natus Vincere (Holo) Stockholm 2021",
        amount: 2,
        url: "Sticker%20%7C%20Natus%20Vincere%20%28Holo%29%20%7C%20Stockholm%202021"
    },
    {
        name: "Ninjas in Pyjamas (Holo) Stockholm 2021",
        amount: 2,
        url: "Sticker%20%7C%20Ninjas%20in%20Pyjamas%20%28Holo%29%20%7C%20Stockholm%202021"
    },
    {
        name: "Gambit Gaming (Holo) Stockholm 2021",
        amount: 1,
        url: "Sticker%20%7C%20Gambit%20Gaming%20%28Holo%29%20%7C%20Stockholm%202021"
    },
    {
        name: "PGL (Holo) Stockholm 2021",
        amount: 6,
        url: "Sticker%20%7C%20PGL%20%28Holo%29%20%7C%20Stockholm%202021"
    },
    {
        name: "Vitality (Holo) Stockholm 2021",
        amount: 1,
        url: "Sticker%20%7C%20Vitality%20%28Holo%29%20%7C%20Stockholm%202021"
    },
    {
        name: "Ninjas in Pyjamas (Foil) Stockholm 2021",
        amount: 1,
        url: "Sticker%20%7C%20Ninjas%20in%20Pyjamas%20%28Foil%29%20%7C%20Stockholm%202021"
    },
    {
        name: "Natus Vincere (Foil) Stockholm 2021",
        amount: 1,
        url: "Sticker%20%7C%20Natus%20Vincere%20%28Foil%29%20%7C%20Stockholm%202021"
    },
    {
        name: "New Sheriff (Foil)",
        amount: 1,
        url: "Sticker%20%7C%20New%20Sheriff%20%28Foil%29"
    },
    {
        name: "Glove Case",
        amount: 5,
        url: "Glove%20Case"
    },
    {
        name: "Antwerp 2022 Ancient Souvenir Package",
        amount: 1,
        url: "Antwerp%202022%20Ancient%20Souvenir%20Package"
    },
    {
        name: "Antwerp 2022 Vertigo Souvenir Package",
        amount: 1,
        url: "Antwerp%202022%20Vertigo%20Souvenir%20Package"
    },
    {
        name: "Antwerp 2022 Dust II Souvenir Package",
        amount: 1,
        url: "Antwerp%202022%20Dust%20II%20Souvenir%20Package"
    },
    {
        name: "Stockholm 2021 Dust II Souvenir Package",
        amount: 2,
        url: "Stockholm%202021%20Dust%20II%20Souvenir%20Package"
    },
    {
        name: "Stockholm 2021 Mirage Souvenir Package",
        amount: 1,
        url: "Stockholm%202021%20Mirage%20Souvenir%20Package"
    },
    {
        name: "M4A4 | Red DDPAT (Factory New)",
        amount: 1,
        url: "M4A4%20%7C%20Red%20DDPAT%20%28Factory%20New%29"
    },
    {
        name: "Galil AR | Amber Fade (Minimal Wear)",
        amount: 1,
        url: "Galil%20AR%20%7C%20Amber%20Fade%20%28Minimal%20Wear%29"
    },
    {
        name: "MP9 | Music Box (Field Tested)",
        amount: 1,
        url: "MP9%20%7C%20Music%20Box%20%28Field-Tested%29"
    },
    {
        name: "P2000 | Silver (Factory New)",
        amount: 1,
        url: "P2000%20%7C%20Silver%20%28Factory%20New%29"
    }
];

async function furia(msg) {
    const STEAM_API_URL = "https://steamcommunity.com/market/priceoverview/?appid=730&currency=3&market_hash_name=";
    
    let message = "";
    let totalPrice = 0;

    for (const item of items) {
        const resp = await got.get(STEAM_API_URL + item.url, { retry: { limit: 7 }}).json();
        let price = resp.lowest_price.replace(',', '.').slice(0, -1);
        price = Number.parseFloat(price);
        totalPrice += price * item.amount;

        if (lastFuria) {
            message += item.lastPrice <= price ? "+" : "-";
            message += `${Math.abs((price - item.lastPrice) / item.lastPrice * 100).toFixed(2)}% `;
        }

        item.lastPrice = price;

        message += `${item.name} | ${item.amount}x €${price} = €${(item.amount * price).toFixed(2)}\n`
        await sleep(250);
    }

    let delta = totalPrice - lastFuria;
    const stock = delta >= 0 ? ":chart_with_upwards_trend: " : ":chart_with_downwards_trend: ";
    const sign = delta < 0 ? '-' : '+';
    let content = `${lastFuria ? stock : ""}Total €${totalPrice.toFixed(2)}`;
    if (lastFuria) {
        content += ` (${sign}€${Math.abs(delta).toFixed(2)})`;
    }

    lastFuria = totalPrice;
    msg.channel.send({ content: content, files: [ new MessageAttachment(Buffer.from(message, "utf-8"), "investments.diff") ]});
}

async function reactWithEmojis(msg, emojis) {
    for (const emoji of emojis) {
        await msg.react(emoji);
    }
}

async function downloadAttachments(attachments) {
    const downloaded = [];

    for (let attachment of attachments) {
        attachment = attachment[1];

        if (!attachment.contentType.includes("image")) return;
        const extensions = attachment.url.split(".");
        const extension = extensions[extensions.length-1];

        try {
            const alpha = "abcdefghijklmnopqrstuvwxyz";
            const path = `temp/${Array(10).fill(1).map(x => alpha[Math.floor(Math.random() * alpha.length)]).join('')}.${extension}`;

            await download(attachment.url, path);
            downloaded.push(path);
        } catch (e) {
            console.error(e);
        }
    }

    return downloaded;
}

function download(url, path) {
    return new Promise((resolve, reject) => {
        request.get(url).pipe(createWriteStream(path)).on("close", resolve);
    })
}

client.on("ready", () => {
    scheduleWordleReset();
    console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", handleMessage);
client.on("messageUpdate", (oldMsg, newMsg) => handleMessage(newMsg));

client.login(config.discordToken);