import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Sky, makeAtmosphere, GradeShader } from './look.js';
import { Backdrop } from './skyfx.js';
import { quality, TIERS, detectTier } from './quality.js';
import { Planet, NUM_REGIONS } from './planet.js';
import { Blob } from './blob.js';
import { Creature } from './creature.js';
import { Particles } from './particles.js';
import { Sound } from './audio.js';
import { SKINS, CREATURE_IDS } from './skins.js';
import { BIOMES, BIOME_IDS } from './biomes.js';
import { Critters } from './critters.js';
import { Stardust } from './stardust.js';
import { RARITY, RATES, TOTAL_FINDS, drawFind, foundCount } from './collection.js';
import { Shop } from './shop.js';
import { planetName, timeSeed } from './names.js';

// ---------------------------------------------------------------- save data

const SAVE_KEY = 'blorbit-save-v1';
const save = Object.assign(
  { unlocked: ['classic'], equipped: 'classic', restored: 0, autoRoll: false, stardust: 0, finds: {}, v: 3 },
  JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'),
);
if ((save.v || 0) < 3) Object.assign(save, { autoRoll: false, v: 3 }); // auto-roll is off by default (toggle with R)
save.quality ??= 'auto';
quality.tier = save.quality === 'auto' ? detectTier() : save.quality;
// trails were removed from the shop: give back any stardust spent on them
if (save.trailsOwned) {
  const TRAIL_COSTS = { sparkle: 60, petals: 80, bubbles: 90, hearts: 110, fire: 130, stars: 160, rainbow: 220 };
  save.stardust = (save.stardust || 0) + save.trailsOwned.reduce((n, t) => n + (TRAIL_COSTS[t] || 0), 0);
  delete save.trailsOwned;
  delete save.trail;
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}
let resetting = false; // once a reset starts, nothing may write the old progress back
const persist = () => !resetting && localStorage.setItem(SAVE_KEY, JSON.stringify(save));
const SKIN_ORDER = ['classic', ...CREATURE_IDS];
// '-' wears Classic Goo; 1-9 then 0 wear the ten creature skins in bar order
const skinKey = (id) => (id === 'classic' ? '-' : String((CREATURE_IDS.indexOf(id) + 1) % 10));

// ---------------------------------------------------------------- renderer & scene

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, TIERS[quality.tier].pixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
// neutral tone mapping keeps pastels true instead of crushing them like ACES does
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const sky = new Sky();
scene.background = sky.texture;
scene.add(makeAtmosphere(10.3));
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.7;

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 600);
// soft, low-contrast pastel light: lavender sky fill, peachy bounce, warm gentle sun
const hemi = new THREE.HemisphereLight(0xf0ecff, 0xffd8c8, 1.35);
const sun = new THREE.DirectionalLight(0xfff4e6, 1.9);
scene.add(hemi, sun, sun.target);


// Post-processing (Pretty only). It renders into a multisampled target because the composer
// otherwise throws away MSAA and every edge goes jagged. Smooth renders straight to screen.
let composer = null;
let grade = null;
function buildComposer() {
  const msaaTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, msaaTarget);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.55, 1.2));
  composer.addPass(new OutputPass());
  grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
}
function applyQuality() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, TIERS[quality.tier].pixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (TIERS[quality.tier].post && !composer) buildComposer();
  composer?.setPixelRatio(renderer.getPixelRatio());
  composer?.setSize(window.innerWidth, window.innerHeight);
}
applyQuality();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer?.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------- game objects

// touch devices get touch hints and no keyboard badges
const coarse = window.matchMedia('(pointer: coarse)');
const syncTouch = () => document.body.classList.toggle('touch', coarse.matches);
syncTouch();
coarse.addEventListener?.('change', syncTouch);
const smallScreen = () => window.innerWidth <= 720 || window.innerHeight <= 500;

const sound = new Sound();
const backdrop = new Backdrop(scene, sound);
const particles = new Particles(scene);
const blob = new Blob(scene);
if (!SKINS[save.equipped]) save.equipped = 'classic';
blob.setSkin(save.equipped);
const BRUSH = 1.3;

let planet = null;
let critters = null;
let stardust = null;
let creatures = [];
let regions = [];
let completed = 0;
let state = 'title'; // title | play | finale
let gameTime = 0;
let hitstop = 0;
let timeScale = 1;
let fovKick = 0;
let shake = 0;
let currentBiome = -1;

const $ = (id) => document.getElementById(id);
const CIRC = 2 * Math.PI * 16;
const CIRC_W = 2 * Math.PI * 23;

