import { BIOMES, BIOME_IDS } from './biomes.js';

// Shared logic for rolling collectibles, whether from a restored patch or a card pack.

export const RARITY = { c: 'common', r: 'rare', l: 'legendary' };
export const RATES = {
  patch: { l: 0.05, r: 0.25 },
  standard: { l: 0.05, r: 0.25 },
  premium: { l: 0.15, r: 0.5 },
};
export const TOTAL_FINDS = BIOME_IDS.reduce((n, b) => n + BIOMES[b].finds.length, 0);

// Rolls one find, records it in the save, and returns what was drawn.
export function drawFind(save, biomeId, rates, minRarity = 'c') {
  const roll = Math.random();
  let rarity = roll < rates.l ? 'l' : roll < rates.l + rates.r ? 'r' : 'c';
  if (minRarity === 'r' && rarity === 'c') rarity = 'r';
  const pool = BIOMES[biomeId].finds.filter((f) => f[2] === rarity);
  const [emoji, name] = pool[Math.floor(Math.random() * pool.length)];
  const key = `${biomeId}:${name}`;
  const isNew = !save.finds[key];
  save.finds[key] = (save.finds[key] || 0) + 1;
  return { biomeId, emoji, name, rarity, isNew, count: save.finds[key] };
}

// Three cards. Shiny packs guarantee at least one rare or better.
export function drawPack(save, biomeId, type) {
  const rates = RATES[type];
  const cards = [drawFind(save, biomeId, rates), drawFind(save, biomeId, rates)];
  const needRare = type === 'premium' && cards.every((c) => c.rarity === 'c');
  cards.push(drawFind(save, biomeId, rates, needRare ? 'r' : 'c'));
  return cards;
}

export const foundCount = (save) => Object.keys(save.finds).length;
