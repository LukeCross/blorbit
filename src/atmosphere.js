import * as THREE from 'three';
import { isSmooth } from './quality.js';

// Each galaxy gets its own look: the colours of space, the light, and a signature weather.
// Individual biomes can override the weather (snow where it's snowy, embers by the volcano).
// Everything here is derived from the galaxy id, so nothing is saved.

const PASTELS = ['#ffd1ea', '#d6c8ff', '#c4f2e2', '#ffe2c6', '#c9e6ff', '#fff1b8'];
const NEBULA = ['#ffb8dc', '#c8b4ff', '#a8ecd6', '#ffd0b0', '#b4dcff'];
const PLANETS = ['#cbb8ff', '#ffd2bd', '#bdf0de', '#ffe9a8'];

const base = {
  starFrac: 1, starWhite: 0.6, starPalette: PASTELS, starSize: 1,
  nebula: NEBULA, nebulaMul: 1, planets: PLANETS, bigPlanet: 1, shootMul: 1,
  sun: 0xfff4e6, sunI: 1.9, hemiSky: 0xf0ecff, hemiGround: 0xffd8c8, hemiI: 1.35, halo: '#fff2fb',
  weather: 'petals', lightning: false,
};

// space colours, light, weather
export const ATMOSPHERES = {
  wild: { ...base },
  city: {
    ...base, starFrac: 0.55, starPalette: ['#ffe9b0', '#ffc890', '#ffffff'],
    nebula: ['#ff9a6a', '#c86aa8', '#6a6ad8', '#ff7aa0'], planets: ['#ffb090', '#9a88e0', '#ffd8a8', '#c0a0e8'],
    sun: 0xffe0c0, hemiSky: 0xe0d4ff, hemiGround: 0xffb8a0, halo: '#ffc8b0', weather: 'rain',
  },
  sky: {
    ...base, starFrac: 0.35, starWhite: 1, starSize: 0.8,
    nebula: ['#ffffff', '#e8f4ff', '#fff6d8'], nebulaMul: 1.15, planets: ['#ffffff', '#ffe8c8', '#d8ecff', '#fff3b8'],
    sun: 0xfffbea, sunI: 2.1, hemiSky: 0xf4f8ff, hemiGround: 0xffeedd, halo: '#e8f6ff', weather: 'wisps',
  },
  safari: {
    ...base, starFrac: 0.6, starPalette: ['#fff0b0', '#ffd890'],
    nebula: ['#ffb870', '#ffd890', '#ff9a70'], planets: ['#ffc080', '#ffa060', '#ffe0a0', '#e89060'],
    sun: 0xffd9a0, sunI: 2, hemiSky: 0xfff0d8, hemiGround: 0xffc890, halo: '#ffd8a0', weather: 'dust',
  },
  sea: {
    ...base, starFrac: 0.8, starWhite: 0.2, starPalette: ['#9affe0', '#9ad8ff', '#d0fff4'], starSize: 1.2,
    nebula: ['#40d0c0', '#4a90e0', '#80f0d0', '#6a78e8'], planets: ['#60c8d8', '#8098f0', '#70e0c0', '#58a8e8'],
    sun: 0xcff6ff, sunI: 1.7, hemiSky: 0xb8ecff, hemiGround: 0x6aa8c8, hemiI: 1.3, halo: '#80f0e0', weather: 'bubbles',
  },
  feast: {
    ...base, starFrac: 0.7, starPalette: ['#ffe0b8', '#ffc8d8', '#fff0c8'],
    nebula: ['#ffb8a0', '#ffd8a0', '#ffa8c0', '#f0c890'], planets: ['#ffb8a0', '#f0d090', '#e8a0b0', '#ffe0b0'],
    sun: 0xffe8c8, hemiSky: 0xfff0e0, hemiGround: 0xffc8b0, halo: '#ffd8c0', weather: 'sprinkles',
  },
  gloom: {
    ...base, starFrac: 0.5, starPalette: ['#e0d8ff', '#b8a8e8'], starSize: 0.9,
    nebula: ['#6a4aa8', '#3a2a78', '#8a5ab8', '#4a3a88'], nebulaMul: 0.85,
    planets: ['#d8d0f0', '#7a6aa8', '#a090c8', '#5a4a88'], bigPlanet: 1.9, shootMul: 2,
    sun: 0xc8c8ff, sunI: 1.5, hemiSky: 0xb8b0e8, hemiGround: 0x8870a8, hemiI: 1.15, halo: '#a090e0',
    weather: 'fog', lightning: true,
  },
  stomp: {
    ...base, starFrac: 0.5, starPalette: ['#ffd8b0', '#ffb890'],
    nebula: ['#ff7a50', '#d8503a', '#ffa060', '#b84a50'], planets: ['#e87850', '#ffb070', '#c85a48', '#f0a060'],
    bigPlanet: 1.5, shootMul: 0.5,
    sun: 0xffc890, sunI: 2, hemiSky: 0xffe0d0, hemiGround: 0xe89870, halo: '#ffb080', weather: 'ash',
  },
};

