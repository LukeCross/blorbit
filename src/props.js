import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { matte, shiny } from './quality.js';

// Low-poly props built from primitives. Each kind is one or more instanced "parts"
// that share a transform. color(it, rand) returns a per-instance tint.

// soft matte 'clay' look; picks up the pastel environment light
const lambert = (c) => matte(c, { roughness: 0.82 });
// glowing bits: brighter than 1.0 so they (and only they) catch the bloom
const unlit = (c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.7) });
const pick = (arr) => (it, rand) => new THREE.Color(arr[Math.floor(rand() * arr.length)]);
const fromGround = (lo, hi) => (it, rand) => it.alive.clone().multiplyScalar(lo + rand() * (hi - lo));
const merge = (...g) => mergeGeometries(g.map((x) => (x.index ? x.toNonIndexed() : x)));

// box sized w×h×d, rotated (rx, ry, rz) about its own centre, then moved to (x, y, z)
function box(w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  return new THREE.BoxGeometry(w, h, d).rotateX(rx).rotateY(ry).rotateZ(rz).translate(x, y, z);
}
// soft-edged box for clay-looking buildings, cars and hedges
function rbox(w, h, d, r, x = 0, y = 0, z = 0, segs = 1) {
  return new RoundedBoxGeometry(w, h, d, segs, r).translate(x, y, z);
}
// solid of revolution from [radius, height] pairs
const lathe = (pts, segs) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs);
// alternating wedges as two geometries: striped awnings, umbrellas and carousel roofs
function stripes(n, make) {
  const a = [], b = [];
  for (let i = 0; i < n; i++) (i % 2 ? b : a).push(make((i / n) * Math.PI * 2, (Math.PI * 2) / n));
  return [merge(...a), merge(...b)];
}

function radial(n, make) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(make((i / n) * Math.PI * 2, i));
  return merge(...out);
}

