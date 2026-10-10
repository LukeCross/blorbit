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

// Quirky names for the player's profile. Random each time: it's the "regenerate" button's job.
// Several shapes over big word banks, so repeats are rare (well over 100,000 combinations).
const ADJECTIVES = ['Soggy', 'Wobbly', 'Grumpy', 'Sleepy', 'Fancy', 'Squishy', 'Suspicious', 'Majestic', 'Dizzy', 'Crunchy', 'Sneaky',
  'Bouncy', 'Tiny', 'Sparkly', 'Mighty', 'Confused', 'Gloopy', 'Dramatic', 'Chonky', 'Lucky', 'Cranky', 'Jolly', 'Wiggly', 'Moist',
  'Cosmic', 'Feral', 'Unbothered', 'Fluffy', 'Gigantic', 'Sticky', 'Spicy', 'Wholesome', 'Haunted', 'Radical', 'Smol', 'Zesty',
  'Sassy', 'Lumpy', 'Cheeky', 'Peculiar', 'Frosty', 'Bashful', 'Dapper', 'Giggly', 'Jiggly', 'Nervous', 'Overcaffeinated', 'Precious',
  'Rowdy', 'Slippery', 'Smug', 'Soft', 'Squeaky', 'Sweaty', 'Tipsy', 'Wonky', 'Boneless', 'Gelatinous', 'Questionable', 'Enchanted'];
const NOUNS = ['Waffle', 'Noodle', 'Pickle', 'Biscuit', 'Muffin', 'Pancake', 'Turnip', 'Crumpet', 'Dumpling', 'Pudding', 'Gizmo',
  'Wombat', 'Tumbleweed', 'Meatball', 'Doodle', 'Bagel', 'Nugget', 'Sprout', 'Jellybean', 'Marshmallow', 'Boop', 'Mango',
  'Blobfish', 'Pretzel', 'Splat', 'Cupcake', 'Gumdrop', 'Potato', 'Wibble', 'Snorkel', 'Kumquat', 'Bubbles', 'Toast', 'Pebble',
  'Spatula', 'Banjo', 'Walrus', 'Gnocchi', 'Crouton', 'Beanbag', 'Doughnut', 'Fidget', 'Hiccup', 'Kazoo', 'Lasagna', 'Moustache',
  'Noodlebug', 'Omelette', 'Pogo', 'Quokka', 'Radish', 'Sock', 'Teapot', 'Trombone', 'Umbrella', 'Wafer', 'Yoyo', 'Zucchini',
  'Giblet', 'Mittens', 'Ravioli', 'Scone', 'Tadpole', 'Piglet', 'Thimble', 'Goblin'];
const TITLES = ['Captain', 'Sir', 'Professor', 'Lord', 'Lady', 'Doctor', 'Admiral', 'Baron', 'Duchess', 'Grand Wizard', 'Chief', 'Agent',
  'Commander', 'Count', 'Madame', 'General', 'Major', 'Sheriff'];
const FIRST = ['Gerald', 'Bartholomew', 'Doris', 'Gus', 'Mabel', 'Reginald', 'Phyllis', 'Barry', 'Wendell', 'Gladys', 'Norbert', 'Ethel',
  'Cornelius', 'Beatrice', 'Dennis', 'Tilly', 'Humphrey', 'Agatha', 'Clive', 'Prudence', 'Walter', 'Bernadette'];
const LAST = ['Splodge', 'Wobblesworth', 'McSquish', 'Gloopington', 'Von Blob', 'Blobsworth', 'Bumblewick', 'Fluffernutter', 'Snugglebottom',
  'Pudgington', 'Wigglesby', 'Squelchworth', 'Goober', 'Dribbleton', 'Puddlesworth', 'Slimington'];
const TRAITS = ['the Brave', 'the Damp', 'the Unready', 'the Magnificent', 'the Squishy', 'the Curious', 'the Slightly Lost', 'the Bouncy',
  'the Gooey', 'the Mysterious', 'the Hungry', 'the Wise-ish', 'the Last Blob', 'of Many Puddles', 'of the Squelch', 'from Next Door',
  'the Third', 'the Great', 'the Snack', 'the Not-So-Terrible'];
const WHOLE = ['Sir Wobbles-a-Lot', 'Glorp', 'Blobert', 'Not a Puddle', 'Blobby McBlobface', 'Slimothy', 'Mr. Splodge', 'Gloop Troop',
  'Squelch', 'Just a Guy', 'Blorb Jr.', 'Sticky Ricky', 'Glooby', 'Big Splat Energy', 'Definitely Not Slime', 'Plop', 'Blip Blop',
  'Sir Splats-a-Lot', 'Gooseph', 'Slimey Joe', 'Splish Splash', 'Boingo', 'Mildly Damp', 'Blob Ross', 'Gloop Dogg', 'Squishmund'];

export function blobName() {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shapes = [
    () => `${pick(ADJECTIVES)} ${pick(NOUNS)}`,
    () => `${pick(ADJECTIVES)} ${pick(NOUNS)}`,
    () => `${pick(ADJECTIVES)} ${pick(NOUNS)}`,
    () => `${pick(TITLES)} ${pick(NOUNS)}`,
    () => `${pick(TITLES)} ${pick(ADJECTIVES)} ${pick(NOUNS)}`,
    () => `${pick(NOUNS)} ${pick(TRAITS)}`,
    () => `${pick(FIRST)} ${pick(LAST)}`,
    () => `${pick(TITLES)} ${pick(FIRST)} ${pick(LAST)}`,
    () => `${pick(FIRST)} ${pick(TRAITS)}`,
    () => `${pick(NOUNS)}${pick(NOUNS).toLowerCase()}`,
    () => pick(WHOLE),
  ];
  return pick(shapes)();
}