function newPlanet(seed = timeSeed()) {
  planet?.dispose();
  critters?.dispose();
  stardust?.dispose();
  creatures.forEach((c) => c.dispose());
  popups.splice(0).forEach((p) => p.el.remove());
  planet = new Planet(scene, seed);
  planet.setSlimeColor(SKINS[blob.skinId].slime);
  creatures = planet.creatureOrder.map((id, r) => new Creature(scene, planet, id, planet.centers[r]));
  critters = new Critters(scene, planet, (dir) => {
    sound.splash();
    particles.burst(surfacePoint(dir, 0.1), dir, [new THREE.Color(0xbff4ff), WHITE], 8, 2.5, 0.25, 0.6);
  });
  stardust = new Stardust(scene, planet);
  regions = planet.creatureOrder.map((id, r) => ({ id, biome: planet.defs[r], done: false, patchesDone: 0 }));
  completed = 0;
  currentBiome = -1;

  // start on the edge of the biggest biome, facing in
  let big = 0;
  for (let r = 1; r < NUM_REGIONS; r++) if (planet.regionTotal[r] > planet.regionTotal[big]) big = r;
  const start = planet.centers[big].clone().lerp(planet.centers[(big + 1) % NUM_REGIONS], 0.35).normalize();
  blob.placeAt(start, planet.centers[big].clone().sub(start));

  $('planet-name').textContent = planetName(seed);
  $('planet-name').title = `seed ${seed}`;
  buildRegionUI();
}

// ---------------------------------------------------------------- UI

function ringSvg(r, size, cls) {
  return `<svg viewBox="0 0 ${size} ${size}"><circle class="${cls[0]}" cx="${size / 2}" cy="${size / 2}" r="${r}"/>
    <circle class="${cls[1]}" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-dasharray="${2 * Math.PI * r}" stroke-dashoffset="${2 * Math.PI * r}"/></svg>`;
}

function buildRegionUI() {
  $('chips').innerHTML = regions
    .map((r) => `<div class="chip" title="${r.biome.name}">${ringSvg(16, 40, ['ring-bg', 'ring-fg'])}<div class="emoji">${SKINS[r.id].emoji}</div></div>`)
    .join('');
  $('world-rings').innerHTML = regions
    .map((r) => `<div class="world-ring">${ringSvg(23, 56, ['bg', 'fg'])}<div class="emoji">${SKINS[r.id].emoji}</div></div>`)
    .join('');
  regions.forEach((r, i) => {
    r.chip = $('chips').children[i];
    r.ring = $('world-rings').children[i];
  });
}

function buildSkinBar() {
  $('skins').innerHTML = SKIN_ORDER
    .map((id, i) => {
      const unlocked = save.unlocked.includes(id);
      const s = SKINS[id];
      return `<button class="skin ${unlocked ? '' : 'locked'} ${blob.skinId === id ? 'active' : ''}" data-id="${id}"
        title="${unlocked ? `${s.name} (press ${skinKey(id)})` : 'Wake this creature to unlock'}">${unlocked ? s.emoji : '🔒'}<i class="key">${skinKey(id)}</i></button>`;
    })
    .join('');
  $('skins').querySelectorAll('.skin').forEach((b) => b.addEventListener('click', () => equip(b.dataset.id)));
}

function equip(id) {
  if (!id || !save.unlocked.includes(id) || id === blob.skinId) return;
  blob.setSkin(id);
  save.equipped = id;
  planet.setSlimeColor(SKINS[id].slime);
  persist();
  sound.skinSwap();
  const c = new THREE.Color(SKINS[id].slime);
  particles.burst(blob.position, blob.p, [c, new THREE.Color(0xffffff)], 50, 5, 0.4, 1);
  buildSkinBar();
}

let toastTimer = 0;
function toast(html) {
  const t = $('toast');
  t.innerHTML = html;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

// floating label that rises out of a completed patch
const popups = [];
function popup(dir, text) {
  const el = document.createElement('div');
  el.className = 'popup';
  el.textContent = text;
  $('popups').appendChild(el);
  popups.push({ el, pos: dir.clone().multiplyScalar(planet.heightAt(dir) + 1.2), age: 0 });
}

const proj = new THREE.Vector3();
function project(pos) {
  proj.copy(pos).project(camera);
  return [(proj.x * 0.5 + 0.5) * window.innerWidth, (-proj.y * 0.5 + 0.5) * window.innerHeight, proj.z];
}

// write a style only when it changes: avoids needless layout/paint work every frame
function setStyle(el, prop, value) {
  const cache = (el._styleCache ??= {});
  if (cache[prop] === value) return;
  cache[prop] = value;
  el.style[prop] = value;
}

function updateUI(dt) {
  const camDir = camera.position.clone().normalize();
  regions.forEach((r, i) => {
    const c = planet.regionProgress(i);
    r.chipRing ??= r.chip.querySelector('.ring-fg');
    r.worldRing ??= r.ring.querySelector('.fg');
    setStyle(r.chipRing, 'strokeDashoffset', (CIRC * (1 - c)).toFixed(1));
    setStyle(r.worldRing, 'strokeDashoffset', (CIRC_W * (1 - c)).toFixed(1));
    r.ring.classList.toggle('near', !r.done && c > 0.88);
    const center = planet.centers[i];
    r.ringPos ??= center.clone().multiplyScalar(planet.heightAt(center) + 2.8);
    const [x, y, z] = project(r.ringPos);
    const facing = center.dot(camDir);
    const visible = state !== 'title' && facing > 0.2 && z < 1;
    setStyle(r.ring, 'opacity', visible ? Math.min(1, (facing - 0.2) * 4).toFixed(2) : '0');
    if (visible) setStyle(r.ring, 'transform', `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`);
  });
  setStyle($('total-fill'), 'width', `${(planet.totalCoverage() * 100).toFixed(1)}%`);

  for (let k = popups.length - 1; k >= 0; k--) {
    const p = popups[k];
    p.age += dt;
    const [x, y, z] = project(p.pos);
    p.el.style.left = `${x}px`;
    p.el.style.top = `${y - p.age * 40}px`;
    p.el.style.opacity = z < 1 ? Math.min(1, 3 - p.age * 1.2) : 0;
    if (p.age > 2.5) {
      p.el.remove();
      popups.splice(k, 1);
    }
  }

  if (currentBiome >= 0) {
    const [done, total] = planet.spots(currentBiome);
    const left = total - done;
    const text = regions[currentBiome].done ? 'restored ✨'
      : left === 0 ? 'all spots cleared!' : left <= 2 ? `${left} spot${left === 1 ? '' : 's'} left!` : `${done}/${total} spots`;
    if ($('biome-progress').textContent !== text) $('biome-progress').textContent = text;
  }
}

function setBiome(r) {
  currentBiome = r;
  const def = planet.defs[r];
  $('biome-name').textContent = def.name;
  $('biome-label').classList.remove('bump');
  void $('biome-label').offsetWidth;
  $('biome-label').classList.add('bump');
  sky.set(...def.sky);
  sound.setBiome(planet.biomes[r]);
}

// ---------------------------------------------------------------- input

const keys = { left: false, right: false, up: false, down: false };
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };
const stick = { id: null, x0: 0, y0: 0, dx: 0, dy: 0 };