// biome ids are globally unique, so no galaxy prefix needed
const BIOME_WEATHER = { snow: 'snow', iceage: 'snow', volcano: 'embers', autumn: 'leaves', candy: 'sprinkles', desert: 'dust' };

// n = particle count, size (world units), fall (negative rises), wind, sway, alpha; len makes rain streaks
const WEATHER = {
  petals: { n: 90, size: 0.24, fall: 0.9, wind: 0.3, sway: 0.7, alpha: 0.85, colors: ['#ffc8e0', '#ffffff', '#ffe0ec', '#e8d8ff'] },
  leaves: { n: 80, size: 0.26, fall: 1, wind: 0.4, sway: 0.9, alpha: 0.9, colors: ['#e8802a', '#d84a2a', '#f0b030', '#b8601a'] },
  snow: { n: 200, size: 0.2, fall: 1.2, wind: 0.3, sway: 0.5, alpha: 0.9, colors: ['#ffffff', '#e8f4ff'] },
  rain: { n: 240, size: 1, fall: 12, wind: 0, sway: 0, alpha: 0.8, len: 0.9, colors: ['#bcd8ff', '#e0ecff'] },
  wisps: { n: 26, size: 3, fall: -0.1, wind: 0.5, sway: 0.4, alpha: 0.2, colors: ['#ffffff', '#f0f8ff'] },
  dust: { n: 150, size: 0.15, fall: 0, wind: 1.6, sway: 0.5, alpha: 0.6, colors: ['#ffd890', '#f0b870', '#fff0c8'] },
  bubbles: { n: 110, size: 0.22, fall: -1, wind: 0.1, sway: 0.4, alpha: 0.55, colors: ['#d8fff4', '#ffffff', '#b8f0ff'] },
  sprinkles: { n: 110, size: 0.17, fall: 0.9, wind: 0.2, sway: 0.4, alpha: 0.9, colors: ['#ff8fc4', '#ffe14d', '#8fd8ff', '#b4ff86', '#ffffff'] },
  fog: { n: 22, size: 4.5, fall: 0, wind: 0.25, sway: 0.5, alpha: 0.13, colors: ['#c0b0e0', '#a898d0'] },
  embers: { n: 130, size: 0.13, fall: -0.9, wind: 0.3, sway: 0.5, alpha: 0.9, colors: ['#ff8a30', '#ffc040', '#ff6a30'] },
  ash: { n: 140, size: 0.15, fall: 0.6, wind: 0.5, sway: 0.5, alpha: 0.7, colors: ['#c8c0b8', '#a89c94', '#ff9a50'] },
};

const BOX = 18; // weather lives in a cube this wide around the blob, wrapping as you roll
const MAX = 260;
const rnd = (a, b) => a + Math.random() * (b - a);

