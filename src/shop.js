import { BIOMES } from './biomes.js';
import { GALAXIES, GALAXY_IDS, isGalaxyUnlocked, unlockProgress } from './galaxies.js';
import { SKINS } from './skins.js';
import { RARITY, RATES, TIERS, drawPack } from './collection.js';

// Stardust shop: three card packs for every biome, each with better odds than the last.
// Opens on the current galaxy's biomes, with tabs for the other galaxies.

export const PACKS = {
  standard: { name: 'Card pack', icon: '🃏', cost: 25 },
  premium: { name: 'Shiny pack', icon: '💎', cost: 75 },
  prism: { name: 'Prism pack', icon: '🔮', cost: 150 },
};
const BUY_CLASS = { standard: '', premium: 'shiny', prism: 'prism' };


const $ = (id) => document.getElementById(id);
const pct = (x) => `${Math.round(x * 100)}%`;

// tab strip for switching galaxies (shared by the shop and the collection book). Every galaxy
// gets a tab so you know what's out there; locked ones are disabled and show their unlock progress.
export function galaxyTabs(save, active, current) {
  return `<div class="galaxy-tabs" role="tablist">${GALAXY_IDS.map((g) => {
    const def = GALAXIES[g];
    if (!isGalaxyUnlocked(save, g)) {
      // lead with progress toward what's needed, matching the "6/8" on the tab itself
      const [done, need] = unlockProgress(save, g);
      const from = GALAXIES[def.unlockedBy].name;
      const left = need - done;
      const why = `Locked: ${done} of ${need} ${from} friends woken. Wake ${left} more to unlock`;
      return `<button role="tab" class="locked" disabled aria-disabled="true" title="${why}" aria-label="${def.name}. ${why}">🔒 ${def.name} <small>${done}/${need}</small></button>`;
    }
    const here = g === current;
    return `<button role="tab" data-action="tab" data-id="${g}" class="${g === active ? 'active' : ''} ${here ? 'is-here' : ''}" aria-selected="${g === active}"${here ? ' title="The galaxy you\'re in"' : ''}>${def.emoji} ${def.name}${here ? ' <small class="here">(here)</small>' : ''}</button>`;
  }).join('')}</div>`;
}

// the chance of each rarity per card, for every pack, plus what each pack guarantees
function oddsTable() {
  const head = TIERS.map((t) => `<th><span class="tier t-${t}"></span><span class="long">${RARITY[t][0].toUpperCase()}${RARITY[t].slice(1)}</span><span class="short">${t.toUpperCase()}</span></th>`).join('');
  const rows = Object.entries(PACKS).map(([type, pk]) => {
    const r = RATES[type];
    return `<tr><td>${pk.icon} ${pk.name} <small>✨${pk.cost}</small></td>${TIERS.map((t) => `<td>${r[t] ? pct(r[t]) : '–'}</td>`).join('')}<td>${RARITY[r.floor]}+</td></tr>`;
  }).join('');
  return `<details class="odds"><summary>Pack odds</summary>
    <table><thead><tr><th>Pack</th>${head}<th>1 card at least</th></tr></thead><tbody>${rows}</tbody></table></details>`;
}

export class Shop {
  constructor({ save, persist, sound, onCollection, onDust, onClose, currentGalaxy, ads }) {
    Object.assign(this, { save, persist, sound, onCollection, onDust, onClose, currentGalaxy, ads });
    // keep the free-pack buttons in step with whether a video is ready
    ads?.onChange(() => this.refreshFreeButtons());
    $('ad-no').addEventListener('click', () => this.closeOffer());
    this.tab = currentGalaxy();
    $('shop-close').addEventListener('click', () => this.close());
    $('shop-body').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const { action, id, type } = btn.dataset;
      if (action === 'pack') this.buyPack(id, type);
      if (action === 'tab') { this.tab = id; this.render(); }
      if (action === 'free') this.offerFree(id);
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
    this.tab = this.currentGalaxy();
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
    $('shop-body').innerHTML = `
      <p class="shop-note">Every pack holds <b>3 cards</b> from one biome's collection. Bigger packs have better odds,
      and each one promises at least one card of a certain rarity.</p>
      ${oddsTable()}
      ${galaxyTabs(this.save, this.tab, this.currentGalaxy())}
      <div class="pack-list">${GALAXIES[this.tab].biomes.map((b) => {
        const def = BIOMES[b];
        const found = def.finds.filter(([, n]) => this.save.finds[`${b}:${n}`]).length;
        return `<div class="pack-row">
          <span class="pack-icon">${SKINS[def.creature].emoji}</span>
          <div class="pack-name"><b>${def.name}</b><small>${found}/${def.finds.length} found</small></div>
          ${this.adsOn() ? `<button class="buy free" data-action="free" data-id="${b}" title="Watch a video for a free Card pack" aria-label="Watch a video for a free ${def.name} Card pack">🎬 Free</button>` : ''}
          ${Object.entries(PACKS).map(([type, pk]) => `<button class="buy ${BUY_CLASS[type]}" data-action="pack" data-id="${b}" data-type="${type}" title="${pk.name}" aria-label="${pk.name} for ${def.name}, ${pk.cost} stardust" ${dust < pk.cost ? 'disabled' : ''}>${pk.icon} ✨${pk.cost}</button>`).join('')}
        </div>`;
      }).join('')}</div>`;
    this.refreshFreeButtons();
  }

  // ---- free pack for watching a rewarded video ------------------------------

