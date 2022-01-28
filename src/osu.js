import request from "request"
import fs from "fs"
import { MessageEmbed } from "discord.js";
import path from "path";
import Sharp from "sharp";
import extract_zip from "extract-zip";

const userMap = {
    "122771188656111616": "11200391",
    "198066327414505472": "9703543",
    "242132070762151936": "18905405",
    "140779436931809280": "5390505"
}

const stateMap = {
    "ranked": '︽',
    "approved": ':white_check_mark:',
    "loved": ':heart:',
    "graveyard": '?'
}

// TODO: move to config file
const secret = config.osuClientSecret;
const clientId = config.osuClientId;
let token = config.osuApiToken;

let beatmapCache = {};
let beatmapsetCache = {};
let backgroundCache = {};

populateCache();

// TODO: cache token locally and perform new request if it has expired
async function obtainToken() {
    return new Promise((resolve, reject) => {
        request.post({
            headers: {"content-type": "application/x-www-form-urlencoded"},
            url: "https://osu.ppy.sh/oauth/token",
            body: `client_id=${clientId}&client_secret=${secret}&grant_type=client_credentials&scope=public`
        }, (err, response) => {
            if (err) {
                reject(err);
            } else {
                const result = JSON.parse(response.body);
                token = result.access_token;

                setTimeout(obtainToken, result.expires_in-10);
                console.log(token);
                resolve(token);
            }
        });
    })
}

async function apiRequest(endpoint) {
    if (!token) await obtainToken();

    return new Promise((resolve, reject) => {        
        request.get(`https://osu.ppy.sh/api/v2${endpoint}`, {
            headers: {"Authorization": `Bearer ${token}`}
        }, (err, response) => {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(response.body));
            }
        });
    });
}

async function cropImage(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if (err) {
                console.error(err);
                reject(err);
            } else {
                const region = {}
                const crop = new Sharp(path).extract(region);
            }
        });
    })
}

async function downloadBeatmap(beatmapsetId) {
    console.log(`Downloading beatmapset #${beatmapsetId}...`);
    return new Promise((resolve, reject) => {
        const temp_file = `temp/${beatmapsetId}.osz`;

        // TODO: catch error if download fails for some reason.
        request(`https://beatconnect.io/b/${beatmapsetId}/`)
            .pipe(fs.createWriteStream(temp_file))
            .on("close", async () => {
                const extractedName = `temp/${beatmapsetId}`;
                
                try {
                    await extract_zip(path.resolve(temp_file), { dir: path.resolve(extractedName) });
                } catch (e) {
                    fs.rmdir(path.resolve(extractedName), {}, () => {});
                    return console.error(`Something went wrong whilst unzipping beatmap\n${e}`);
                } finally {
                    fs.rm(path.resolve(`temp/${beatmapsetId}.osz`), {}, () => {});
                }
                
                resolve(extractedName);
            });
    });
}

function populateCache() {
    // TODO: async
    backgroundCache = JSON.parse(fs.readFileSync("resources/osu/cache/background_cache.json"));
    beatmapCache = JSON.parse(fs.readFileSync("resources/osu/cache/beatmap_cache.json"));
    beatmapsetCache = JSON.parse(fs.readFileSync("resources/osu/cache/beatmapset_cache.json"));
    console.log(`Loaded ${Object.keys(beatmapCache).length} beatmaps over ${Object.keys(beatmapsetCache).length} different sets, and ${Object.keys(backgroundCache).length} backgrounds from cache.`);
}

async function saveDataToFile(file, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, JSON.stringify(data), err => {
            if (err) {
                console.error(`Error whilst saving to file...\n${err}`);
                reject(err);
            } else {
                resolve();
            }
        }); 
    });
}

const saveBackgroundCache = async () => await saveDataToFile("resources/osu/cache/background_cache.json", backgroundCache);
const saveBeatmapCache = async () => await saveDataToFile("resources/osu/cache/beatmap_cache.json", beatmapCache);
const saveBeatmapsetCache = async () => await saveDataToFile("resources/osu/cache/beatmapset_cache.json", beatmapsetCache);

async function getProfilePicture(user) {
    return new Promise((resolve, reject) => {
        const dest = `resources/osu/cache/profile_pictures/${user.id}`;
        if (fs.existsSync(dest)) {
            resolve(dest);
        } else {
            // TODO: catch error
            let stream = request(user.avatar_url).pipe(fs.createWriteStream(dest));
            stream.on('close', x => resolve(dest));
        }
    });
}

