const WORD = "kleand";
const DAILY_ATTEMPTS = 6;
const START_DAY = new Date("April 14, 2022");

const SYMBOL_CORRECT = '🟩';
const SYMBOL_PRESENT = '🟨';
const SYMBOL_INCORRECT = '⬛';

let attempts = {}

export function wordle(msg) {
    const user = msg.author.id;
    const guess = msg.content;

    if (guess.length != WORD.length || !userHasGuesses(user)) return;

    if (attempts[user] == null) {
        attempts[user] = {count: 0, guesses: []}
    }

    const acc = accuracy(guess);
    attempts[user].count++;
    attempts[user].guesses.push(acc);

    const attempt = attempts[user].count;
    if (isCorrect(guess) || !userHasGuesses(user)) {
        const word = firstLetterUppercase(WORD);
        const day = dayNumber();
        const score = attempts[user].guesses.join('\n');

        msg.reply(`${word} ${day}\t${attempt}/${DAILY_ATTEMPTS}\n${score}`);
        attempts[user].count = DAILY_ATTEMPTS;
    } else {
        msg.reply(`${attempt}/${DAILY_ATTEMPTS} ${acc}`);
    }
}

const msPerDay = 1000 * 60 * 60 * 24;
const timeUntilNextDay = () => msPerDay - (new Date().getTime() % msPerDay);
const userHasGuesses = user => (attempts[user]?.count ?? 0) < DAILY_ATTEMPTS;
const isCorrect = guess => guess.toLowerCase() == WORD;

const accuracy = guess => guess.toLowerCase().split('').map((c, i) => {
    if (WORD[i] == c) return SYMBOL_CORRECT;
    return WORD.includes(c) ? SYMBOL_PRESENT : SYMBOL_INCORRECT;
}).join('');

function dayNumber() {
    const durationMs = new Date().getTime() - START_DAY.getTime();
    const durationDays = Math.floor(durationMs / msPerDay);
    return durationDays + 1;
}

function firstLetterUppercase(word) {
    if ((word?.length ?? 0) == 0) return "";
    return word.length == 1 ? word.toUpperCase() : word[0].toUpperCase() + word.substring(1);
}

export function scheduleWordleReset() {
    attempts = [];
    setTimeout(scheduleWordleReset, timeUntilNextDay() + 5000);
}