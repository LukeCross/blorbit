import { BIOMES, BIOME_IDS } from './biomes.js';
import { SKINS } from './skins.js';
import { RARITY, RATES, drawPack } from './collection.js';

// Stardust shop: a standard and a shiny card pack for every biome.

export const PACKS = {
  standard: { name: 'Card pack', cost: 25 },
  premium: { name: 'Shiny pack', cost: 75 },
};


const $ = (id) => document.getElementById(id);
const pct = (x) => `${Math.round(x * 100)}%`;

export class Shop {
  constructor({ save, persist, sound, onCollection, onDust, onClose }) {
    Object.assign(this, { save, persist, sound, onCollection, onDust, onClose });
    $('shop-close').addEventListener('click', () => this.close());
    $('shop-body').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const { action, id, type } = btn.dataset;
      if (action === 'pack') this.buyPack(id, type);
    });
  }

  isOpen() {
    return !$('shop').classList.contains('hidden') || !$('pack').classList.contains('hidden');
  }

  toggle() {
    if (this.isOpen()) this.close();
    else this.open();
  }

  open() {
    $('shop').classList.remove('hidden');
    this.render();
  }

  close() {
    $('shop').classList.add('hidden');
    $('pack').classList.add('hidden');
    this.onClose?.();
  }

  render() {
    $('shop-dust').textContent = this.save.stardust;
    const dust = this.save.stardust;
    const s = RATES.standard, p = RATES.premium;
    $('shop-body').innerHTML = `
      <p class="shop-note">Every pack holds <b>3 cards</b> from one biome's collection.
      Card pack: ${pct(s.l)} legendary · ${pct(s.r)} rare. <span class="shiny-text">Shiny pack</span>: ${pct(p.l)} legendary · ${pct(p.r)} rare · always at least one rare.</p>
      <div class="pack-list">${BIOME_IDS.map((b) => {
        const def = BIOMES[b];
        const found = def.finds.filter(([, n]) => this.save.finds[`${b}:${n}`]).length;
        return `<div class="pack-row">
          <span class="pack-icon">${SKINS[def.creature].emoji}</span>
          <div class="pack-name"><b>${def.name}</b><small>${found}/${def.finds.length} found</small></div>
          <button class="buy" data-action="pack" data-id="${b}" data-type="standard" ${dust < PACKS.standard.cost ? 'disabled' : ''}>🃏 ✨${PACKS.standard.cost}</button>
          <button class="buy shiny" data-action="pack" data-id="${b}" data-type="premium" ${dust < PACKS.premium.cost ? 'disabled' : ''}>💎 ✨${PACKS.premium.cost}</button>
        </div>`;
      }).join('')}</div>`;
  }

  spend(cost) {
    if (this.save.stardust < cost) {
      this.sound.deny();
      return false;
    }
    this.save.stardust -= cost;
    this.sound.purchase();
    this.onDust();
    return true;
  }

  buyPack(biomeId, type) {
    if (!this.spend(PACKS[type].cost)) return;
    const cards = drawPack(this.save, biomeId, type);
    this.persist();
    this.onCollection();
    this.showPack(biomeId, type, cards);
  }

  // ---- pack opening -------------------------------------------------------

  showPack(biomeId, type, cards) {
    const def = BIOMES[biomeId];
    $('shop').classList.add('hidden');
    $('pack').classList.remove('hidden');
    const stage = $('pack-stage');
    stage.innerHTML = `
      <div class="pack-box ${type}">
        <div class="pack-shine"></div>
        <span class="pack-emoji">${SKINS[def.creature].emoji}</span>
        <b>${def.name}</b>
        <small>${PACKS[type].name}</small>
      </div>
      <p class="pack-hint">Tap the pack to open it</p>`;
    $('pack-actions').innerHTML = '';
    const box = stage.querySelector('.pack-box');
    box.addEventListener('click', () => {
      if (box.classList.contains('shake')) return;
      box.classList.add('shake');
      this.sound.packShake();
      setTimeout(() => {
        this.sound.packRip();
        $('pack-flash').classList.remove('go');
        void $('pack-flash').offsetWidth;
        $('pack-flash').classList.add('go');
        this.showCards(biomeId, type, cards);
      }, 700);
    }, { once: false });
  }

  showCards(biomeId, type, cards) {
    const stage = $('pack-stage');
    stage.innerHTML = `<div class="cards">${cards.map((c, i) => `
      <div class="card ${c.rarity}" style="animation-delay:${i * 0.12}s" data-i="${i}">
        <div class="card-inner">
          <div class="card-back"><span>✦</span></div>
          <div class="card-front">
            ${c.isNew ? '<em class="ribbon">NEW!</em>' : `<em class="dupe">×${c.count}</em>`}
            <span class="card-emoji">${c.emoji}</span>
            <b>${c.name}</b>
            <small>${RARITY[c.rarity]}</small>
          </div>
        </div>
      </div>`).join('')}</div>
      <p class="pack-hint">Tap each card to flip it</p>`;
    let flipped = 0;
    stage.querySelectorAll('.card').forEach((el) => el.addEventListener('click', () => {
      if (el.classList.contains('flipped')) return;
      el.classList.add('flipped');
      const c = cards[Number(el.dataset.i)];
      this.sound.cardFlip();
      setTimeout(() => this.sound.discovery(c.rarity, c.isNew), 180);
      if (++flipped === cards.length) this.packDone(biomeId, type);
    }));
  }

  packDone(biomeId, type) {
    const cost = PACKS[type].cost;
    const can = this.save.stardust >= cost;
    setTimeout(() => {
      $('pack-stage').querySelector('.pack-hint').textContent = `✨ ${this.save.stardust} stardust left`;
      $('pack-actions').innerHTML = `
        <button class="btn" id="pack-again" ${can ? '' : 'disabled'}>Open another ✨${cost}</button>
        <button class="btn secondary" id="pack-shop">Back to shop</button>
        <button class="btn secondary" id="pack-done">Done</button>`;
      $('pack-again').addEventListener('click', () => this.buyPack(biomeId, type));
      $('pack-shop').addEventListener('click', () => { $('pack').classList.add('hidden'); this.open(); });
      $('pack-done').addEventListener('click', () => this.close());
    }, 600);
  }
}
