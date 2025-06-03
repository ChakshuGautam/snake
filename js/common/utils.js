export function randomInt(min, max) { // max is exclusive
    return Math.floor(Math.random() * (max - min)) + min;
}

export function randomChoice(arr) {
    if (!arr || arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
}

export function log(...msgs) {
    console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...msgs);
}
