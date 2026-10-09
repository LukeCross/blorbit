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

// a thin rod between two points: ropes, strings, tripod legs
function rod(from, to, r, segs = 4) {
  const len = from.distanceTo(to);
  const g = new THREE.CylinderGeometry(r, r, len, segs).translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize()));
  return g.translate(from.x, from.y, from.z);
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
  // ---------------------------------------------------------------- Skyhaven galaxy
  // Floating sky islands: soft stone, wood and cloud when withered; restored, flags, kites,
  // rainbows and lanterns come back in sunny pastels.

  // Cloud Pastures
  stoneWall: {
    scale: [0.9, 1.15],
    parts: () => {
      const a = [], b = [];
      for (let row = 0; row < 2; row++) for (let i = 0; i < 5; i++) {
        const x = -0.3 + i * 0.15 + (row ? 0.075 : 0);
        if (x > 0.32) continue;
        const g = new THREE.DodecahedronGeometry(0.085, 0).scale(1.15, 0.72, 0.9).rotateY(i * 1.3 + row).translate(x, 0.06 + row * 0.11, i % 2 ? 0.012 : -0.012);
        ((i + row) % 2 ? b : a).push(g);
      }
      return [
        { geo: merge(...a), mat: lambert(0xffffff), color: pick([0xe8e2d8, 0xdcd6d0, 0xeae4f0]) },
        { geo: merge(...b), mat: lambert(0xffffff), color: pick([0xd2cbc4, 0xdcd6e4, 0xe2dacb]) },
      ];
    },
  },
  stile: {
    scale: [0.9, 1.1],
    parts: () => [
      {
        geo: merge(box(0.04, 0.5, 0.04, -0.17, 0.25, 0), box(0.04, 0.5, 0.04, 0.17, 0.25, 0), box(0.42, 0.035, 0.05, 0, 0.44, 0), box(0.42, 0.035, 0.05, 0, 0.32, 0), box(0.32, 0.03, 0.12, 0, 0.17, 0.09), box(0.32, 0.03, 0.12, 0, 0.17, -0.09)),
        mat: lambert(0xffffff), color: pick([0xc89a6a, 0xb8865a, 0xd8aa7a]),
      },
      { geo: merge(box(0.03, 0.17, 0.03, -0.13, 0.085, 0.13), box(0.03, 0.17, 0.03, 0.13, 0.085, 0.13), box(0.03, 0.17, 0.03, -0.13, 0.085, -0.13), box(0.03, 0.17, 0.03, 0.13, 0.085, -0.13)), mat: lambert(0x8a6448) },
    ],
  },
  bluebell: {
    scale: [0.8, 1.3],
    parts: () => {
      const stems = [], bells = [];
      for (let i = 0; i < 3; i++) {
        // each stem arches over, with little bells hanging from the curve
        const a = i * 2.1 + 0.4, dx = Math.cos(a), dz = Math.sin(a);
        const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(dx * 0.02, 0.34, dz * 0.02), new THREE.Vector3(dx * 0.13, 0.27, dz * 0.13));
        stems.push(new THREE.TubeGeometry(curve, 6, 0.007, 3));
        for (let k = 0; k < 2; k++) {
          const p = curve.getPoint(0.65 + k * 0.3);
          const r = 0.028 - k * 0.004;
          bells.push(new THREE.SphereGeometry(r, 6, 3, 0, Math.PI * 2, 0, Math.PI * 0.62).scale(1, 1.25, 1).translate(p.x, p.y - r * 1.2, p.z));
        }
      }
      return [
        { geo: merge(...stems), mat: lambert(0x5aa86a) },
        { geo: merge(...bells), mat: lambert(0xffffff, { side: THREE.DoubleSide }), color: pick([0x8fa8ff, 0xb49aff, 0x9fc0ff, 0xf4f0ff]) },
      ];
    },
  },
  cloudPuff: {
    scale: [0.8, 1.4],
    parts: () => [{
      geo: merge(
        new THREE.IcosahedronGeometry(0.16, 1).translate(0, 0.36, 0),
        new THREE.IcosahedronGeometry(0.12, 1).translate(0.15, 0.32, 0.02),
        new THREE.IcosahedronGeometry(0.11, 1).translate(-0.15, 0.32, -0.02),
        new THREE.IcosahedronGeometry(0.1, 1).translate(0.04, 0.31, 0.11),
      ).scale(1, 0.8, 1),
      mat: lambert(0xffffff), color: pick([0xffffff, 0xfff4fa, 0xf4f0ff, 0xffeef4]),
    }],
  },
  shepherdHut: {
    scale: [0.9, 1.1],
    parts: () => [
      { geo: merge(rbox(0.62, 0.34, 0.36, 0.04, 0, 0.36, 0), box(0.14, 0.03, 0.1, -0.15, 0.08, 0.24), box(0.14, 0.03, 0.1, -0.15, 0.14, 0.21)), mat: lambert(0xffffff), color: pick([0xb8e0c8, 0xffd0d8, 0xc8d8ff, 0xfff0c0]) },
      // curved tin roof: the top half of a cylinder lying along x
      { geo: new THREE.CylinderGeometry(0.21, 0.21, 0.7, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).translate(0, 0.52, 0), mat: lambert(0xffffff), color: pick([0x8a9ab8, 0xb89aa8, 0x9ab8b0]) },
      { geo: merge(...[[-0.2, 0.19], [0.2, 0.19], [-0.2, -0.19], [0.2, -0.19]].map(([x, z]) => new THREE.CylinderGeometry(0.085, 0.085, 0.03, 10).rotateX(Math.PI / 2).translate(x, 0.09, z)), box(0.12, 0.22, 0.012, -0.15, 0.32, 0.184)), mat: lambert(0x4a4458) },
      { geo: new THREE.PlaneGeometry(0.13, 0.1).translate(0.13, 0.42, 0.183), mat: unlit(0xfff0c0) },
    ],
  },

  // Windmill Cliffs
  windmill: {
    scale: [0.9, 1.1],
    parts: () => {
      const blades = [], spars = [];
      for (let i = 0; i < 4; i++) {
        const r = (i * Math.PI) / 2 + Math.PI / 4;
        blades.push(box(0.16, 0.66, 0.02, 0.05, 0.52, 0).rotateZ(r).translate(0, 1.72, 0.36));
        spars.push(box(0.025, 0.86, 0.025, 0, 0.43, 0).rotateZ(r).translate(0, 1.72, 0.37));
      }
      const windows = [0.55, 1.05].map((y) => new THREE.PlaneGeometry(0.1, 0.13).translate(0, y, 0.33 - y * 0.06));
      return [
        { geo: new THREE.CylinderGeometry(0.25, 0.38, 1.7, 14).translate(0, 0.85, 0), mat: lambert(0xffffff), color: pick([0xfff4e2, 0xffe6e6, 0xe6f0ff, 0xf0ffe8]) },
        { geo: merge(new THREE.ConeGeometry(0.33, 0.42, 14).translate(0, 1.91, 0), box(0.14, 0.24, 0.02, 0, 0.12, 0.377)), mat: lambert(0xffffff), color: pick([0xb87a7a, 0x7a9ab8, 0x9ab87a, 0xc89a6a]) },
        { geo: merge(...blades), mat: lambert(0xfdf8f2) },
        { geo: merge(...spars, new THREE.CylinderGeometry(0.06, 0.06, 0.12, 10).rotateX(Math.PI / 2).translate(0, 1.72, 0.33)), mat: lambert(0x8a6448) },
        { geo: merge(...windows), mat: unlit(0xfff0c0) },
      ];
    },
  },
  ropeBridge: {
    scale: [0.9, 1.1],
    parts: () => {
      const sag = (x) => 0.16 - 0.06 * (1 - (x / 0.46) ** 2);
      const planks = [];
      for (let i = 0; i < 8; i++) {
        const x = -0.42 + i * 0.12;
        planks.push(box(0.09, 0.022, 0.26, x, sag(x), 0, 0, 0, (x / 0.46) * 0.25));
      }
      const rails = [-0.14, 0.14].map((z) => new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.48, 0.38, z), new THREE.Vector3(0, 0.2, z), new THREE.Vector3(0.48, 0.38, z)), 10, 0.008, 3));
      return [
        { geo: merge(...planks), mat: lambert(0xffffff), color: pick([0xd8aa7a, 0xc8986a, 0xe0b88a]) },
        { geo: merge(...[-0.48, 0.48].flatMap((x) => [-0.14, 0.14].map((z) => box(0.045, 0.42, 0.045, x, 0.21, z)))), mat: lambert(0x8a6448) },
        { geo: merge(...rails), mat: lambert(0xeadcc0) },
      ];
    },
  },
  kite: {
    scale: [0.9, 1.2],
    parts: () => {
      const top = new THREE.Vector3(0.32, 1.12, 0);
      const tail = new THREE.QuadraticBezierCurve3(top.clone().add(new THREE.Vector3(0, -0.18, 0)), new THREE.Vector3(0.42, 0.75, 0.05), new THREE.Vector3(0.3, 0.55, 0));
      const bows = [0.25, 0.5, 0.75, 1].map((t) => {
        const p = tail.getPoint(t);
        return new THREE.OctahedronGeometry(0.03, 0).scale(1.6, 0.7, 0.4).translate(p.x, p.y, p.z);
      });
      return [
        { geo: merge(rod(new THREE.Vector3(0, 0.08, 0), top.clone().add(new THREE.Vector3(-0.02, -0.12, 0)), 0.004, 3), new THREE.TubeGeometry(tail, 10, 0.004, 3), new THREE.CylinderGeometry(0.012, 0.016, 0.12, 5).translate(0, 0.06, 0)), mat: lambert(0xf4ecf8) },
        { geo: new THREE.OctahedronGeometry(0.17, 0).scale(0.72, 1.1, 0.06).rotateZ(-0.35).translate(top.x, top.y, top.z), mat: lambert(0xffffff), color: pick([0xff8fb8, 0x8fd0ff, 0xffd34d, 0xb8f07a, 0xc9a8ff]) },
        { geo: merge(...bows), mat: lambert(0xffffff), color: pick([0xff7a9a, 0xffa86a, 0x7ac8ff]) },
      ];
    },
  },
  cliffRock: {
    scale: [0.85, 1.25],
    parts: () => [
      {
        geo: merge(
          new THREE.DodecahedronGeometry(0.3, 0).scale(1, 0.75, 0.95).translate(0, 0.2, 0),
          new THREE.DodecahedronGeometry(0.23, 0).scale(1, 0.85, 1).rotateY(0.7).translate(0.04, 0.55, 0.02),
          new THREE.DodecahedronGeometry(0.16, 0).rotateY(1.4).translate(-0.02, 0.84, -0.01),
        ),
        mat: lambert(0xffffff), color: pick([0xcfc6dc, 0xd8d0e0, 0xc6c0d4]),
      },
      { geo: new THREE.IcosahedronGeometry(0.14, 1).scale(1.1, 0.4, 1.1).translate(-0.02, 0.98, -0.01), mat: lambert(0xffffff), color: fromGround(0.85, 1.1) },
    ],
  },

  // Rainbow Falls
  rainbowArch: {
    scale: [0.9, 1.1],
    parts: () => {
      // six pastel bands; plain (not boosted) basic colour so they glow softly without blowing out the bloom
      const bands = [0xffb3c6, 0xffcf9e, 0xfff0a0, 0xb8f0c0, 0xa8d8ff, 0xd0b8ff].map((c, i) => ({
        geo: new THREE.TorusGeometry(0.88 - i * 0.05, 0.026, 5, 20, Math.PI),
        mat: new THREE.MeshBasicMaterial({ color: c }),
      }));
      const puff = (x) => [
        new THREE.IcosahedronGeometry(0.17, 1).translate(x, 0.1, 0),
        new THREE.IcosahedronGeometry(0.12, 1).translate(x + 0.13, 0.07, 0.04),
        new THREE.IcosahedronGeometry(0.12, 1).translate(x - 0.13, 0.07, -0.04),
      ];
      return [...bands, { geo: merge(...puff(-0.76), ...puff(0.76)), mat: lambert(0xffffff), color: pick([0xffffff, 0xfff4fa, 0xf4f0ff]) }];
    },
  },
  prism: {
    scale: [0.8, 1.3],
    parts: () => [
      { geo: new THREE.DodecahedronGeometry(0.14, 0).scale(1.2, 0.5, 1).translate(0, 0.05, 0), mat: lambert(0xd0c8dc) },
      {
        geo: merge(new THREE.OctahedronGeometry(0.1, 0).scale(0.75, 2.1, 0.75).translate(0, 0.28, 0), new THREE.OctahedronGeometry(0.06, 0).scale(0.75, 2, 0.75).rotateZ(0.5).translate(0.09, 0.16, 0.03)),
        mat: unlit(0xffffff), color: pick([0xffc4d8, 0xffe0b0, 0xfff4b8, 0xc8f4d0, 0xc0e0ff, 0xdcc8ff]),
      },
    ],
  },
  waterfallRock: {
    scale: [0.9, 1.15],
    parts: () => [
      {
        geo: merge(
          new THREE.DodecahedronGeometry(0.3, 0).scale(1, 1.6, 0.85).translate(0, 0.46, -0.04),
          new THREE.DodecahedronGeometry(0.2, 0).rotateY(0.6).translate(0.16, 0.86, -0.06),
          new THREE.DodecahedronGeometry(0.14, 0).translate(-0.18, 0.14, 0.14),
        ),
        mat: lambert(0xffffff), color: pick([0xcfc6dc, 0xc8d0d8, 0xd6cede]),
      },
      { geo: merge(rbox(0.15, 0.86, 0.04, 0.018, 0, 0.53, 0.25), new THREE.CylinderGeometry(0.22, 0.24, 0.03, 14).translate(0, 0.015, 0.3)), mat: shiny(0x9fdcff, { transparent: true, opacity: 0.85, emissive: new THREE.Color(0x3a7aa0), emissiveIntensity: 0.2 }) },
      { geo: new THREE.TorusGeometry(0.13, 0.045, 5, 12).rotateX(Math.PI / 2).translate(0, 0.05, 0.27), mat: lambert(0xfafcff) },
    ],
  },
  rainbowFlower: {
    scale: [0.8, 1.3],
    parts: () => {
      const petal = (i) => new THREE.SphereGeometry(0.045, 6, 3).scale(1, 0.35, 1.35).translate(0, 0, 0.065).rotateX(-0.25).rotateY((i / 6) * Math.PI * 2).translate(0, 0.36, 0);
      return [
        { geo: new THREE.CylinderGeometry(0.008, 0.011, 0.36, 5).translate(0, 0.18, 0), mat: lambert(0x5aa86a) },
        { geo: new THREE.IcosahedronGeometry(0.03, 0).translate(0, 0.37, 0), mat: lambert(0xfff0a0) },
        // three colours per flower, each pair of opposite petals one colour
        { geo: merge(petal(0), petal(3)), mat: lambert(0xffffff), color: pick([0xff9fb8, 0xffb08a]) },
        { geo: merge(petal(1), petal(4)), mat: lambert(0xffffff), color: pick([0xfff08a, 0xa8f0b0]) },
        { geo: merge(petal(2), petal(5)), mat: lambert(0xffffff), color: pick([0x9fc8ff, 0xc8a8ff]) },
      ];
    },
  },

  // Balloon Meadow
  hotAirBalloon: {
    scale: [0.9, 1.1],
    parts: () => {
      const profile = [[0.1, 0.95], [0.22, 1.05], [0.38, 1.22], [0.5, 1.42], [0.55, 1.65], [0.52, 1.88], [0.42, 2.05], [0.24, 2.17], [0, 2.22]];
      const gores = [[], []];
      for (let i = 0; i < 8; i++) gores[i % 2].push(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 3, (i / 8) * Math.PI * 2, Math.PI / 4));
      const corners = [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]];
      const ropes = corners.map(([x, z]) => rod(new THREE.Vector3(x, 0.66, z), new THREE.Vector3(x * 0.8, 0.96, z * 0.8), 0.006, 3));
      const tethers = [[-0.45, 0.2], [0.45, -0.2]].map(([x, z]) => rod(new THREE.Vector3(x * 0.25, 0.5, z * 0.25), new THREE.Vector3(x, 0.02, z), 0.005, 3));
      return [
        { geo: merge(...gores[0]), mat: lambert(0xffffff), color: pick([0xff8fb8, 0x8fd0ff, 0xffb06a, 0xb8f07a, 0xc9a8ff]) },
        { geo: merge(...gores[1]), mat: lambert(0xffffff), color: pick([0xfff8f0, 0xfff0a0, 0xf4f0ff]) },
        { geo: merge(rbox(0.26, 0.17, 0.26, 0.03, 0, 0.58, 0), ...[-0.45, 0.45].map((x, i) => new THREE.CylinderGeometry(0.02, 0.025, 0.08, 5).translate(x, 0.04, i ? -0.2 : 0.2))), mat: lambert(0xc89a6a) },
        { geo: merge(...ropes, ...tethers), mat: lambert(0xe8dcc8) },
        { geo: new THREE.IcosahedronGeometry(0.05, 0).translate(0, 0.86, 0), mat: unlit(0xffd08a) },
      ];
    },
  },
  weatherVane: {
    scale: [0.9, 1.15],
    parts: () => [
      {
        geo: merge(
          new THREE.CylinderGeometry(0.018, 0.024, 1.0, 6).translate(0, 0.5, 0),
          box(0.42, 0.016, 0.016, 0, 0.78, 0), box(0.016, 0.016, 0.42, 0, 0.78, 0),
          ...[[0.21, 0], [-0.21, 0], [0, 0.21], [0, -0.21]].map(([x, z]) => new THREE.IcosahedronGeometry(0.025, 0).translate(x, 0.78, z)),
          new THREE.CylinderGeometry(0.05, 0.06, 0.05, 8).translate(0, 0.025, 0),
        ),
        mat: lambert(0x4a4458),
      },
      {
        // arrow with a little rooster perched on it
        geo: merge(
          box(0.46, 0.022, 0.022, 0, 0.98, 0), new THREE.ConeGeometry(0.045, 0.1, 4).rotateZ(-Math.PI / 2).translate(0.27, 0.98, 0), box(0.1, 0.1, 0.012, -0.22, 0.99, 0),
          new THREE.SphereGeometry(0.06, 8, 6).scale(1.2, 1, 0.5).translate(0.02, 1.07, 0), new THREE.SphereGeometry(0.035, 8, 6).translate(0.09, 1.14, 0),
          new THREE.ConeGeometry(0.05, 0.1, 6).rotateZ(0.9).translate(-0.06, 1.12, 0),
        ),
        mat: shiny(0xffffff), color: pick([0xf0c860, 0xe8a070, 0xd8b890]),
      },
    ],
  },
  picnicBlanket: {
    scale: [0.9, 1.15],
    parts: () => {
      const a = [], b = [];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) ((i + j) % 2 ? b : a).push(box(0.13, 0.02, 0.13, -0.195 + i * 0.13, 0.012, -0.195 + j * 0.13));
      return [
        { geo: merge(...a), mat: lambert(0xffffff), color: pick([0xff8f9f, 0x8fc8ff, 0x8fe0b0, 0xffb06a]) },
        { geo: merge(...b), mat: lambert(0xfff8f0) },
        { geo: merge(rbox(0.14, 0.09, 0.1, 0.02, 0.1, 0.07, 0.06), new THREE.TorusGeometry(0.05, 0.008, 4, 10, Math.PI).translate(0.1, 0.115, 0.06)), mat: lambert(0xc89a6a) },
        { geo: merge(new THREE.IcosahedronGeometry(0.03, 0).translate(-0.09, 0.05, -0.05), new THREE.IcosahedronGeometry(0.03, 0).translate(-0.04, 0.05, -0.1)), mat: lambert(0xff6f7f) },
      ];
    },
  },
  windsock: {
    scale: [0.9, 1.15],
    parts: () => {
      const orange = [], white = [];
      for (let i = 0; i < 4; i++) {
        const r0 = 0.075 - i * 0.011, r1 = 0.075 - (i + 1) * 0.011;
        (i % 2 ? white : orange).push(new THREE.CylinderGeometry(r1, r0, 0.11, 8, 1, true).translate(0, 0.055 + i * 0.11, 0).rotateZ(-Math.PI / 2 - 0.28).translate(0.02, 0.86, 0));
      }
      return [
        { geo: merge(new THREE.CylinderGeometry(0.016, 0.022, 0.92, 6).translate(0, 0.46, 0), new THREE.TorusGeometry(0.075, 0.01, 4, 10).rotateY(Math.PI / 2).translate(0.03, 0.86, 0)), mat: lambert(0xd8d0e0) },
        { geo: merge(...orange), mat: lambert(0xffa060, { side: THREE.DoubleSide }) },
        { geo: merge(...white), mat: lambert(0xfff8f0, { side: THREE.DoubleSide }) },
      ];
    },
  },

  // Stargazer's Peak
  telescope: {
    scale: [0.9, 1.15],
    parts: () => {
      const head = new THREE.Vector3(0, 0.5, 0);
      const legs = [0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return rod(head, new THREE.Vector3(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2), 0.012, 4);
      });
      const tube = (r0, r1, len, off) => new THREE.CylinderGeometry(r1, r0, len, 10).translate(0, off, 0).rotateZ(-0.95).translate(0, 0.55, 0);
      return [
        { geo: merge(...legs), mat: lambert(0x8a6448) },
        { geo: merge(tube(0.05, 0.045, 0.42, 0.12), tube(0.035, 0.035, 0.12, -0.14)), mat: shiny(0xffffff), color: pick([0xf0c860, 0xb8c8ff, 0xffb8c8]) },
        { geo: merge(tube(0.058, 0.058, 0.03, 0.33), new THREE.SphereGeometry(0.03, 8, 6).translate(0, 0.53, 0)), mat: lambert(0x4a4458) },
      ];
    },
  },
  observatory: {
    scale: [0.9, 1.1],
    parts: () => {
      const windows = [-0.9, 0, 0.9].map((a) => box(0.1, 0.15, 0.02, 0, 0, 0).rotateY(a).translate(Math.sin(a) * 0.505, 0.68, Math.cos(a) * 0.505));
      return [
        { geo: merge(new THREE.CylinderGeometry(0.5, 0.53, 1.1, 18).translate(0, 0.55, 0), new THREE.CylinderGeometry(0.6, 0.62, 0.08, 18).translate(0, 0.04, 0)), mat: lambert(0xffffff), color: pick([0xe8dcff, 0xfff0e0, 0xdcecff]) },
        { geo: new THREE.SphereGeometry(0.52, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.1, 0), mat: shiny(0xffffff), color: pick([0xf4f0fa, 0xfff0d0, 0xe0e8f8]) },
        // the slit in the dome, the door, and the little telescope poking out
        {
          geo: merge(
            new THREE.TorusGeometry(0.525, 0.06, 3, 8, Math.PI * 0.42).scale(1, 1, 1).rotateY(-Math.PI / 2).translate(0, 1.1, 0),
            box(0.16, 0.3, 0.02, 0, 0.23, 0.52),
            new THREE.CylinderGeometry(0.05, 0.06, 0.42, 10).rotateX(0.85).translate(0, 1.38, 0.42),
          ),
          mat: lambert(0x4a4458),
        },
        { geo: merge(...windows, new THREE.IcosahedronGeometry(0.045, 0).translate(0, 1.66, 0)), mat: unlit(0xfff0c0) },
      ];
    },
  },
  starLantern: {
    scale: [0.9, 1.15],
    parts: () => {
      const star = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const a = Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 0.08 : 0.18;
        star[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      return [
        { geo: merge(new THREE.CylinderGeometry(0.02, 0.026, 0.9, 6).translate(0, 0.45, 0), new THREE.CylinderGeometry(0.06, 0.07, 0.05, 8).translate(0, 0.025, 0), new THREE.TorusGeometry(0.03, 0.008, 4, 8).translate(0, 0.92, 0)), mat: lambert(0x5a5068) },
        { geo: new THREE.ExtrudeGeometry(star, { depth: 0.04, bevelEnabled: false }).translate(0, 0, -0.02).translate(0, 1.1, 0), mat: unlit(0xffffff), color: pick([0xfff0a0, 0xffe0b8, 0xffd0e0, 0xd8e8ff]) },
      ];
    },
  },
  sundial: {
    scale: [0.9, 1.15],
    parts: () => {
      const gnomon = new THREE.Shape();
      gnomon.moveTo(-0.12, 0);
      gnomon.lineTo(0.12, 0);
      gnomon.lineTo(-0.12, 0.13);
      const ticks = [];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ticks.push(box(0.012, 0.01, 0.04, Math.cos(a) * 0.16, 0.465, Math.sin(a) * 0.16, 0, -a + Math.PI / 2, 0));
      }
      return [
        { geo: merge(lathe([[0.16, 0], [0.16, 0.06], [0.09, 0.08], [0.07, 0.36], [0.12, 0.42], [0.2, 0.42], [0.2, 0.46], [0, 0.46]], 12)), mat: lambert(0xffffff), color: pick([0xe8e2d8, 0xdcd6e4, 0xece0d2]) },
        { geo: merge(new THREE.ExtrudeGeometry(gnomon, { depth: 0.012, bevelEnabled: false }).translate(0, 0.46, -0.006), ...ticks), mat: shiny(0xf0c860) },
      ];
    },
  },

  // ---------------------------------------------------------------- Sunroam galaxy
  // Sun-baked savanna, jungle, river, bamboo and outback: warm earth tones and big leaves.

  // Golden Savanna
  acacia: {
    scale: [1.0, 1.5],
    parts: () => [
      { geo: merge(new THREE.CylinderGeometry(0.045, 0.07, 0.6, 8).translate(0, 0.3, 0), rod(new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(-0.2, 0.78, 0), 0.03), rod(new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(0.18, 0.76, 0.04), 0.03)), mat: lambert(0x7a5a3a) },
      { geo: merge(new THREE.SphereGeometry(0.4, 14, 8).scale(1, 0.26, 1).translate(0.02, 0.88, 0), new THREE.SphereGeometry(0.24, 12, 8).scale(1, 0.3, 1).translate(-0.3, 0.8, 0.06), new THREE.SphereGeometry(0.22, 12, 8).scale(1, 0.3, 1).translate(0.3, 0.76, -0.04)), mat: lambert(0xffffff), color: fromGround(0.75, 1.0) },
    ],
  },
  baobab: {
    scale: [1.1, 1.6],
    parts: () => [
      { geo: merge(new THREE.CylinderGeometry(0.2, 0.3, 0.7, 14).translate(0, 0.35, 0), new THREE.CylinderGeometry(0.17, 0.2, 0.28, 14).translate(0, 0.84, 0), ...[0, 1, 2, 3, 4].map((i) => { const a = i * 1.26; return rod(new THREE.Vector3(0, 0.95, 0), new THREE.Vector3(Math.cos(a) * 0.3, 1.25, Math.sin(a) * 0.3), 0.035); })), mat: lambert(0xffffff), color: pick([0xa88a6a, 0x9a7e66, 0xb89a78]) },
      { geo: merge(...[0, 1, 2, 3, 4].map((i) => { const a = i * 1.26; return new THREE.IcosahedronGeometry(0.14, 1).translate(Math.cos(a) * 0.32, 1.3, Math.sin(a) * 0.32); })), mat: lambert(0xffffff), color: fromGround(0.7, 0.95) },
    ],
  },
  termiteMound: {
    scale: [0.8, 1.4],
    parts: () => [{
      geo: lathe([[0.26, 0], [0.22, 0.14], [0.17, 0.3], [0.12, 0.46], [0.06, 0.56], [0.02, 0.6], [0, 0.6]], 10),
      mat: lambert(0xffffff), color: pick([0xc8946a, 0xd8a47a, 0xb8845a]),
    }],
  },
  safariTent: {
    scale: [0.9, 1.1],
    parts: () => {
      const tri = new THREE.Shape([new THREE.Vector2(-0.34, 0), new THREE.Vector2(0.34, 0), new THREE.Vector2(0, 0.44)]);
      return [
        { geo: new THREE.ExtrudeGeometry(tri, { depth: 0.6, bevelEnabled: false }).translate(0, 0, -0.3), mat: lambert(0xffffff), color: pick([0xf0e0b8, 0xe8d0a0, 0xf4e8cc]) },
        { geo: merge(box(0.02, 0.5, 0.02, 0, 0.25, 0.32), box(0.5, 0.02, 0.02, 0, 0.45, 0.32), new THREE.PlaneGeometry(0.18, 0.3).translate(0, 0.16, 0.302)), mat: lambert(0x6a4a34) },
        { geo: merge(new THREE.PlaneGeometry(0.1, 0.1).rotateY(Math.PI / 2).translate(0.172, 0.2, 0), new THREE.PlaneGeometry(0.1, 0.1).rotateY(-Math.PI / 2).translate(-0.172, 0.2, 0)), mat: unlit(0xfff0c0) },
      ];
    },
  },
  jeep: {
    scale: [0.9, 1.1],
    parts: () => [
      { geo: merge(rbox(0.64, 0.17, 0.34, 0.05, 0, 0.17, 0), rbox(0.22, 0.14, 0.3, 0.03, -0.1, 0.31, 0)), mat: lambert(0xffffff), color: pick([0xd8b878, 0xc8a064, 0xe0c48a]) },
      { geo: merge(box(0.025, 0.2, 0.025, -0.2, 0.4, 0.14), box(0.025, 0.2, 0.025, -0.2, 0.4, -0.14), box(0.3, 0.02, 0.32, -0.04, 0.5, 0)), mat: lambert(0x5a4a3a) },
      { geo: merge(...[[-0.2, 0.17], [0.2, 0.17], [-0.2, -0.17], [0.2, -0.17]].map(([x, z]) => new THREE.CylinderGeometry(0.085, 0.085, 0.07, 10).rotateX(Math.PI / 2).translate(x, 0.085, z))), mat: lambert(0x3d3a4a) },
      { geo: merge(new THREE.IcosahedronGeometry(0.03, 0).translate(0.33, 0.2, 0.1), new THREE.IcosahedronGeometry(0.03, 0).translate(0.33, 0.2, -0.1)), mat: unlit(0xfff4c0) },
    ],
  },

  // Parrot Canopy
  bananaTree: {
    scale: [0.9, 1.4],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.06, 0.09, 0.62, 8).translate(0, 0.31, 0), mat: lambert(0x9aae5a) },
      { geo: radial(6, (a) => new THREE.ConeGeometry(0.15, 0.7, 6).scale(1, 1, 0.22).rotateZ(-1.55).translate(0.34, 0.74, 0).rotateY(a)), mat: lambert(0xffffff), color: fromGround(0.8, 1.1) },
      { geo: merge(...[0, 1, 2, 3].map((i) => new THREE.CapsuleGeometry(0.025, 0.12, 2, 6).rotateZ(0.5).translate(0.1 + i * 0.015, 0.54 - i * 0.04, i * 0.03 - 0.04))), mat: lambert(0xffd84a) },
    ],
  },
  bamboo: {
    scale: [0.9, 1.5],
    parts: () => {
      const stalks = [], nodes = [], leaves = [];
      [[0, 0, 1.1], [0.09, 0.05, 0.95], [-0.08, 0.06, 1.25], [0.02, -0.09, 0.8]].forEach(([x, z, h], k) => {
        stalks.push(new THREE.CylinderGeometry(0.03, 0.036, h, 8).translate(x, h / 2, z));
        for (let n = 1; n < 4; n++) nodes.push(new THREE.CylinderGeometry(0.04, 0.04, 0.018, 8).translate(x, (h * n) / 4, z));
        leaves.push(new THREE.ConeGeometry(0.05, 0.22, 4).scale(1, 1, 0.3).rotateZ(1.2 + k * 0.1).translate(x + 0.1, h * 0.9, z).rotateY(k * 1.4));
      });
      return [
        { geo: merge(...stalks), mat: lambert(0xffffff), color: fromGround(0.8, 1.05) },
        { geo: merge(...nodes), mat: lambert(0x6a8a3a) },
        { geo: merge(...leaves), mat: lambert(0x7fc45a) },
      ];
    },
  },

  // Outback
  eucalyptus: {
    scale: [1.0, 1.5],
    parts: () => [
      { geo: merge(new THREE.CylinderGeometry(0.05, 0.08, 0.9, 8).translate(0, 0.45, 0), rod(new THREE.Vector3(0, 0.7, 0), new THREE.Vector3(0.14, 1.0, 0), 0.025)), mat: lambert(0xffffff), color: pick([0xe8dccc, 0xd8c8b4, 0xf0e4d4]) },
      { geo: merge(new THREE.IcosahedronGeometry(0.22, 1).scale(1, 0.8, 1).translate(-0.04, 1.0, 0), new THREE.IcosahedronGeometry(0.17, 1).translate(0.16, 1.08, 0.04), new THREE.IcosahedronGeometry(0.14, 1).translate(-0.18, 0.88, 0.06)), mat: lambert(0xffffff), color: pick([0x8fb89a, 0x9ac4a0, 0x7fa88a]) },
    ],
  },
  mesaRock: {
    scale: [1.0, 1.5],
    parts: () => [{
      geo: merge(new THREE.CylinderGeometry(0.3, 0.42, 0.7, 12).translate(0, 0.35, 0), new THREE.CylinderGeometry(0.34, 0.3, 0.1, 12).translate(0, 0.75, 0), new THREE.CylinderGeometry(0.16, 0.22, 0.3, 10).translate(0.34, 0.15, 0.12)),
      mat: lambert(0xffffff), color: pick([0xd8764a, 0xc8683e, 0xe08a58]),
    }],
  },

  // ---------------------------------------------------------------- Seaglow galaxy
  // The sea floor: drab sand, rock and wreckage when withered; kelp, coral and glow when restored.

  // Kelp Forest
  kelp: {
    scale: [1.0, 1.7],
    parts: () => {
      const blades = [];
      [[0, 0, 1.2], [0.07, 0.04, 0.9], [-0.06, 0.05, 1.05]].forEach(([x, z, h], k) => {
        const curve = new THREE.CatmullRomCurve3([0, 0.33, 0.66, 1].map((t, i) => new THREE.Vector3(x + Math.sin(i * 1.7 + k) * 0.07, h * t, z + Math.cos(i * 1.3 + k) * 0.05)));
        blades.push(new THREE.TubeGeometry(curve, 8, 0.018, 4));
        for (let i = 1; i < 4; i++) {
          const p = curve.getPoint(i / 4);
          blades.push(new THREE.SphereGeometry(0.075, 8, 4).scale(1, 0.18, 0.5).rotateY(i + k).translate(p.x + 0.07, p.y, p.z));
        }
      });
      return [{ geo: merge(...blades), mat: lambert(0xffffff), color: fromGround(0.75, 1.05) }];
    },
  },
  urchin: {
    scale: [0.6, 1.1],
    parts: () => [{
      geo: merge(new THREE.IcosahedronGeometry(0.1, 1).translate(0, 0.1, 0), ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
        const a = i * 0.63, y = (((i * 7) % 10) / 10) * 0.12;
        return rod(new THREE.Vector3(Math.cos(a) * 0.07, 0.1 + y * 0.4, Math.sin(a) * 0.07), new THREE.Vector3(Math.cos(a) * 0.2, 0.12 + y, Math.sin(a) * 0.2), 0.009, 3);
      })),
      mat: lambert(0xffffff), color: pick([0x8a5ac8, 0xd85a9a, 0x5a6ad8]),
    }],
  },

  // Coral Reef
  coralFan: {
    scale: [0.8, 1.4],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.03, 0.045, 0.14, 6).translate(0, 0.07, 0), mat: lambert(0xffffff), color: pick([0xe86a8a, 0xf08a5a, 0xc86ad8]) },
      { geo: new THREE.CircleGeometry(0.26, 14, 0, Math.PI).translate(0, 0.14, 0), mat: lambert(0xffffff, { side: THREE.DoubleSide }), color: pick([0xff7a9a, 0xff9a6a, 0xd87aff, 0xffc86a]) },
    ],
  },
  anemone: {
    scale: [0.8, 1.3],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.07, 0.09, 0.1, 10).translate(0, 0.05, 0), mat: lambert(0xffffff), color: pick([0xe0709a, 0xd88a5a, 0x9a70d8]) },
      { geo: merge(...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = i * 0.785; return new THREE.CapsuleGeometry(0.014, 0.16, 2, 5).rotateZ(Math.cos(i) * 0.3).rotateX(Math.sin(i * 1.7) * 0.3).translate(Math.cos(a) * 0.05, 0.17, Math.sin(a) * 0.05); })), mat: lambert(0xffffff), color: pick([0xffa0c8, 0xffc890, 0xc8a0ff]) },
    ],
  },

  // Sunken Galleon
  shipHull: {
    scale: [1.0, 1.3],
    parts: () => {
      const hull = new THREE.CylinderGeometry(0.42, 0.3, 0.9, 10, 1, true, 0, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.55, 0.7);
      const ribs = [-0.3, -0.1, 0.1, 0.3].map((x) => box(0.025, 0.34, 0.5, x, 0.2, 0, 0, 0, 0));
      return [
        { geo: merge(hull.translate(0, 0.28, 0), ...ribs), mat: lambert(0xffffff, { side: THREE.DoubleSide }), color: pick([0x7a5a42, 0x6a4e3a, 0x8a6a4c]) },
        { geo: merge(box(0.04, 0.5, 0.04, 0.35, 0.55, 0), box(0.04, 0.34, 0.04, -0.25, 0.46, 0.05, 0.3, 0, 0.2)), mat: lambert(0x5a4030) },
      ];
    },
  },
  mast: {
    scale: [0.9, 1.4],
    parts: () => [
      { geo: merge(new THREE.CylinderGeometry(0.03, 0.04, 1.1, 8).translate(0, 0.55, 0), box(0.5, 0.03, 0.03, 0, 0.9, 0), box(0.4, 0.03, 0.03, 0, 0.6, 0)), mat: lambert(0x6a4e3a) },
      { geo: merge(new THREE.PlaneGeometry(0.42, 0.28).translate(0, 0.74, 0.01), new THREE.PlaneGeometry(0.34, 0.2).translate(0.02, 0.45, 0.01)), mat: lambert(0xffffff, { side: THREE.DoubleSide }), color: pick([0xe8e0cc, 0xd8cfb8, 0xeee8d8]) },
    ],
  },
  treasureChest: {
    scale: [0.9, 1.1],
    parts: () => [
      { geo: merge(rbox(0.36, 0.2, 0.24, 0.03, 0, 0.1, 0), new THREE.CylinderGeometry(0.12, 0.12, 0.36, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(0, 0.2, 0)), mat: lambert(0xffffff), color: pick([0x8a5a3a, 0x7a4e32, 0x9a6a44]) },
      { geo: merge(box(0.04, 0.34, 0.26, -0.1, 0.17, 0), box(0.04, 0.34, 0.26, 0.1, 0.17, 0), box(0.05, 0.06, 0.04, 0, 0.18, 0.12)), mat: lambert(0xd8b040) },
      { geo: merge(new THREE.SphereGeometry(0.04, 8, 6).translate(0.05, 0.22, 0.02), new THREE.SphereGeometry(0.035, 8, 6).translate(-0.06, 0.21, -0.03), new THREE.SphereGeometry(0.03, 8, 6).translate(0.0, 0.24, -0.04)), mat: unlit(0xffd860) },
    ],
  },
  anchor: {
    scale: [0.9, 1.2],
    parts: () => [{
      geo: merge(
        new THREE.CylinderGeometry(0.025, 0.025, 0.6, 6).translate(0, 0.3, 0), box(0.28, 0.025, 0.025, 0, 0.5, 0),
        new THREE.TorusGeometry(0.04, 0.012, 5, 10).translate(0, 0.64, 0),
        new THREE.TorusGeometry(0.2, 0.025, 6, 14, Math.PI).rotateZ(Math.PI).translate(0, 0.22, 0),
        new THREE.ConeGeometry(0.05, 0.1, 4).translate(-0.2, 0.24, 0), new THREE.ConeGeometry(0.05, 0.1, 4).translate(0.2, 0.24, 0),
      ),
      mat: lambert(0xffffff), color: pick([0x6a7480, 0x5e6a76, 0x7a8490]),
    }],
  },

  // Jellyglow Gardens
  jellyLamp: {
    scale: [0.8, 1.5],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.012, 0.02, 0.5, 6).translate(0, 0.25, 0), mat: lambert(0x4a6a78) },
      { geo: merge(new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.52, 0), ...[0, 1, 2, 3, 4].map((i) => new THREE.CylinderGeometry(0.006, 0.003, 0.16, 4).translate(Math.cos(i * 1.26) * 0.07, 0.44, Math.sin(i * 1.26) * 0.07))), mat: unlit(0xffffff), color: pick([0xff9ae0, 0x9ab8ff, 0x9affe0, 0xd89aff]) },
    ],
  },
  glowCoral: {
    scale: [0.8, 1.4],
    parts: () => [{
      geo: merge(...[0, 1, 2, 3, 4].map((i) => { const a = i * 1.26, h = 0.2 + (i % 3) * 0.1; return new THREE.CapsuleGeometry(0.03, h, 3, 6).rotateZ(Math.cos(a) * 0.35).rotateX(Math.sin(a) * 0.35).translate(Math.cos(a) * 0.07, h / 2 + 0.05, Math.sin(a) * 0.07); })),
      mat: unlit(0xffffff), color: pick([0x7affd8, 0xff8ad8, 0x8ab8ff, 0xc8ff7a]),
    }],
  },
  moonShell: {
    scale: [0.8, 1.3],
    parts: () => [
      { geo: merge(new THREE.SphereGeometry(0.17, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1).translate(0, 0.02, 0), ...[-0.1, 0, 0.1].map((x) => box(0.015, 0.1, 0.3, x, 0.08, 0, 0, 0, 0))), mat: lambert(0xffffff), color: pick([0xd8c8f0, 0xf0d8e8, 0xc8e0f0]) },
      { geo: new THREE.SphereGeometry(0.05, 10, 8).translate(0, 0.07, 0), mat: unlit(0xffffff) },
    ],
  },

  // Abyssal Vents
  ventChimney: {
    scale: [0.9, 1.5],
    parts: () => [
      { geo: lathe([[0.2, 0], [0.15, 0.2], [0.11, 0.45], [0.09, 0.7], [0.1, 0.78], [0.06, 0.8], [0, 0.78]], 9), mat: lambert(0xffffff), color: pick([0x3e3a44, 0x4a4450, 0x36323c]) },
      { geo: new THREE.CylinderGeometry(0.05, 0.05, 0.03, 8).translate(0, 0.79, 0), mat: unlit(0xff7a3a) },
    ],
  },
  tubeWorm: {
    scale: [0.8, 1.4],
    parts: () => [
      { geo: merge(...[[0, 0, 0.5], [0.07, 0.03, 0.38], [-0.06, 0.04, 0.44], [0.02, -0.07, 0.32]].map(([x, z, h]) => new THREE.CylinderGeometry(0.022, 0.026, h, 6).translate(x, h / 2, z))), mat: lambert(0xf0ece4) },
      { geo: merge(...[[0, 0, 0.5], [0.07, 0.03, 0.38], [-0.06, 0.04, 0.44], [0.02, -0.07, 0.32]].map(([x, z, h]) => new THREE.SphereGeometry(0.036, 8, 6).translate(x, h + 0.01, z))), mat: unlit(0xff5a6a) },
    ],
  },
  barrel: {
    scale: [0.8, 1.1],
    parts: () => [
      { geo: lathe([[0.1, 0], [0.13, 0.1], [0.14, 0.2], [0.13, 0.3], [0.1, 0.4], [0, 0.4]], 10), mat: lambert(0xffffff), color: pick([0x7a5a3e, 0x6a5440, 0x8a6648]) },
      { geo: merge(new THREE.TorusGeometry(0.128, 0.01, 4, 12).rotateX(Math.PI / 2).translate(0, 0.1, 0), new THREE.TorusGeometry(0.128, 0.01, 4, 12).rotateX(Math.PI / 2).translate(0, 0.3, 0)), mat: lambert(0x5a606a) },
    ],
  },

  // ---------------------------------------------------------------- Feastvale galaxy
  // A world of food: withered, dull and cold; restored, warm, golden and steaming.

  // Bakery Village
  breadOven: {
    scale: [0.9, 1.2],
    parts: () => [
      { geo: merge(lathe([[0.3, 0], [0.3, 0.12], [0.26, 0.3], [0.18, 0.43], [0.08, 0.5], [0, 0.52]], 14), rbox(0.2, 0.3, 0.2, 0.03, 0.22, 0.15, 0)), mat: lambert(0xffffff), color: pick([0xd8a888, 0xc8987a, 0xe0b898]) },
      { geo: merge(new THREE.CircleGeometry(0.1, 14, 0, Math.PI).translate(0, 0.08, 0.286), new THREE.CylinderGeometry(0.05, 0.06, 0.28, 8).translate(-0.12, 0.62, -0.05)), mat: lambert(0x3a2e2c) },
      { geo: new THREE.CircleGeometry(0.07, 12, 0, Math.PI).translate(0, 0.08, 0.289), mat: unlit(0xff9a3a) },
    ],
  },
  flourSack: {
    scale: [0.8, 1.2],
    parts: () => [
      { geo: merge(new THREE.SphereGeometry(0.15, 10, 8).scale(1, 1.15, 0.8).translate(0, 0.17, 0), new THREE.CylinderGeometry(0.06, 0.09, 0.08, 8).translate(0, 0.37, 0)), mat: lambert(0xffffff), color: pick([0xf4ead8, 0xeadfc8, 0xf8f0e0]) },
      { geo: new THREE.TorusGeometry(0.065, 0.012, 5, 10).rotateX(Math.PI / 2).translate(0, 0.32, 0), mat: lambert(0xb86a4a) },
    ],
  },

  // Orchard Lane
  fruitTree: {
    scale: [0.9, 1.4],
    parts: () => {
      const pts = [[0.2, 0.9, 0.2], [-0.25, 0.8, 0.1], [0.05, 1.18, -0.18], [-0.12, 0.7, -0.3], [0.32, 0.7, -0.08], [0.0, 0.95, 0.34], [-0.34, 1.0, -0.05]];
      return [
        { geo: new THREE.CylinderGeometry(0.06, 0.1, 0.7, 8).translate(0, 0.35, 0), mat: lambert(0x7a5236) },
        { geo: merge(new THREE.IcosahedronGeometry(0.42, 2).translate(0, 0.95, 0), new THREE.IcosahedronGeometry(0.3, 2).translate(0.22, 1.12, 0.05)), mat: lambert(0xffffff), color: fromGround(0.7, 1.0) },
        { geo: merge(...pts.map(([x, y, z]) => new THREE.SphereGeometry(0.06, 8, 6).translate(x, y, z))), mat: lambert(0xffffff), color: pick([0xe8384a, 0xff9a4a, 0xffb090, 0x9a58c8, 0xffd84a, 0xa8d048]) },
      ];
    },
  },
  grapeArbor: {
    scale: [0.9, 1.2],
    parts: () => [
      { geo: merge(box(0.04, 0.6, 0.04, -0.26, 0.3, 0), box(0.04, 0.6, 0.04, 0.26, 0.3, 0), box(0.6, 0.04, 0.06, 0, 0.62, 0), box(0.5, 0.03, 0.03, 0, 0.3, 0)), mat: lambert(0x8a6a48) },
      { geo: merge(new THREE.SphereGeometry(0.2, 8, 6).scale(1.5, 0.5, 0.8).translate(0, 0.66, 0)), mat: lambert(0xffffff), color: fromGround(0.7, 0.95) },
      { geo: merge(...[-0.18, -0.05, 0.1, 0.2].map((x, i) => merge(...[0, 1, 2, 3].map((k) => new THREE.SphereGeometry(0.04, 7, 5).translate(x + (k % 2) * 0.03, 0.52 - k * 0.05, (k % 2) * 0.03 - 0.01 + i * 0.005))))), mat: lambert(0xffffff), color: pick([0x8a48c8, 0x9ad048, 0xb838a0]) },
    ],
  },
  melon: {
    scale: [0.7, 1.2],
    parts: () => [{
      geo: merge(new THREE.SphereGeometry(0.15, 12, 8).scale(1, 0.85, 1).translate(0, 0.12, 0), new THREE.CylinderGeometry(0.012, 0.012, 0.06, 4).translate(0, 0.27, 0)),
      mat: lambert(0xffffff), color: pick([0x78c050, 0xa8d878, 0xf0a850, 0x58a848]),
    }],
  },

  // Noodle Night Market
  steamerStack: {
    scale: [0.9, 1.2],
    parts: () => [
      { geo: merge(...[0, 1, 2].map((i) => new THREE.CylinderGeometry(0.15, 0.15, 0.1, 14).translate(0, 0.05 + i * 0.1, 0)), new THREE.CylinderGeometry(0.16, 0.12, 0.06, 14).translate(0, 0.33, 0)), mat: lambert(0xffffff), color: pick([0xd8b078, 0xe0be88, 0xc8a068]) },
      { geo: merge(...[0, 1, 2].map((i) => new THREE.TorusGeometry(0.152, 0.008, 4, 14).rotateX(Math.PI / 2).translate(0, 0.1 + i * 0.1, 0))), mat: lambert(0x7a5a3a) },
      { geo: new THREE.SphereGeometry(0.05, 8, 6).scale(1.4, 0.8, 1.4).translate(0, 0.39, 0), mat: unlit(0xffffff), color: pick([0xf4f0e8]) },
    ],
  },
  noodleCart: {
    scale: [0.9, 1.1],
    parts: () => [
      { geo: merge(rbox(0.5, 0.22, 0.28, 0.03, 0, 0.28, 0), box(0.05, 0.2, 0.05, -0.2, 0.1, 0.1), box(0.05, 0.2, 0.05, 0.2, 0.1, 0.1), box(0.05, 0.2, 0.05, -0.2, 0.1, -0.1), box(0.05, 0.2, 0.05, 0.2, 0.1, -0.1)), mat: lambert(0xffffff), color: pick([0xe8584a, 0x4a8ae8, 0xe8b84a, 0x58b878]) },
      { geo: merge(new THREE.CylinderGeometry(0.045, 0.045, 0.45, 6).rotateZ(Math.PI / 2).translate(0, 0.62, 0.12), new THREE.CylinderGeometry(0.045, 0.045, 0.45, 6).rotateZ(Math.PI / 2).translate(0, 0.62, -0.12), new THREE.CylinderGeometry(0.4, 0.4, 0.02, 4, 1).rotateY(Math.PI / 4).scale(0.9, 1, 0.9).translate(0, 0.7, 0)), mat: lambert(0xfff4e0) },
      { geo: merge(...[-0.14, 0, 0.14].map((x) => new THREE.CylinderGeometry(0.05, 0.035, 0.05, 10).translate(x, 0.42, 0.02))), mat: lambert(0xf0f0f8) },
      { geo: merge(...[-0.14, 0, 0.14].map((x) => new THREE.SphereGeometry(0.035, 8, 5).scale(1.2, 0.5, 1.2).translate(x, 0.45, 0.02))), mat: lambert(0xf4d078) },
      { geo: merge(new THREE.SphereGeometry(0.025, 6, 5).translate(-0.19, 0.58, 0.14), new THREE.SphereGeometry(0.025, 6, 5).translate(0.19, 0.58, 0.14)), mat: unlit(0xffd890) },
    ],
  },
  giantBowl: {
    scale: [0.9, 1.3],
    parts: () => [
      { geo: lathe([[0.1, 0], [0.18, 0.05], [0.27, 0.18], [0.3, 0.26], [0.27, 0.27], [0.22, 0.18], [0.12, 0.06], [0, 0.04]], 14), mat: lambert(0xffffff), color: pick([0xf4f0f8, 0xe8584a, 0xf0e0b8]) },
      { geo: new THREE.CylinderGeometry(0.26, 0.26, 0.02, 14).translate(0, 0.21, 0), mat: lambert(0xf4d078) },
      { geo: merge(box(0.02, 0.4, 0.02, 0.1, 0.4, 0.04, 0, 0, 0.4), box(0.02, 0.4, 0.02, 0.15, 0.4, 0.0, 0, 0, 0.5)), mat: lambert(0x7a5a3a) },
      { geo: merge(new THREE.SphereGeometry(0.05, 8, 6).translate(-0.06, 0.24, 0.05), new THREE.CylinderGeometry(0.045, 0.045, 0.02, 10).translate(0.05, 0.23, -0.08)), mat: lambert(0xff8a6a) },
    ],
  },

  // Veggie Valley
  cornStalk: {
    scale: [0.9, 1.5],
    parts: () => [
      { geo: merge(new THREE.CylinderGeometry(0.02, 0.03, 0.9, 6).translate(0, 0.45, 0), ...[0, 1, 2, 3].map((i) => new THREE.ConeGeometry(0.04, 0.4, 3).scale(1, 1, 0.3).rotateZ(0.9 * (i % 2 ? 1 : -1)).translate((i % 2 ? 0.15 : -0.15), 0.4 + i * 0.12, 0).rotateY(i * 1.1))), mat: lambert(0xffffff), color: fromGround(0.8, 1.1) },
      { geo: merge(new THREE.CapsuleGeometry(0.035, 0.18, 3, 8).rotateZ(0.2).translate(0.06, 0.55, 0), new THREE.CapsuleGeometry(0.03, 0.14, 3, 8).rotateZ(-0.2).translate(-0.05, 0.7, 0.02)), mat: lambert(0xffd84a) },
    ],
  },
  tomatoPlant: {
    scale: [0.8, 1.3],
    parts: () => [
      { geo: merge(box(0.015, 0.55, 0.015, 0, 0.275, 0), new THREE.SphereGeometry(0.17, 8, 6).scale(1, 1.2, 1).translate(0, 0.28, 0)), mat: lambert(0xffffff), color: fromGround(0.7, 1.0) },
      { geo: merge(...[[0.1, 0.22, 0.08], [-0.1, 0.34, 0.04], [0.04, 0.42, -0.1], [-0.05, 0.16, -0.1], [0.12, 0.4, -0.02]].map(([x, y, z]) => new THREE.SphereGeometry(0.045, 8, 6).translate(x, y, z))), mat: lambert(0xffffff), color: pick([0xe83a3a, 0xff5a3a, 0xffa83a]) },
    ],
  },
  broccoli: {
    scale: [0.8, 1.3],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.035, 0.05, 0.22, 6).translate(0, 0.11, 0), mat: lambert(0xa8d078) },
      { geo: merge(new THREE.IcosahedronGeometry(0.1, 1).translate(0, 0.3, 0), new THREE.IcosahedronGeometry(0.075, 1).translate(0.1, 0.25, 0.02), new THREE.IcosahedronGeometry(0.075, 1).translate(-0.1, 0.25, -0.02), new THREE.IcosahedronGeometry(0.07, 1).translate(0.02, 0.26, 0.1)), mat: lambert(0xffffff), color: fromGround(0.7, 1.0) },
    ],
  },
  scarecrow: {
    scale: [0.9, 1.2],
    parts: () => [
      { geo: merge(box(0.04, 0.9, 0.04, 0, 0.45, 0), box(0.5, 0.04, 0.04, 0, 0.62, 0)), mat: lambert(0x7a5a3a) },
      { geo: merge(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 8).translate(0, 0.5, 0), box(0.46, 0.1, 0.07, 0, 0.62, 0)), mat: lambert(0xffffff), color: pick([0x5a78c8, 0xc85a5a, 0x5ab878]) },
      { geo: new THREE.SphereGeometry(0.1, 10, 8).translate(0, 0.8, 0), mat: lambert(0xf0d8a0) },
      { geo: merge(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 12).translate(0, 0.88, 0), new THREE.CylinderGeometry(0.08, 0.09, 0.1, 10).translate(0, 0.94, 0)), mat: lambert(0x8a6a3a) },
    ],
  },

  // Spice Bazaar
  spiceSacks: {
    scale: [0.8, 1.2],
    parts: () => [
      { geo: merge(...[[-0.15, 0], [0.12, 0.05], [0, -0.14]].map(([x, z], i) => new THREE.CylinderGeometry(0.1, 0.12, 0.16 + i * 0.02, 10).translate(x, 0.08 + i * 0.01, z))), mat: lambert(0xffffff), color: pick([0xe8d8b0, 0xd8c498, 0xf0e4c4]) },
      { geo: merge(...[[-0.15, 0], [0.12, 0.05], [0, -0.14]].map(([x, z], i) => new THREE.SphereGeometry(0.095, 10, 6).scale(1, 0.4, 1).translate(x, 0.17 + i * 0.015, z))), mat: lambert(0xffffff), color: pick([0xe85a2a, 0xe8b02a, 0xa83a2a, 0x78a83a]) },
    ],
  },
  tagine: {
    scale: [0.8, 1.2],
    parts: () => [
      { geo: lathe([[0.18, 0], [0.2, 0.06], [0.17, 0.1], [0, 0.1]], 12), mat: lambert(0xffffff), color: pick([0xd87a4a, 0xc8683a, 0xe08a58]) },
      { geo: lathe([[0.17, 0.1], [0.12, 0.2], [0.05, 0.3], [0.025, 0.4], [0.04, 0.42], [0, 0.43]], 12), mat: lambert(0xffffff), color: pick([0x4a9ab8, 0xd8a83a, 0xc85a4a]) },
    ],
  },
  // Gloomhollow
  gravestone: {
    scale: [0.8, 1.3],
    parts: () => [
      { geo: merge(rbox(0.22, 0.34, 0.07, 0.025, 0, 0.19, 0), new THREE.CylinderGeometry(0.11, 0.11, 0.07, 12).rotateX(Math.PI / 2).translate(0, 0.34, 0), rbox(0.3, 0.05, 0.14, 0.015, 0, 0.025, 0)), mat: lambert(0xffffff), color: pick([0x9a9aa8, 0x8a8c9a, 0xa8a8b4, 0x7e8090]) },
      { geo: box(0.1, 0.012, 0.075, 0, 0.3, 0.01), mat: lambert(0x5a5c68) },
    ],
  },
  graveCross: {
    scale: [0.8, 1.3],
    parts: () => [
      { geo: merge(rbox(0.07, 0.5, 0.07, 0.015, 0, 0.25, 0), rbox(0.26, 0.07, 0.07, 0.015, 0, 0.36, 0), rbox(0.2, 0.04, 0.16, 0.01, 0, 0.02, 0)), mat: lambert(0xffffff), color: pick([0x9a9aa8, 0x8a8c9a, 0xa8a8b4]) },
    ],
  },
  deadTree: {
    scale: [0.9, 1.6],
    parts: () => [
      { geo: merge(
        new THREE.CylinderGeometry(0.05, 0.1, 0.8, 7).translate(0, 0.4, 0),
        new THREE.CylinderGeometry(0.02, 0.045, 0.45, 5).rotateZ(-0.9).translate(0.17, 0.78, 0),
        new THREE.CylinderGeometry(0.018, 0.04, 0.4, 5).rotateZ(0.8).translate(-0.15, 0.7, 0.03),
        new THREE.CylinderGeometry(0.015, 0.03, 0.3, 5).rotateX(0.8).translate(0.02, 0.95, 0.12),
        new THREE.CylinderGeometry(0.01, 0.02, 0.22, 4).rotateZ(-0.3).translate(0.3, 1.05, 0),
        new THREE.CylinderGeometry(0.01, 0.02, 0.22, 4).rotateZ(0.4).translate(-0.26, 0.95, 0.03),
      ), mat: lambert(0xffffff), color: pick([0x4a3e4a, 0x3e3446, 0x54464e]) },
    ],
  },
  mausoleum: {
    scale: [1.0, 1.3],
    parts: () => [
      { geo: merge(rbox(0.62, 0.42, 0.5, 0.02, 0, 0.21, 0), box(0.7, 0.05, 0.58, 0, 0.44, 0), new THREE.ConeGeometry(0.46, 0.22, 4).rotateY(Math.PI / 4).scale(1, 1, 0.85).translate(0, 0.58, 0), box(0.07, 0.4, 0.07, -0.25, 0.2, 0.31), box(0.07, 0.4, 0.07, 0.25, 0.2, 0.31)), mat: lambert(0xffffff), color: pick([0x9a98a8, 0x8e8ca0, 0xa4a2b2]) },
      { geo: merge(new THREE.CircleGeometry(0.12, 12, 0, Math.PI).translate(0, 0.16, 0.255), box(0.24, 0.16, 0.01, 0, 0.08, 0.255)), mat: lambert(0x2a2432) },
      { geo: new THREE.SphereGeometry(0.03, 8, 6).translate(0, 0.74, 0), mat: unlit(0xb8f0d8) },
    ],
  },
  manor: {
    scale: [1.1, 1.4],
    parts: () => [
      { geo: merge(rbox(0.7, 0.5, 0.46, 0.02, 0, 0.25, 0), rbox(0.26, 0.82, 0.26, 0.02, -0.28, 0.41, -0.05), box(0.08, 0.2, 0.08, 0.26, 0.6, 0.04)), mat: lambert(0xffffff), color: pick([0x6a5a78, 0x5e5470, 0x74647e]) },
      { geo: merge(new THREE.ConeGeometry(0.52, 0.34, 4).rotateY(Math.PI / 4).scale(1, 1, 0.7).translate(0.04, 0.67, 0), new THREE.ConeGeometry(0.24, 0.4, 4).rotateY(Math.PI / 4).translate(-0.28, 1.02, -0.05)), mat: lambert(0x3a3048) },
      { geo: merge(box(0.09, 0.12, 0.01, -0.12, 0.33, 0.235), box(0.09, 0.12, 0.01, 0.12, 0.33, 0.235), box(0.09, 0.12, 0.01, 0.26, 0.33, 0.235), box(0.07, 0.1, 0.01, -0.28, 0.7, 0.085), box(0.07, 0.1, 0.01, -0.28, 0.5, 0.085)), mat: unlit(0xffd070) },
      { geo: merge(new THREE.CircleGeometry(0.06, 10, 0, Math.PI).translate(0.02, 0.1, 0.235), box(0.12, 0.1, 0.01, 0.02, 0.05, 0.235)), mat: lambert(0x2a2030) },
    ],
  },
  cauldron: {
    scale: [0.8, 1.2],
    parts: () => [
      { geo: merge(new THREE.SphereGeometry(0.2, 14, 10, 0, Math.PI * 2, 0.5, 2.1).translate(0, 0.22, 0), new THREE.TorusGeometry(0.15, 0.02, 6, 16).rotateX(Math.PI / 2).translate(0, 0.35, 0), ...[0, 2.1, 4.2].map((a) => new THREE.CylinderGeometry(0.02, 0.025, 0.1, 5).translate(Math.cos(a) * 0.12, 0.04, Math.sin(a) * 0.12))), mat: lambert(0x2e2c38) },
      { geo: new THREE.CircleGeometry(0.15, 14).rotateX(-Math.PI / 2).translate(0, 0.33, 0), mat: unlit(0x78e870) },
      { geo: merge(new THREE.SphereGeometry(0.035, 7, 5).translate(0.05, 0.37, 0.03), new THREE.SphereGeometry(0.025, 7, 5).translate(-0.06, 0.37, -0.04)), mat: unlit(0xa8ff98) },
    ],
  },
  candles: {
    scale: [0.8, 1.2],
    parts: () => {
      const cs = [[0, 0, 0.2], [0.09, 0.05, 0.13], [-0.08, 0.06, 0.1], [0.02, -0.09, 0.07]];
      return [
        { geo: merge(...cs.map(([x, z, h]) => new THREE.CylinderGeometry(0.03, 0.035, h, 8).translate(x, h / 2, z))), mat: lambert(0xffffff), color: pick([0xf4ecd8, 0xe8dcc0, 0xd8c8e8]) },
        { geo: merge(...cs.map(([x, z, h]) => new THREE.SphereGeometry(0.022, 7, 5).scale(0.7, 1.4, 0.7).translate(x, h + 0.03, z))), mat: unlit(0xffc060) },
      ];
    },
  },
  coffin: {
    scale: [0.8, 1.2],
    parts: () => [
      { geo: new THREE.CylinderGeometry(0.1, 0.06, 0.44, 6).rotateX(Math.PI / 2).scale(1, 0.55, 1).translate(0, 0.07, 0), mat: lambert(0xffffff), color: pick([0x5a3a30, 0x4e3a40, 0x62443a]) },
      { geo: merge(box(0.02, 0.005, 0.2, 0, 0.105, -0.04), box(0.09, 0.005, 0.02, 0, 0.105, 0)), mat: lambert(0xc8a868) },
    ],
  },
  jackLantern: {
    scale: [0.8, 1.3],
    parts: () => [
      { geo: merge(new THREE.SphereGeometry(0.15, 12, 8).scale(1.15, 0.9, 1.05).translate(0, 0.14, 0), new THREE.CylinderGeometry(0.018, 0.025, 0.07, 5).translate(0, 0.29, 0)), mat: lambert(0xffffff), color: pick([0xe8782a, 0xd8681e, 0xf08a38]) },
      { geo: merge(new THREE.ConeGeometry(0.03, 0.05, 3).rotateX(0).translate(-0.06, 0.18, 0.15), new THREE.ConeGeometry(0.03, 0.05, 3).translate(0.06, 0.18, 0.15), box(0.12, 0.025, 0.02, 0, 0.09, 0.155)), mat: unlit(0xffb84a) },
    ],
  },
  bones: {
    scale: [0.8, 1.3],
    parts: () => [
      { geo: merge(
        new THREE.CylinderGeometry(0.015, 0.015, 0.22, 5).rotateZ(Math.PI / 2).rotateY(0.4).translate(0, 0.015, 0),
        new THREE.SphereGeometry(0.028, 6, 5).translate(-0.1, 0.02, 0.04), new THREE.SphereGeometry(0.028, 6, 5).translate(0.1, 0.02, -0.04),
        new THREE.CylinderGeometry(0.014, 0.014, 0.18, 5).rotateZ(Math.PI / 2).rotateY(-0.7).translate(0.04, 0.03, 0.1),
        new THREE.SphereGeometry(0.075, 8, 6).scale(1, 0.9, 1.05).translate(-0.08, 0.075, -0.1),
        box(0.07, 0.04, 0.05, -0.08, 0.02, -0.04),
      ), mat: lambert(0xece4d4) },
      { geo: merge(new THREE.SphereGeometry(0.02, 6, 5).translate(-0.105, 0.09, -0.04), new THREE.SphereGeometry(0.02, 6, 5).translate(-0.055, 0.09, -0.04)), mat: lambert(0x2a2430) },
    ],
  },
  bookStack: {
    scale: [0.8, 1.2],
    parts: () => [
      { geo: merge(rbox(0.3, 0.07, 0.2, 0.01, 0, 0.035, 0), rbox(0.26, 0.06, 0.18, 0.01, 0.02, 0.1, 0.01).rotateY(0.25), rbox(0.22, 0.055, 0.16, 0.01, -0.01, 0.16, 0).rotateY(-0.2)), mat: lambert(0xffffff), color: pick([0x6a3a5a, 0x3a4a6a, 0x5a3a2e, 0x3a5a4a]) },
      { geo: merge(box(0.28, 0.012, 0.19, 0, 0.035, 0.002), box(0.24, 0.01, 0.17, 0.02, 0.1, 0.002).rotateY(0.25)), mat: lambert(0xf0e8d0) },
    ],
  },
  ironGate: {
    scale: [0.9, 1.2],
    parts: () => [
      { geo: merge(
        box(0.05, 0.55, 0.05, -0.3, 0.275, 0), box(0.05, 0.55, 0.05, 0.3, 0.275, 0),
        box(0.6, 0.03, 0.03, 0, 0.12, 0), box(0.6, 0.03, 0.03, 0, 0.42, 0),
        ...[-0.2, -0.1, 0, 0.1, 0.2].map((x) => box(0.02, 0.4, 0.02, x, 0.28, 0)),
        ...[-0.3, 0.3].map((x) => new THREE.ConeGeometry(0.04, 0.09, 4).translate(x, 0.6, 0)),
        ...[-0.2, -0.1, 0, 0.1, 0.2].map((x) => new THREE.ConeGeometry(0.02, 0.06, 4).translate(x, 0.51, 0)),
      ), mat: lambert(0x38343e) },
    ],
  },

};

// kinds too small/plentiful to have a withered stand-in
export const NO_DEAD = new Set(['grass', 'flower', 'snowdrop', 'sprinkle', 'pebble', 'shell', 'seaGrass', 'pathStone', 'plank', 'starfish', 'carrot', 'cabbage']);