window.addEventListener('keydown', (e) => {
  if (state === 'title') return start();
  if (KEYMAP[e.code]) {
    keys[KEYMAP[e.code]] = true;
    e.preventDefault();
  }
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'KeyR') toggleAutoRoll();
  if (e.code === 'KeyB') toggleBook();
  if (e.code === 'KeyP') shop.toggle();
  if (e.code === 'KeyN') $('new-planet').click();
  if (e.code === 'Escape') { shop.close(); $('book').classList.add('hidden'); closeSettings(); }
  if (e.code === 'Minus' || e.code === 'NumpadSubtract') equip('classic');
  const digit = /^(?:Digit|Numpad)(\d)$/.exec(e.code);
  if (digit) equip(CREATURE_IDS[(Number(digit[1]) + 9) % 10]);
});
window.addEventListener('keyup', (e) => {
  if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false;
});
window.addEventListener('blur', () => Object.keys(keys).forEach((k) => (keys[k] = false)));

// touch / mouse: drag anywhere for a virtual joystick
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (stick.id !== null) return;
  Object.assign(stick, { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 });
  const j = $('joystick');
  j.style.left = `${e.clientX}px`;
  j.style.top = `${e.clientY}px`;
  j.classList.add('on');
});
window.addEventListener('pointermove', (e) => {
  if (e.pointerId !== stick.id) return;
  let dx = e.clientX - stick.x0, dy = e.clientY - stick.y0;
  const len = Math.hypot(dx, dy);
  if (len > 55) { dx *= 55 / len; dy *= 55 / len; }
  stick.dx = dx / 55;
  stick.dy = dy / 55;
  $('knob').style.transform = `translate(${dx}px, ${dy}px)`;
});
const release = (e) => {
  if (e.pointerId !== stick.id) return;
  stick.id = null;
  stick.dx = stick.dy = 0;
  $('joystick').classList.remove('on');
  $('knob').style.transform = '';
};
window.addEventListener('pointerup', release);
window.addEventListener('pointercancel', release);

function readInput() {
  let steer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + stick.dx;
  let throttle = (keys.up ? 1 : 0) - (keys.down ? 1 : 0) - stick.dy;
  if (Math.abs(stick.dx) < 0.15 && stick.id !== null && !keys.left && !keys.right) steer = 0;
  if (save.autoRoll && !keys.down && stick.dy < 0.3) throttle = 1;
  return { steer: Math.max(-1, Math.min(1, steer)), throttle: Math.max(-1, Math.min(1, throttle)) };
}

function toggleMute() {
  sound.setMuted(!sound.muted);
  $('mute').classList.toggle('muted', sound.muted);
}
function toggleAutoRoll() {
  save.autoRoll = !save.autoRoll;
  persist();
  $('autoroll').classList.toggle('on', save.autoRoll);
}
$('autoroll').classList.toggle('on', save.autoRoll);
$('mute').addEventListener('click', toggleMute);
$('autoroll').addEventListener('click', toggleAutoRoll);
$('title').addEventListener('pointerdown', () => start());

function start() {
  if (state !== 'title') return;
  sound.start();
  state = 'play';
  $('title').classList.add('hidden');
  ['hud-top', 'skins', 'biome-label', 'autoroll', 'hud-left'].forEach((id) => $(id).classList.remove('hidden'));
  buildSkinBar();
}

$('next-planet').addEventListener('click', () => {
  $('finale').classList.add('hidden');
  warpToNewPlanet();
});
// ---------------------------------------------------------------- resume

