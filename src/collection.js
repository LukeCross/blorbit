import { BIOMES, BIOME_IDS } from './biomes.js';
import { GALAXIES } from './galaxies.js';

// Shared logic for rolling collectibles, whether from a restored patch or a card pack.

// rarity tiers, lowest first
export const TIERS = ['c', 'u', 'r', 'e', 'l'];
export const RARITY = { c: 'common', u: 'uncommon', r: 'rare', e: 'epic', l: 'legendary' };
const rank = (t) => TIERS.indexOf(t);

// Chance of each tier per card. With 3 common, 2 uncommon and 1 each of rare, epic and legendary
// per biome, each individual find gets steadily harder: ~17% / 13.5% / 13% / 6% / 2% from a spot.
// `floor`: one card in the pack is at least this tier.
export const RATES = {
  patch: { c: 0.52, u: 0.27, r: 0.13, e: 0.06, l: 0.02 },
  standard: { c: 0.52, u: 0.27, r: 0.13, e: 0.06, l: 0.02, floor: 'u' },
  premium: { c: 0.15, u: 0.3, r: 0.3, e: 0.18, l: 0.07, floor: 'r' },
  prism: { c: 0, u: 0.14, r: 0.38, e: 0.32, l: 0.16, floor: 'e' },
};

export const TOTAL_FINDS = BIOME_IDS.reduce((n, b) => n + BIOMES[b].finds.length, 0);
export const totalFindsIn = (g) => GALAXIES[g].biomes.reduce((n, b) => n + BIOMES[b].finds.length, 0);

// roll a tier, re-weighted to only the tiers at or above `min`
function rollTier(rates, min = 'c') {
  const allowed = TIERS.filter((t) => rank(t) >= rank(min) && rates[t] > 0);
  const total = allowed.reduce((s, t) => s + rates[t], 0);
  let x = Math.random() * total;
  for (const t of allowed) if ((x -= rates[t]) < 0) return t;
  return allowed[allowed.length - 1];
}

// Rolls one find, records it in the save, and returns what was drawn.
export function drawFind(save, biomeId, rates, min = 'c') {
  const rarity = rollTier(rates, min);
  const pool = BIOMES[biomeId].finds.filter((f) => f[2] === rarity);
  const [emoji, name] = pool[Math.floor(Math.random() * pool.length)];
  const key = `${biomeId}:${name}`;
  const isNew = !save.finds[key];
  save.finds[key] = (save.finds[key] || 0) + 1;
  return { biomeId, emoji, name, rarity, isNew, count: save.finds[key] };
}

// Three cards. If none of the first two reach the pack's floor tier, the third one is lifted to it,
// so every pack keeps its promise without making the floor tier any more common than it needs to be.
export function drawPack(save, biomeId, type) {
  const rates = RATES[type];
  const cards = [drawFind(save, biomeId, rates), drawFind(save, biomeId, rates)];
  const floor = rates.floor ?? 'c';
  const met = cards.some((c) => rank(c.rarity) >= rank(floor));
  cards.push(drawFind(save, biomeId, rates, met ? 'c' : floor));
  return cards;
}

// only counts finds that still exist, so a renamed find can't inflate the total
const foundInBiome = (save, b) => BIOMES[b].finds.filter(([, name]) => save.finds[`${b}:${name}`]).length;
export const foundCount = (save) => BIOME_IDS.reduce((n, b) => n + foundInBiome(save, b), 0);
export const foundIn = (save, g) => GALAXIES[g].biomes.reduce((n, b) => n + foundInBiome(save, b), 0);

// finds discovered vs possible, per rarity tier, across the given biomes: { c: [found, total], ... }
export function rarityCounts(save, biomeIds = BIOME_IDS) {
  const out = Object.fromEntries(TIERS.map((t) => [t, [0, 0]]));
  for (const b of biomeIds) {
    for (const [, name, t] of BIOMES[b].finds) {
      out[t][1]++;
      if (save.finds[`${b}:${name}`]) out[t][0]++;
    }
  }
  return out;
}
// every card ever drawn, duplicates included
export const cardsCollected = (save) => Object.values(save.finds).reduce((n, c) => n + c, 0);

// every find by its save key, for the profile showcase
export const FIND_INDEX = new Map(BIOME_IDS.flatMap((b) => BIOMES[b].finds.map(([emoji, name, rarity]) => [`${b}:${name}`, { biomeId: b, emoji, name, rarity }])));
export const SHOWCASE_SLOTS = 3;
// a showcase can only hold finds that exist and have been discovered, each at most once
export function cleanShowcase(save) {
  const seen = new Set();
  const keep = (save.showcase || []).slice(0, SHOWCASE_SLOTS).map((k) => (FIND_INDEX.has(k) && save.finds[k] && !seen.has(k) && seen.add(k) ? k : null));
  while (keep.length < SHOWCASE_SLOTS) keep.push(null);
  return keep;
}
// the player's rarest discovered finds, rarest first
export function rarestFinds(save, n = SHOWCASE_SLOTS) {
  return [...FIND_INDEX.keys()]
    .filter((k) => save.finds[k])
    .sort((a, b) => rank(FIND_INDEX.get(b).rarity) - rank(FIND_INDEX.get(a).rarity))
    .slice(0, n);
}
