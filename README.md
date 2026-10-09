# Blorbit

A cosy little 3D browser game about a wobbly alien water blob who rolls around tiny planets, leaving a trail of slime that brings dead worlds back to life.

No timers, no fail states, no rush. Just rolling, restoring and collecting, with plenty of satisfying pings along the way.

Everything runs in the browser: there's no server, no account and no downloads. Progress is saved locally on your device.

---

## How the game works

### Restore the planet
Each planet starts grey and withered. Wherever your blob rolls, it leaves a glistening slime trail. The slime fades into life: grass sprouts, flowers pop up, trees regrow, ponds refill and critters return.

### Galaxies
When you boot the game you **choose your galaxy**. Each galaxy is its own set of biomes, creatures and collectibles:

- **🌸 Wildbloom:** 10 wild biomes, 10 creatures and 80 finds. Open from the start.
- **🌆 Citylight:** 5 city biomes, 5 creatures and 40 finds. Abandoned grey streets light back up: windows glow, awnings unfurl and the traffic returns. It **unlocks once you've woken 8 of the 10 Wildbloom creatures** (80%).

Travel between unlocked galaxies is **free**. Tap the galaxy icon next to the planet name or press `G`, or go **🏠 Menu** (top left, also on the planet-restored screen) to get back to the galaxy picker. Each galaxy keeps its own half-finished planet, so you can leave one and come back to it later. Your stardust, skins and collection are shared across every galaxy, so a cat can roll around Wildbloom.

### Biomes and spots
Every planet is split into **4 biomes**, picked at random from its galaxy:

| Wildbloom biome | Sleeping creature | | Citylight biome | Sleeping creature |
| --- | --- | --- | --- | --- |
| Bunny Meadow | 🐰 Bunny | | Plaza Park | 🐿️ Squirrel |
| Sleepy Pond | 🐸 Frog | | Neon Downtown | 🐱 Cat |
| Dusty Dunes | 🦊 Fox | | Sleepy Suburbs | 🐶 Dog |
| Frosty Peaks | 🐧 Penguin | | Funfair Pier | 🦝 Raccoon |
| Moonlit Grove | 🦋 Moth | | Dockside Harbour | 🐦 Seagull |
| Snail Garden | 🐌 Snail | | | |
| Sunny Shore | 🐢 Turtle | | | |
| Ember Crags | 🦎 Lizard | | | |
| Sugar Hills | 🐻 Bear | | | |
| Maple Hollow | 🦔 Hedgehog | | | |

Each biome has its own terrain, colours, sky tint, props, critters, ambient particles and soundscape. It's also scattered with smaller named **spots**, like a flower bed, an old dirt road, an oasis or a frozen lake. Slime enough of a spot to clear it, which earns a chime, a burst of nature and a chance at a collectible find.

Clear every spot in a biome and the whole biome **auto-completes**. Its sleeping creature wakes up, and you unlock that creature as a **skin** for your blob.

Restore all 4 biomes to finish the planet. Then warp to a brand new one or keep rolling around the one you just saved.

### Planets
Each planet gets a randomly generated name and layout, seeded from the date and time it was created, so no two planets are alike. Use **New planet** at the top of the screen (with a confirm tap) to warp somewhere fresh at any time. Refreshing the page picks up exactly where you left off on a half-finished planet.

### Stardust, finds and the shop
- **Stardust** ✨ is scattered in little trails across every planet. Roll over it to collect it.
- **Finds** are collectibles: 8 per biome (80 in Wildbloom, 40 in Citylight). Each one is *common*, *rare* or *legendary*. You can roll one by clearing a spot, and they all live in your **Collection** book, which has a tab per galaxy.
- The **Shop** sells card packs for each biome. It opens on your current galaxy, with a tab for every galaxy: unlocked ones let you buy their packs without travelling, and locked ones show greyed out with their unlock progress. Every pack holds 3 cards from that biome's collection:
  - **Card pack** (✨25): 5% legendary, 25% rare.
  - **Shiny pack** (✨75): 15% legendary, 50% rare, and always at least one rare.

### Skins
You start as the classic water blob. Each creature you wake becomes a skin with its own body colour and accessories: ears, shells, spines, antennae and more. All the features tumble with the blob as it rolls.

---

## Controls