const PLANET_KEY = 'blorbit-planet-v1';
function packBits(arr) {
  const bytes = new Uint8Array(Math.ceil(arr.length / 8));
  for (let i = 0; i < arr.length; i++) if (arr[i]) bytes[i >> 3] |= 1 << (i & 7);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function unpackBits(str, n) {
  const s = atob(str);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = (s.charCodeAt(i >> 3) >> (i & 7)) & 1;
  return out;
}

function savePlanet() {
  if (!planet || resetting) return;
  localStorage.setItem(PLANET_KEY, JSON.stringify({
    seed: planet.seed,
    painted: packBits(planet.painted),
    regions: planet.regionDone.map((d) => d >= 0),
    patches: planet.patches.map((p) => p.done >= 0),
    patchesDone: regions.map((r) => r.patchesDone),
    dust: packBits(stardust.items.map((it) => it.state === 2)),
    blob: [...blob.p.toArray(), ...blob.f.toArray()],
    finished: completed === NUM_REGIONS,
  }));
}

// Rebuild a saved planet in its restored state (no celebrations, it all just pops back in).
function resumePlanet(data) {
  newPlanet(data.seed);
  const painted = unpackBits(data.painted, planet.count);
  const restore = (i, flag) => {
    planet.markPainted(i);
    planet.paintTime[i] = -10;
    planet.dyn[i * 4 + 1] = 1;
    planet.flags[i] |= flag;
  };
  painted.forEach((v, i) => v && restore(i, 0));
  data.patches.forEach((done, k) => {
    if (!done) return;
    const patch = planet.patches[k];
    patch.done = 0;
    for (const v of patch.verts) {
      restore(v, 2);
      planet.water[v] = planet.waterTarget[v];
    }
    spawnCritters(patch.def.critters, patch.center, patch.path ? 0.3 : patch.r * 1.5);
  });
  data.regions.forEach((done, r) => {
    if (!done) return;
    planet.regionDone[r] = 0;
    for (const v of planet.regionVerts[r]) restore(v, 1);
    regions[r].done = true;
    regions[r].chip.classList.add('done');
    regions[r].ring.classList.add('done');
    creatures[r].setAwake();
    completed++;
    spawnCritters(planet.defs[r].critters, planet.centers[r], planet.biomeRadius[r]);
  });
  data.patchesDone?.forEach((n, r) => (regions[r].patchesDone = n));
  unpackBits(data.dust, stardust.items.length).forEach((v, i) => v && stardust.markCollected(i));
  const [px, py, pz, fx, fy, fz] = data.blob;
  blob.placeAt(new THREE.Vector3(px, py, pz), new THREE.Vector3(fx, fy, fz));
  planet.dynAttr.needsUpdate = true;
  planet.waterAttr.needsUpdate = true;
}

setInterval(() => state !== 'title' && savePlanet(), 4000);
document.addEventListener('visibilitychange', () => document.hidden && savePlanet());
window.addEventListener('pagehide', savePlanet);

// Leave for a brand-new planet: flash out, regenerate, swoop back in.
let warping = false;
function warpToNewPlanet() {
  if (warping) return;
  warping = true;
  sound.warp();
  $('warp').classList.add('on');
  setTimeout(() => {
    newPlanet();
    savePlanet();
    state = 'play';
    cam.pos.copy(blob.p).multiplyScalar(40);
    fovKick = 12;
    $('warp').classList.remove('on');
    toast(`Welcome to ${$('planet-name').textContent}<small>A brand-new planet, just for you</small>`);
    warping = false;
  }, 450);
}

// two taps to confirm, so you never lose a planet by accident
let confirmTimer = 0;
$('new-planet').addEventListener('click', () => {
  const btn = $('new-planet');
  if (completed === 0 && planet.totalCoverage() < 0.02) return warpToNewPlanet();
  if (btn.classList.contains('confirm')) {
    clearTimeout(confirmTimer);
    btn.classList.remove('confirm');
    $('new-planet-label').textContent = 'New planet';
    return warpToNewPlanet();
  }
  btn.classList.add('confirm');
  $('new-planet-label').textContent = 'Leave this planet? Tap again';
  confirmTimer = setTimeout(() => {
    btn.classList.remove('confirm');
    $('new-planet-label').textContent = 'New planet';
  }, 3000);
});

$('keep-rolling').addEventListener('click', () => {
  $('finale').classList.add('hidden');
  state = 'play';
});

// ---------------------------------------------------------------- rewards

const WHITE = new THREE.Color(0xffffff);
const GOLD = new THREE.Color(0xffd84d);
const PINK = new THREE.Color(0xff7eb6);
const cap = (s) => s[0].toUpperCase() + s.slice(1);

function surfacePoint(dir, up = 0) {
  return dir.clone().multiplyScalar(planet.heightAt(dir) + up);
}

function completePatch(k, silent = false) {
  const patch = planet.patches[k];
  planet.completePatch(k);
  if (silent) return;
  const r = regions[patch.region];
  sound.patchPing(r.patchesDone++);
  blob.jiggle(0.8);
  fovKick = 2.5;
  const col = planet.aliveCols[patch.region];
  const pts = patch.path ? patch.pts.filter((_, i) => i % 3 === 0) : [patch.center];
  for (const d of pts) particles.burst(surfacePoint(d, 0.3), d, [col, WHITE, GOLD], patch.path ? 14 : 50, 6, 0.45, 1.2);
  popup(patch.center, `${patch.name} ✓`);
  spawnCritters(patch.def.critters, patch.center, patch.path ? 0.3 : patch.r * 1.5, 700);
  setTimeout(() => rollFind(planet.biomes[patch.region], patch.center), 350);
  savePlanet();
}

function spawnCritters(list, center, radius, delay = 0) {
  if (!list) return;
  const c = critters;
  setTimeout(() => {
    if (c !== critters) return;
    for (const [kind, n] of list) for (let i = 0; i < n; i++) critters.spawn(kind, center, radius);
  }, delay);
}

// ---------------------------------------------------------------- collection

function rollFind(biomeId, dir) {
  const { emoji, name, rarity, isNew, count } = drawFind(save, biomeId, RATES.patch);
  persist();
  sound.discovery(rarity, isNew);
  findCard(emoji, name, rarity, isNew, count);
  if (isNew) {
    const colors = rarity === 'l' ? [GOLD, WHITE, PINK] : rarity === 'r' ? [new THREE.Color(0x8ad8ff), WHITE] : [WHITE];
    particles.burst(surfacePoint(dir, 0.6), dir, colors, rarity === 'l' ? 120 : 30, rarity === 'l' ? 9 : 5, 0.5, 1.4);
    if (rarity === 'l') { hitstop = 0.08; shake = 0.2; }
    $('book-btn').classList.remove('bump');
    void $('book-btn').offsetWidth;
    $('book-btn').classList.add('bump');
  }
  updateBookCount();
}

function findCard(emoji, name, rarity, isNew, count) {
  const el = document.createElement('div');
  el.className = `find ${rarity}${isNew ? ' new' : ''}`;
  el.innerHTML = `<span class="find-emoji">${emoji}</span><div><b>${isNew ? 'NEW! ' : ''}${name}</b><small>${RARITY[rarity]}${isNew ? '' : ` · ×${count}`}</small></div>`;
  $('finds').prepend(el);
  setTimeout(() => el.classList.add('out'), 3200);
  setTimeout(() => el.remove(), 3700);
  while ($('finds').children.length > (smallScreen() ? 2 : 4)) $('finds').lastChild.remove();
}

function updateBookCount() {
  $('book-count').textContent = `${foundCount(save)}/${TOTAL_FINDS}`;
}

function refreshDust() {
  $('dust-count').textContent = save.stardust;
}

// ---------------------------------------------------------------- settings + reset

function openSettings() {
  // Classic Goo is always yours, so only the ten creature skins count
  const unlockedSkins = save.unlocked.filter((id) => CREATURE_IDS.includes(id)).length;
  $('settings-stats').innerHTML = [
    ['Skins unlocked', `${unlockedSkins}/${CREATURE_IDS.length}`],
    ['Collection', `${foundCount(save)}/${TOTAL_FINDS}`],
    ['Stardust', save.stardust],
    ['Planets restored', save.restored],
  ].map(([label, value]) => `<div class="stat"><small>${label}</small><b>${value}</b></div>`).join('');
  $('reset-start').classList.remove('hidden');
  $('reset-confirm').classList.add('hidden');
  $('quality-picker').querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', b.dataset.q === save.quality);
    if (b.dataset.q === 'auto') b.textContent = `Auto (${quality.tier === 'smooth' ? 'Smooth' : 'Pretty'})`;
  });
  $('settings').classList.remove('hidden');
}
// switching graphics rebuilds materials, so save everything and reload into the same planet
$('quality-picker').addEventListener('click', (e) => {
  const q = e.target.closest('button')?.dataset.q;
  if (!q || q === save.quality) return;
  save.quality = q;
  persist();
  savePlanet();
  $('warp').classList.add('on');
  setTimeout(() => location.reload(), 350);
});
function closeSettings() {
  $('settings').classList.add('hidden');
}
$('settings-btn').addEventListener('click', openSettings);
$('settings-close').addEventListener('click', closeSettings);
$('reset-btn').addEventListener('click', () => {
  $('reset-start').classList.add('hidden');
  $('reset-confirm').classList.remove('hidden');
});
$('reset-cancel').addEventListener('click', () => {
  $('reset-confirm').classList.add('hidden');
  $('reset-start').classList.remove('hidden');
});
$('reset-yes').addEventListener('click', () => {
  resetting = true;
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(PLANET_KEY);
  $('warp').classList.add('on');
  setTimeout(() => location.replace(location.pathname), 450);
});

