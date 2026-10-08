import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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
};

// kinds too small/plentiful to have a withered stand-in
export const NO_DEAD = new Set(['grass', 'flower', 'snowdrop', 'sprinkle', 'pebble', 'shell', 'seaGrass', 'pathStone', 'plank', 'starfish', 'carrot', 'cabbage']);
