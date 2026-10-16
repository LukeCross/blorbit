import { track } from './analytics.js';

// XP and levels. The save holds one running total (`save.xp`) and the level is worked out from it,
// so the curve can be retuned without touching anyone's save. Levels never end.

export const XP = {
  patch: 5,
  biome: 40,
  planet: 150,
  pack: { standard: 10, premium: 20, prism: 35 },
  newFind: { c: 10, u: 15, r: 25, e: 40, l: 80 },
  rankUp: 20, // a duplicate that moves a find up a rank
  mastered: 150, // ...and reaching the top rank
};
// a repeat card is worth a third of a first discovery
export const dupeXp = (rarity) => Math.round(XP.newFind[rarity] / 3);

// XP needed to climb from level n to n + 1
const stepCost = (n) => 100 + 25 * n;
// total XP at which level n begins (level 1 starts at 0)
export const xpForLevel = (n) => {
  const k = n - 1;
  return 100 * k + 12.5 * k * (k + 1);
};
export function levelFor(xp) {
  let k = Math.max(0, Math.floor((-112.5 + Math.sqrt(112.5 * 112.5 + 50 * xp)) / 25));
  while (xpForLevel(k + 2) <= xp) k++; // guard against rounding at the edges
  while (k > 0 && xpForLevel(k + 1) > xp) k--;
  return k + 1;
}
export function levelInfo(xp = 0) {
  const level = levelFor(xp);
  const into = xp - xpForLevel(level);
  const need = stepCost(level);
  return { level, into, need, frac: into / need };
}

// stardust for reaching a level
export const levelStardust = (level) => Math.min(50, 10 + 2 * level);

const TITLES = [
  [1, 'Puddle Blob'], [5, 'Wobbler'], [10, 'Goo Scout'], [15, 'Planet Hopper'], [20, 'Slime Sage'],
  [30, 'Star Roller'], [40, 'Cosmic Blorb'], [60, 'Galactic Glob'], [80, 'Blorbit Legend'], [100, 'Eternal Blorb'],
];
export const levelTitle = (level) => TITLES.filter(([from]) => level >= from).pop()[1];

const listeners = [];
export const onXp = (fn) => listeners.push(fn);

// Adds XP, pays out stardust for any levels climbed, and tells the UI.
export function addXp(save, amount) {
  if (!(amount > 0)) return;
  const before = levelFor(save.xp || 0);
  save.xp = (save.xp || 0) + amount;
  const after = levelFor(save.xp);
  let dust = 0;
  for (let l = before + 1; l <= after; l++) {
    dust += levelStardust(l);
    track(`level-up/${l}`);
  }
  save.stardust = (save.stardust || 0) + dust;
  for (const fn of listeners) fn({ amount, level: after, levels: after - before, dust });
}