// ---------------------------------------------------------------- shop

const shop = new Shop({
  save, persist, sound,
  onCollection: updateBookCount,
  onDust: refreshDust,
  onClose: () => {
    // opened from the "Planet restored" card: come back to it afterwards
    if (shopFromFinale) {
      $('finale-dust').textContent = save.stardust;
      $('finale').classList.remove('hidden');
    }
    shopFromFinale = false;
  },
});
let shopFromFinale = false;
$('finale-shop').addEventListener('click', () => {
  $('finale').classList.add('hidden');
  shopFromFinale = true;
  shop.open();
});
$('shop-btn').addEventListener('click', () => shop.toggle());
$('dust').addEventListener('click', () => shop.open());

// little slime droplets flicking off the back of the blob
function spawnDrips(dt, moving) {
  dripTimer -= dt * Math.min(1, moving);
  if (dripTimer >= 0) return;
  dripTimer = 0.09;
  const p = blob.position.clone().addScaledVector(blob.f, -0.5 * Math.sign(blob.speed || 1)).add(new THREE.Vector3().randomDirection().multiplyScalar(0.35));
  const v = blob.p.clone().multiplyScalar(1 + Math.random() * 1.5).add(new THREE.Vector3().randomDirection().multiplyScalar(0.8));
  particles.spawn(p, v, new THREE.Color(SKINS[blob.skinId].slime).multiplyScalar(0.7), 0.22, 0.5, 9);
}

