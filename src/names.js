import { mulberry32 } from './noise.js';

// Silly, friendly planet names built from syllables. Same seed, same name.

const START = ['zor', 'bli', 'ka', 'mo', 'lu', 'vee', 'gla', 'pip', 'nu', 'qua', 'ri', 'ste', 'flo', 'dro', 'yum', 'bo', 'tel',
  'xan', 'ori', 'pa', 'mi', 'sko', 'wib', 'jel', 'su', 'pom', 'ze', 'cra', 'fen', 'ha', 'oo', 'twi', 'bram', 'cel', 'dun', 'ema'];
const MIDDLE = ['bu', 'la', 'mi', 'ro', 'zi', 'ne', 'po', 'ka', 'li', 'fu', 'ster', 'gle', 'wum', 'da', 'ri', 'ble', 'so', 'mo'];
const END = ['bia', 'tron', 'lis', 'ix', 'ora', 'une', 'opia', 'ulon', 'ee', 'ax', 'oo', 'ara', 'ine', 'ette', 'os', 'ia', 'ump',
  'ble', 'yx', 'onia', 'ari', 'ell', 'ot', 'una'];
const ROMAN = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'IX', 'XII'];
const FORMATS = [
  (n) => n,
  (n) => n,
  (n) => n,
  (n) => `${n} Prime`,
  (n) => `${n} Minor`,
  (n) => `${n} Major`,
  (n, r) => `${n} ${ROMAN[Math.floor(r() * ROMAN.length)]}`,
  (n, r) => `${n}-${2 + Math.floor(r() * 97)}`,
  (n) => `Little ${n}`,
  (n) => `New ${n}`,
  (n) => `${n}'s Rock`,
];

export function planetName(seed) {
  const r = mulberry32(seed ^ 0x51ed27);
  const pick = (a) => a[Math.floor(r() * a.length)];
  let word = pick(START);
  if (r() < 0.55) word += pick(MIDDLE);
  word += pick(END);
  word = word[0].toUpperCase() + word.slice(1);
  return pick(FORMATS)(word, r);
}

// A fresh seed from the moment you arrive, so every planet is new.
export function timeSeed() {
  let h = Date.now() ^ Math.floor(performance.now() * 1000);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
}
