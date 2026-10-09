# AGENTS.md

Everything an agent needs to work on **Blorbit** without prior context. Read this first, then `README.md` (player-facing docs).

Blorbit is a cosy 3D browser game: a wobbly slime blob rolls around tiny planets and brings dead worlds back to life. No timers, no fail states. Everything is generated in code (no models, textures or audio files).

---

## 1. Stack and commands

- **Three.js** (r186) for rendering, **Vite** for dev/build, plain HTML/CSS UI (no framework), Web Audio API (all sound is synthesised), `localStorage` saves.
- **Puppeteer** (`puppeteer-core`, dev only) for screenshot/regression scripts in `scripts/`. They launch macOS Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` with SwiftShader flags.

```bash
npm install
npm run dev        # http://localhost:5173 (needed by every scripts/*.mjs check)
npm run build      # production build into dist/ (also a quick syntax/import sanity check)
npm run preview
```

There are **no unit tests** (`npm test` is a stub). Verification is: `npm run build`, then render the thing in a browser with the dev server running (see section 7).

Deploys: pushing to `main` runs `.github/workflows/deploy.yml` (GitHub Pages, site is https://blorbit.io). Don't push or commit unless the user asks.

---

## 2. Conventions and house rules

- **Match the surrounding code**: same comment density, naming and idioms. Comments explain *why*, are sparse, and are written in plain British-ish English.
- **Galaxy names are ONE word**, a compound, like `Wildbloom`, `Citylight`, `Skyhaven`, `Sunroam`, `Seaglow`, `Feastvale`. Never two words.
- **Every emoji is unique across the whole game.** A given emoji may be used only once among: find emojis, creature skin emojis and galaxy icons. Before choosing any, compute the unused set (section 5). Creature/galaxy emojis must not duplicate a find.
- **Biome ids are globally unique** (find keys are `${biomeId}:${name}` with no galaxy prefix).
- **Never rename or reuse existing ids** (galaxy ids, biome ids, creature/skin ids, find names): they're stored in players' saves. Renaming a find name or biome id orphans saved progress.
- Each biome has exactly **8 finds: 3 common (`c`), 2 uncommon (`u`), 1 rare (`r`), 1 epic (`e`), 1 legendary (`l`)**. A startup check only enforces at least one of each, but docs and the shop assume 8 and this split.
- Each galaxy has **5 biomes, 5 creatures, 40 finds** (Wildbloom is the exception: 10/10/80).
- Commit style (see `git log`): short imperative title, e.g. `Add feastvale galaxy`, `Fix ipad resolution`. End commit messages with the attribution line the harness provides (currently `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`) and PR bodies with the harness's PR line. Only commit/push when asked.
- Use they/them for anyone whose pronouns aren't known.
- On macOS use `sed -i ''` (BSD sed); prefer a small Python script or the Edit tool for multi-line edits.
- Scripts that import `puppeteer-core` must live in `scripts/` (so Node resolves it). If you write a throwaway script, put it in `scripts/`, run it, and delete it.

---

## 3. Architecture map

```
index.html     All CSS (design tokens, HUD, panels, responsive rules), UI markup, SEO/share tags
about.html     About & how-to-play page (static HTML, galaxy cards + counts are hand-written)
privacy.html   Privacy policy
src/main.js    Game loop, state, input, UI, saves, galaxy picker/travel, collection book. Exposes window.blorbit for scripts
src/planet.js  Icosphere terrain (terrain() switch), biome layout, patches ("spots"), slime painting, GLSL ground shader, prop layers
src/galaxies.js  GALAXIES definitions, unlock rules, startup sanity checks
src/biomes.js  BIOMES: terrain, colours, props, critters, particles, patches, finds
src/props.js   PROP_KINDS: procedural low-poly prop models (instanced)
src/skins.js   SKINS (one per creature) and buildAccessories(): the creature's features
src/creature.js  Sleeping/waking creature placed in each biome (uses skins)
src/critters.js  Ambient wandering critters (KINDS)
src/audio.js   Synthesised sound: per-biome ambient cases + rolling timbre
src/shop.js    Card pack shop, galaxy tabs (galaxyTabs, renderKeepingTabs)
src/collection.js  Finds, rarities, pack rates (totals are computed, not hard-coded)
src/ads.js     Rewarded video ads (Google Ad Manager)
src/{blob,look,skyfx,particles,stardust,names,noise,quality,shadow}.js  Blob, sky, ambient particles, stardust, naming, PRNG, quality tiers
scripts/       Puppeteer helpers (screenshots, regression checks); scripts/og/ builds the share image and icons
public/        Static files: og-image.png (share image, also the About hero), favicon, icons, manifest
```

Key facts:
- A **planet** picks **4 biomes** (`NUM_REGIONS = 4` in `planet.js`) from one galaxy. Planets are deterministic from `seed + galaxy`; each planet only shuffles its own galaxy's biome list, so **adding a galaxy never changes existing planets** (but adding/removing a biome inside an existing galaxy does).
- Saves: main save `blorbit-save-v1` (stardust, skins, finds, settings, current galaxy, restored counts, `unlocked` creature ids, `seenGalaxies`, `adUnlocked`); one planet save per galaxy `blorbit-planet-v1:<galaxy>`.
- Galaxy unlock: `unlockedBy` (previous galaxy id) + `unlockAt` (0.8 = 80% of that galaxy's creatures woken). The chain today is a straight line. Players can also unlock one by watching a rewarded video (`save.adUnlocked`).
- Unknown galaxy ids fall back to `'wild'` in `main.js` (`save.galaxy`, `bookTab`, planet-save migration). Don't change those.
- `window.blorbit` (bottom of `main.js`) exposes `save, newPlanet, travelTo, enterGalaxy, planet(), completeRegion(i), completePatch(k), galaxyOf(biomeId), blob, sound, shop, ...` for scripts.

---

## 4. Current galaxies

| id | Name | Icon | Biome ids (creature) | Unlocked by |
| --- | --- | --- | --- | --- |
| `wild` | Wildbloom | 🌸 | meadow (bunny), pond (frog), desert (fox), snow (penguin), grove (moth), garden (snail), shore (turtle), volcano (lizard), candy (bear), autumn (hedgehog) | open |
| `city` | Citylight | 🌆 | park (squirrel), downtown (cat), suburbs (dog), funfair (raccoon), harbour (seagull) | `wild` 80% |
| `sky` | Skyhaven | ☁️ | pastures (sheep), cliffs (goat), rainbow (unicorn), balloons (eagle), stargazer (owl) | `city` 80% |
| `safari` | Sunroam | 🦒 | savanna (lion), canopy (parrot), riverbank (hippo), bamboo (panda), outback (koala) | `sky` 80% |
| `sea` | Seaglow | 🐋 | kelp (otter), reef (pufferfish), galleon (shark), jellyglow (jellyfish), vents (squid) | `safari` 80% |
| `feast` | Feastvale | 🥘 | bakery (rooster), orchard (monkey), market (rat), veggie (pig), bazaar (camel) | `sea` 80% |
| `gloom` | Gloomhollow | 🏚️ | graveyard (ghost), mansion (bat), cauldron (witch), pumpkins (zombie), crypt (spider) | `feast` 80% |
| `stomp` | Stompvale | 👣 | fernwood (longneck), fossils (trex), iceage (mammoth), dodoisle (dodo), tarpits (sloth) | `gloom` 80% |

**Current totals: 8 galaxies, 45 biomes, 360 cards (80 + 7 × 40).** Update this table and these totals whenever you add a galaxy.

Special per-biome rendering knobs (`style` array in `biomes.js`): `[sand, snow, moon, pave, cloud, sea]`. `style[3]` = paved ground (city, markets), `style[4]` = cloud sea (Skyhaven), `style[5]` = underwater look (Seaglow). Adding a new ground-shader effect means: new vertex attribute `aX`, varying `vX`, a block in the fragment shader, a buffer filled in `planet.js` next to `cloud`/`sea`, and a new `style[n]` slot (follow how `aSea` was added).

---

## 5. Choosing unused emojis

Never guess. Compute what's taken (run from the repo root):

```python
import re
s = open('src/biomes.js').read()
sk = open('src/skins.js').read() + open('src/galaxies.js').read()
used = set(re.findall(r"\['([^'\w#][^']*)', [\"']", s)) | set(re.findall(r"emoji: '([^']+)'", sk))
st = lambda e: e.replace('️', '')          # ignore variation selectors
U = {st(u) for u in used}
want = "🥐 🥖 ...".split()                         # your candidates
print([w for w in want if st(w) in U])           # must print []
```

- Check **finds, skin emojis and galaxy emojis** together (all three are in those two reads).
- Beware filter mistakes when enumerating free emojis: substring filters on Unicode names can accidentally drop valid candidates (e.g. "EAR" drops the globes, "FACE" drops animal faces). Cross-check by hand.
- Roughly exhausted themes (as of Feastvale): ocean life, plants/flowers, weather/sky, gems, most tools/office. Still plentiful: spooky/fantasy (👻 🦇 🕷️ 🕸️ 🧙 🧛 🧟 🐺 🧹 ⚰️ 🏚️ 🗡️), sports (🏀 🏐 🏈 🏏 🏒 🥊 🎿 🏂 🏎️ 🏍️ 🎳), music (🎹 🎺 🎻 🥁 🎤 🪕 🪗), retro tech/games (🕹️ 🎮 🎰 📺 📻 💾 👾 🤖), and many animals (🐯 🐴 🦓 🦍 🦏 🐘 🦙 🦚 🦩 🦘 🦥 🦡 🦨 🦬 🦖 🦕 🦣 🐜 🦗). Re-verify before relying on this list.
- Multi-codepoint emojis (ZWJ sequences like 🏴‍☠️) work but check they render and compare after stripping `️`.

---

## 6. How to add a new galaxy (full checklist)

Use Feastvale (`git show <sha>` for "Add feastvale galaxy") as the template for a no-new-shader galaxy and Seaglow for one that adds a shader effect.

### 6.0 Plan first
Pitch to the user before implementing when asked: one-word name, icon, 5 biomes (each with creature + sample finds), unlock rule (normally the previous galaxy at 80%), and note any emoji constraints. Get approval, then write all 40 finds with rarities.

### 6.1 `src/galaxies.js`
Add an entry to `GALAXIES` after the last one:
```js
feast: {
  name: 'Feastvale', emoji: '🥘',
  blurb: '...short one-liner...',
  art: ['#ffd8a8', '#ffb8c8'],            // gradient of the picker card
  biomes: ['bakery', 'orchard', 'market', 'veggie', 'bazaar'],
  // unlocked by waking 80% of Seaglow's creatures (4 of 5)
  unlockedBy: 'sea', unlockAt: 0.8,
},
```
The startup checks in this file throw if a biome is missing/duplicated/in two galaxies or lacks a rarity, and warn (`checkSkins`) if a creature has no skin.

### 6.2 `src/biomes.js`
Append a `Object.assign(BIOMES, { ... })` block before `export const BIOME_IDS`, with a header comment. Per biome:
```js
id: {
  name, creature: '<skin id>', weight, terrain: '<terrain case in planet.js>',
  dead: 0x..., alive: 0x..., sky: ['#top', '#bottom'], style: [sand, snow, moon, pave, cloud, sea],
  small: [[propKind, densityPerVertex], ...],     // scattered everywhere
  big: [[propKind, density], ...],                // sparse landmarks
  critters: [[kind, count], ...],
  particles: [[colours...], gravity (negative rises), rate/sec],
  patches: [ 6 named spots ],   // { name, shape: 'blob'|'path', ...S|M|L (size), center?: true, rFrac?, water?, emissive?, pave?, dead, alive, props: [[kind, density, 'any'|'rim'|'inner']], critters }
  patchCount: 9-10,
  finds: [[emoji, 'Name', 'c'], ... 8 entries],
}
```
Existing terrains: `rolling gentle basin dunes peaks beach volcano bumps city islands cliffs hillocks` (see `terrain()` in `planet.js`; add a case there for a new one). Reuse existing prop and critter kinds where they fit; list kinds with `grep -oE "^  [a-zA-Z]+: \{$" src/props.js`.

### 6.3 `src/props.js` (new props)
Add kinds to `PROP_KINDS` before the closing `};` (above `NO_DEAD`). Shape: `{ scale: [min, max], parts: () => [{ geo, mat, color? }] }`. Helpers at the top: `lambert`, `unlit` (glowing, blooms), `pick([...])` / `fromGround(lo, hi)` (per-instance tint), `merge`, `box`, `rbox`, `lathe`, `rod`, `radial`, `stripes`. Use `mat: lambert(0xffffff)` plus a `color` function when you want per-instance colour variety. Tiny/plentiful kinds that shouldn't get a withered stand-in go in `NO_DEAD`.

### 6.4 `src/skins.js` (one skin per creature)
1. Add `id: { name: 'X Blob', emoji, body: 0x..., slime: 0x... }` to `SKINS`.
2. Add the id to `CREATURE_IDS`.
3. Add it to `BODY_STYLE` (`fur`, `soft`, `gloss`, `gummy`) so the body material matches.
4. Add an `if (id === '...') { ... }` branch inside `buildAccessories` (before the final `g.userData.animate = ...`). Helpers: `mesh`, `sphere`, `roundedCone`, `taperedTube` + `tubeGroup`, `onSurface`, `surfacePatch`, `gradient`; push per-frame motion with `anims.push((t) => ...)`. Model in unit-sphere space: body radius 1, +y up, +z forward; eyes sit on top of surface patches.
5. Gotcha: `mesh.scale.set(...)` returns a Vector3, not the mesh. Create the mesh in a const, set the scale, then `g.add(it)`.

### 6.5 `src/critters.js` (only if you need a new critter)
Add to `KINDS` (`flying`, `speed`, `hover`, `turn`, `build()` returning `{ g, wings?, glow? }`). `fish` is a jumper that leaps out of water; use a flying critter for things that swim around.

### 6.6 `src/audio.js`
Add a `case '<biomeId>':` per biome in the ambient switch (above `default:`), and an entry per biome in the `rollTimbre` object in `setBiome` (`[filter centre, Q, low thump]`). Helpers: `this.tone`, `this.noiseBurst`, `this.birdChirp`, `midi`, `pentaStep`.

### 6.7 `src/planet.js` (only for new terrain or shader effects)
New terrain: a `case` in `terrain()`. New ground effect: follow the `aSea`/`aCloud` pattern (attribute, varying, fragment block, `style[n]` slot, buffer with `smooth()`, `setAttribute`).

### 6.8 Counts, docs and generated images: every place that changes
After adding a galaxy, update ALL of these (numbers are galaxies / biomes / cards = 8 / 45 / 360 at time of writing; new totals = biomes + 5, cards + 40, galaxies + 1):

| File | What to change |
| --- | --- |
| `index.html` | **4 occurrences** of "Bring N biomes back to life ... collect N cards." in `meta description`, `og:description`, `twitter:description` and the JSON-LD `description` (lines ~8, 21, 29, 40). |
| `about.html` | `meta description` and `og:description` ("restore N biomes across N galaxies ... collect N cards"); add a new `<div class="galaxy">` card (emoji + name, one-line blurb, `<ul>` of 5 biomes with creature emojis) after the last one; the "There are **N cards**" sentence in the Collecting section. |
| `README.md` | Galaxies bullet list (add a bullet with name, biome themes, "5 creatures and 40 finds", the unlock sentence); the biome/creature table (add two columns "X biome \| Creature" and fill the first five rows; keep the separator row's column count in step); the Finds sentence ("80 in Wildbloom, 40 each in ..."); the `biomes.js` line in the project structure ("The N biome definitions"). Also stale: "About 60 procedurally modelled prop types" (there are 170 now). |
| `scripts/og/compose.html` | The chips line: "N galaxies", "N biomes", "N cards to collect". |
| `public/og-image.png` | **Regenerate** after editing compose.html: start `npm run dev`, then `node scripts/og/compose.mjs` (writes `public/og-image.png`; also the About page hero). To also change the planet photo, run `node scripts/og/capture.mjs`, copy a frame to `scripts/og/planet.png`, then compose. |
| `scripts/biome.mjs` | Its test save's `unlocked` array must include every creature of the earlier galaxies so the new galaxy isn't locked when you screenshot it (add the previous galaxy's 5 creature ids) and update its comment. |
| `AGENTS.md` | Section 4 table and totals. |

Quick finder for stragglers (zsh-safe):
```bash
grep -rnE "[0-9]+ biomes|[0-9]+ galaxies|[0-9]+ cards|biome definitions" index.html about.html README.md scripts/og/compose.html
```
`src/collection.js` totals, the shop/collection tabs, the title picker and the skin bar are computed from `GALAXIES`, so they need no edits.

### 6.9 UI layout that depends on the number of galaxies (check every time)
- **Title galaxy picker** (`index.html`): `#title .galaxy-cards { width: min(1700px, 94vw) }` is sized so all cards fit one row on a wide desktop (title cards are `minmax(200px, 1fr)`; 8 cards need ~1700px). With more galaxies, raise that width and the `@media (min-width: 721px) and (max-width: 1810px) and (min-height: 501px)` upper bound (single swipeable row, `grid-auto-columns: 250px`, `width: 88vw`, scroll-snap) so the swipe row covers every width where they no longer fit. Phones (<=720px) use a stacked list. Verify at 1920, 1440, 1024 and 820 wide.
- **Shop and collection galaxy tabs** (`.galaxy-tabs`): never wrap or truncate; they scroll sideways, and `renderKeepingTabs` (in `shop.js`, used by the shop and `renderBook`) preserves scroll position and reveals the active tab. Keep `position: relative` on `.galaxy-tabs` (the reveal math uses `offsetLeft`).
- **Skin bar** (`#skins`): scrolls sideways; shows Classic, the current galaxy's creatures, then skins unlocked elsewhere. Number keys `1-9`, `0` map to the current galaxy's creatures.
- **Top HUD** (`#hud-top`): between 721px and 1100px wide (tablets) the planet card is dropped below the corner buttons (`top: 72px`, with `#biome-label` and `#finds` pushed down). Phones and landscape phones have their own rules. Don't let HUD buttons overlap.