function toggleBook() {
  const book = $('book');
  if (!book.classList.contains('hidden')) return book.classList.add('hidden');
  $('book-grid').innerHTML = BIOME_IDS.map((b) => {
    const def = BIOMES[b];
    const woke = save.unlocked.includes(def.creature);
    const items = def.finds.map(([emoji, name, rarity]) => {
      const n = save.finds[`${b}:${name}`];
      return `<div class="slot ${rarity} ${n ? '' : 'locked'}" title="${n ? `${name} (${RARITY[rarity]})` : `??? (${RARITY[rarity]})`}">${n ? emoji : '❔'}${n > 1 ? `<i>×${n}</i>` : ''}</div>`;
    }).join('');
    const found = def.finds.filter(([, name]) => save.finds[`${b}:${name}`]).length;
    return `<div class="book-row"><div class="book-head"><span class="${woke ? '' : 'dim'}">${woke ? SKINS[def.creature].emoji : '❔'}</span><b>${def.name}</b><em>${found}/${def.finds.length}</em></div><div class="slots">${items}</div></div>`;
  }).join('');
  $('book-total').textContent = `${foundCount(save)} of ${TOTAL_FINDS} found · ✨ ${save.stardust} stardust · ${save.restored} planet${save.restored === 1 ? "" : "s"} restored`;
  book.classList.remove('hidden');
}
$('book-btn').addEventListener('click', toggleBook);
$('book-close').addEventListener('click', toggleBook);
updateBookCount();

function completeRegion(i) {
  const r = regions[i];
  r.done = true;
  completed++;
  planet.completeRegion(i);
  planet.patches.forEach((p, k) => { if (p.region === i && p.done < 0) completePatch(k, true); });
  sound.ping(completed - 1);
  hitstop = 0.11;
  fovKick = 7;
  shake = 0.3;
  blob.jiggle(1.6);
  r.chip.classList.add('done');
  r.ring.classList.add('done');

  const center = planet.centers[i];
  particles.burst(surfacePoint(center, 0.5), center, [planet.aliveCols[i], WHITE, GOLD], 160, 10, 0.7, 2);
  spawnCritters(planet.defs[i].critters, center, planet.biomeRadius[i], 1200);
  particles.burst(blob.position, blob.p, [new THREE.Color(SKINS[blob.skinId].slime), WHITE], 40, 5, 0.4, 1);

  const creature = creatures[i];
  setTimeout(() => {
    creature.wake();
    sound.wake();
  }, 500);
  setTimeout(() => particles.burst(creature.worldTop(), center, [PINK, WHITE], 30, 3.5, 0.45, 1.2), 1000);
  setTimeout(() => {
    const skin = SKINS[r.id];
    if (!save.unlocked.includes(r.id)) {
      save.unlocked.push(r.id);
      persist();
      sound.unlock();
      buildSkinBar();
      $('skins').querySelector(`[data-id="${r.id}"]`)?.classList.add('fresh');
      toast(`${skin.emoji} ${r.biome.name} restored!<small>${cap(r.id)} woke up. New skin unlocked: press ${skinKey(r.id)} to wear it</small>`);
    } else {
      toast(`${skin.emoji} ${r.biome.name} restored!<small>${completed} of ${NUM_REGIONS} friends woken</small>`);
    }
  }, 1400);

  savePlanet();
  const p = planet;
  if (completed === NUM_REGIONS) setTimeout(() => p === planet && finale(), 3400);
}

function finale() {
  state = 'finale';
  save.restored++;
  persist();
  sound.fanfare();
  const colors = [...planet.aliveCols, WHITE, GOLD];
  for (let k = 0; k < 6; k++) {
    setTimeout(() => {
      const d = new THREE.Vector3().randomDirection();
      particles.burst(surfacePoint(d, 0.5), d, colors, 120, 12, 0.8, 2.2);
    }, k * 220);
  }
  $('finale-creatures').textContent = regions.map((r) => SKINS[r.id].emoji).join('');
  $('finale-dust').textContent = save.stardust;
  setTimeout(() => $('finale').classList.remove('hidden'), 1800);
}

// ---------------------------------------------------------------- per-frame play logic