const VERT = /* glsl */ `
  attribute vec3 seed;
  attribute float aEnd;
  attribute float size;
  attribute vec3 color;
  uniform vec3 uCenter;
  uniform vec3 uFall;
  uniform vec3 uDown;
  uniform float uTime;
  uniform float uBox;
  uniform float uSway;
  uniform float uScale;
  uniform float uLen;
  varying vec3 vCol;
  varying float vFade;
  void main() {
    float s = seed.x * 40.0;
    vec3 p = seed * uBox + uFall;
    p += vec3(sin(uTime * 0.7 + s), sin(uTime * 0.5 + s * 1.7) * 0.5, cos(uTime * 0.6 + s * 1.3)) * uSway;
    vec3 q = mod(p - uCenter + 0.5 * uBox, uBox) - 0.5 * uBox;
    vec3 w = uCenter + q + uDown * uLen * aEnd;
    vFade = 1.0 - smoothstep(0.6, 1.0, length(q) / (0.5 * uBox));
    vCol = color;
    vec4 mv = viewMatrix * vec4(w, 1.0);
    vFade *= smoothstep(0.6, 2.0, -mv.z);
    gl_PointSize = size * uScale / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;

const FRAG = /* glsl */ `
  uniform float uAlpha;
  varying vec3 vCol;
  varying float vFade;
  void main() {
    #ifdef DOT
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.1, d);
    #else
      float a = 1.0;
    #endif
    gl_FragColor = vec4(vCol, a * vFade * uAlpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

// One cheap draw call of camera-following particles (points, or line segments for rain).
// The motion is all in the vertex shader; the CPU only advances one wrapped offset per frame.
class Weather {
  constructor(scene) {
    this.uniforms = {
      uCenter: { value: new THREE.Vector3() }, uFall: { value: new THREE.Vector3() }, uDown: { value: new THREE.Vector3(0, -1, 0) },
      uTime: { value: 0 }, uBox: { value: BOX }, uSway: { value: 0 }, uScale: { value: 300 }, uLen: { value: 0 }, uAlpha: { value: 0 },
    };
    const make = (Type, verts, defines) => {
      const geo = new THREE.BufferGeometry();
      const attr = (name, n) => geo.setAttribute(name, new THREE.BufferAttribute(new Float32Array(MAX * verts * n), n));
      attr('position', 3); attr('seed', 3); attr('aEnd', 1); attr('size', 1); attr('color', 3);
      const obj = new Type(geo, new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG, defines, transparent: true, depthWrite: false }));
      obj.frustumCulled = false;
      obj.visible = false;
      scene.add(obj);
      return obj;
    };
    this.points = make(THREE.Points, 1, { DOT: '' });
    this.lines = make(THREE.LineSegments, 2, {});
    this.kind = null;
    this.want = null;
    this.fade = 0;
    this.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  set(kind) {
    this.want = this.reduced ? null : kind;
  }

  build(kind) {
    const def = WEATHER[kind];
    const streak = !!def?.len;
    this.points.visible = !!def && !streak;
    this.lines.visible = streak;
    this.kind = kind;
    if (!def) return;
    const obj = streak ? this.lines : this.points;
    const verts = streak ? 2 : 1;
    const n = Math.round(def.n * (isSmooth() ? 0.6 : 1));
    const g = obj.geometry;
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const sx = Math.random(), sy = Math.random(), sz = Math.random();
      const sz0 = def.size * rnd(0.6, 1.4);
      c.set(def.colors[Math.floor(Math.random() * def.colors.length)]);
      for (let v = 0; v < verts; v++) {
        const k = i * verts + v;
        g.attributes.seed.setXYZ(k, sx, sy, sz);
        g.attributes.aEnd.setX(k, v);
        g.attributes.size.setX(k, sz0);
        g.attributes.color.setXYZ(k, c.r, c.g, c.b);
      }
    }
    for (const a of Object.values(g.attributes)) a.needsUpdate = true;
    g.setDrawRange(0, n * verts);
    this.uniforms.uSway.value = def.sway;
    this.uniforms.uLen.value = def.len || 0;
  }

  update(dt, center, scale) {
    // fade the old weather out, swap, fade the new one in
    const u = this.uniforms;
    if (this.want !== this.kind) {
      this.fade -= dt * 2;
      if (this.fade <= 0) { this.fade = 0; this.build(this.want); }
    } else if (this.kind) {
      this.fade = Math.min(1, this.fade + dt * 1.2);
    }
    const def = WEATHER[this.kind];
    if (!def) return;
    const down = u.uDown.value.copy(center).normalize().negate();
    // world-space drift (fall + wind), wrapped to the cube so the numbers stay small
    const f = u.uFall.value;
    f.addScaledVector(down, def.fall * dt);
    f.x += def.wind * dt;
    f.z += def.wind * 0.4 * dt;
    f.set(f.x % BOX, f.y % BOX, f.z % BOX);
    u.uCenter.value.copy(center);
    u.uTime.value = (u.uTime.value + dt) % 600;
    u.uScale.value = scale;
    u.uAlpha.value = def.alpha * this.fade;
  }
}