// TODO: split get and download functions
async function getBeatmapBackground(diffId) {
    async function processDiff(file) {
        return new Promise((resolve, reject) => {
            fs.readFile(file, (err, data) => {
                if (err) {
                    console.error(`Error attempting to read beatmap file.\n${err}`);
                    reject(err);
                } else {
                    let content = data.toString('utf-8');

                    // TODO: make this work without carriage return
                    const metadata = content.split("[Metadata]\r\n")[1].split("\r\n")
                    const events = content.split("[Events]\r\n")[1].split("\r\n")

                    // TODO: throw error if beatmap id could not be found
                    let beatmapId;
                    for (const line of metadata) {
                        if (line.startsWith("BeatmapID")) {
                            beatmapId = line.substring(line.indexOf(':')+1).trim();
                            break;
                        }
                    }

                    for (const line of events) {
                        if (line == "") {
                            const err = "No background referenced by beatmap!";
                            console.error(err);
                            return reject(err);
                        } else if (line.startsWith('0')) {
                            const source = path.join(path.dirname(file), line.split(',')[2].replace(/"/g, ""));
                            // TODO: Possibly make it work with different image formats
                            resolve({source, beatmapId});
                            break;
                        }
                    }
                }
            });
        });
    }

    async function copyBackground(source, dest) {
        return new Promise((resolve, reject) => {
            fs.copyFile(source, dest, resolve);
        });
    }

    if (backgroundCache[diffId] != null) {
        console.log("Requested beatmap background was found in cache!");
        return `resources/osu/cache/backgrounds/${backgroundCache[diffId]}.jpg`;
    }

    const beatmap = await beatmapById(diffId);
    const folder = await downloadBeatmap(beatmap.beatmapset_id)
    const files = fs.readdirSync(folder);
    const promises = files.filter(x => x.match(new RegExp(`.*\.osu`)))
        .map(x => processDiff(path.join(folder, x)));

    // Ugly af lol
    const toCopy = {};
    for (const background of await Promise.all(promises)) {
        if (toCopy[background.source] == null) {
            toCopy[background.source] = [background.beatmapId];
        } else {
            toCopy[background.source].push(background.beatmapId);
        }
    }

    for (const same of Object.keys(toCopy)) {
        const id = toCopy[same][0];
        for (const diff of toCopy[same]) {
            backgroundCache[diff] = id;
        }
    }

    // TODO: schedule saving cache
    await saveBackgroundCache();
    await Promise.all(Object.keys(toCopy).map(x => copyBackground(x, `resources/osu/cache/backgrounds/${toCopy[x][0]}.jpg`)));

    console.log(`Cached ${Object.keys(toCopy).length} new beatmap backgrounds!`);

    fs.rm(folder, { recursive: true }, () => {});
}

export const latestPlay = async (userId) => (await apiRequest(`/users/${userId}/scores/recent?limit=1&include_fails=1`))[0];

export async function beatmapById(beatmapId) {
    const cached = beatmapCache[""+beatmapId];
    if (cached) {
        console.log(`Beatmap id ${beatmapId} was found in cache!`);
        return { beatmapset: beatmapsetCache[cached.beatmapset_id], ...cached };
    }
    
    const result = await apiRequest(`/beatmaps/${beatmapId}`);
    if (result.error) {
        console.error(`Something went wrong whilst requesting beatmap information for beatmap with id ${beatmapId}!`)
        return null;
    }

    const { 
        deleted_at, mode_int,
        ranked, url, checksum,
        beatmapset, failtimes,
        ...stripped
    } = result;

    // TODO: schedule saving
    beatmapCache[result.id] = stripped;
    await saveBeatmapCache();

    if (beatmapsetCache[result.beatmapset_id] == null) {
        const {
            covers, availability,
            can_be_hyped, discussion_enabled,
            discussion_locked, legacy_thread_url,
            nominations_summary, ranked, ratings,
            ...set_stripped
        } = beatmapset;

        beatmapsetCache[result.beatmapset_id] = set_stripped;
        await saveBeatmapsetCache();
    }

    return { beatmapset: beatmapsetCache[result.beatmapset_id], ...stripped };
}

export const osuIdFromDiscordId = (discordId) => userMap[discordId];
export const discordIdFromOsuId = (osuId) => Object.keys(userMap).find(x => userMap[x] == osuId);

export async function summaryImage(play) {
    if (!play) {
        throw new Error("No play found!");
    }

    const { user, beatmapset } = play;
    const beatmap = await beatmapById(play.beatmap.id);

    // TODO: do this whilst waiting for other downloads
    const background = Sharp(await getBeatmapBackground(beatmap.id));

    // profile picture
    const profilePic = Sharp(await getProfilePicture(user))
        .resize(300, 300);

    const output = await background.composite([
        {
            input: profilePic,
            top: 500,
            left: 500,
        }
    ]).toBuffer();

    return { files: output };
}

export async function summary(play) {
    if (!play) {
        throw new Error("No play found!");
    }

    const { user, beatmapset } = play;
    const beatmap = await beatmapById(play.beatmap.id);
    //Player | Artist - Title [difficulty] +Mods (Mapper, Map stats when applicable) acc% FC/combo+misscount #Leaderboard pos. | pp | UR/cv. UR
    
    await getBeatmapBackground(beatmap.id);

    const state = stateMap[beatmapset.status];

    const embed = new MessageEmbed({
        author: {
            name: user.username,
            iconURL: play.rank == 'F' ? "https://i.imgur.com/h0bAakU.png" : `http://s.ppy.sh/images/${play.rank}.png`
        },
        footer: {
            text: user.username,
            iconURL: user.avatar_url
        },
        title: `${state} ${beatmapset.artist_unicode} - ${beatmapset.title_unicode} [${beatmap.version}]`,
        timestamp: new Date(play.created_at),
        color: 15230624,
        thumbnail: {
            url: "attachment://thumb.jpg",
        },
        fields: [
            {name: "acc", value: `${(play.accuracy * 100).toFixed(2)}%`, inline: true},
            {name: "combo", value: `${play.max_combo}/${beatmap.max_combo}x`, inline: true},
            {name: "pp", value: play.pp != null ? `${play.pp}pp` : '-', inline: true},
            {name: "misses", value: `:x: ${play.statistics.count_miss}`, inline: true},
            {name: "difficulty", value: `${Math.floor(beatmap.difficulty_rating * 100) / 100}★`}
        ]
    });

    const files = [
        {attachment: await getBeatmapBackground(beatmap.id), name: "thumb.jpg"}
    ];

    return { embeds: [embed], files };
}