let stepAccum = 0;
let freshSinceStep = 0;
let streak = 0;
let dripTimer = 0;
let lifeTimer = 0;
let prevSteer = 0;
let dustCombo = 0;
let lastDust = -10;
let dustSaveTimer = 0;
let moteAccum = 0;

function updatePlay(dt) {
  const { steer, throttle } = state === 'play' ? readInput() : { steer: 0, throttle: 0 };
  if (steer !== 0 && prevSteer === 0) {
    sound.turnSquelch();
    blob.jiggle(0.35);
  }
  prevSteer = steer;

  const sleeping = creatures.filter((c) => c.state === 'sleeping').map((c) => c.dir);
  blob.update(dt, steer, throttle, gameTime, planet, sleeping);
  if (state === 'title') return;

  const fresh = planet.paint(blob.p, BRUSH);
  freshSinceStep += fresh;
  const moving = Math.abs(blob.speed);

  // a bloop every ~blob-length; the pitch climbs while you're slime-ing new ground
  stepAccum += moving * dt;
  if (stepAccum > 0.9) {
    stepAccum = 0;
    if (freshSinceStep > 4) {
      streak = Math.min(streak + 1, 11);
      sound.blorp(streak);
    } else {
      streak = Math.max(0, streak - 3);
      sound.squish();
    }
    freshSinceStep = 0;
  }
  sound.updateRoll(blob.rollAngle, Math.min(1, moving / 2));

  spawnDrips(dt, moving);

  const here = planet.regionAt(blob.p);
  if (here !== currentBiome) setBiome(here);

  const got = stardust.update(dt, gameTime, blob.position);
  for (const pos of got) {
    dustCombo = gameTime - lastDust < 1.2 ? dustCombo + 1 : 0;
    lastDust = gameTime;
    sound.pickup(dustCombo);
    save.stardust++;
    particles.burst(pos, blob.p, [GOLD, WHITE], 8, 3, 0.3, 0.6);
    $('dust').classList.remove('bump');
    void $('dust').offsetWidth;
    $('dust').classList.add('bump');
  }
  if (got.length) {
    refreshDust();
    dustSaveTimer = 1;
  }
  if (dustSaveTimer > 0 && (dustSaveTimer -= dt) <= 0) persist();

  // ambient motes for the biome you're in; busier once it's restored
  const [pcols, grav, rate] = planet.defs[here].particles;
  moteAccum += dt * rate * (0.35 + 0.65 * planet.coverage(here));
  while (moteAccum > 1) {
    moteAccum -= 1;
    const off = new THREE.Vector3().randomDirection().projectOnPlane(blob.p).normalize().multiplyScalar(1 + Math.random() * 8);
    const d = blob.position.clone().add(off).normalize();
    const pos = d.clone().multiplyScalar(planet.heightAt(d) + (grav > 0 ? 3 + Math.random() * 2 : 0.3 + Math.random()));
    const vel = new THREE.Vector3().randomDirection().multiplyScalar(0.4);
    const col = new THREE.Color(pcols[Math.floor(Math.random() * pcols.length)]);
    particles.spawn(pos, vel, col, 0.16 + Math.random() * 0.1, 3 + Math.random() * 2, grav);
  }

  planet.patches.forEach((p, k) => {
    if (p.done < 0 && planet.patchCoverage(k) >= 0.93) completePatch(k);
  });
  for (let i = 0; i < NUM_REGIONS; i++) {
    const r = regions[i];
    if (!r.done && !r.pending && planet.regionComplete(i)) {
      // let the last spot's ping land before the big biome celebration
      r.pending = true;
      const p = planet;
      setTimeout(() => p === planet && !r.done && completeRegion(i), 700);
    }
  }

  lifeTimer -= dt;
  if (lifeTimer < 0) {
    lifeTimer = 0.5;
    sound.setLife(planet.totalCoverage());
  }
}

const BIG_PROPS = new Set(['tree', 'bigOak', 'pine', 'palm', 'cactus', 'snowman', 'bush', 'glowShroom', 'lantern', 'crystal']);
function onPop(item, kind) {
  if (item.patch >= 0 || BIG_PROPS.has(kind)) {
    sound.bloomTinkle();
    if (Math.random() < 0.6) {
      const up = item.pos.clone().normalize();
      particles.burst(item.pos.clone().addScaledVector(up, 0.5), up, [item.alive, WHITE], 4, 2.5, 0.35, 0.8);
    }
  } else if (kind === 'flower' || kind === 'snowdrop') sound.bloomTinkle();
}

// ---------------------------------------------------------------- camera

const cam = { pos: new THREE.Vector3(0, 10, 28), up: new THREE.Vector3(0, 1, 0), target: new THREE.Vector3() };
const desiredPos = new THREE.Vector3();
const desiredTarget = new THREE.Vector3();
// follow camera: height above / distance behind the blob, and where it looks
const CAM = { up: 11, back: 4, ahead: 1.8, drop: 0.5 };
let orbit = 0;
let snapCamera = true; // jump straight to the first framing instead of gliding through the planet