// Applies a galaxy's profile: space colours (Backdrop.apply), light colours (eased), weather.
export class Atmosphere {
  constructor({ scene, hemi, sun, halo, backdrop, sound }) {
    this.sound = sound;
    this.hemi = hemi;
    this.sun = sun;
    this.halo = halo.material.uniforms.uColor.value;
    this.backdrop = backdrop;
    this.weather = new Weather(scene);
    this.profile = null;
    this.flash = 0;
    this.hemiI = 1;
    this.sunI = 1;
    this.pixelRatio = 1;
    this.nextFlash = rnd(8, 16);
    this.t = {
      hemiSky: new THREE.Color(), hemiGround: new THREE.Color(), sun: new THREE.Color(), halo: new THREE.Color(),
      hemiI: 0, sunI: 0,
    };
  }

  setGalaxy(id) {
    const p = ATMOSPHERES[id] ?? ATMOSPHERES.wild;
    const snap = !this.profile;
    this.profile = p;
    this.backdrop.apply(p, snap);
    const t = this.t;
    t.hemiSky.set(p.hemiSky); t.hemiGround.set(p.hemiGround); t.sun.set(p.sun); t.halo.set(p.halo);
    t.hemiI = p.hemiI; t.sunI = p.sunI;
    if (snap) {
      this.hemi.color.copy(t.hemiSky); this.hemi.groundColor.copy(t.hemiGround); this.sun.color.copy(t.sun);
      this.halo.copy(t.halo); this.hemiI = t.hemiI; this.sunI = t.sunI;
    }
    this.setWeather(p.weather);
  }

  setBiome(biomeId) {
    if (this.profile) this.setWeather(BIOME_WEATHER[biomeId] ?? this.profile.weather);
  }

  setWeather(kind) {
    this.weather.set(kind);
    if (kind !== this.kind) this.sound.setWeather(kind);
    this.kind = kind;
  }

  update(dt, center) {
    if (!this.profile) return;
    const k = Math.min(1, dt * 1.5);
    const t = this.t;
    this.hemi.color.lerp(t.hemiSky, k);
    this.hemi.groundColor.lerp(t.hemiGround, k);
    this.sun.color.lerp(t.sun, k);
    this.halo.lerp(t.halo, k);
    // lightning: a brief flicker of the light every so often, with thunder rolling in after
    if (this.profile.lightning) {
      this.nextFlash -= dt;
      if (this.nextFlash <= 0) { this.flash = 1; this.sound.thunder(); this.nextFlash = rnd(9, 20); }
    }
    this.flash = Math.max(0, this.flash - dt * 2.5);
    const f = this.flash > 0 ? this.flash * (0.6 + 0.4 * Math.sin(this.flash * 30)) : 0;
    this.hemiI += (t.hemiI - this.hemiI) * k;
    this.sunI += (t.sunI - this.sunI) * k;
    this.hemi.intensity = this.hemiI + f * 0.8;
    this.sun.intensity = this.sunI + f * 1.2;
    this.weather.update(dt, center, 300 * (window.innerHeight / 800) * (this.pixelRatio || 1));
  }
}
