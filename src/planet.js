import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeNoise3, mulberry32 } from './noise.js';
import { BIOMES, BIOME_IDS } from './biomes.js';
import { PROP_KINDS, NO_DEAD } from './props.js';
import { matte } from './quality.js';

export const NUM_REGIONS = 4;
const WAVE_SPEED = 0.9; // radians/sec the biome bloom wave travels
const PATCH_WAVE_TIME = 0.6; // seconds a patch's completion wave takes
const SLIME_FADE = 0.75;
const LIFE_DELAY = 0.3;
const LIFE_RATE = 1.8;
const PATH_HALF_WIDTH = 0.075;
const GRID_CELL = 0.2; // larger than the brush's reach, so the 27 surrounding cells always cover it

const vert = /* glsl */ `
  attribute vec3 aDead;
  attribute vec3 aAlive;
  attribute vec4 aStyle;
  attribute vec3 aWaterCol;
  attribute vec4 aDyn;
  attribute float aWater;
  attribute vec2 aEdge;
  varying vec3 vN, vP, vWorld, vDead, vAlive, vWaterCol;
  varying vec4 vDyn, vStyle;
  varying float vWater;
  varying vec2 vEdge;
  void main() {
    vN = normalize(normal);
    vP = position;
    vDead = aDead; vAlive = aAlive; vStyle = aStyle; vWaterCol = aWaterCol;
    vDyn = aDyn; vWater = aWater; vEdge = aEdge;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const frag = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSlimeCol;
  uniform vec3 uSunDir;
  varying vec3 vN, vP, vWorld, vDead, vAlive, vWaterCol;
  varying vec4 vDyn, vStyle;
  varying float vWater;
  varying vec2 vEdge;

  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float vnoise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  void main() {
    float slime = vDyn.x, life = vDyn.y, flash = vDyn.z, glow = vDyn.w;
    float sand = vStyle.x, snow = vStyle.y, moon = vStyle.z, glowing = vStyle.w;
    float nz = vnoise(vP * 1.4) * 0.6 + vnoise(vP * 5.0) * 0.4;
    float fine = vnoise(vP * 22.0);

    vec3 dead = vDead * (0.8 + 0.4 * nz);
    float crack = smoothstep(0.03, 0.0, abs(vnoise(vP * 3.0) - 0.5));
    dead *= 1.0 - crack * 0.1;

    vec3 alive = vAlive * (0.78 + 0.45 * nz);
    alive = mix(alive, alive * 1.35 + 0.04, smoothstep(0.72, 0.8, fine) * 0.5 * (1.0 - sand));

    // sand ripples
    float ripple = sin(dot(vP, vec3(2.3, 1.1, 1.7)) * 7.0 + nz * 7.0);
    alive *= 1.0 + ripple * 0.07 * sand;
    dead *= 1.0 + ripple * 0.04 * sand;

    vec3 col = mix(dead, alive, life);

    // snow glitter
    vec3 cell = floor(vP * 38.0);
    float h = hash(cell);
    float glint = step(0.97, h) * (0.5 + 0.5 * sin(uTime * 3.0 + h * 40.0));
    col += vec3(glint) * snow * life * 0.8;

    // moonlit glow
    col += vAlive * moon * life * (0.18 + 0.08 * sin(uTime * 1.5 + vP.x * 2.0));

    // water / ice
    vec3 N = normalize(vN);
    if (vWater > 0.001) {
      vec3 wn = normalize(N + 0.25 * vec3(vnoise(vP * 4.0 + uTime * 0.6) - 0.5, vnoise(vP * 4.0 - uTime * 0.5 + 9.0) - 0.5, vnoise(vP * 4.0 + 3.0 + uTime * 0.4) - 0.5));
      vec3 wcol = vWaterCol * (0.75 + 0.3 * nz);
      col = mix(col, wcol, vWater);
      N = normalize(mix(N, wn, vWater));
    }

    // borders: dashed biome edges and dotted patch outlines on not-yet-restored ground
    // soft glowing outlines (no hard dashes): faint biome seams, a gently breathing ring around each patch
    col = mix(col, col * 1.1 + 0.05, smoothstep(0.12, 0.45, vEdge.x) * 0.55 * (1.0 - life));
    col += vec3(1.0, 0.97, 0.92) * smoothstep(0.1, 0.42, vEdge.y) * 0.2 * (1.0 - life) * (0.75 + 0.25 * sin(uTime * 2.0));

    // leftover patches in a nearly-done area pulse so you can find them
    col += vec3(1.0, 0.78, 0.88) * glow * (0.55 + 0.45 * sin(uTime * 4.0)) * 0.35;

    vec3 L = normalize(uSunDir);
    vec3 V = normalize(cameraPosition - vWorld);
    float diff = max(dot(N, L), 0.0);
    col *= 0.52 + diff * 0.58;

    vec3 H = normalize(L + V);
    float wspec = pow(max(dot(N, H), 0.0), 90.0) * vWater * 1.2;
    float spec = pow(max(dot(N, H), 0.0), 70.0);
    col = mix(col, uSlimeCol * (0.55 + diff * 0.6), slime * 0.55);
    col += uSlimeCol * slime * 0.06 + vec3(spec * slime * 0.8) + vec3(wspec);

    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    col += vec3(1.0, 0.86, 0.96) * fres * 0.14;
    col += (vAlive * 1.2 + 0.45) * flash;

    // lava and other glowing ground ignores lighting
    float pulse = 0.85 + 0.25 * sin(uTime * 2.0 + nz * 8.0);
    col += vAlive * glowing * life * 0.6 * pulse;
    col += vWaterCol * glowing * vWater * 1.1 * pulse;

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Everything is nudged toward the pastel palette: living colours soften toward white,
// dead ground drifts toward a gentle lilac-grey instead of muddy grey.
const WHITE = new THREE.Color(0xffffff);
const LILAC_GREY = new THREE.Color(0x9a90ab);
export const pastel = (c) => c.lerp(WHITE, 0.1);
const pastelDead = (c) => c.lerp(LILAC_GREY, 0.45);

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const elastic = (t) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};

// Instanced meshes sharing transforms that pop in with an elastic scale when triggered.
// Only visible instances are drawn: shown props are appended to the front of the buffer
// (mesh.count grows) and withered stand-ins are packed and removed as they shrink away,
// so the GPU never processes hidden props.
class PropLayer {
  constructor(kind, items, trigger, rand, withDead) {
    this.kind = kind;
    this.items = items;
    this.trigger = trigger;
    this.duration = 0.5;
    const parts = PROP_KINDS[kind].parts();
    const n = items.length;
    this.colors = parts.map(({ color }) => (color ? items.map((it) => pastel(color(it, rand))) : null));
    this.meshes = parts.map(({ geo, mat }) => {
      const m = new THREE.InstancedMesh(geo, mat, n);
      m.frustumCulled = false;
      m.count = 0;
      return m;
    });
    this.aliveSlot = new Int32Array(n).fill(-1);
    this.aliveCount = 0;

    // grey, slightly slumped versions stand in until the area is restored
    this.deadMeshes = [];
    this.deadSlot = new Int32Array(n).fill(-1);
    this.deadAt = [];
    this.m = new THREE.Matrix4();
    this.s = new THREE.Vector3();
    this.remaining = n;
    items.forEach((it) => {
      it.state = 0;
      it.t = 0;
      it.dead = withDead && rand() < 0.7;
    });
    if (withDead) {
      const deadMat = matte(0xffffff, { roughness: 0.9 });
      const deadItems = items.map((it, i) => (it.dead ? i : -1)).filter((i) => i >= 0);
      this.deadMeshes = parts.map(({ geo }) => {
        const m = new THREE.InstancedMesh(geo, deadMat, Math.max(1, deadItems.length));
        m.frustumCulled = false;
        m.count = deadItems.length;
        return m;
      });
      deadItems.forEach((i, slot) => {
        const it = items[i];
        this.deadSlot[i] = slot;
        this.deadAt[slot] = i;
        this.m.compose(it.pos, it.quat, this.s.set(it.scale * 0.9, it.scale * 0.75, it.scale * 0.9));
        this.deadMeshes.forEach((m) => {
          m.setMatrixAt(slot, this.m);
          m.setColorAt(slot, it.deadCol);
        });
      });
    }
  }

  show(i) {
    const slot = this.aliveCount++;
    this.aliveSlot[i] = slot;
    this.meshes.forEach((m, k) => {
      if (this.colors[k]) {
        m.setColorAt(slot, this.colors[k][i]);
        m.instanceColor.needsUpdate = true;
      }
      m.count = this.aliveCount;
    });
  }

  // drop a withered stand-in once it has shrunk away (move the last one into its slot)
  removeDead(i) {
    const slot = this.deadSlot[i];
    if (slot < 0) return;
    const last = this.deadMeshes[0].count - 1;
    const j = this.deadAt[last];
    this.deadMeshes.forEach((m) => {
      if (slot !== last) {
        m.getMatrixAt(last, this.m);
        m.setMatrixAt(slot, this.m);
        m.setColorAt(slot, this.items[j].deadCol);
        m.instanceColor.needsUpdate = true;
      }
      m.count = last;
      m.instanceMatrix.needsUpdate = true;
    });
    this.deadAt[slot] = j;
    this.deadSlot[j] = slot;
    this.deadSlot[i] = -1;
  }

  update(dt, onPop) {
    if (this.remaining === 0) return;
    let dirty = false;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (it.state === 2) continue;
      if (it.state === 0) {
        if (!this.trigger(it)) continue;
        it.state = 1;
        this.show(i);
        onPop?.(it, this.kind);
      }
      it.t = Math.min(1, it.t + dt / this.duration);
      const s = elastic(it.t) * it.scale;
      this.m.compose(it.pos, it.quat, this.s.set(s, s, s));
      const slot = this.aliveSlot[i];
      this.meshes.forEach((m) => m.setMatrixAt(slot, this.m));
      if (this.deadSlot[i] >= 0) {
        const shrink = Math.max(0, 1 - it.t * 3.5);
        if (shrink === 0) this.removeDead(i);
        else {
          const ds = shrink * it.scale;
          this.m.compose(it.pos, it.quat, this.s.set(ds * 0.9, ds * 0.75, ds * 0.9));
          this.deadMeshes.forEach((m) => m.setMatrixAt(this.deadSlot[i], this.m));
        }
      }
      if (it.t >= 1) {
        it.state = 2;
        this.remaining--;
      }
      dirty = true;
    }
    if (dirty) [...this.meshes, ...this.deadMeshes].forEach((m) => (m.instanceMatrix.needsUpdate = true));
  }
}

export class Planet {
  constructor(scene, seed) {
    this.scene = scene;
    this.seed = seed;
    this.R = 8;
    this.time = 0;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.fbm = makeNoise3(seed);
    this.warp = makeNoise3(seed + 101);
    this.rand = mulberry32(seed ^ 0x9e3779b9);
    this.scoreBuf = new Float32Array(NUM_REGIONS);
    this.weightBuf = new Float32Array(NUM_REGIONS);

    this.chooseBiomes();
    this.classifyVertices();
    this.placePatches();
    this.buildMesh();
    this.buildProps();
  }

  // seeded random unit vector, so the same seed always rebuilds the same planet
  randDir() {
    const z = this.rand() * 2 - 1;
    const a = this.rand() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    return new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), z);
  }

  // ------------------------------------------------------------- biome layout

  chooseBiomes() {
    const ids = [...BIOME_IDS];
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    this.biomes = ids.slice(0, NUM_REGIONS);
    this.defs = this.biomes.map((id) => BIOMES[id]);
    this.creatureOrder = this.defs.map((d) => d.creature);
    this.aliveCols = this.defs.map((d) => pastel(new THREE.Color(d.alive)));
    this.deadCols = this.defs.map((d) => pastelDead(new THREE.Color(d.dead)));

    const rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.rand() * 6.28, this.rand() * 6.28, this.rand() * 6.28));
    const golden = Math.PI * (3 - Math.sqrt(5));
    this.centers = [];
    this.weights = [];
    this.duneDir = [];
    for (let i = 0; i < NUM_REGIONS; i++) {
      const y = 1 - ((i + 0.5) / NUM_REGIONS) * 2;
      const r = Math.sqrt(1 - y * y);
      this.centers.push(new THREE.Vector3(Math.cos(golden * i) * r, y, Math.sin(golden * i) * r).applyQuaternion(rot));
      this.weights.push(this.defs[i].weight + (this.rand() - 0.5) * 0.14);
      this.duneDir.push(this.randDir());
    }
    this.regionDone = new Array(NUM_REGIONS).fill(-1);
  }

  scores(dir) {
    const s = this.scoreBuf;
    for (let i = 0; i < NUM_REGIONS; i++) {
      const c = this.centers[i];
      s[i] = dir.x * c.x + dir.y * c.y + dir.z * c.z + this.weights[i]
        + 0.1 * this.warp(dir.x * 2.2 + i * 17.3, dir.y * 2.2, dir.z * 2.2, 2);
    }
    return s;
  }

  regionAt(dir) {
    const s = this.scores(dir);
    let bi = 0;
    for (let i = 1; i < NUM_REGIONS; i++) if (s[i] > s[bi]) bi = i;
    return bi;
  }

  // soft per-biome weights for blending terrain + colours across borders
  softWeights(dir) {
    const s = this.scores(dir);
    let max = -Infinity;
    for (let i = 0; i < NUM_REGIONS; i++) max = Math.max(max, s[i]);
    const w = this.weightBuf;
    let sum = 0;
    for (let i = 0; i < NUM_REGIONS; i++) {
      w[i] = Math.exp((s[i] - max) * 18);
      sum += w[i];
    }
    for (let i = 0; i < NUM_REGIONS; i++) w[i] /= sum;
    return w;
  }

  terrain(i, n) {
    const f = this.fbm;
    switch (this.defs[i].terrain) {
      case 'rolling': return 0.5 * f(n.x * 1.4 + 3, n.y * 1.4, n.z * 1.4);
      case 'gentle': return 0.3 * f(n.x * 1.2, n.y * 1.2 + 5, n.z * 1.2);
      case 'basin': {
        const ang = n.angleTo(this.centers[i]);
        return -0.35 * (1 - smoothstep(0, 0.45, ang)) + 0.15 * f(n.x * 2, n.y * 2, n.z * 2);
      }
      case 'dunes': {
        const d = n.dot(this.duneDir[i]);
        const ridge = 1 - Math.abs(Math.sin(d * 30 + 3 * f(n.x * 1.5, n.y * 1.5, n.z * 1.5)));
        return 0.3 * ridge * ridge + 0.15 * f(n.x * 1.3, n.y * 1.3, n.z * 1.3 + 9);
      }
      case 'peaks': {
        const r = 1 - Math.abs(f(n.x * 2.2 + 5, n.y * 2.2, n.z * 2.2) * 2);
        return 0.95 * r * r - 0.15;
      }
      case 'beach': return 0.15 * f(n.x * 1.5, n.y * 1.5, n.z * 1.5 + 4);
      case 'volcano': {
        const ang = n.angleTo(this.centers[i]);
        return 1.5 * (1 - smoothstep(0, 0.5, ang)) - 0.9 * (1 - smoothstep(0, 0.13, ang)) + 0.12 * f(n.x * 3, n.y * 3, n.z * 3);
      }
      case 'bumps': return 0.75 * smoothstep(-0.1, 0.35, f(n.x * 2.6 + 1, n.y * 2.6, n.z * 2.6)) - 0.2;
      case 'hillocks': return 0.55 * Math.max(0, f(n.x * 3.2, n.y * 3.2, n.z * 3.2)) + 0.2 * f(n.x * 1.3, n.y * 1.3 + 2, n.z * 1.3);
      default: return 0;
    }
  }

  heightAt(dir) {
    const w = this.softWeights(dir);
    let h = 0;
    for (let i = 0; i < NUM_REGIONS; i++) if (w[i] > 0.005) h += w[i] * this.terrain(i, dir);
    if (this.waterPatches) {
      for (const p of this.waterPatches) {
        const ang = dir.angleTo(p.center);
        if (ang < p.r * 1.3) h -= 0.22 * (1 - smoothstep(0, p.r * 1.3, ang));
      }
    }
    return this.R + h;
  }

  classifyVertices() {
    let geo = new THREE.IcosahedronGeometry(1, 56);
    geo.deleteAttribute('normal');
    geo.deleteAttribute('uv');
    geo = mergeVertices(geo, 1e-5);
    this.geo = geo;
    const n = (this.count = geo.attributes.position.count);
    this.dirs = new Float32Array(n * 3);
    this.region = new Uint8Array(n);
    this.regionAng = new Float32Array(n);
    this.regionTotal = new Array(NUM_REGIONS).fill(0);
    this.regionPainted = new Array(NUM_REGIONS).fill(0);
    this.regionVerts = Array.from({ length: NUM_REGIONS }, () => []);
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(geo.attributes.position, i).normalize();
      this.dirs[i * 3] = v.x; this.dirs[i * 3 + 1] = v.y; this.dirs[i * 3 + 2] = v.z;
      const r = this.regionAt(v);
      this.region[i] = r;
      this.regionAng[i] = v.angleTo(this.centers[r]);
      this.regionTotal[r]++;
      this.regionVerts[r].push(i);
    }
    // bucket vertices into a coarse 3D grid so painting only checks nearby ones
    const buckets = new Map();
    for (let i = 0; i < n; i++) {
      const key = this.cellKey(this.dirs[i * 3], this.dirs[i * 3 + 1], this.dirs[i * 3 + 2]);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(i);
    }
    this.grid = new Map([...buckets].map(([k, v]) => [k, Int32Array.from(v)]));
    this.biomeRadius = this.regionVerts.map((list) => {
      const angs = list.map((i) => this.regionAng[i]).sort((a, b) => a - b);
      return angs[Math.floor(angs.length * 0.75)] || 0.3;
    });
  }

  cellKey(x, y, z, dx = 0, dy = 0, dz = 0) {
    const c = (v) => Math.floor((v + 1) / GRID_CELL);
    return (c(x) + dx) * 4096 + (c(y) + dy) * 64 + (c(z) + dz);
  }

  dirOf(i, out = new THREE.Vector3()) {
    return out.set(this.dirs[i * 3], this.dirs[i * 3 + 1], this.dirs[i * 3 + 2]);
  }

  // ------------------------------------------------------------- patches

  placePatches() {
    const n = this.count;
    this.patchId = new Int16Array(n).fill(-1);
    this.patchDist = new Float32Array(n);
    this.patchPerp = new Float32Array(n);
    this.patches = [];
    const v = new THREE.Vector3();

    for (let r = 0; r < NUM_REGIONS; r++) {
      const def = this.defs[r];
      const list = this.regionVerts[r];
      const wanted = Math.max(2, Math.round(def.patchCount * Math.sqrt(list.length / 5200)));
      const centerDefs = def.patches.filter((d) => d.center);
      const others = def.patches.filter((d) => !d.center);
      const order = [...centerDefs];
      while (order.length < wanted) {
        const round = [...others];
        for (let i = round.length - 1; i > 0; i--) {
          const j = Math.floor(this.rand() * (i + 1));
          [round[i], round[j]] = [round[j], round[i]];
        }
        order.push(...round);
      }

      for (const pdef of order.slice(0, wanted)) {
        for (let attempt = 0; attempt < 60; attempt++) {
          const patch = pdef.shape === 'path' ? this.tryPath(r, pdef, list) : this.tryBlob(r, pdef, list, v);
          if (patch) break;
        }
      }
    }
    this.patchTotal = this.patches.map((p) => p.verts.length);
    this.patchPainted = this.patches.map(() => 0);
    this.waterPatches = this.patches.filter((p) => p.water && !p.path);
  }

  claim(patch, members) {
    if (members.length < 25) return null;
    const id = this.patches.length;
    let maxDist = 0;
    for (const [i, dist, perp] of members) {
      this.patchId[i] = id;
      this.patchDist[i] = dist;
      this.patchPerp[i] = perp;
      maxDist = Math.max(maxDist, dist);
    }
    patch.id = id;
    patch.verts = members.map((m) => m[0]);
    patch.waveSpeed = Math.max(0.05, maxDist / PATCH_WAVE_TIME);
    patch.done = -1;
    this.patches.push(patch);
    return patch;
  }

  tryBlob(r, pdef, list, v) {
    let center, rad;
    if (pdef.center) {
      center = this.centers[r].clone();
      rad = this.biomeRadius[r] * pdef.rFrac;
    } else {
      rad = pdef.r[0] + this.rand() * (pdef.r[1] - pdef.r[0]);
      const i = list[Math.floor(this.rand() * list.length)];
      if (this.patchId[i] >= 0 || this.regionAng[i] < rad + 0.12) return null;
      center = this.dirOf(i);
      for (const p of this.patches) {
        if (p.center.angleTo(center) < rad + (p.r || 0.1) + 0.025) return null;
      }
    }
    const members = [];
    for (const i of list) {
      if (this.patchId[i] >= 0) continue;
      this.dirOf(i, v);
      const ang = v.angleTo(center);
      const limit = rad * (1 + 0.28 * this.warp(v.x * 5 + 40, v.y * 5, v.z * 5, 2));
      if (ang < limit) members.push([i, ang, ang / limit]);
    }
    // the edge of the biome would clip the shape; reject lopsided placements
    if (!pdef.center && members.length < Math.PI * (rad / 0.022) ** 2 * 0.5) return null;
    return this.claim({ def: pdef, name: pdef.name, region: r, center, r: rad, water: pdef.water }, members);
  }

  tryPath(r, pdef, list) {
    const i0 = list[Math.floor(this.rand() * list.length)];
    if (this.patchId[i0] >= 0 || this.regionAng[i0] < 0.15) return null;
    const pts = [this.dirOf(i0)];
    let heading = this.randDir().projectOnPlane(pts[0]).normalize();
    const step = 0.055;
    for (let k = 0; k < 18; k++) {
      const p = pts[pts.length - 1];
      let ok = false;
      for (let tries = 0; tries < 4 && !ok; tries++) {
        const h = heading.clone().applyAxisAngle(p, (this.rand() - 0.5) * 0.6 + (tries ? (tries % 2 ? 1 : -1) * 0.7 * tries : 0));
        const next = p.clone().addScaledVector(h, step).normalize();
        if (this.regionAt(next) !== r || next.angleTo(this.centers[r]) < 0.12) continue;
        let blocked = false;
        for (const q of this.patches) if (!q.path && q.center.angleTo(next) < q.r + 0.08) blocked = true;
        if (blocked) continue;
        heading = h.projectOnPlane(next).normalize();
        pts.push(next);
        ok = true;
      }
      if (!ok) break;
    }
    if (pts.length < 9) return null;

    const cum = [0];
    for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + pts[k].distanceTo(pts[k - 1]));
    const members = [];
    const v = new THREE.Vector3();
    const seg = new THREE.Line3();
    const closest = new THREE.Vector3();
    for (const i of list) {
      if (this.patchId[i] >= 0) continue;
      this.dirOf(i, v);
      if (v.distanceTo(pts[0]) > cum[cum.length - 1] + 0.2) continue;
      let best = Infinity, along = 0;
      for (let k = 1; k < pts.length; k++) {
        seg.set(pts[k - 1], pts[k]);
        const t = seg.closestPointToPointParameter(v, true);
        seg.at(t, closest);
        const d = closest.distanceTo(v);
        if (d < best) { best = d; along = cum[k - 1] + t * (cum[k] - cum[k - 1]); }
      }
      const limit = PATH_HALF_WIDTH * (1 + 0.2 * this.warp(v.x * 6, v.y * 6 + 20, v.z * 6, 2));
      if (best < limit) members.push([i, along, best / limit]);
    }
    const mid = pts[Math.floor(pts.length / 2)].clone();
    return this.claim({ def: pdef, name: pdef.name, region: r, center: mid, r: 0.05, pts, path: true, water: pdef.water }, members);
  }

  // ------------------------------------------------------------- mesh

  buildMesh() {
    const geo = this.geo;
    const n = this.count;
    const pos = geo.attributes.position;
    const dead = new Float32Array(n * 3);
    const alive = new Float32Array(n * 3);
    const style = new Float32Array(n * 4);
    const waterCol = new Float32Array(n * 3);
    const edge = new Float32Array(n * 2);
    this.waterTarget = new Float32Array(n);
    this.water = new Float32Array(n);
    this.dyn = new Float32Array(n * 4);
    this.painted = new Uint8Array(n);
    this.paintTime = new Float32Array(n);
    this.flags = new Uint8Array(n);
    // only vertices that are still animating get touched each frame
    this.active = new Uint8Array(n);
    this.activeList = [];
    this.glowState = { regions: [], patches: [] };
    this.aliveVert = alive;
    this.deadVert = dead;

    const v = new THREE.Vector3();
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      this.dirOf(i, v);
      const h = this.heightAt(v);
      pos.setXYZ(i, v.x * h, v.y * h, v.z * h);
      const w = this.softWeights(v);
      let dr = 0, dg = 0, db = 0, ar = 0, ag = 0, ab = 0, s0 = 0, s1 = 0, s2 = 0;
      for (let r = 0; r < NUM_REGIONS; r++) {
        if (w[r] < 0.002) continue;
        const d = this.deadCols[r], a = this.aliveCols[r], st = this.defs[r].style;
        dr += d.r * w[r]; dg += d.g * w[r]; db += d.b * w[r];
        ar += a.r * w[r]; ag += a.g * w[r]; ab += a.b * w[r];
        s0 += st[0] * w[r]; s1 += st[1] * w[r]; s2 += st[2] * w[r];
      }
      const p = this.patchId[i];
      if (p >= 0) {
        const patch = this.patches[p];
        pastelDead(c.set(patch.def.dead)); dr = c.r; dg = c.g; db = c.b;
        pastel(c.set(patch.def.alive)); ar = c.r; ag = c.g; ab = c.b;
        if (patch.def.emissive) style[i * 4 + 3] = patch.def.emissive;
        if (patch.water) {
          c.set(patch.water).lerp(WHITE, 0.12);
          waterCol.set([c.r, c.g, c.b], i * 3);
          this.waterTarget[i] = 1 - smoothstep(0.55, 0.85, this.patchPerp[i]);
        }
      }
      dead.set([dr, dg, db], i * 3);
      alive.set([ar, ag, ab], i * 3);
      style[i * 4] = s0; style[i * 4 + 1] = s1; style[i * 4 + 2] = s2;
    }

    // edges: neighbours in a different biome / patch
    const idx = geo.index.array;
    for (let t = 0; t < idx.length; t += 3) {
      for (let k = 0; k < 3; k++) {
        const a = idx[t + k], b = idx[t + ((k + 1) % 3)];
        if (this.region[a] !== this.region[b]) { edge[a * 2] = 1; edge[b * 2] = 1; }
        if (this.patchId[a] !== this.patchId[b]) {
          if (this.patchId[a] >= 0) edge[a * 2 + 1] = 1;
          if (this.patchId[b] >= 0) edge[b * 2 + 1] = 1;
        }
      }
    }
    // soften patch colour edges a little
    this.smooth(dead, 3, idx, 2);
    this.smooth(alive, 3, idx, 2);
    this.smooth(waterCol, 3, idx, 1);
    this.smooth(edge, 2, idx, 2);

    geo.computeVertexNormals();
    const attr = (arr, size, dynamic) => {
      const a = new THREE.BufferAttribute(arr, size);
      if (dynamic) a.setUsage(THREE.DynamicDrawUsage);
      return a;
    };
    geo.setAttribute('aDead', attr(dead, 3));
    geo.setAttribute('aAlive', attr(alive, 3));
    this.smooth(style, 4, idx, 1);
    geo.setAttribute('aStyle', attr(style, 4));
    geo.setAttribute('aWaterCol', attr(waterCol, 3));
    geo.setAttribute('aEdge', attr(edge, 2));
    this.dynAttr = attr(this.dyn, 4, true);
    this.waterAttr = attr(this.water, 1, true);
    geo.setAttribute('aDyn', this.dynAttr);
    geo.setAttribute('aWater', this.waterAttr);

    this.uniforms = {
      uTime: { value: 0 },
      uSlimeCol: { value: new THREE.Color(0x8dffd6) },
      uSunDir: { value: new THREE.Vector3(1, 1, 1).normalize() },
    };
    this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: this.uniforms }));
    this.group.add(this.mesh);
  }

  smooth(arr, size, idx, passes) {
    const n = this.count;
    const acc = new Float32Array(n * size);
    const cnt = new Float32Array(n);
    for (let p = 0; p < passes; p++) {
      acc.fill(0);
      cnt.fill(0);
      for (let t = 0; t < idx.length; t += 3) {
        for (let k = 0; k < 3; k++) {
          const a = idx[t + k];
          for (let j = 0; j < 3; j++) {
            const b = idx[t + j];
            for (let s = 0; s < size; s++) acc[a * size + s] += arr[b * size + s];
            cnt[a]++;
          }
        }
      }
      for (let i = 0; i < n; i++) for (let s = 0; s < size; s++) arr[i * size + s] = acc[i * size + s] / cnt[i];
    }
  }

  // ------------------------------------------------------------- props

  propAt(i, scale, jitter = 0.04) {
    const d = this.dirOf(i);
    d.x += (this.rand() - 0.5) * jitter;
    d.y += (this.rand() - 0.5) * jitter;
    d.z += (this.rand() - 0.5) * jitter;
    d.normalize();
    const h = this.heightAt(d) - 0.03;
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.rand() * 6.28));
    const alive = new THREE.Color(this.aliveVert[i * 3], this.aliveVert[i * 3 + 1], this.aliveVert[i * 3 + 2]);
    const deadCol = new THREE.Color(this.deadVert[i * 3], this.deadVert[i * 3 + 1], this.deadVert[i * 3 + 2]).multiplyScalar(1.06);
    return { v: i, pos: d.multiplyScalar(h), quat, scale, alive, deadCol, region: this.region[i], ang: this.regionAng[i], patch: this.patchId[i], dist: this.patchDist[i], delay: 0 };
  }

  sample(list, count) {
    const out = [];
    if (!list.length) return out;
    for (let k = 0; k < count; k++) out.push(list[Math.floor(this.rand() * list.length)]);
    return out;
  }

  buildProps() {
    const groups = {};
    const add = (kind, trigger, it) => {
      const s = PROP_KINDS[kind].scale;
      it.scale *= s[0] + this.rand() * (s[1] - s[0]);
      (groups[`${kind}|${trigger}`] ??= { kind, trigger, items: [] }).items.push(it);
    };

    for (let r = 0; r < NUM_REGIONS; r++) {
      const def = this.defs[r];
      const free = this.regionVerts[r].filter((i) => this.patchId[i] < 0);
      for (const [kind, density] of def.small) {
        for (const i of this.sample(free, Math.round(free.length * density))) {
          const it = this.propAt(i, 1, 0.06);
          it.delay = kind === 'grass' ? 0.1 : 0.5 + this.rand() * 1.2;
          add(kind, 'life', it);
        }
      }
      const open = free.filter((i) => this.regionAng[i] > 0.15);
      for (const [kind, density] of def.big) {
        for (const i of this.sample(open, Math.round(open.length * density))) add(kind, 'biome', this.propAt(i, 1, 0));
      }
    }

    for (const patch of this.patches) {
      for (const [kind, density, placeArg] of patch.def.props) {
        const place = placeArg || (patch.water ? 'rim' : 'any');
        const cands = patch.verts.filter((i) => {
          const perp = this.patchPerp[i];
          if (place === 'rim') return perp > 0.65;
          if (place === 'inner') return perp < 0.5 && this.regionAng[i] > 0.05;
          return true;
        });
        const count = Math.max(1, Math.round(cands.length * density));
        for (const i of this.sample(cands, count)) add(kind, 'patch', this.propAt(i, 1, 0.02));
      }
    }

    const triggers = {
      life: (it) => this.painted[it.v] && this.time - this.paintTime[it.v] > it.delay + LIFE_DELAY,
      biome: (it) => this.regionDone[it.region] >= 0 && (this.time - this.regionDone[it.region]) * WAVE_SPEED >= it.ang,
      patch: (it) => {
        const p = this.patches[it.patch];
        return p.done >= 0 && (this.time - p.done) * p.waveSpeed >= it.dist;
      },
    };
    this.layers = Object.values(groups).map((g) => new PropLayer(g.kind, g.items, triggers[g.trigger], this.rand, g.trigger !== 'life' && !NO_DEAD.has(g.kind)));
    for (const l of this.layers) [...l.meshes, ...l.deadMeshes].forEach((m) => this.group.add(m));

    // bare rocks so the dead world has some shape
    const rocks = this.sample(Array.from({ length: this.count }, (_, i) => i).filter((i) => this.patchId[i] < 0), 30);
    const rockMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.35, 2), matte(0xcdc4d8, { roughness: 0.9 }), rocks.length);
    const m = new THREE.Matrix4();
    rocks.forEach((i, k) => {
      const it = this.propAt(i, 0.5 + this.rand() * 1.1, 0);
      m.compose(it.pos, it.quat, new THREE.Vector3(it.scale, it.scale * 0.7, it.scale));
      rockMesh.setMatrixAt(k, m);
    });
    rockMesh.frustumCulled = false;
    this.group.add(rockMesh);
  }

  // ------------------------------------------------------------- play

  wake(i) {
    if (!this.active[i]) {
      this.active[i] = 1;
      this.activeList.push(i);
    }
  }

  markPainted(i) {
    if (this.painted[i]) return false;
    this.painted[i] = 1;
    this.paintTime[i] = this.time;
    this.regionPainted[this.region[i]]++;
    const p = this.patchId[i];
    if (p >= 0) this.patchPainted[p]++;
    return true;
  }

  // Lay slime in a circle around dir. Returns how many new vertices were covered.
  paint(dir, radius) {
    const cosR = Math.cos(radius / this.R);
    const cosInner = Math.cos((radius * 0.6) / this.R);
    const d = this.dirs;
    let fresh = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const cell = this.grid.get(this.cellKey(dir.x, dir.y, dir.z, dx, dy, dz));
      if (!cell) continue;
      for (let c = 0; c < cell.length; c++) {
        const i = cell[c];
        const dot = d[i * 3] * dir.x + d[i * 3 + 1] * dir.y + d[i * 3 + 2] * dir.z;
        if (dot < cosR) continue;
        const s = dot > cosInner ? 1 : (dot - cosR) / (cosInner - cosR);
        if (s > this.dyn[i * 4]) this.dyn[i * 4] = s;
        if (this.markPainted(i)) fresh++;
        this.wake(i);
      }
    }
    return fresh;
  }

  // spots (patches) in a biome: [done, total]
  spots(r) {
    let done = 0, total = 0;
    for (const p of this.patches) {
      if (p.region !== r) continue;
      total++;
      if (p.done >= 0) done++;
    }
    return [done, total];
  }

  // a biome is finished once every spot is cleared (or, the old way, nearly all ground is slimed)
  regionComplete(r) {
    const [done, total] = this.spots(r);
    return (total > 0 && done === total) || this.coverage(r) >= 0.97;
  }

  // what the progress rings show: whichever is further along, spots or ground
  regionProgress(r) {
    if (this.regionDone[r] >= 0) return 1;
    const [done, total] = this.spots(r);
    return Math.max(total ? done / total : 0, this.coverage(r));
  }

  coverage(r) {
    return this.regionDone[r] >= 0 ? 1 : this.regionPainted[r] / this.regionTotal[r];
  }

  patchCoverage(p) {
    return this.patches[p].done >= 0 ? 1 : this.patchPainted[p] / this.patchTotal[p];
  }

  totalCoverage() {
    let p = 0;
    for (let r = 0; r < NUM_REGIONS; r++) p += this.regionDone[r] >= 0 ? this.regionTotal[r] : this.regionPainted[r];
    return p / this.count;
  }

  completeRegion(r) {
    this.regionDone[r] = this.time;
    for (const i of this.regionVerts[r]) this.wake(i);
  }

  completePatch(p) {
    this.patches[p].done = this.time;
    for (const i of this.patches[p].verts) this.wake(i);
  }

  setSlimeColor(hex) {
    this.uniforms.uSlimeCol.value.set(hex);
  }

  update(dt, onPop) {
    this.time += dt;
    this.uniforms.uTime.value = this.time;
    const t = this.time;
    const regionGlow = this.regionDone.map((d, r) => d < 0 && this.coverage(r) > 0.88);
    const lastFew = this.regionDone.map((d, r) => {
      const [done, total] = this.spots(r);
      return d < 0 && total - done <= 2;
    });
    const patchGlow = this.patches.map((p, k) => p.done < 0 && (this.patchCoverage(k) > 0.8 || lastFew[p.region]));
    // when an area starts or stops glowing, its vertices need a few frames to fade
    regionGlow.forEach((g, r) => {
      if (g !== !!this.glowState.regions[r]) for (const i of this.regionVerts[r]) this.wake(i);
    });
    patchGlow.forEach((g, k) => {
      if (g !== !!this.glowState.patches[k]) for (const i of this.patches[k].verts) this.wake(i);
    });
    this.glowState = { regions: regionGlow, patches: patchGlow };

    const dyn = this.dyn;
    const list = this.activeList;
    const still = [];
    let lo = Infinity, hi = -1, wlo = Infinity, whi = -1;
    for (let n = 0; n < list.length; n++) {
      const i = list[n];
      const k = i * 4;
      if (dyn[k] > 0) dyn[k] = Math.max(0, dyn[k] - dt * SLIME_FADE);
      const r = this.region[i];
      const rd = this.regionDone[r];
      let pending = false;
      if (rd >= 0 && !(this.flags[i] & 1)) {
        if ((t - rd) * WAVE_SPEED >= this.regionAng[i]) {
          this.flags[i] |= 1;
          if (this.markPainted(i)) this.paintTime[i] = t - LIFE_DELAY;
          dyn[k + 2] = Math.max(dyn[k + 2], 0.6);
        } else pending = true;
      }
      const p = this.patchId[i];
      if (p >= 0) {
        const patch = this.patches[p];
        if (patch.done >= 0 && !(this.flags[i] & 2)) {
          if ((t - patch.done) * patch.waveSpeed >= this.patchDist[i]) {
            this.flags[i] |= 2;
            if (this.markPainted(i)) this.paintTime[i] = t - LIFE_DELAY;
            dyn[k + 2] = 1;
          } else pending = true;
        }
        if (this.flags[i] & 2 && this.water[i] < this.waterTarget[i]) {
          this.water[i] = Math.min(this.waterTarget[i], this.water[i] + dt * 1.4);
          pending = true;
          if (i < wlo) wlo = i;
          if (i > whi) whi = i;
        }
      }
      if (this.painted[i] && dyn[k + 1] < 1) {
        if (t - this.paintTime[i] > LIFE_DELAY) dyn[k + 1] = Math.min(1, dyn[k + 1] + dt * LIFE_RATE);
        pending = true;
      }
      if (dyn[k + 2] > 0) dyn[k + 2] = Math.max(0, dyn[k + 2] - dt * 1.8);
      const g = !this.painted[i] && (regionGlow[r] || (p >= 0 && patchGlow[p])) ? 1 : 0;
      dyn[k + 3] += (g - dyn[k + 3]) * Math.min(1, dt * 4);
      if (g) pending = true; // glowing patches keep pulsing
      if (i < lo) lo = i;
      if (i > hi) hi = i;
      if (pending || dyn[k] > 0 || dyn[k + 2] > 0 || Math.abs(g - dyn[k + 3]) > 0.01) still.push(i);
      else this.active[i] = 0;
    }
    this.activeList = still;
    // upload only the slice of the buffer that changed
    if (hi >= 0) {
      this.dynAttr.clearUpdateRanges();
      this.dynAttr.addUpdateRange(lo * 4, (hi - lo + 1) * 4);
      this.dynAttr.needsUpdate = true;
    }
    if (whi >= 0) {
      this.waterAttr.clearUpdateRanges();
      this.waterAttr.addUpdateRange(wlo, whi - wlo + 1);
      this.waterAttr.needsUpdate = true;
    }
    for (const l of this.layers) l.update(dt, onPop);
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
}