function updateCamera(dt) {
  const right = new THREE.Vector3().crossVectors(blob.p, blob.f);
  // portrait screens are narrow, so back the camera off until the planet fits side to side
  const zoom = THREE.MathUtils.clamp(1.05 / camera.aspect, 1, 1.8);
  if (state === 'title') {
    orbit += dt * 0.12;
    const side = blob.f.clone().multiplyScalar(Math.cos(orbit)).addScaledVector(right, Math.sin(orbit));
    desiredPos.copy(blob.p).multiplyScalar(0.8).addScaledVector(side, 0.6).normalize().multiplyScalar(24 * zoom);
    desiredTarget.set(0, 0, 0);
  } else if (state === 'finale') {
    desiredPos.copy(cam.pos).normalize().multiplyScalar(25 * zoom).applyAxisAngle(blob.p, dt * 0.15);
    desiredTarget.set(0, 0, 0);
  } else {
    desiredPos.copy(blob.position).addScaledVector(blob.p, CAM.up * zoom).addScaledVector(blob.f, -CAM.back * zoom);
    desiredTarget.copy(blob.position).addScaledVector(blob.f, CAM.ahead).addScaledVector(blob.p, -CAM.drop);
  }
  if (snapCamera) {
    cam.pos.copy(desiredPos);
    cam.target.copy(desiredTarget);
    cam.up.copy(blob.p);
    snapCamera = false;
  }
  const k = 1 - Math.exp(-dt * (state === 'play' ? 4 : 1.6));
  cam.pos.lerp(desiredPos, k);
  cam.target.lerp(desiredTarget, k);
  cam.up.lerp(blob.p, k).normalize();

  camera.position.copy(cam.pos);
  if (shake > 0) {
    camera.position.add(new THREE.Vector3().randomDirection().multiplyScalar(shake * 0.25));
    shake = Math.max(0, shake - dt * 1.5);
  }
  camera.up.copy(cam.up);
  camera.lookAt(cam.target);
  fovKick *= Math.exp(-dt * 5);
  camera.fov = 55 + fovKick;
  camera.updateProjectionMatrix();

  // keep the sun over our shoulder so the visible side is always lit
  const camRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const sunDir = cam.pos.clone().normalize().multiplyScalar(0.7).addScaledVector(cam.up, 0.6).addScaledVector(camRight, 0.45).normalize();
  planet.uniforms.uSunDir.value.copy(sunDir);
  sun.position.copy(sunDir).multiplyScalar(50);
  sky.update(dt);
  if (grade) grade.uniforms.uTime.value = (grade.uniforms.uTime.value + dt) % 10;
}

// ---------------------------------------------------------------- loop

// ?seed=123 visits a specific planet; otherwise resume the last unfinished one, or make a new one
{
  const urlSeed = Number(new URLSearchParams(location.search).get('seed'));
  const saved = JSON.parse(localStorage.getItem(PLANET_KEY) || 'null');
  if (urlSeed) newPlanet(urlSeed);
  else if (saved && !saved.finished) {
    try {
      resumePlanet(saved);
    } catch (err) {
      console.warn('Could not resume planet, starting fresh', err);
      newPlanet();
    }
  } else newPlanet();
}
let last = performance.now();

// Auto quality: if Pretty can't hold ~42fps on this machine, drop to Smooth once.
const perf = { time: 0, frames: 0, warmup: 3 };
function watchPerformance(realDt) {
  if (save.quality !== 'auto' || quality.tier !== 'pretty' || document.hidden) return;
  if ((perf.warmup -= realDt) > 0) return;
  perf.time += realDt;
  perf.frames++;
  if (perf.time < 4) return;
  const fps = perf.frames / perf.time;
  perf.time = perf.frames = 0;
  if (fps < 42) {
    quality.tier = 'smooth';
    applyQuality();
    toast('Switched to Smooth graphics<small>to keep things running nicely on this device · change it in Settings</small>');
  }
}

function frame() {
  requestAnimationFrame(frame);
  const nowMs = performance.now();
  // cap at ~60fps: on 120Hz screens drawing every refresh just doubles the work
  if (nowMs - last < 1000 / 62) return;
  const realDt = Math.min((nowMs - last) / 1000, 1 / 20);
  watchPerformance(Math.min((nowMs - last) / 1000, 0.25));
  last = nowMs;
  if (hitstop > 0) {
    hitstop -= realDt;
    timeScale = 0.06;
  } else {
    timeScale += (1 - timeScale) * Math.min(1, realDt * 9);
  }
  const paused = shop.isOpen() || !$('book').classList.contains('hidden') || !$('settings').classList.contains('hidden');
  const dt = paused ? 0 : realDt * timeScale;
  gameTime += dt;

  updatePlay(dt);
  planet.update(dt, state === 'title' ? null : onPop);
  creatures.forEach((c) => c.update(dt, gameTime, blob.position));
  critters.update(dt);
  particles.update(dt);
  updateCamera(realDt);
  backdrop.update(realDt, camera);
  updateUI(realDt);
  if (TIERS[quality.tier].post) composer.render();
  else renderer.render(scene, camera);
}
frame();

// handy for debugging from the console
refreshDust();
window.blorbit = { shop, save, newPlanet, CAM, camera, backdrop, planet: () => planet, rollFind, toggleBook, completeRegion, completePatch, blob, sound, keys };