export const PROP_KINDS = {
  grass: {
    scale: [0.7, 1.4],
    parts: () => [{
      geo: radial(3, (a) => new THREE.ConeGeometry(0.05, 0.38, 3).translate(0, 0.19, 0).rotateZ(0.25).rotateY(a)),
      mat: lambert(0xffffff), color: fromGround(0.9, 1.4),
    }],
  },
  flower: {
    scale: [0.8, 1.4],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.018, 0.018, 0.4, 6).translate(0, 0.2, 0), mat: lambert(0x4f9a3a) },
      { geo: new THREE.IcosahedronGeometry(0.085, 1).translate(0, 0.42, 0), mat: lambert(0xffffff), color: pick([0xfff6d6, 0xffd34d, 0xff8fb8, 0xc9a8ff, 0x8fd8ff]) },
    ],
  },
  snowdrop: {
    scale: [0.7, 1.1],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6).translate(0, 0.15, 0), mat: lambert(0x6fb38a) },
      { geo: new THREE.ConeGeometry(0.07, 0.1, 10).rotateX(Math.PI).translate(0, 0.3, 0), mat: lambert(0xffffff), color: pick([0xffffff, 0xdff0ff]) },
    ],
  },
  tulip: {
    scale: [0.9, 1.4],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6).translate(0, 0.25, 0), mat: lambert(0x3f8a32) },
      { geo: new THREE.CylinderGeometry(0.1, 0.05, 0.18, 10).translate(0, 0.56, 0), mat: lambert(0xffffff), color: pick([0xff4f6d, 0xff9a3d, 0xffe14d, 0xff7ad1, 0xffffff, 0xb07aff]) },
    ],
  },
  tree: {
    scale: [0.8, 1.5],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.07, 0.11, 0.7, 10).translate(0, 0.35, 0), mat: lambert(0x7a5236) },
      { geo: merge(new THREE.IcosahedronGeometry(0.42, 2).translate(0, 0.9, 0), new THREE.IcosahedronGeometry(0.3, 2).translate(0.2, 1.2, 0.05)), mat: lambert(0xffffff), color: fromGround(0.7, 1.0) },
    ],
  },
  bigOak: {
    scale: [1.5, 1.8],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.1, 0.18, 0.8, 14).translate(0, 0.4, 0), mat: lambert(0x6e4a30) },
      { geo: merge(new THREE.IcosahedronGeometry(0.5, 2).translate(0, 1.0, 0), new THREE.IcosahedronGeometry(0.38, 2).translate(0.3, 1.2, 0.1), new THREE.IcosahedronGeometry(0.35, 2).translate(-0.28, 1.15, -0.1)), mat: lambert(0xffffff), color: fromGround(0.7, 0.9) },
    ],
  },
  pine: {
    scale: [0.9, 1.6],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.06, 0.08, 0.3, 10).translate(0, 0.15, 0), mat: lambert(0x6a4a34) },
      { geo: merge(new THREE.ConeGeometry(0.42, 0.6, 14).translate(0, 0.5, 0), new THREE.ConeGeometry(0.32, 0.5, 14).translate(0, 0.85, 0), new THREE.ConeGeometry(0.22, 0.4, 14).translate(0, 1.15, 0)), mat: lambert(0x2f6e4f) },
      { geo: merge(new THREE.ConeGeometry(0.12, 0.16, 10).translate(0, 1.3, 0), new THREE.ConeGeometry(0.2, 0.1, 14).translate(0, 1.0, 0)), mat: lambert(0xc8d2e0) },
    ],
  },
  cactus: {
    scale: [0.8, 1.4],
    parts: () => [
      { geo: merge(
        new THREE.CapsuleGeometry(0.13, 0.7, 4, 12).translate(0, 0.45, 0),
        new THREE.CapsuleGeometry(0.08, 0.25, 3, 8).translate(0.22, 0.6, 0),
        new THREE.CapsuleGeometry(0.08, 0.2, 3, 8).translate(-0.2, 0.45, 0),
        new THREE.CylinderGeometry(0.06, 0.06, 0.12, 10).rotateZ(Math.PI / 2).translate(0.15, 0.45, 0),
        new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10).rotateZ(Math.PI / 2).translate(-0.13, 0.32, 0),
      ), mat: lambert(0x4fa65a) },
      { geo: new THREE.IcosahedronGeometry(0.07, 1).translate(0, 0.92, 0), mat: lambert(0xffffff), color: pick([0xff7ab0, 0xffd34d, 0xff5a5a]) },
    ],
  },
  palm: {
    scale: [1.0, 1.4],
    parts: () => [
      { geo: merge(...[0, 1, 2, 3].map((i) => new THREE.CylinderGeometry(0.06, 0.08, 0.32, 10).translate(i * 0.05, 0.16 + i * 0.3, 0))), mat: lambert(0x9b7448) },
      { geo: radial(6, (a) => new THREE.ConeGeometry(0.12, 0.8, 10).scale(1, 1, 0.25).rotateZ(-1.9).translate(0.35, 1.15, 0).rotateY(a)), mat: lambert(0x3fae55) },
    ],
  },
  reed: {
    scale: [0.8, 1.3],
    parts: () => [
      { geo: merge(...[[0, 0], [0.07, 0.04], [-0.05, 0.06]].map(([x, z], i) => new THREE.CylinderGeometry(0.014, 0.014, 0.7 + i * 0.12, 6).translate(x, 0.35 + i * 0.06, z))), mat: lambert(0x5f9a48) },
      { geo: merge(...[[0, 0], [0.07, 0.04], [-0.05, 0.06]].map(([x, z], i) => new THREE.CapsuleGeometry(0.03, 0.12, 2, 6).translate(x, 0.72 + i * 0.12, z))), mat: lambert(0x7a5236) },
    ],
  },
  lily: {
    scale: [0.8, 1.4],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.22, 0.22, 0.02, 14, 1, false, 0.4, Math.PI * 2 - 0.4).translate(0, 0.04, 0), mat: lambert(0x3f9f4a) },
      { geo: new THREE.IcosahedronGeometry(0.07, 1).translate(0.05, 0.09, 0.03), mat: lambert(0xffffff), color: pick([0xffa3c8, 0xffffff, 0xfff0a0]) },
    ],
  },
  shrub: {
    scale: [0.6, 1.0],
    parts: () => [{ geo: new THREE.IcosahedronGeometry(0.18, 1).translate(0, 0.12, 0), mat: lambert(0xffffff), color: pick([0x9aa84f, 0x7f9a4a, 0xb0a85a]) }],
  },
  desertRock: {
    scale: [0.5, 1.2],
    parts: () => [{ geo: new THREE.IcosahedronGeometry(0.25, 2).scale(1, 0.7, 1).translate(0, 0.1, 0), mat: lambert(0xffffff), color: pick([0xd98a5a, 0xc9764a, 0xe0a070]) }],
  },
  crystal: {
    scale: [0.6, 1.3],
    parts: () => [{ geo: merge(new THREE.OctahedronGeometry(0.14, 0).scale(1, 2.4, 1).translate(0, 0.3, 0), new THREE.OctahedronGeometry(0.09, 0).scale(1, 2.2, 1).rotateZ(0.5).translate(0.12, 0.18, 0)), mat: unlit(0xffffff), color: pick([0xaee8ff, 0xd7c8ff, 0xffffff]) }],
  },
  snowman: {
    scale: [0.9, 1.2],
    parts: () => [
      { geo: merge(new THREE.SphereGeometry(0.28, 20, 14).translate(0, 0.25, 0), new THREE.SphereGeometry(0.2, 14, 10).translate(0, 0.65, 0), new THREE.SphereGeometry(0.14, 14, 10).translate(0, 0.94, 0)), mat: lambert(0xffffff) },
      { geo: new THREE.ConeGeometry(0.035, 0.18, 8).rotateX(Math.PI / 2).translate(0, 0.95, 0.2), mat: lambert(0xff8a2a) },
    ],
  },
  glowShroom: {
    scale: [0.6, 1.3],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.05, 0.07, 0.3, 10).translate(0, 0.15, 0), mat: lambert(0xe8e0ff) },
      { geo: new THREE.SphereGeometry(0.18, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.28, 0), mat: unlit(0xffffff), color: pick([0x5ff0ff, 0xc77dff, 0xff7ad9, 0x7dffb0]) },
    ],
  },
  shroom: {
    scale: [0.6, 1.1],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.06, 0.08, 0.3, 10).translate(0, 0.15, 0), mat: lambert(0xfff3e0) },
      { geo: new THREE.SphereGeometry(0.2, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.28, 0), mat: lambert(0xffffff), color: pick([0xff5a5a, 0xffa94d, 0xffe0f0]) },
    ],
  },
  fern: {
    scale: [0.8, 1.5],
    parts: () => [{
      geo: radial(5, (a) => new THREE.ConeGeometry(0.06, 0.55, 3).scale(1, 1, 0.3).rotateZ(-0.7).translate(0.18, 0.2, 0).rotateY(a)),
      mat: lambert(0xffffff), color: pick([0x4fbf8f, 0x6fd6a8, 0x8f7dff]),
    }],
  },
  bush: {
    scale: [0.8, 1.3],
    parts: () => [
      { geo: new THREE.IcosahedronGeometry(0.3, 2).scale(1, 0.85, 1).translate(0, 0.24, 0), mat: lambert(0xffffff), color: fromGround(0.6, 0.85) },
      { geo: merge(...[[0.2, 0.35, 0.12], [-0.15, 0.42, 0.1], [0.05, 0.3, -0.24], [-0.2, 0.25, -0.1], [0.1, 0.5, -0.05]].map(([x, y, z]) => new THREE.IcosahedronGeometry(0.07, 1).translate(x, y, z))), mat: lambert(0xffffff), color: pick([0xff5a8a, 0xff8fb8, 0xffffff, 0xffd34d]) },
    ],
  },
  pathStone: {
    scale: [0.6, 1.1],
    parts: () => [{ geo: new THREE.CylinderGeometry(0.22, 0.25, 0.08, 14).translate(0, 0.03, 0), mat: lambert(0xffffff), color: pick([0xd9d2c5, 0xc4bcb0, 0xe8e2d8]) }],
  },
  lantern: {
    scale: [0.9, 1.1],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.03, 0.04, 0.6, 6).translate(0, 0.3, 0), mat: lambert(0x4a3a3a) },
      { geo: new THREE.SphereGeometry(0.1, 10, 8).translate(0, 0.66, 0), mat: unlit(0xffe28a) },
    ],
  },
  glowStone: {
    scale: [0.6, 1.1],
    parts: () => [{ geo: new THREE.IcosahedronGeometry(0.14, 2).scale(1, 0.7, 1).translate(0, 0.07, 0), mat: unlit(0xffffff), color: pick([0xbfa8ff, 0x8ff0ff, 0xfff0a0]) }],
  },
  pebble: {
    scale: [0.5, 1.0],
    parts: () => [{ geo: new THREE.IcosahedronGeometry(0.1, 1).scale(1, 0.6, 1).translate(0, 0.03, 0), mat: lambert(0xffffff), color: pick([0xb8b0a8, 0x9a948e, 0xc8c0b4]) }],
  },
  appleTree: {
    scale: [0.9, 1.3],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.07, 0.1, 0.6, 10).translate(0, 0.3, 0), mat: lambert(0x7a5236) },
      { geo: new THREE.IcosahedronGeometry(0.48, 2).translate(0, 0.9, 0), mat: lambert(0xffffff), color: pick([0x5fb84a, 0x4fa83e, 0x7ac85a]) },
      { geo: merge(...[[0.3, 0.95, 0.3], [-0.35, 0.8, 0.15], [0.1, 1.2, -0.35], [-0.15, 1.05, 0.38], [0.38, 0.75, -0.2]].map(([x, y, z]) => new THREE.SphereGeometry(0.07, 10, 8).translate(x, y, z))), mat: lambert(0xffffff), color: pick([0xff3b3b, 0xff5a3a, 0xffd23a]) },
    ],
  },
  beehive: {
    scale: [1.0, 1.2],
    parts: () => [
      { geo: merge(...[0, 1, 2, 3].map((i) => new THREE.TorusGeometry(0.22 - i * 0.04, 0.08, 10, 28).rotateX(Math.PI / 2).translate(0, 0.1 + i * 0.13, 0))), mat: lambert(0xf2b84a) },
      { geo: new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10).rotateX(Math.PI / 2).translate(0, 0.18, 0.28), mat: lambert(0x3a2a1a) },
    ],
  },
  haybale: {
    scale: [0.9, 1.2],
    parts: () => [{ geo: new THREE.CylinderGeometry(0.25, 0.25, 0.4, 14).rotateZ(Math.PI / 2).translate(0, 0.25, 0), mat: lambert(0xffffff), color: pick([0xe8c860, 0xd8b850]) }],
  },
  sunflower: {
    scale: [1.0, 1.4],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.025, 0.03, 0.9, 6).translate(0, 0.45, 0), mat: lambert(0x4a8a32) },
      { geo: radial(8, (a) => new THREE.SphereGeometry(0.07, 10, 8).scale(1, 0.4, 1.8).translate(0, 0, 0.14).rotateY(a)).rotateX(1.2).translate(0, 0.92, 0.04), mat: lambert(0xffd23a) },
      { geo: new THREE.CylinderGeometry(0.09, 0.09, 0.05, 10).rotateX(1.2).translate(0, 0.92, 0.05), mat: lambert(0x5a3a1a) },
    ],
  },
  willow: {
    scale: [1.0, 1.4],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.08, 0.12, 0.9, 10).translate(0, 0.45, 0), mat: lambert(0x6a5038) },
      { geo: merge(new THREE.SphereGeometry(0.6, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62).translate(0, 0.75, 0), ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => new THREE.CylinderGeometry(0.06, 0.02, 0.6, 10).translate(0.5, 0.55, 0).rotateY((i / 8) * Math.PI * 2))), mat: lambert(0xffffff), color: pick([0x7ac86a, 0x8ad87a]) },
    ],
  },
  mossRock: {
    scale: [0.7, 1.3],
    parts: () => [
      { geo: new THREE.IcosahedronGeometry(0.3, 2).scale(1, 0.75, 1).translate(0, 0.15, 0), mat: lambert(0x8a8890) },
      { geo: new THREE.SphereGeometry(0.26, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2.5).translate(0, 0.17, 0), mat: lambert(0x5aa848) },
    ],
  },
  log: {
    scale: [1.0, 1.3],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.18, 0.2, 1.2, 14).rotateZ(Math.PI / 2).translate(0, 0.18, 0), mat: lambert(0x7a5838) },
      { geo: merge(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 14).rotateZ(Math.PI / 2).translate(0.61, 0.18, 0), new THREE.CylinderGeometry(0.15, 0.15, 0.02, 14).rotateZ(Math.PI / 2).translate(-0.61, 0.18, 0)), mat: lambert(0xd8b888) },
    ],
  },
  arch: {
    scale: [1.3, 1.6],
    parts: () => [{ geo: merge(new THREE.TorusGeometry(0.7, 0.18, 10, 28, Math.PI).translate(0, 0.1, 0), new THREE.CylinderGeometry(0.2, 0.25, 0.25, 14).translate(0.7, 0.05, 0), new THREE.CylinderGeometry(0.2, 0.25, 0.25, 14).translate(-0.7, 0.05, 0)), mat: lambert(0xffffff), color: pick([0xe0905a, 0xd88050]) }],
  },
  pillar: {
    scale: [0.7, 1.3],
    parts: () => [{ geo: merge(new THREE.CylinderGeometry(0.13, 0.13, 0.8, 14).translate(0, 0.45, 0), new THREE.BoxGeometry(0.36, 0.08, 0.36).translate(0, 0.04, 0), new THREE.BoxGeometry(0.34, 0.08, 0.34).translate(0, 0.88, 0)), mat: lambert(0xffffff), color: pick([0xf0dcb8, 0xe0c8a0]) }],
  },
  igloo: {
    scale: [1.2, 1.4],
    parts: () => [
      { geo: merge(new THREE.SphereGeometry(0.5, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.CylinderGeometry(0.2, 0.2, 0.3, 14, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).translate(0, 0, 0.5)), mat: lambert(0xf0f6ff) },
      { geo: new THREE.CircleGeometry(0.15, 24, 0, Math.PI).translate(0, 0.02, 0.655), mat: lambert(0x3a4a6a) },
    ],
  },
  iceSpire: {
    scale: [0.8, 1.6],
    parts: () => [{ geo: merge(new THREE.ConeGeometry(0.18, 1.0, 14).translate(0, 0.5, 0), new THREE.ConeGeometry(0.1, 0.55, 10).translate(0.18, 0.27, 0.05)), mat: unlit(0xffffff), color: pick([0xbfe8ff, 0xa8d8ff, 0xe0f4ff]) }],
  },
  moonTree: {
    scale: [1.0, 1.5],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.06, 0.1, 1.0, 10).translate(0, 0.5, 0), mat: lambert(0x3a3050) },
      { geo: merge(new THREE.IcosahedronGeometry(0.4, 2).translate(0, 1.1, 0), new THREE.IcosahedronGeometry(0.26, 2).translate(0.25, 0.9, 0.1)), mat: unlit(0xffffff), color: pick([0x8a70ff, 0x5ad8ff, 0xd070ff]) },
    ],
  },
  moonflower: {
    scale: [0.8, 1.3],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.015, 0.015, 0.4, 6).translate(0, 0.2, 0), mat: lambert(0x4a6a6a) },
      { geo: new THREE.ConeGeometry(0.1, 0.12, 10, 1, true).rotateX(Math.PI).translate(0, 0.44, 0), mat: unlit(0xffffff), color: pick([0xe0d8ff, 0xb8f0ff, 0xffd8f8]) },
    ],
  },
  bigCrystal: {
    scale: [1.2, 1.6],
    parts: () => [{ geo: merge(new THREE.OctahedronGeometry(0.3, 0).scale(1, 3, 1).translate(0, 0.8, 0), new THREE.OctahedronGeometry(0.18, 0).scale(1, 2.6, 1).rotateZ(0.4).translate(0.3, 0.45, 0), new THREE.OctahedronGeometry(0.15, 0).scale(1, 2.4, 1).rotateZ(-0.5).translate(-0.28, 0.4, 0.1)), mat: unlit(0xffffff), color: pick([0xb08aff, 0x8ad0ff]) }],
  },
  cabbage: {
    scale: [0.7, 1.0],
    parts: () => [{ geo: new THREE.IcosahedronGeometry(0.17, 2).scale(1, 0.8, 1).translate(0, 0.13, 0), mat: lambert(0xffffff), color: pick([0x8ad86a, 0x6ac85a, 0xa0e080]) }],
  },
  carrot: {
    scale: [0.8, 1.1],
    parts: () => [
      { geo: new THREE.ConeGeometry(0.06, 0.12, 8).rotateX(Math.PI).translate(0, 0.05, 0), mat: lambert(0xff8a2a) },
      { geo: radial(3, (a) => new THREE.ConeGeometry(0.03, 0.25, 3).rotateZ(0.3).translate(0.03, 0.22, 0).rotateY(a)), mat: lambert(0x4aa83a) },
    ],
  },
  birdbath: {
    scale: [1.1, 1.3],
    parts: () => [
      { geo: merge(new THREE.CylinderGeometry(0.08, 0.14, 0.5, 14).translate(0, 0.25, 0), new THREE.CylinderGeometry(0.35, 0.18, 0.12, 14).translate(0, 0.56, 0)), mat: lambert(0xd8d0c8) },
      { geo: new THREE.CylinderGeometry(0.3, 0.3, 0.02, 14).translate(0, 0.62, 0), mat: unlit(0x6ad0f0) },
    ],
  },
  gnome: {
    scale: [0.9, 1.1],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.1, 0.13, 0.25, 14).translate(0, 0.12, 0), mat: lambert(0xffffff), color: pick([0x3a6ad8, 0x3aa85a, 0x8a4ad8]) },
      { geo: new THREE.ConeGeometry(0.12, 0.3, 10).translate(0, 0.48, 0), mat: lambert(0xe83a3a) },
      { geo: merge(new THREE.SphereGeometry(0.08, 10, 8).translate(0, 0.3, 0.02), new THREE.ConeGeometry(0.08, 0.16, 10).rotateX(Math.PI).translate(0, 0.22, 0.06)), mat: lambert(0xfff4e8) },
    ],
  },
  shell: {
    scale: [0.6, 1.1],
    parts: () => [{ geo: radial(5, (a) => new THREE.SphereGeometry(0.06, 10, 8).scale(0.6, 0.4, 1.6).translate(0, 0.03, 0.06).rotateY(a * 0.35 - 0.7)), mat: lambert(0xffffff), color: pick([0xffd8c8, 0xffe8b8, 0xf8c0d0, 0xffffff]) }],
  },
  seaGrass: {
    scale: [0.7, 1.2],
    parts: () => [{ geo: radial(4, (a) => new THREE.ConeGeometry(0.03, 0.45, 3).translate(0, 0.22, 0).rotateZ(0.3).rotateY(a)), mat: lambert(0x8ab85a) }],
  },
  coral: {
    scale: [0.7, 1.3],
    parts: () => [{ geo: merge(new THREE.CapsuleGeometry(0.06, 0.4, 3, 8).translate(0, 0.25, 0), new THREE.CapsuleGeometry(0.05, 0.25, 2, 6).rotateZ(0.6).translate(0.12, 0.35, 0), new THREE.CapsuleGeometry(0.05, 0.22, 2, 6).rotateZ(-0.7).translate(-0.12, 0.3, 0.04), new THREE.CapsuleGeometry(0.04, 0.2, 2, 6).rotateX(0.6).translate(0, 0.38, 0.1)), mat: lambert(0xffffff), color: pick([0xff7a8a, 0xff9a4a, 0xc87aff, 0xffd04a]) }],
  },
  starfish: {
    scale: [0.6, 1.1],
    parts: () => [{ geo: radial(5, (a) => new THREE.ConeGeometry(0.05, 0.2, 8).rotateZ(-Math.PI / 2).translate(0.1, 0.03, 0).rotateY(a)), mat: lambert(0xffffff), color: pick([0xff7a4a, 0xff5a7a, 0xffb04a]) }],
  },
  sandcastle: {
    scale: [1.2, 1.4],
    parts: () => [
      { geo: merge(new THREE.CylinderGeometry(0.35, 0.4, 0.3, 14).translate(0, 0.15, 0), new THREE.CylinderGeometry(0.15, 0.15, 0.35, 14).translate(0, 0.45, 0), ...[0, 1, 2, 3].map((i) => new THREE.CylinderGeometry(0.08, 0.09, 0.22, 10).translate(0.32, 0.38, 0).rotateY((i * Math.PI) / 2))), mat: lambert(0xf0d090) },
      { geo: merge(new THREE.ConeGeometry(0.17, 0.2, 14).translate(0, 0.72, 0), ...[0, 1, 2, 3].map((i) => new THREE.ConeGeometry(0.1, 0.13, 10).translate(0.32, 0.55, 0).rotateY((i * Math.PI) / 2))), mat: lambert(0xffffff), color: pick([0xff6a6a, 0x5ab0ff]) },
    ],
  },
  plank: {
    scale: [0.9, 1.1],
    parts: () => [{ geo: new THREE.BoxGeometry(0.7, 0.05, 0.18).translate(0, 0.03, 0), mat: lambert(0xffffff), color: pick([0xb88a5a, 0xa87a4a, 0xc89a6a]) }],
  },
  lavaRock: {
    scale: [0.6, 1.3],
    parts: () => [
      { geo: new THREE.IcosahedronGeometry(0.25, 2).scale(1, 0.75, 1).translate(0, 0.12, 0), mat: lambert(0x2e2628) },
      { geo: merge(new THREE.BoxGeometry(0.03, 0.2, 0.03).translate(0.15, 0.14, 0.12), new THREE.BoxGeometry(0.2, 0.03, 0.03).translate(-0.05, 0.22, 0.17)), mat: unlit(0xff7a2a) },
    ],
  },
  fireFlower: {
    scale: [0.8, 1.3],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6).translate(0, 0.2, 0), mat: lambert(0x3a2a20) },
      { geo: new THREE.ConeGeometry(0.1, 0.2, 10).translate(0, 0.48, 0), mat: unlit(0xffffff), color: pick([0xff5a1a, 0xffa01a, 0xffd04a]) },
    ],
  },
  obsidian: {
    scale: [0.7, 1.4],
    parts: () => [{ geo: merge(new THREE.OctahedronGeometry(0.2, 0).scale(1, 2.2, 1).translate(0, 0.38, 0), new THREE.OctahedronGeometry(0.12, 0).scale(1, 2, 1).rotateZ(0.5).translate(0.16, 0.22, 0)), mat: shiny(0x2a1a3a) }],
  },
  dragonEgg: {
    scale: [0.9, 1.2],
    parts: () => [{ geo: new THREE.SphereGeometry(0.16, 14, 10).scale(1, 1.35, 1).translate(0, 0.21, 0), mat: lambert(0xffffff), color: pick([0xe05a8a, 0x5ae0b0, 0xffb03a, 0x8a6aff]) }],
  },
  vent: {
    scale: [0.8, 1.2],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.12, 0.28, 0.3, 14, 1, true).translate(0, 0.15, 0), mat: lambert(0x3a3234) },
      { geo: new THREE.CircleGeometry(0.12, 24).rotateX(-Math.PI / 2).translate(0, 0.28, 0), mat: unlit(0xffa03a) },
    ],
  },
  gumdrop: {
    scale: [0.7, 1.3],
    parts: () => [{ geo: new THREE.SphereGeometry(0.2, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.8).scale(1, 1.3, 1), mat: shiny(0xffffff), color: pick([0xff4a6a, 0x4ad8ff, 0xffd84a, 0x6aff8a, 0xc06aff]) }],
  },
  sprinkle: {
    scale: [0.8, 1.2],
    parts: () => [{ geo: new THREE.CapsuleGeometry(0.02, 0.08, 2, 6).rotateZ(Math.PI / 2).translate(0, 0.02, 0), mat: unlit(0xffffff), color: pick([0xff4a6a, 0x4ad8ff, 0xffd84a, 0x6aff8a, 0xffffff]) }],
  },
  lollipop: {
    scale: [0.9, 1.5],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.025, 0.025, 0.8, 6).translate(0, 0.4, 0), mat: lambert(0xffffff) },
      { geo: merge(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16).rotateX(Math.PI / 2).translate(0, 0.95, 0)), mat: lambert(0xffffff), color: pick([0xff4a8a, 0x6ad8ff, 0xffd04a, 0x9a6aff]) },
      { geo: new THREE.TorusGeometry(0.17, 0.035, 6, 16).translate(0, 0.95, 0.045), mat: lambert(0xffffff) },
    ],
  },
  cupcake: {
    scale: [0.9, 1.2],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.2, 0.15, 0.2, 14).translate(0, 0.1, 0), mat: lambert(0xffffff), color: pick([0xd89a5a, 0x7a4a2a]) },
      { geo: merge(new THREE.SphereGeometry(0.21, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.2, 0), new THREE.SphereGeometry(0.12, 14, 10).translate(0, 0.33, 0)), mat: lambert(0xffffff), color: pick([0xffb8d8, 0xfff0f8, 0xb8e8ff]) },
      { geo: new THREE.SphereGeometry(0.06, 10, 8).translate(0, 0.46, 0), mat: lambert(0xe82a3a) },
    ],
  },
  candyCane: {
    scale: [0.9, 1.4],
    parts: () => [
      { geo: merge(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 10).translate(0, 0.4, 0), new THREE.TorusGeometry(0.14, 0.05, 10, 28, Math.PI).translate(0.14, 0.8, 0)), mat: lambert(0xffffff) },
      { geo: merge(...[0, 1, 2, 3, 4].map((i) => new THREE.TorusGeometry(0.055, 0.018, 6, 16).rotateX(Math.PI / 2).translate(0, 0.1 + i * 0.15, 0))), mat: lambert(0xe82a3a) },
    ],
  },
  donut: {
    scale: [0.8, 1.2],
    parts: () => [
      { geo: new THREE.TorusGeometry(0.16, 0.08, 10, 28).rotateX(Math.PI / 2).translate(0, 0.08, 0), mat: lambert(0xd8a060) },
      { geo: new THREE.TorusGeometry(0.16, 0.06, 10, 28, Math.PI * 2).rotateX(Math.PI / 2).translate(0, 0.12, 0), mat: lambert(0xffffff), color: pick([0xff8ac8, 0x7a4a2a, 0xfff0f8, 0x8ad8ff]) },
    ],
  },
  leafPile: {
    scale: [0.7, 1.2],
    parts: () => [{ geo: new THREE.SphereGeometry(0.3, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1), mat: lambert(0xffffff), color: pick([0xe8702a, 0xd84a2a, 0xf0a030, 0xc8902a]) }],
  },
  maple: {
    scale: [0.9, 1.5],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.07, 0.11, 0.7, 10).translate(0, 0.35, 0), mat: lambert(0x5a3a2a) },
      { geo: merge(new THREE.IcosahedronGeometry(0.45, 2).translate(0, 0.95, 0), new THREE.IcosahedronGeometry(0.3, 2).translate(-0.25, 1.2, 0.05), new THREE.IcosahedronGeometry(0.28, 2).translate(0.28, 0.8, -0.1)), mat: lambert(0xffffff), color: pick([0xe8502a, 0xf08a2a, 0xe8a830, 0xd83a3a]) },
    ],
  },
  pumpkin: {
    scale: [0.7, 1.3],
    parts: () => [
      { geo: radial(6, (a) => new THREE.SphereGeometry(0.13, 14, 10).scale(0.7, 1, 1).translate(0.09, 0.15, 0).rotateY(a)), mat: lambert(0xffffff), color: pick([0xff8a1a, 0xf07a1a, 0xffa030]) },
      { geo: new THREE.CylinderGeometry(0.025, 0.035, 0.1, 6).translate(0, 0.3, 0), mat: lambert(0x4a6a2a) },
    ],
  },
  // ---------------------------------------------------------------- city galaxy
  // Abandoned, the withered stand-ins are grey silhouettes with dark windows; restored,
  // facades get their pastel paint back and windows, lamps and neon light up (unlit = glows).

  // Plaza Park
  parkTree: {
    scale: [0.9, 1.2],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.05, 0.07, 0.75, 8).translate(0, 0.375, 0), mat: lambert(0x7a5a46) },
      { geo: new THREE.IcosahedronGeometry(0.42, 2).scale(1, 0.92, 1).translate(0, 1.04, 0), mat: lambert(0xffffff), color: fromGround(0.75, 1.0) },
      { geo: new THREE.TorusGeometry(0.15, 0.018, 4, 14).rotateX(Math.PI / 2).translate(0, 0.1, 0), mat: lambert(0x4a4458) },
    ],
  },
  bench: {
    scale: [0.9, 1.1],
    parts: () => [
      {
        geo: merge(box(0.56, 0.03, 0.08, 0, 0.2, 0.05), box(0.56, 0.03, 0.08, 0, 0.2, -0.05), box(0.56, 0.07, 0.025, 0, 0.32, -0.11, -0.2), box(0.56, 0.05, 0.025, 0, 0.42, -0.13, -0.2)),
        mat: lambert(0xffffff), color: pick([0xd09a62, 0xb98250, 0x8fd0c0, 0xff9f8a]),
      },
      { geo: merge(...[-0.24, 0.24].flatMap((x) => [box(0.03, 0.19, 0.2, x, 0.095, 0), box(0.03, 0.26, 0.03, x, 0.31, -0.12, -0.2)])), mat: lambert(0x3d3a4a) },
    ],
  },
  lampPost: {
    scale: [0.9, 1.15],
    parts: () => [
      { geo: merge(new THREE.CylinderGeometry(0.022, 0.03, 1.15, 8).translate(0, 0.575, 0), new THREE.CylinderGeometry(0.07, 0.08, 0.08, 10).translate(0, 0.04, 0), new THREE.ConeGeometry(0.1, 0.08, 10).translate(0, 1.3, 0)), mat: lambert(0x3d3a4a) },
      { geo: new THREE.IcosahedronGeometry(0.085, 1).scale(1, 1.15, 1).translate(0, 1.2, 0), mat: unlit(0xfff0b8) },
    ],
  },
  fountain: {
    scale: [0.9, 1.1],
    parts: () => [
      {
        geo: merge(
          lathe([[0, 0.06], [0.7, 0.06], [0.72, 0], [0.82, 0], [0.84, 0.22], [0.74, 0.24]], 24),
          new THREE.CylinderGeometry(0.07, 0.11, 0.62, 10).translate(0, 0.31, 0),
          lathe([[0, 0.56], [0.08, 0.56], [0.3, 0.64], [0.32, 0.7], [0.27, 0.71]], 18),
        ),
        mat: lambert(0xffffff), color: pick([0xe8e0f0, 0xf2e6da, 0xdfe8ee]),
      },
      {
        geo: merge(
          new THREE.CylinderGeometry(0.73, 0.73, 0.03, 24).translate(0, 0.17, 0),
          new THREE.CylinderGeometry(0.26, 0.26, 0.03, 16).translate(0, 0.68, 0),
          new THREE.ConeGeometry(0.07, 0.3, 8).translate(0, 0.84, 0),
          new THREE.IcosahedronGeometry(0.06, 1).translate(0, 1.0, 0),
        ),
        mat: shiny(0x9fdcff, { emissive: new THREE.Color(0x3a7aa0), emissiveIntensity: 0.25 }),
      },
    ],
  },
  planter: {
    scale: [0.9, 1.2],
    parts: () => [
      { geo: box(0.5, 0.18, 0.26, 0, 0.09, 0), mat: lambert(0xffffff), color: pick([0xe6dccf, 0xd8d0e8, 0xf0d8cc]) },
      { geo: box(0.44, 0.06, 0.2, 0, 0.2, 0), mat: lambert(0xffffff), color: fromGround(0.7, 0.9) },
      { geo: merge(...[-0.15, -0.05, 0.05, 0.15].map((x, i) => new THREE.IcosahedronGeometry(0.055, 0).translate(x, 0.27, i % 2 ? 0.04 : -0.04))), mat: lambert(0xffffff), color: pick([0xff8fb8, 0xffd34d, 0xc9a8ff, 0xff9a5a, 0xffffff]) },
    ],
  },
  hotdogCart: {
    scale: [0.9, 1.1],
    parts: () => {
      const [a, b] = stripes(8, (t0, tl) => new THREE.ConeGeometry(0.42, 0.18, 2, 1, false, t0, tl).translate(0, 0.86, 0));
      return [
        { geo: merge(box(0.44, 0.24, 0.24, 0, 0.26, 0), box(0.48, 0.03, 0.28, 0, 0.395, 0)), mat: lambert(0xffffff), color: pick([0xff9f9f, 0x8fd0ff, 0xffe08a, 0xb8f0c8]) },
        { geo: merge(...[-0.14, 0.14].map((x) => new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12).rotateX(Math.PI / 2).translate(x, 0.08, 0.13)), new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6).translate(0, 0.62, 0)), mat: lambert(0x3d3a4a) },
        { geo: a, mat: lambert(0xfff8f0) },
        { geo: b, mat: lambert(0xffffff), color: pick([0xff6f8f, 0xffb84a, 0x6fb8ff]) },
      ];
    },
  },
  hedge: {
    scale: [0.9, 1.2],
    parts: () => [{ geo: rbox(0.62, 0.34, 0.26, 0.08, 0, 0.17, 0, 2), mat: lambert(0xffffff), color: fromGround(0.65, 0.85) }],
  },

  // Neon Downtown
  tower: {
    scale: [0.85, 1.2],
    parts: () => {
      const lit = [], dark = [];
      // a deterministic sprinkle of dark panes so the lit grid doesn't look like graph paper
      for (let f = 0; f < 4; f++) for (let row = 0; row < 9; row++) for (let col = 0; col < 3; col++) {
        const pane = new THREE.PlaneGeometry(0.14, 0.16).translate((col - 1) * 0.2, 0.32 + row * 0.27, 0.356).rotateY((f * Math.PI) / 2);
        ((row * 7 + col * 3 + f * 5) % 6 === 0 ? dark : lit).push(pane);
      }
      return [
        { geo: merge(box(0.7, 2.6, 0.7, 0, 1.3, 0), box(0.78, 0.08, 0.78, 0, 2.62, 0)), mat: lambert(0xffffff), color: pick([0xf6c7d8, 0xc9d6ff, 0xd2efe2, 0xffe2c0, 0xe2d4ff]) },
        { geo: merge(...lit), mat: unlit(0xffffff), color: pick([0xfff2b0, 0xffe0f0, 0xd2f2ff]) },
        { geo: merge(...dark), mat: lambert(0x6a6a8a) },
        { geo: merge(box(0.32, 0.22, 0.32, 0.1, 2.77, -0.08), new THREE.CylinderGeometry(0.012, 0.012, 0.45, 5).translate(-0.18, 2.88, 0.15)), mat: lambert(0x8a84a0) },
        { geo: new THREE.IcosahedronGeometry(0.03, 0).translate(-0.18, 3.11, 0.15), mat: unlit(0xff7a9a) },
      ];
    },
  },
  shopFront: {
    scale: [0.9, 1.1],
    parts: () => {
      const a = [], b = [];
      for (let i = 0; i < 6; i++) (i % 2 ? b : a).push(box(0.135, 0.02, 0.26, -0.3375 + i * 0.135, 0.52, 0.36, 0.35));
      return [
        { geo: merge(box(0.82, 0.86, 0.5, 0, 0.43, 0), box(0.86, 0.05, 0.54, 0, 0.885, 0)), mat: lambert(0xffffff), color: pick([0xffd6c4, 0xd6e4ff, 0xe8d8ff, 0xd2f2e0, 0xfff0c4]) },
        { geo: merge(new THREE.PlaneGeometry(0.46, 0.26).translate(-0.1, 0.22, 0.252), new THREE.PlaneGeometry(0.16, 0.16).translate(-0.2, 0.7, 0.252), new THREE.PlaneGeometry(0.16, 0.16).translate(0.2, 0.7, 0.252)), mat: unlit(0xfff0c8) },
        { geo: box(0.14, 0.32, 0.02, 0.27, 0.16, 0.255), mat: lambert(0x6a5a7a) },
        { geo: merge(...a), mat: lambert(0xfff8f0) },
        { geo: merge(...b), mat: lambert(0xffffff), color: pick([0xff6f8f, 0x5fc8a8, 0x6f9fff, 0xffa84a]) },
      ];
    },
  },
  trafficLight: {
    scale: [0.9, 1.1],
    parts: () => [
      { geo: merge(new THREE.CylinderGeometry(0.02, 0.025, 0.9, 8).translate(0, 0.45, 0), box(0.1, 0.28, 0.08, 0, 1.0, 0)), mat: lambert(0x3d3a4a) },
      { geo: new THREE.IcosahedronGeometry(0.03, 1).translate(0, 1.09, 0.04), mat: unlit(0xff5a6a) },
      { geo: new THREE.IcosahedronGeometry(0.03, 1).translate(0, 1.0, 0.04), mat: unlit(0xffc04a) },
      { geo: new THREE.IcosahedronGeometry(0.03, 1).translate(0, 0.91, 0.04), mat: unlit(0x5aff9a) },
    ],
  },
  billboard: {
    scale: [0.9, 1.15],
    parts: () => [
      { geo: merge(...[-0.3, 0.3].map((x) => new THREE.CylinderGeometry(0.025, 0.03, 0.9, 6).translate(x, 0.45, 0)), box(0.96, 0.5, 0.05, 0, 1.12, 0)), mat: lambert(0x4a4458) },
      { geo: merge(new THREE.PlaneGeometry(0.88, 0.42).translate(0, 1.12, 0.027), new THREE.PlaneGeometry(0.88, 0.42).rotateY(Math.PI).translate(0, 1.12, -0.027)), mat: unlit(0xffffff), color: pick([0xffb8dc, 0xb8e4ff, 0xffe6a0, 0xc8f0d8, 0xd8c4ff]) },
      { geo: merge(new THREE.CircleGeometry(0.11, 12).translate(-0.24, 1.14, 0.03), box(0.36, 0.05, 0.005, 0.12, 1.2, 0.03), box(0.28, 0.05, 0.005, 0.08, 1.07, 0.03)), mat: lambert(0xfdf8ff) },
    ],
  },
  neonSign: {
    scale: [0.9, 1.2],
    parts: () => {
      const pts = [];
      for (let i = 0; i < 24; i++) {
        const t = (i / 24) * Math.PI * 2;
        pts.push(new THREE.Vector3(16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t), 0).multiplyScalar(0.012));
      }
      const heart = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 40, 0.022, 5, true).translate(0, 0.62, 0);
      return [
        { geo: merge(new THREE.CylinderGeometry(0.018, 0.022, 0.46, 6).translate(0, 0.23, 0), new THREE.CylinderGeometry(0.08, 0.09, 0.04, 8).translate(0, 0.02, 0)), mat: lambert(0x3d3a4a) },
        { geo: heart, mat: unlit(0xffffff), color: pick([0xff7ad1, 0x7ae8ff, 0xc89aff, 0xffe07a, 0x7affc0]) },
      ];
    },
  },
  hydrant: {
    scale: [0.9, 1.2],
    parts: () => [{
      geo: merge(
        new THREE.CylinderGeometry(0.07, 0.08, 0.22, 10).translate(0, 0.11, 0),
        new THREE.SphereGeometry(0.075, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.22, 0),
        new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6).rotateZ(Math.PI / 2).translate(0, 0.14, 0),
        new THREE.CylinderGeometry(0.1, 0.1, 0.03, 10).translate(0, 0.015, 0),
      ),
      mat: lambert(0xffffff), color: pick([0xff6a6a, 0xffc04a, 0xff8a5a]),
    }],
  },
  car: {
    scale: [0.9, 1.1],
    parts: () => [
      { geo: merge(rbox(0.62, 0.18, 0.32, 0.06, 0, 0.15, 0), rbox(0.36, 0.05, 0.3, 0.02, -0.03, 0.385, 0)), mat: lambert(0xffffff), color: pick([0xff9f9f, 0x8fc8ff, 0xffe08a, 0xb8f0c8, 0xd8b8ff]) },
      { geo: rbox(0.34, 0.13, 0.28, 0.04, -0.03, 0.3, 0), mat: shiny(0xbfe8ff) },
      { geo: merge(...[[-0.19, 0.15], [0.19, 0.15], [-0.19, -0.15], [0.19, -0.15]].map(([x, z]) => new THREE.CylinderGeometry(0.07, 0.07, 0.05, 10).rotateX(Math.PI / 2).translate(x, 0.07, z))), mat: lambert(0x3d3a4a) },
      { geo: merge(new THREE.IcosahedronGeometry(0.028, 0).translate(0.31, 0.17, 0.1), new THREE.IcosahedronGeometry(0.028, 0).translate(0.31, 0.17, -0.1)), mat: unlit(0xfff4c0) },
    ],
  },

  // Sleepy Suburbs
  house: {
    scale: [0.9, 1.15],
    parts: () => {
      const tri = new THREE.Shape([new THREE.Vector2(-0.48, 0), new THREE.Vector2(0.48, 0), new THREE.Vector2(0, 0.4)]);
      const roof = new THREE.ExtrudeGeometry(tri, { depth: 0.7, bevelEnabled: false }).translate(0, 0.55, -0.35);
      return [
        { geo: box(0.8, 0.55, 0.6, 0, 0.275, 0), mat: lambert(0xffffff), color: pick([0xfff0d8, 0xd8ecff, 0xffe0e8, 0xe4f6dc, 0xf0e4ff]) },
        { geo: merge(roof, box(0.1, 0.22, 0.1, 0.22, 0.85, -0.1)), mat: lambert(0xffffff), color: pick([0xe07a7a, 0x7a9ae0, 0x9a7aaa, 0xe0a05a, 0x6ab8a0]) },
        { geo: merge(new THREE.PlaneGeometry(0.14, 0.14).translate(-0.22, 0.32, 0.302), new THREE.PlaneGeometry(0.14, 0.14).translate(0.22, 0.32, 0.302), new THREE.PlaneGeometry(0.14, 0.14).rotateY(Math.PI / 2).translate(0.402, 0.32, 0)), mat: unlit(0xfff0c0) },
        { geo: box(0.13, 0.26, 0.02, 0, 0.13, 0.305), mat: lambert(0x8a5a4a) },
      ];
    },
  },
  fence: {
    scale: [0.9, 1.1],
    parts: () => [{
      geo: merge(
        ...[-0.25, -0.15, -0.05, 0.05, 0.15, 0.25].flatMap((x) => [box(0.05, 0.24, 0.02, x, 0.12, 0), new THREE.ConeGeometry(0.036, 0.06, 4).rotateY(Math.PI / 4).translate(x, 0.27, 0)]),
        box(0.62, 0.035, 0.015, 0, 0.08, -0.016), box(0.62, 0.035, 0.015, 0, 0.19, -0.016),
      ),
      mat: lambert(0xfffaf2),
    }],
  },
  mailbox: {
    scale: [0.9, 1.2],
    parts: () => [
      { geo: box(0.04, 0.34, 0.04, 0, 0.17, 0), mat: lambert(0x8a6a52) },
      { geo: rbox(0.14, 0.13, 0.26, 0.05, 0, 0.4, 0), mat: lambert(0xffffff), color: pick([0x7a9ae0, 0xe07a7a, 0xf4f0f8, 0x7ac09a, 0xffc04a]) },
      { geo: merge(box(0.012, 0.12, 0.012, 0.075, 0.46, -0.06), box(0.012, 0.05, 0.07, 0.075, 0.5, -0.03)), mat: lambert(0xff5a5a) },
    ],
  },
  paddlingPool: {
    scale: [0.9, 1.2],
    parts: () => [
      { geo: new THREE.TorusGeometry(0.28, 0.07, 6, 20).rotateX(Math.PI / 2).translate(0, 0.07, 0), mat: shiny(0xffffff), color: pick([0x8fd0ff, 0xffa0c8, 0xffe07a, 0xa8f0c8]) },
      { geo: new THREE.CylinderGeometry(0.27, 0.27, 0.02, 18).translate(0, 0.085, 0), mat: shiny(0x7fd8ff, { emissive: new THREE.Color(0x2a6a9a), emissiveIntensity: 0.25 }) },
    ],
  },

  // Funfair Pier
  ferrisWheel: {
    scale: [0.9, 1.1],
    parts: () => {
      const hubY = 1.35, R = 0.95;
      const rims = [], spokes = [], gondA = [], gondB = [], bulbs = [];
      for (const z of [-0.1, 0.1]) {
        rims.push(new THREE.TorusGeometry(R, 0.022, 4, 32).translate(0, hubY, z));
        for (let i = 0; i < 8; i++) spokes.push(box(0.018, R, 0.018, 0, R / 2, 0).rotateZ((i / 8) * Math.PI * 2).translate(0, hubY, z));
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        const x = Math.cos(a) * R, y = hubY + Math.sin(a) * R;
        (i % 2 ? gondB : gondA).push(box(0.15, 0.13, 0.15, x, y - 0.11, 0));
      }
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        bulbs.push(new THREE.IcosahedronGeometry(0.028, 0).translate(Math.cos(a) * R, hubY + Math.sin(a) * R, 0.13));
      }
      // A-frame legs on both sides, meeting at the hub
      // leaning in from x = ±0.52 at the ground so the tops meet at the hub
      const legs = [-1, 1].flatMap((s) => [-0.16, 0.16].map((z) => box(0.04, 1.42, 0.04, 0, 0.71, 0).rotateZ(s * 0.375).translate(s * 0.52, 0.02, z)));
      return [
        { geo: merge(...rims, ...spokes, ...legs, new THREE.CylinderGeometry(0.06, 0.06, 0.34, 10).rotateX(Math.PI / 2).translate(0, hubY, 0)), mat: lambert(0xffffff), color: pick([0xffb8d8, 0xa8d4ff, 0xc8b4ff, 0xfff0f8]) },
        { geo: merge(...gondA), mat: lambert(0xffffff), color: pick([0xff8fb8, 0x8fd0ff, 0xffd34d]) },
        { geo: merge(...gondB), mat: lambert(0xffffff), color: pick([0xb8f0c8, 0xc9a8ff, 0xffa86a]) },
        { geo: merge(...bulbs), mat: unlit(0xfff0b8) },
      ];
    },
  },
  carousel: {
    scale: [0.9, 1.1],
    parts: () => {
      const [a, b] = stripes(12, (t0, tl) => new THREE.ConeGeometry(0.72, 0.38, 2, 1, false, t0, tl).translate(0, 1.07, 0));
      const poles = [], horses = [], bulbs = [];
      for (let i = 0; i < 6; i++) {
        const t = (i / 6) * Math.PI * 2, x = Math.cos(t) * 0.48, z = Math.sin(t) * 0.48;
        poles.push(new THREE.CylinderGeometry(0.012, 0.012, 0.78, 5).translate(x, 0.5, z));
        const y = 0.38 + (i % 2) * 0.12;
        horses.push(new THREE.SphereGeometry(0.1, 8, 5).scale(1.5, 0.8, 0.7).rotateY(-t + Math.PI / 2).translate(x, y, z));
        horses.push(new THREE.SphereGeometry(0.06, 6, 4).translate(x + Math.cos(t + Math.PI / 2) * 0.13, y + 0.09, z + Math.sin(t + Math.PI / 2) * 0.13));
      }
      for (let i = 0; i < 12; i++) {
        const t = (i / 12) * Math.PI * 2;
        bulbs.push(new THREE.IcosahedronGeometry(0.03, 0).translate(Math.cos(t) * 0.72, 0.88, Math.sin(t) * 0.72));
      }
      return [
        { geo: merge(new THREE.CylinderGeometry(0.66, 0.68, 0.12, 20).translate(0, 0.06, 0), new THREE.CylinderGeometry(0.72, 0.72, 0.05, 20).translate(0, 0.88, 0)), mat: lambert(0xffffff), color: pick([0xffd0e4, 0xd0e8ff, 0xfff0c0]) },
        { geo: merge(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 10).translate(0, 0.5, 0), ...poles), mat: shiny(0xf0c860) },
        { geo: merge(...horses), mat: lambert(0xfff8f0) },
        { geo: a, mat: lambert(0xfff8f0) },
        { geo: b, mat: lambert(0xffffff), color: pick([0xff6f8f, 0x6fb8ff, 0xb07aff, 0x5fc8a8]) },
        { geo: merge(...bulbs, new THREE.IcosahedronGeometry(0.05, 1).translate(0, 1.3, 0)), mat: unlit(0xfff0b8) },
      ];
    },
  },
  stall: {
    scale: [0.9, 1.1],
    parts: () => {
      const a = [], b = [];
      for (let i = 0; i < 6; i++) (i % 2 ? b : a).push(box(0.12, 0.02, 0.4, -0.3 + i * 0.12, 0.8, 0.05, 0.3));
      return [
        { geo: box(0.62, 0.36, 0.34, 0, 0.18, 0), mat: lambert(0xffffff), color: pick([0xfff0d0, 0xd8ecff, 0xffe0ec]) },
        { geo: merge(...[[-0.28, -0.14], [0.28, -0.14], [-0.28, 0.16], [0.28, 0.16]].map(([x, z]) => new THREE.CylinderGeometry(0.015, 0.015, 0.8, 5).translate(x, 0.4, z))), mat: lambert(0xfff8f0) },
        { geo: merge(...a), mat: lambert(0xfff8f0) },
        { geo: merge(...b), mat: lambert(0xffffff), color: pick([0xff6f8f, 0xffa84a, 0x6fb8ff, 0x5fc8a8]) },
        { geo: merge(new THREE.IcosahedronGeometry(0.07, 1).translate(-0.15, 0.43, 0.05), new THREE.IcosahedronGeometry(0.07, 1).translate(0.12, 0.43, 0.02)), mat: lambert(0xffffff), color: pick([0xffb8dc, 0xc8e8ff, 0xfff0a0]) },
      ];
    },
  },
  bunting: {
    scale: [0.9, 1.15],
    parts: () => {
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.5, 0.78, 0), new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(0.5, 0.78, 0));
      const flags = [[], [], []];
      for (let i = 0; i < 9; i++) {
        const p = curve.getPoint((i + 0.5) / 9);
        flags[i % 3].push(new THREE.ConeGeometry(0.045, 0.11, 3).rotateX(Math.PI).translate(p.x, p.y - 0.06, p.z));
      }
      return [
        { geo: merge(...[-0.5, 0.5].map((x) => new THREE.CylinderGeometry(0.018, 0.022, 0.84, 6).translate(x, 0.42, 0)), new THREE.TubeGeometry(curve, 12, 0.006, 3)), mat: lambert(0xd8c8e8) },
        { geo: merge(...flags[0]), mat: lambert(0xffffff), color: pick([0xff7a9a, 0xff9a5a]) },
        { geo: merge(...flags[1]), mat: lambert(0xffffff), color: pick([0xffe07a, 0xb8f07a]) },
        { geo: merge(...flags[2]), mat: lambert(0xffffff), color: pick([0x7ac8ff, 0xc89aff]) },
      ];
    },
  },
  balloons: {
    scale: [0.85, 1.15],
    parts: () => {
      const tops = [[-0.14, 0.92, 0.02], [0.12, 1.0, -0.05], [0.02, 1.1, 0.08], [0.18, 0.84, 0.1]];
      const strings = tops.map(([x, y, z]) => {
        const from = new THREE.Vector3(0, 0.05, 0), to = new THREE.Vector3(x, y - 0.13, z);
        const len = from.distanceTo(to);
        const g = new THREE.CylinderGeometry(0.004, 0.004, len, 3).translate(0, len / 2, 0);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize()));
        return g.translate(0, 0.05, 0);
      });
      const ball = ([x, y, z]) => new THREE.SphereGeometry(0.12, 10, 8).scale(1, 1.18, 1).translate(x, y, z);
      return [
        { geo: merge(...strings, new THREE.CylinderGeometry(0.04, 0.05, 0.06, 6).translate(0, 0.03, 0)), mat: lambert(0xeee6f6) },
        { geo: merge(ball(tops[0]), ball(tops[2])), mat: shiny(0xffffff), color: pick([0xff7a9a, 0xffe07a, 0x7ac8ff]) },
        { geo: merge(ball(tops[1]), ball(tops[3])), mat: shiny(0xffffff), color: pick([0xb8f07a, 0xc89aff, 0xffa86a]) },
      ];
    },
  },

  // Dockside Harbour
  crane: {
    scale: [0.9, 1.1],
    parts: () => {
      const legs = [[-0.32, -0.28], [0.32, -0.28], [-0.32, 0.28], [0.32, 0.28]].map(([x, z]) => box(0.07, 1.7, 0.07, x, 0.85, z));
      const braces = [-0.28, 0.28].flatMap((z) => [box(0.04, 0.9, 0.04, 0, 0, 0, 0, 0, 0.62).translate(0, 0.9, z), box(0.04, 0.9, 0.04, 0, 0, 0, 0, 0, -0.62).translate(0, 0.9, z)]);
      return [
        {
          geo: merge(...legs, ...braces, box(0.78, 0.12, 0.7, 0, 1.76, 0), box(0.12, 0.1, 1.9, 0, 2.02, 0.35), box(0.07, 0.5, 0.07, 0, 2.15, -0.1), box(0.07, 0.07, 0.07, 0, 2.42, -0.1)),
          mat: lambert(0xffffff), color: pick([0xffd06a, 0xff9f5a, 0x8fc8ff, 0xff8f8f]),
        },
        { geo: merge(box(0.26, 0.2, 0.24, 0.12, 1.92, -0.1), box(0.3, 0.16, 0.3, 0, 1.98, -0.55)), mat: lambert(0xf4f0f8) },
        { geo: new THREE.PlaneGeometry(0.16, 0.09).translate(0.12, 1.94, 0.021), mat: unlit(0xd2f2ff) },
        { geo: merge(new THREE.CylinderGeometry(0.006, 0.006, 0.7, 3).translate(0, 1.62, 1.1), new THREE.TorusGeometry(0.04, 0.012, 4, 8, Math.PI * 1.4).translate(0, 1.24, 1.1)), mat: lambert(0x3d3a4a) },
      ];
    },
  },
  container: {
    scale: [0.9, 1.1],
    parts: () => {
      const crate = (y, rot) => {
        const ridges = [];
        for (let i = 0; i < 7; i++) for (const z of [-0.155, 0.155]) ridges.push(box(0.02, 0.26, 0.012, -0.3 + i * 0.1, 0.14, z));
        return merge(box(0.72, 0.28, 0.3, 0, 0.14, 0), ...ridges).rotateY(rot).translate(0, y, 0);
      };
      return [
        { geo: crate(0, 0), mat: lambert(0xffffff), color: pick([0xff8f8f, 0x8fc8ff, 0xffd06a, 0x8fe0b0]) },
        { geo: crate(0.29, 0.25), mat: lambert(0xffffff), color: pick([0xc9a8ff, 0xffb06a, 0x7ab8e0, 0xff9fc8]) },
      ];
    },
  },
  tugboat: {
    scale: [0.9, 1.1],
    parts: () => {
      const outline = new THREE.Shape();
      outline.moveTo(-0.3, -0.14);
      outline.lineTo(0.18, -0.14);
      outline.quadraticCurveTo(0.36, -0.1, 0.4, 0);
      outline.quadraticCurveTo(0.36, 0.1, 0.18, 0.14);
      outline.lineTo(-0.3, 0.14);
      outline.quadraticCurveTo(-0.36, 0, -0.3, -0.14);
      const hull = (y0, h) => new THREE.ExtrudeGeometry(outline, { depth: h, bevelEnabled: false, curveSegments: 4 }).rotateX(-Math.PI / 2).translate(0, y0, 0);
      return [
        { geo: hull(-0.02, 0.1), mat: lambert(0xffffff), color: pick([0xff7a7a, 0x5a8ae0, 0x3d3a4a]) },
        { geo: merge(hull(0.08, 0.05), box(0.24, 0.16, 0.18, -0.06, 0.21, 0)), mat: lambert(0xfdf8f2) },
        { geo: merge(new THREE.PlaneGeometry(0.14, 0.06).rotateY(Math.PI / 2).translate(0.061, 0.24, 0), new THREE.PlaneGeometry(0.16, 0.06).translate(-0.06, 0.24, 0.091)), mat: unlit(0xfff0c0) },
        { geo: new THREE.CylinderGeometry(0.04, 0.045, 0.16, 8).translate(-0.17, 0.36, 0), mat: lambert(0xffffff), color: pick([0xffc04a, 0xff7a7a, 0x8fc8ff]) },
      ];
    },
  },
  lighthouse: {
    scale: [0.9, 1.1],
    parts: () => {
      const red = [], white = [];
      for (let i = 0; i < 6; i++) {
        const r0 = 0.3 - (i / 6) * 0.13, r1 = 0.3 - ((i + 1) / 6) * 0.13;
        (i % 2 ? white : red).push(new THREE.CylinderGeometry(r1, r0, 0.3, 12).translate(0, 0.15 + i * 0.3 + 0.12, 0));
      }
      return [
        { geo: new THREE.DodecahedronGeometry(0.4, 0).scale(1, 0.4, 1).translate(0, 0.06, 0), mat: lambert(0xb8b0c4) },
        { geo: merge(...red, new THREE.ConeGeometry(0.2, 0.22, 12).translate(0, 2.36, 0)), mat: lambert(0xffffff), color: pick([0xff7a7a, 0xff7a7a, 0xff8f6a, 0x6a9ae0]) },
        { geo: merge(...white, new THREE.CylinderGeometry(0.24, 0.24, 0.04, 12).translate(0, 2.0, 0)), mat: lambert(0xfdf8f2) },
        { geo: new THREE.CylinderGeometry(0.13, 0.13, 0.22, 10).translate(0, 2.13, 0), mat: unlit(0xfff4c0) },
      ];
    },
  },
  bollard: {
    scale: [0.9, 1.2],
    parts: () => [{ geo: merge(new THREE.CylinderGeometry(0.055, 0.065, 0.16, 8).translate(0, 0.08, 0), new THREE.CylinderGeometry(0.085, 0.07, 0.04, 8).translate(0, 0.18, 0)), mat: lambert(0x4a4458) }],
  },
  buoy: {
    scale: [0.9, 1.2],
    parts: () => [
      { geo: new THREE.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(0, 0.06, 0), mat: lambert(0xffffff), color: pick([0xff7a7a, 0xffc04a]) },
      { geo: merge(new THREE.CylinderGeometry(0.1, 0.13, 0.1, 10).translate(0, 0.11, 0), new THREE.CylinderGeometry(0.01, 0.01, 0.16, 4).translate(0, 0.24, 0)), mat: lambert(0xfdf8f2) },
      { geo: new THREE.IcosahedronGeometry(0.035, 0).translate(0, 0.33, 0), mat: unlit(0xffe08a) },
    ],
  },
};

// kinds too small/plentiful to have a withered stand-in
export const NO_DEAD = new Set(['grass', 'flower', 'snowdrop', 'sprinkle', 'pebble', 'shell', 'seaGrass', 'pathStone', 'plank', 'starfish', 'carrot', 'cabbage']);