### Keyboard (desktop)
| Key | Action |
| --- | --- |
| `W` `A` `S` `D` / arrow keys | Roll forward/back and steer |
| `R` | Toggle auto-roll (blob keeps rolling forward; you just steer) |
| `B` | Open/close the Collection book |
| `P` | Open/close the Shop |
| `N` | New planet (asks you to confirm) |
| `G` | Open the galaxy picker |
| `M` | Mute/unmute |
| `-` | Equip the classic blob skin |
| `1`–`9`, `0` | Equip this galaxy's creature skins, in order (if unlocked) |
| `Esc` | Close any open panel |

Pick a galaxy on the title screen to start, or press `Enter` to jump back into the galaxy you were last in.

### Touch (phones and tablets)
- **Tap sides** (default): your blob rolls forward by itself. **Hold the left or right half** of the screen to turn; the turn starts gentle and builds up the longer you hold. Quick taps give a small nudge, and both thumbs down goes straight.
- **Joystick** (optional, in Settings → Touch controls): **drag anywhere** to use a virtual joystick. Push up to roll forward and left/right to steer.
- Tap the icons in the top bar for the Collection, Shop, auto-roll, Settings and sound.
- Swipe the skin strip at the bottom to browse and equip skins.

### Settings
- **Graphics:** *Auto* (default), *Smooth* or *Pretty*. See [Performance](#performance) below.
- **Touch controls** (touch devices only): *Tap sides* or *Joystick*.
- **Turning sensitivity:** a slider from 40% to 160% that scales how fast the blob turns.
- **Colorblind mode:** swaps meaningful colours to a blue/orange palette that stays distinct for protanopia, deuteranopia and tritanopia. It adds ✓ badges on finished biomes, a pulse on nearly-finished ones and ◆/★ markers on rare/legendary finds, so nothing relies on colour alone. It also raises secondary text contrast above the WCAG AA guideline of 4.5:1.
- **Reset all progress:** wipes skins, finds, stardust and the current planet (asks you to confirm).

---

## Running it locally

You'll need [Node.js](https://nodejs.org/) 20+.

```bash
npm install      # install dependencies
npm run dev      # start the Vite dev server (http://localhost:5173)
npm run build    # production build into dist/
npm run preview  # serve the production build locally
```

The `dist/` folder is fully static. Drop it on any static host (GitHub Pages, Netlify, Vercel, S3, etc.).

### Deploying to GitHub Pages
`.github/workflows/deploy.yml` builds the game and publishes `dist/` to GitHub Pages on every push to `main`. You can also run it by hand from the **Actions** tab.

To turn it on, open the repo's **Settings → Pages** and set **Source** to **GitHub Actions**. The game will be live at `https://<user>.github.io/<repo>/`. `vite.config.js` uses relative asset paths, so it works under any repo name.

---

## How it was built

### Tech stack
- **[Three.js](https://threejs.org/)** (r186) for all 3D rendering, using the WebGL renderer, ES module imports and `three/addons` for post-processing.
- **[Vite](https://vitejs.dev/)** for the dev server and production bundling.
- **Web Audio API** for all sound. There are **no audio files**: every blorp, chime, bell and ambient soundscape is synthesised live.
- **Plain HTML and CSS** for the UI, with no framework. It's a pastel glass design system built on CSS variables, `backdrop-filter`, the Fredoka and Nunito fonts, and inline SVG icons.
- **localStorage** for saving progress.
- **Puppeteer** (dev only) for automated headless screenshot checks of the game on desktop and mobile viewports.

There are no models, textures or sound assets. Everything you see and hear is generated in code.

### The planet
- The planet is a finely subdivided **icosphere** (about 32k vertices). Hills, dunes, basins, peaks and volcanoes come from layered, seeded **3D value noise**.
- Biomes are laid out with a **noise-warped, weighted Voronoi** partition over the sphere, so regions differ in size and have organic, softly blended borders.
- A custom **GLSL shader** drives the ground. Each vertex carries attributes for its dead colour, alive colour, biome style (sand sparkle, snow, moon dust, emissive lava), water, and dynamic state (slime, life, flash, glow). The shader blends between them, so slime visibly spreads, glistens and blooms into life.
- **Painting** uses a spatial hash grid so only nearby vertices are touched each frame. Changed vertices go on an *active list*, and only the dirty ranges of each attribute buffer are uploaded to the GPU.

### Props and critters
- About 60 procedurally modelled prop types (trees, flowers, cacti, crystals, lanterns, lollipops and more) are rendered with **InstancedMesh**, so thousands of objects cost only a handful of draw calls.
- Props grow in with an elastic "pop" when their patch of ground comes alive. Withered grey stand-ins mark where they'll appear.
- Butterflies, bees, fireflies, birds, crabs, fish and other critters wander each biome. Ambient particles like pollen, snow and embers drift around too.

### The blob
- The blob is a sphere with a **custom vertex shader** for jelly wobble and a squished, flattened base. It uses a cheap translucent material with a shader-injected rim light to fake a glassy water-bag look.
- Spring physics drive the squash, stretch and jiggle. The eyes, accessories and suspended bubbles live in a "roller" group that genuinely tumbles as the blob rolls, then rocks back upright when it stops.

### Space backdrop
- A gradient sky, twinkling star field (custom point shader), drifting pastel nebula sprites and distant ringed planets.
- Shooting stars streak across the open sky around the planet every few seconds, now and then as a little shower.

### Determinism and saving
- Every planet is generated from a single seed using a seeded PRNG (**mulberry32**) and seeded noise. Given the seed and its galaxy, the terrain, biomes, spots, props and stardust are identical every time. Each planet only shuffles its own galaxy's biome list, so adding a galaxy never changes existing planets.
- That keeps saves tiny. The save stores the seed plus compact **bitsets** (base64) of painted vertices and collected stardust, the blob's position, and which spots and biomes are done. Progress is saved every few seconds, when the tab is hidden and after every completion.
- **Saves and galaxies:** one main save (`blorbit-save-v1`) holds everything shared across galaxies: stardust, skins, finds, settings, which galaxy you're in and planets restored per galaxy. Each galaxy has its own planet save (`blorbit-planet-v1:<galaxy>`). Finds are keyed `biomeId:name`, and biome ids are unique across galaxies, so they don't need a galaxy prefix. Saves from before galaxies existed migrate to Wildbloom automatically.

### Performance
The game is tuned to run on low-end laptops and phones:
- **Quality tiers:** *Smooth* renders at native resolution with Lambert/Phong materials and no post-processing. *Pretty* adds 1.5× resolution, MSAA, a subtle bloom and a colour-grade pass, with PBR materials.
- **Auto mode** picks a tier based on the device (mobile, CPU cores, memory). It also drops to Smooth if the frame rate stays below about 42 fps.
- Frame rate is capped at 60 fps, geometry detail scales with prop size, hidden instances are packed out of draw calls, and expensive material features (transmission, clearcoat, sheen) are avoided entirely.

### Responsive UI
On small screens the HUD switches to a compact layout:
- The top bar becomes icon-only.
- The skin dock becomes a swipeable strip.
- Panels open as bottom sheets.
- Everything respects iPhone notch and home-bar safe areas.

Touch devices also get touch-specific hints instead of keyboard shortcuts.

---

## Project structure

```
index.html          UI markup and all CSS (design tokens, HUD, panels, responsive layout)
src/
  main.js           Game loop, state, input, UI, saving and orchestration
  planet.js         Icosphere terrain, biome layout, spots, slime painting, prop layers
  galaxies.js       Galaxy definitions (which biomes belong to which galaxy) and unlock rules
  biomes.js         The 15 biome definitions (terrain, colours, props, critters, finds)
  props.js          Procedural prop models
  blob.js           The player blob: movement, rolling, jelly shader, squash and stretch
  skins.js          Creature skins: accessories, body materials, eyes
  creature.js       Sleeping/waking creatures on each biome
  critters.js       Wandering ambient critters
  particles.js      Ambient particle systems
  stardust.js       Collectible stardust trails
  collection.js     Finds, rarities and pack draw rates
  shop.js           Card pack shop and pack-opening animation
  audio.js          Synthesised Web Audio sound effects and soundscapes
  look.js           Sky gradient, atmosphere glow, colour-grade shader
  skyfx.js          Stars, nebula, distant planets, shooting stars
  quality.js        Quality tiers, device detection, material helpers
  names.js          Planet name generator and time-based seeds
  noise.js          Seeded noise and PRNG
  shadow.js         Soft contact shadows
scripts/            Puppeteer screenshot and regression checks used during development
```