  adsOn() {
    return !!this.ads?.enabled && this.ads.supported;
  }

  refreshFreeButtons() {
    const ready = !!this.ads?.ready;
    document.querySelectorAll('#shop .buy.free').forEach((b) => b.classList.toggle('waiting', !ready));
    if (!this.adsOn()) document.querySelectorAll('#shop .buy.free').forEach((b) => b.remove());
  }

  // The player always opts in first (Ad Manager policy): say what the video gets them, show the
  // pack odds, and offer a clear "No thanks". Nothing is lost by saying no.
  offerFree(biomeId) {
    const def = BIOMES[biomeId];
    const r = RATES.standard;
    const odds = TIERS.map((t) => `${pct(r[t])} ${RARITY[t]}`).join(' · ');
    return this.offerVideo({
      title: 'Free Card pack?',
      body: `<p>Watch a short video and you'll get a free <b>${def.name}</b> Card pack: 3 cards, at least one uncommon or better.</p>
        <p class="offer-odds">Odds per card: ${odds}</p>`,
      starting: 'Your free pack opens as soon as it finishes.',
      missed: 'there is no free pack this time',
      onReward: () => this.grantFree(biomeId),
    });
  }

  // Shared rewarded-video prompt (free packs, galaxy unlocks). `body` explains exactly what the video
  // earns; the video only plays if the player taps Watch, and `onReward` only runs if they finish it.
  async offerVideo({ title, body, starting, missed, onReward }) {
    this.offerOpen = true;
    $('ad-offer').classList.remove('hidden');
    $('ad-offer-body').innerHTML = `<div class="offer-emoji">🎬</div><h2 id="ad-offer-title">${title}</h2>${body}`;
    const watch = $('ad-watch');
    watch.classList.remove('hidden');
    $('ad-no').textContent = 'No thanks';
    if (!this.ads.ready) {
      watch.disabled = true;
      watch.textContent = 'Finding a video…';
      const ok = await this.ads.waitForReady();
      if (!this.offerOpen) return;
      if (!ok) return this.offerMessage('No videos right now', "There isn't a video available at the moment. Please try again in a little while.");
    }
    watch.disabled = false;
    watch.textContent = '▶ Watch video';
    watch.onclick = () => this.watchFor({ starting, missed, onReward });
  }

  watchFor({ starting, missed, onReward }) {
    $('ad-offer-body').innerHTML = `<div class="offer-emoji">🎬</div><h2 id="ad-offer-title">Here comes your video</h2><p>${starting}</p>`;
    $('ad-watch').classList.add('hidden');
    const started = this.ads.show({
      onReward: () => {
        this.closeOffer();
        onReward();
      },
      onDismiss: () => this.offerMessage('Not this time', `The video was closed before the end, so ${missed}. You can try again whenever you like.`),
    });
    if (!started) this.offerMessage('No videos right now', "There isn't a video available at the moment. Please try again in a little while.");
  }

  offerMessage(title, text) {
    $('ad-offer-body').innerHTML = `<div class="offer-emoji">🎬</div><h2 id="ad-offer-title">${title}</h2><p>${text}</p>`;
    $('ad-watch').classList.add('hidden');
    $('ad-no').textContent = 'OK';
  }

  closeOffer() {
    this.offerOpen = false;
    $('ad-offer').classList.add('hidden');
  }

  grantFree(biomeId) {
    const cards = drawPack(this.save, biomeId, 'standard');
    this.persist();
    this.onCollection();
    this.sound.purchase();
    this.showPack(biomeId, 'standard', cards, { free: true });
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

  showPack(biomeId, type, cards, opts = {}) {
    const def = BIOMES[biomeId];
    $('shop').classList.add('hidden');
    $('pack').classList.remove('hidden');
    const stage = $('pack-stage');
    stage.innerHTML = `
      <div class="pack-box ${type}">
        <div class="pack-shine"></div>
        <span class="pack-emoji">${SKINS[def.creature].emoji}</span>
        <b>${def.name}</b>
        <small>${opts.free ? 'Free ' : ''}${PACKS[type].name}</small>
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
        this.showCards(biomeId, type, cards, opts);
      }, 700);
    }, { once: false });
  }

  showCards(biomeId, type, cards, opts = {}) {
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
      if (++flipped === cards.length) this.packDone(biomeId, type, opts);
    }));
  }

  packDone(biomeId, type, opts = {}) {
    const cost = PACKS[type].cost;
    const can = this.save.stardust >= cost;
    setTimeout(() => {
      $('pack-stage').querySelector('.pack-hint').textContent = `✨ ${this.save.stardust} stardust left`;
      $('pack-actions').innerHTML = `
        ${opts.free && this.adsOn() ? '<button class="btn" id="pack-free">🎬 Another free pack</button>' : ''}
        <button class="btn ${opts.free ? 'secondary' : ''}" id="pack-again" ${can ? '' : 'disabled'}>Open another ✨${cost}</button>
        <button class="btn secondary" id="pack-shop">Back to shop</button>
        <button class="btn secondary" id="pack-done">Done</button>`;
      $('pack-again').addEventListener('click', () => this.buyPack(biomeId, type));
      $('pack-free')?.addEventListener('click', () => this.offerFree(biomeId));
      $('pack-shop').addEventListener('click', () => { $('pack').classList.add('hidden'); this.open(); });
      $('pack-done').addEventListener('click', () => this.close());
    }, 600);
  }
}