---

## 7. Verifying work

1. `npm run build` must pass (it also catches bad imports). The galaxy data checks in `galaxies.js` run at runtime, so a page load is the real test for data errors.
2. Start the dev server: `npx vite --port 5173 &` (kill it afterwards: `pkill -f "vite --port 5173"`).
3. **Render each new biome**, before and after restoring: `BIOME=<id> node scripts/biome.mjs` writes `/tmp/blorbit-<id>-dead.png` and `-restored.png` (~15s each; run biomes in parallel with `&` + `wait`). Look at them. A `[pageerror]` line means a runtime error. Auto graphics always resolve to Smooth.
4. Check the **title screen** with all galaxy cards at several widths (see 6.9), and the shop/collection tabs (`#shop .galaxy-tabs`, `#book .galaxy-tabs`).
5. Other helpers in `scripts/` (many are older, galaxy-specific regression checks): `galaxycheck.mjs`, `shot.mjs`, `mobilecheck.mjs [portrait|landscape]`, `propbooth.mjs` (props restored vs withered), `creaturebooth.mjs` / `skinbooth.mjs` (creature skins up close), `shopcheck.mjs`, `resetcheck.mjs`, `consentcheck.mjs`, `accesscheck.mjs`. Read each file's header comment for usage.
6. Honest reporting: say what you rendered and what you did not (sound, close-up skins, real devices).

---

## 8. Gotchas collected so far

- Locked galaxies can't be entered by `enterGalaxy`; test saves must list earlier creatures in `unlocked` (see `scripts/biome.mjs`).
- Water patches (`water:`) lower terrain and fill with water on restore; don't use them in underwater biomes.
- `emissive` patches glow when restored; `pave` makes slab-patterned ground; both are per-patch knobs.
- `NUM_REGIONS` is 4 and the player's progress counts 4 biomes per planet; the "N of the M friends" unlock text is generated from data.
- The README and about page are hand-maintained marketing/docs: counts there do not update themselves.
- Don't commit generated screenshots from `/tmp`; the only committed generated asset is `public/og-image.png` (and `scripts/og/planet.png`).
