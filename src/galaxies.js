import { BIOMES } from './biomes.js';
import { SKINS } from './skins.js';

// A galaxy is a set of biomes. Each planet draws its 4 biomes from one galaxy, so every
// galaxy has its own creatures, finds and shop packs. Biome ids are unique across galaxies,
// which keeps find keys (`${biomeId}:${name}`) unambiguous without a galaxy prefix.

export const GALAXIES = {
  wild: {
    name: 'Wildbloom',
    emoji: '🌸',
    blurb: 'Meadows, ponds, dunes and snowy peaks. Wake the wild creatures.',
    art: ['#c8f0d8', '#d8c8ff'],
    biomes: ['meadow', 'pond', 'desert', 'snow', 'grove', 'garden', 'shore', 'volcano', 'candy', 'autumn'],
  },
  city: {
    name: 'Citylight',
    emoji: '🌆',
    blurb: 'Parks, neon streets, suburbs, a funfair and the docks. Light the city back up.',
    art: ['#ffc8e0', '#b8c4ff'],
    biomes: ['park', 'downtown', 'suburbs', 'funfair', 'harbour'],
    // unlocked by waking 80% of Wildbloom's creatures (8 of 10)
    unlockedBy: 'wild',
    unlockAt: 0.8,
  },
  sky: {
    name: 'Skyhaven',
    emoji: '☁️',
    blurb: 'Floating islands, windmills, rainbows and stars. Brighten the skies.',
    art: ['#bfe4ff', '#fff0c8'],
    biomes: ['pastures', 'cliffs', 'rainbow', 'balloons', 'stargazer'],
    // unlocked by waking 80% of Citylight's creatures (4 of 5)
    unlockedBy: 'city',
    unlockAt: 0.8,
  },
};
export const GALAXY_IDS = Object.keys(GALAXIES);

// the creatures of a galaxy, in biome order (this order is also the skin hotkey order)
export const creaturesOf = (g) => GALAXIES[g].biomes.map((b) => BIOMES[b].creature);
export const galaxyOfBiome = (biomeId) => GALAXY_IDS.find((g) => GALAXIES[g].biomes.includes(biomeId));
export const galaxyOfCreature = (id) => GALAXY_IDS.find((g) => creaturesOf(g).includes(id));

// creatures woken in a galaxy: [done, total]
export function wokenIn(save, g) {
  const all = creaturesOf(g);
  return [all.filter((c) => save.unlocked.includes(c)).length, all.length];
}

// what a locked galaxy is waiting for: [woken so far, needed, total] in the galaxy it depends on
export function unlockProgress(save, g) {
  const { unlockedBy, unlockAt = 1 } = GALAXIES[g];
  const [done, total] = wokenIn(save, unlockedBy);
  return [done, Math.ceil(total * unlockAt), total];
}

export function isGalaxyUnlocked(save, g) {
  if (!GALAXIES[g].unlockedBy) return true;
  if (save.adUnlocked?.includes(g)) return true; // unlocked by watching a video
  const [done, need] = unlockProgress(save, g);
  return done >= need;
}

// e.g. "Wake 8 of the 10 Wildbloom friends to unlock"
export function unlockHint(save, g) {
  const [, need, total] = unlockProgress(save, g);
  const from = GALAXIES[GALAXIES[g].unlockedBy].name;
  return need >= total ? `Wake all ${total} ${from} friends to unlock` : `Wake ${need} of the ${total} ${from} friends to unlock`;
}

// sanity checks so a typo in the data fails loudly at startup instead of mid-game
for (const g of GALAXY_IDS) {
  for (const b of GALAXIES[g].biomes) {
    if (!BIOMES[b]) throw new Error(`galaxy ${g}: unknown biome ${b}`);
    if (GALAXY_IDS.filter((o) => GALAXIES[o].biomes.includes(b)).length > 1) throw new Error(`biome ${b} is in more than one galaxy`);
    for (const r of ['c', 'u', 'r', 'e', 'l']) if (!BIOMES[b].finds.some((f) => f[2] === r)) throw new Error(`biome ${b} needs at least one ${r} find`);
  }
}
for (const b of Object.keys(BIOMES)) if (!galaxyOfBiome(b)) throw new Error(`biome ${b} isn't in any galaxy`);
export const checkSkins = () => {
  for (const g of GALAXY_IDS) for (const c of creaturesOf(g)) if (!SKINS[c]) console.warn(`galaxy ${g}: no skin yet for ${c}`);
};
