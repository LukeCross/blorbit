import { BIOMES, BIOME_IDS } from './biomes.js';
import { GALAXIES } from './galaxies.js';
import { track } from './analytics.js';
import { XP, dupeXp, addXp } from './xp.js';

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

// Every find ranks up as you collect copies. These are the copies needed for each rank (the first is
// the discovery itself). Rarer finds turn up less often, so they ask for fewer copies.
export const RANKS = ['Found', 'Familiar', 'Cherished', 'Treasured', 'Mastered'];
export const MAX_RANK = RANKS.length;
const RANK_AT = { c: [1, 3, 6, 10, 15], u: [1, 3, 5, 8, 12], r: [1, 2, 4, 7, 10], e: [1, 2, 4, 6, 8], l: [1, 2, 3, 5, 7] };
// 0 = undiscovered, 1 (Found) .. 5 (Mastered)
export const rankFor = (rarity, count = 0) => RANK_AT[rarity].filter((n) => count >= n).length;
// One colour per rank, bronze up to a prismatic top (shown as a rainbow once it's full).
const RANK_COLORS = ['#cf8a4e', '#b4bfcc', '#f2b823', '#ff7eb6', '#b57cf5'];
const RANK_TRACK = 'rgba(61,53,96,0.12)';
// Colour stops for a progress ring or bar split into one segment per rank: finished ranks are full
// in their own colour, the next one is part-filled, the rest are empty. Pass it to conic-gradient
// (total 360, unit 'deg') or linear-gradient (total 100, unit '%'). Reads as "how far from Mastered".
export function rankStops(rarity, count, total, gap, unit) {
  const { rank, frac } = rankInfo(rarity, count);
  const seg = total / MAX_RANK, u = (n) => `${n.toFixed(2)}${unit}`, out = [];
  for (let i = 0; i < MAX_RANK; i++) {
    const a = i * seg + gap / 2, b = (i + 1) * seg - gap / 2;
    const fill = i < rank ? 1 : i === rank ? frac : 0;
    const mid = a + (b - a) * fill;
    out.push(`transparent ${u(i * seg)} ${u(a)}`);
    if (fill === 1 && i === MAX_RANK - 1) out.push(`#ff7eb6 ${u(a)}`, `#b57cf5 ${u((a + b) / 2)}`, `#5fd0ff ${u(b)}`);
    else {
      if (fill > 0) out.push(`${RANK_COLORS[i]} ${u(a)} ${u(mid)}`);
      if (fill < 1) out.push(`${RANK_TRACK} ${u(mid)} ${u(b)}`);
    }
    out.push(`transparent ${u(b)} ${u((i + 1) * seg)}`);
  }
  return out.join(', ');
}
export const RANK_DOTS = RANK_COLORS;
// everything the UI needs to describe a find's rank: its name, progress to the next one, and a sentence
export function rankInfo(rarity, count = 0) {
  const rank = rankFor(rarity, count);
  if (!rank) return { rank, name: '', frac: 0, left: 0, text: '' };
  const name = RANKS[rank - 1];
  if (rank === MAX_RANK) return { rank, name, frac: 1, left: 0, text: 'No more copies needed' };
  const at = RANK_AT[rarity], left = at[rank] - count;
  return { rank, name, frac: (count - at[rank - 1]) / (at[rank] - at[rank - 1]), left, text: `${left} more cop${left === 1 ? 'y' : 'ies'} to ${RANKS[rank]}` };
}

// Rolls one find, records it in the save, pays the XP for it, and returns what was drawn.
export function drawFind(save, biomeId, rates, min = 'c') {
  const rarity = rollTier(rates, min);
  const pool = BIOMES[biomeId].finds.filter((f) => f[2] === rarity);
  const [emoji, name] = pool[Math.floor(Math.random() * pool.length)];
  const key = `${biomeId}:${name}`;
  const isNew = !save.finds[key];
  const before = rankFor(rarity, save.finds[key]);
  save.finds[key] = (save.finds[key] || 0) + 1;
  const rank = rankFor(rarity, save.finds[key]);
  const rankUp = !isNew && rank > before;
  const mastered = rankUp && rank === MAX_RANK;
  track(`find/${key.replace(':', '/')}`);
  if (mastered) track(`find-mastered/${key.replace(':', '/')}`);
  addXp(save, (isNew ? XP.newFind[rarity] : dupeXp(rarity)) + (rankUp ? XP.rankUp : 0) + (mastered ? XP.mastered : 0));
  return { biomeId, emoji, name, rarity, isNew, count: save.finds[key], rank, rankUp, mastered };
}

// Three cards. If none of the first two reach the pack's floor tier, the third one is lifted to it,
// so every pack keeps its promise without making the floor tier any more common than it needs to be.
export function drawPack(save, biomeId, type) {
  const rates = RATES[type];
  const cards = [drawFind(save, biomeId, rates), drawFind(save, biomeId, rates)];
  const floor = rates.floor ?? 'c';
  const met = cards.some((c) => rank(c.rarity) >= rank(floor));
  cards.push(drawFind(save, biomeId, rates, met ? 'c' : floor));
  addXp(save, XP.pack[type]);
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
// finds taken to the top rank
export const masteredCount = (save) => [...FIND_INDEX].filter(([k, f]) => rankFor(f.rarity, save.finds[k]) === MAX_RANK).length;
export const masteredIn = (save, biomeIds) => biomeIds.reduce((n, b) => n + BIOMES[b].finds.filter(([, name, t]) => rankFor(t, save.finds[`${b}:${name}`]) === MAX_RANK).length, 0);

// A rough XP total for saves from before levels existed, so long-time players start with a level.
export function estimateXp(save) {
  let xp = (save.restored || 0) * XP.planet + Math.max(0, (save.unlocked?.length || 1) - 1) * XP.biome;
  for (const [k, f] of FIND_INDEX) {
    const n = save.finds[k];
    if (n) xp += XP.newFind[f.rarity] + (n - 1) * dupeXp(f.rarity);
  }
  return xp;
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
