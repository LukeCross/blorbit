import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { matte, shiny } from './quality.js';

// Every creature you wake unlocks a blob skin with its features. The same builders dress
// both the sleeping creature and the blob, so they read as a matching pair.
// Everything is modelled in unit-sphere space: body radius 1, +y up, +z forward.

export const SKINS = {
  classic: { name: 'Classic Goo', emoji: '💧', body: 0x6ff2c6, slime: 0x8dffd6 },
  fox: { name: 'Fox Blob', emoji: '🦊', body: 0xff9447, slime: 0xffc078 },
  frog: { name: 'Frog Blob', emoji: '🐸', body: 0x5fd94f, slime: 0xb4ff86, eyeLift: true },
  moth: { name: 'Moth Blob', emoji: '🦋', body: 0xbfa2ff, slime: 0xe4d6ff },
  snail: { name: 'Snail Blob', emoji: '🐌', body: 0xff9fbd, slime: 0xffd2e0 },
  bunny: { name: 'Bunny Blob', emoji: '🐰', body: 0xf3eeff, slime: 0xffffff },
  penguin: { name: 'Penguin Blob', emoji: '🐧', body: 0x3a4258, slime: 0xc4e8ff },
  turtle: { name: 'Turtle Blob', emoji: '🐢', body: 0x6ac87a, slime: 0xb0f0c8 },
  lizard: { name: 'Lizard Blob', emoji: '🦎', body: 0xff6a3a, slime: 0xffb080 },
  bear: { name: 'Gummy Bear Blob', emoji: '🐻', body: 0xff5a7a, slime: 0xffb8c8 },
  hedgehog: { name: 'Hedgehog Blob', emoji: '🦔', body: 0xc8946a, slime: 0xffd8a8 },
  squirrel: { name: 'Squirrel Blob', emoji: '🐿️', body: 0xd9895a, slime: 0xffc8a0 },
  cat: { name: 'Cat Blob', emoji: '🐱', body: 0xf7b47e, slime: 0xffe0b8 },
  dog: { name: 'Dog Blob', emoji: '🐶', body: 0xf0d29c, slime: 0xfff2c4 },
  raccoon: { name: 'Raccoon Blob', emoji: '🦝', body: 0xb8b4c4, slime: 0xd8d0f4 },
  seagull: { name: 'Seagull Blob', emoji: '🐦', body: 0xfaf8f4, slime: 0xc8ecff },
  sheep: { name: 'Sheep Blob', emoji: '🐑', body: 0xfff4e4, slime: 0xfff0c0 },
  goat: { name: 'Goat Blob', emoji: '🐐', body: 0xe6ddd2, slime: 0xd8f0b8 },
  unicorn: { name: 'Unicorn Blob', emoji: '🦄', body: 0xf6f0ff, slime: 0xf0c8ff },
  eagle: { name: 'Eagle Blob', emoji: '🦅', body: 0xa8744e, slime: 0xffe0a0 },
  owl: { name: 'Owl Blob', emoji: '🦉', body: 0xd8a070, slime: 0xb8e8d8 },
  lion: { name: 'Lion Blob', emoji: '🦁', body: 0xf0b860, slime: 0xffe0a0 },
  parrot: { name: 'Parrot Blob', emoji: '🦜', body: 0xff5a4a, slime: 0xffb8a0 },
  hippo: { name: 'Hippo Blob', emoji: '🦛', body: 0xb8a4d8, slime: 0xe0d0f8 },
  panda: { name: 'Panda Blob', emoji: '🐼', body: 0xf8f8f4, slime: 0xd0f0d0 },
  koala: { name: 'Koala Blob', emoji: '🐨', body: 0xaab0c0, slime: 0xd8e4f0 },
  otter: { name: 'Otter Blob', emoji: '🦦', body: 0xa87a5a, slime: 0xd8b8a0 },
  pufferfish: { name: 'Pufferfish Blob', emoji: '🐡', body: 0xffd860, slime: 0xfff0a0 },
  shark: { name: 'Shark Blob', emoji: '🦈', body: 0x8ea4bc, slime: 0xc0e0f0 },
  jellyfish: { name: 'Jellyfish Blob', emoji: '🪼', body: 0xff9ae0, slime: 0xffd0f4 },
  squid: { name: 'Squid Blob', emoji: '🦑', body: 0xff7a8c, slime: 0xffb8c4 },
  rooster: { name: 'Rooster Blob', emoji: '🐓', body: 0xfff2e0, slime: 0xffd8b0 },
  monkey: { name: 'Monkey Blob', emoji: '🐒', body: 0xb88a5e, slime: 0xf0d0a0 },
  rat: { name: 'Rat Blob', emoji: '🐀', body: 0xb4aec4, slime: 0xe0d8f0 },
  pig: { name: 'Pig Blob', emoji: '🐖', body: 0xffb4c4, slime: 0xffd8e0 },
  camel: { name: 'Camel Blob', emoji: '🐫', body: 0xe0b070, slime: 0xffe0a8 },
  ghost: { name: 'Ghost Blob', emoji: '👻', body: 0xeceeff, slime: 0xf6f8ff },
  bat: { name: 'Bat Blob', emoji: '🦇', body: 0x5e4e7e, slime: 0xa890d4 },
  witch: { name: 'Witch Blob', emoji: '🧙', body: 0x9a68d0, slime: 0xd0a8f4 },
  zombie: { name: 'Zombie Blob', emoji: '🧟', body: 0x92c880, slime: 0xc4f0a8 },
  spider: { name: 'Spider Blob', emoji: '🕷️', body: 0x3e3450, slime: 0x8c78b0 },
};

export const CREATURE_IDS = ['bunny', 'frog', 'fox', 'penguin', 'moth', 'snail', 'turtle', 'lizard', 'bear', 'hedgehog', 'squirrel', 'cat', 'dog', 'raccoon', 'seagull', 'sheep', 'goat', 'unicorn', 'eagle', 'owl', 'lion', 'parrot', 'hippo', 'panda', 'koala', 'otter', 'pufferfish', 'shark', 'jellyfish', 'squid', 'rooster', 'monkey', 'rat', 'pig', 'camel', 'ghost', 'bat', 'witch', 'zombie', 'spider'];

// ---------------------------------------------------------------- materials

// All cheap materials (see quality.js): matte for fur and skin, shiny for shells, beaks, noses.
const fur = (color, extra = {}) => matte(color, { roughness: 0.85, ...extra });
const gloss = (color, extra = {}) => shiny(color, extra);
const gummy = (color) => shiny(color, { transparent: true, opacity: 0.88 });
const soft = (color, extra = {}) => matte(color, { roughness: 0.6, ...extra });

// what each sleeping creature's body is made of
const BODY_STYLE = { fox: fur, bunny: fur, hedgehog: fur, moth: fur, penguin: soft, turtle: soft, frog: gloss, lizard: gloss, snail: gloss, bear: gummy, squirrel: fur, cat: fur, dog: fur, raccoon: fur, seagull: soft, sheep: fur, goat: fur, unicorn: soft, eagle: soft, owl: fur, lion: fur, parrot: soft, hippo: soft, panda: fur, koala: fur, otter: fur, pufferfish: gloss, shark: gloss, jellyfish: gummy, squid: gloss, rooster: soft, monkey: fur, rat: fur, pig: soft, camel: fur, ghost: gummy, bat: fur, witch: soft, zombie: soft, spider: fur };
export const bodyMaterial = (id) => (BODY_STYLE[id] || soft)(SKINS[id].body);

// ---------------------------------------------------------------- shape helpers

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

const sphere = (r, w = 40, h = 28) => new THREE.SphereGeometry(r, w, h);

// A smooth cone with a rounded tip: ears, spikes, beaks, horns.
function roundedCone(r, h, tipRound = 0.3, segs = 40) {
  const pts = [new THREE.Vector2(0, 0)];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // gently bowed silhouette that rounds over at the tip
    const shoulder = Math.pow(1 - t, 0.85);
    const round = Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, t - (1 - tipRound)) / tipRound, 2)));
    pts.push(new THREE.Vector2(r * shoulder * (t > 1 - tipRound ? round : 1) + 0.0001, h * t));
  }
  pts.push(new THREE.Vector2(0, h));
  const g = new THREE.LatheGeometry(pts, segs);
  g.computeVertexNormals();
  return g;
}

// A tube along a smooth curve whose radius follows radiusAt(t), with rounded end caps.
function taperedTube(points, radiusAt, tubular = 64, radial = 20) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const geo = new THREE.TubeGeometry(curve, tubular, 1, radial, false);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  const t = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const ti = Math.floor(i / (radial + 1)) / tubular;
    curve.getPointAt(ti, c);
    v.fromBufferAttribute(pos, i).sub(c).multiplyScalar(radiusAt(ti)).add(c);
    pos.setXYZ(i, v.x, v.y, v.z);
    t[i] = ti;
  }
  geo.setAttribute('along', new THREE.BufferAttribute(t, 1));
  geo.computeVertexNormals();
  // hemispherical caps aligned with the tube so the surfaces meet cleanly (no z-fighting seam)
  const caps = [0, 1].map((end) => {
    const r = radiusAt(end);
    const cap = new THREE.SphereGeometry(r, radial, Math.max(8, radial / 2), 0, Math.PI * 2, 0, Math.PI / 2);
    const out = curve.getTangentAt(end).multiplyScalar(end ? 1 : -1);
    cap.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), out));
    return cap.translate(...curve.getPointAt(end).toArray());
  });
  return { geo, caps, curve };
}

// Paints a geometry with a gradient between two colours based on a per-vertex 0..1 value.
function gradient(geo, values, from, to, start = 0, end = 1) {
  const a = new THREE.Color(from), b = new THREE.Color(to), c = new THREE.Color();
  const col = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i < geo.attributes.position.count; i++) {
    const k = THREE.MathUtils.smoothstep(values(i), start, end);
    c.copy(a).lerp(b, k);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

// Place a mesh on the unit sphere surface, facing outward.
function onSurface(m, dir, lift = 0.98) {
  const d = new THREE.Vector3(...dir).normalize();
  m.position.copy(d).multiplyScalar(lift);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d);
  return m;
}

// A soft rounded marking lying on the body surface (belly, muzzle) so it shows through the jelly.
function surfacePatch(mat, dir, r, sx = 1, sy = 1, lift = 0.9) {
  const m = onSurface(mesh(sphere(r, 48, 32), mat), dir, lift);
  m.scale.set(sx, sy, 0.3);
  return m;
}

// A tube with its rounded caps as one group (caps share the material)
function tubeGroup(tube, mat) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(tube.geo, mat));
  tube.caps.forEach((c) => g.add(new THREE.Mesh(c, mat)));
  return g;
}

// ---------------------------------------------------------------- accessories

export function buildAccessories(id) {
  const g = new THREE.Group();
  const anims = [];
  const skin = SKINS[id];

  if (id === 'fox') {
    const orange = fur(skin.body);
    const cream = fur(0xfff3e4);
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.46, 0.76, -0.04);
      ear.rotation.set(-0.12, 0, -s * 0.36);
      const outer = mesh(roundedCone(0.3, 0.62, 0.32), orange);
      outer.scale.set(1, 1, 0.62);
      const inner = mesh(roundedCone(0.17, 0.42, 0.35), fur(0xffd6c8), 0, 0.04, 0.09);
      inner.scale.set(1, 1, 0.4);
      ear.add(outer, inner);
      g.add(ear);
      anims.push((t) => (ear.rotation.z = -s * (0.36 + Math.sin(t * 1.7 + s) * 0.05)));
    }
    // bushy tail that fades to a white tip
    const tail = new THREE.Group();
    tail.position.set(0, -0.25, -0.8);
    const tube = taperedTube([[0, 0, 0], [0, 0.22, -0.32], [0, 0.6, -0.5], [0.05, 0.98, -0.42]], (t) => 0.09 + 0.2 * Math.pow(Math.sin(Math.PI * t), 1.3));
    const along = tube.geo.attributes.along.array;
    gradient(tube.geo, (i) => along[i], skin.body, 0xfff6ea, 0.74, 0.86);
    const tailMat = soft(0xffffff, { vertexColors: true, roughness: 0.75 });
    tail.add(new THREE.Mesh(tube.geo, tailMat), new THREE.Mesh(tube.caps[0], soft(skin.body)), new THREE.Mesh(tube.caps[1], soft(0xfff6ea)));
    g.add(tail);
    anims.push((t) => (tail.rotation.y = Math.sin(t * 4.5) * 0.4));
    // pale muzzle
    // pale muzzle sitting on the surface of the face, nose between the eyes and the smile
    g.add(surfacePatch(cream, [0, -0.2, 1], 0.36, 1.15, 0.8, 0.9));
    g.add(onSurface(mesh(sphere(0.065), gloss(0x2a1f2a)), [0, 0.43, 0.9], 1.01));
  }

  if (id === 'frog') {
    const green = gloss(skin.body, { roughness: 0.4 });
    for (const s of [-1, 1]) g.add(mesh(sphere(0.32, 48, 32), green, s * 0.38, 0.72, 0.42));
    const spot = soft(0x3a9a48);
    const spots = [[0.5, 0.5, -0.6], [-0.3, 0.75, -0.55], [0.1, 0.9, -0.3], [-0.7, 0.35, -0.5], [0.75, 0.2, -0.35], [-0.2, 0.3, -0.9]];
    for (const p of spots) {
      const m = onSurface(mesh(sphere(0.16), spot), p, 0.975);
      m.scale.set(1, 1, 0.22);
      g.add(m);
    }
    g.add(surfacePatch(soft(0xe8ffc8), [0, -0.45, 0.9], 0.5, 1.2, 0.85));
  }

  if (id === 'moth') {
    const stalkMat = soft(0x5a4a7a);
    const fluff = fur(0xfff0b0, { emissive: new THREE.Color(0xffd86a), emissiveIntensity: 0.35 });
    for (const s of [-1, 1]) {
      const a = new THREE.Group();
      const tube = taperedTube([[s * 0.2, 0.86, 0.3], [s * 0.3, 1.18, 0.5], [s * 0.48, 1.42, 0.48], [s * 0.62, 1.52, 0.32]], (t) => 0.035 - t * 0.012, 40, 10);
      a.add(new THREE.Mesh(tube.geo, stalkMat));
      a.add(mesh(sphere(0.1), fluff, ...tube.curve.getPointAt(1).toArray()));
      g.add(a);
      anims.push((t) => (a.rotation.x = Math.sin(t * 2.5 + s) * 0.06));
    }
    // shaped wings with a soft eyespot
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.bezierCurveTo(0.35, 0.55, 1.05, 0.7, 1.15, 0.25);
    wingShape.bezierCurveTo(1.2, -0.05, 0.85, -0.2, 0.6, -0.12);
    wingShape.bezierCurveTo(0.75, -0.35, 0.55, -0.7, 0.25, -0.55);
    wingShape.bezierCurveTo(0.08, -0.45, 0, -0.2, 0, 0);
    const wingGeo = new THREE.ShapeGeometry(wingShape, 24);
    const wingMat = soft(0xf2e8ff, { side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const eyeMat = soft(0xffb8dc, { side: THREE.DoubleSide });
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.45, 0.45, -0.35);
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.scale.set(s, 1, 1);
      wing.rotation.y = -s * 0.35;
      const spotM = mesh(new THREE.CircleGeometry(0.12, 32), eyeMat, s * 0.72, 0.22, 0.003);
      wing.add(spotM);
      pivot.add(wing);
      g.add(pivot);
      anims.push((t) => (pivot.rotation.y = s * (0.15 + Math.sin(t * 9) * 0.35)));
    }
    const ruffMat = fur(0xfff6ff);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      const tuft = mesh(sphere(0.1 + (i % 3) * 0.02, 20, 14), ruffMat, Math.cos(a) * 0.82, 0.53 + (i % 2) * 0.05, Math.sin(a) * 0.82);
      tuft.scale.set(1, 0.8, 1);
      g.add(tuft);
    }
  }

  if (id === 'snail') {
    // a real spiral shell: a tube winding inward with caramel bands
    const pts = [];
    const turns = 2.4;
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      const a = t * turns * Math.PI * 2;
      const r = 0.52 * (1 - t * 0.9);
      pts.push([Math.sin(a) * r, Math.cos(a) * r, -0.16 * t]);
    }
    const tube = taperedTube(pts, (t) => 0.27 * Math.pow(1 - t, 0.8) + 0.035, 192, 28);
    const along = tube.geo.attributes.along.array;
    gradient(tube.geo, (i) => 0.5 + 0.5 * Math.sin(along[i] * turns * Math.PI * 4), 0xe2a070, 0xb86a48, 0.3, 0.7);
    const shell = new THREE.Group();
    shell.add(new THREE.Mesh(tube.geo, gloss(0xffffff, { vertexColors: true })));
    shell.add(new THREE.Mesh(tube.caps[0], gloss(0xe2a070)), new THREE.Mesh(tube.caps[1], gloss(0xb86a48)));
    shell.position.set(0, 0.72, -0.5);
    shell.rotation.set(0.65, 0, 0);
    g.add(shell);
    const stalkMat = soft(skin.body);
    for (const s of [-1, 1]) {
      const a = new THREE.Group();
      const st = taperedTube([[s * 0.2, 0.72, 0.6], [s * 0.26, 1.0, 0.72], [s * 0.32, 1.22, 0.78]], (t) => 0.065 - t * 0.02, 32, 12);
      a.add(new THREE.Mesh(st.geo, stalkMat));
      a.add(mesh(sphere(0.075), gloss(0x2a2236), ...st.curve.getPointAt(1).toArray()));
      g.add(a);
      anims.push((t) => (a.rotation.x = Math.sin(t * 2.2 + s) * 0.08));
    }
  }

  if (id === 'bunny') {
    const white = fur(skin.body);
    const pink = fur(0xffc2d6);
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.3, 0.72, -0.05);
      const outer = taperedTube([[0, 0, 0], [s * 0.05, 0.45, -0.06], [s * 0.1, 0.9, -0.16]], (t) => 0.12 + 0.07 * Math.sin(Math.PI * Math.min(1, t * 1.1)), 48, 20);
      const inner = taperedTube([[0, 0.1, 0.06], [s * 0.05, 0.47, 0.01], [s * 0.095, 0.82, -0.08]], (t) => 0.06 + 0.04 * Math.sin(Math.PI * Math.min(1, t * 1.1)), 40, 14);
      const o = tubeGroup(outer, white);
      o.scale.set(1, 1, 0.6);
      const n = tubeGroup(inner, pink);
      n.scale.set(1, 1, 0.45);
      n.position.z = 0.03;
      ear.add(o, n);
      g.add(ear);
      anims.push((t) => (ear.rotation.x = -0.15 + Math.sin(t * 2.5 + s * 0.7) * 0.1));
    }
    g.add(mesh(sphere(0.24), white, 0, -0.15, -0.97));
  }

  if (id === 'penguin') {
    const white = soft(0xfaf8f2);
    const orange = gloss(0xffa23a);
    g.add(surfacePatch(white, [0, -0.22, 1], 0.62, 1.05, 1.2, 0.86));
    const beak = mesh(roundedCone(0.13, 0.3, 0.4), orange, 0, 0.18, 0.95);
    beak.rotation.x = Math.PI / 2;
    g.add(beak);
    const flipperMat = soft(skin.body);
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.92, 0.12, 0);
      const flipper = mesh(sphere(0.36), flipperMat, s * 0.1, -0.28, 0);
      flipper.scale.set(0.28, 1, 0.6);
      pivot.add(flipper);
      g.add(pivot);
      anims.push((t) => (pivot.rotation.z = s * (0.25 + Math.sin(t * 6 + s) * 0.2)));
      const foot = mesh(sphere(0.2), orange, s * 0.34, -0.86, 0.36);
      foot.scale.set(1, 0.4, 1.4);
      g.add(foot);
    }
    for (const [x, r] of [[-0.08, -0.3], [0.04, 0], [0.13, 0.3]]) {
      const tuft = mesh(roundedCone(0.05, 0.22, 0.4, 16), flipperMat, x, 0.95, 0.05);
      tuft.rotation.z = r;
      g.add(tuft);
    }
  }

  if (id === 'turtle') {
    const shellMat = gloss(0x5f8a3e, { roughness: 0.45 });
    const back = new THREE.Group(); // the dome + plates, tilted back so the face stays clear
    back.rotation.x = -0.95;
    back.position.set(0, -0.02, -0.08);
    g.add(back);
    const shell = mesh(new THREE.SphereGeometry(1.0, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), shellMat, 0, 0.02, -0.12);
    shell.scale.set(1.08, 0.92, 1.1);
    back.add(shell);
    const rim = mesh(new THREE.TorusGeometry(1.06, 0.09, 16, 96), gloss(0x4a7032), 0, 0.03, -0.12);
    rim.rotation.x = Math.PI / 2;
    back.add(rim);
    const plate = gloss(0x9cbe62, { roughness: 0.4 });
    const plateGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.06, 6, 1);
    for (let i = 0; i < 7; i++) {
      const a = (i / 6) * Math.PI * 2;
      const v = i === 6 ? [0, 1, -0.12] : [Math.cos(a) * 0.62, 0.76, Math.sin(a) * 0.62 - 0.12];
      const m = mesh(plateGeo, plate);
      const d = new THREE.Vector3(...v).normalize();
      m.position.copy(new THREE.Vector3(d.x * 1.08, d.y * 0.92, d.z * 1.1)).add(new THREE.Vector3(0, 0.02, -0.12 * (1 - d.y)));
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
      back.add(m);
    }
    const leg = soft(skin.body);
    for (const [x, z] of [[0.62, 0.5], [-0.62, 0.5], [0.62, -0.6], [-0.62, -0.6]]) {
      const m = mesh(new THREE.CapsuleGeometry(0.16, 0.12, 8, 20), leg, x, -0.78, z);
      m.scale.set(1, 0.8, 1.2);
      g.add(m);
    }
    const tail = mesh(roundedCone(0.1, 0.24, 0.4, 20), leg, 0, -0.5, -1.05);
    tail.rotation.x = -Math.PI / 2 - 0.4;
    g.add(tail);
  }

  if (id === 'lizard') {
    const spikeMat = gloss(0xffd05a);
    for (let i = 0; i < 7; i++) {
      const a = -0.35 + i * 0.36;
      const size = 1 - Math.abs(i - 2) * 0.12;
      const m = mesh(roundedCone(0.11 * size, 0.32 * size, 0.35, 24), spikeMat, 0, Math.cos(a) * 0.97, -Math.sin(a) * 0.97);
      m.rotation.x = -a;
      g.add(m);
    }
    const tail = new THREE.Group();
    tail.position.set(0, -0.35, -0.82);
    const tube = taperedTube([[0, 0, 0], [0, 0.02, -0.45], [0.15, 0.15, -0.85], [0.35, 0.4, -1.05]], (t) => 0.27 * Math.pow(1 - t, 1.2) + 0.035, 64, 20);
    tail.add(tubeGroup(tube, soft(skin.body)));
    g.add(tail);
    anims.push((t) => (tail.rotation.y = Math.sin(t * 4) * 0.4));
    for (const s of [-1, 1]) {
      const horn = mesh(roundedCone(0.07, 0.24, 0.35, 20), spikeMat, s * 0.34, 0.84, 0.42);
      horn.rotation.set(0.45, 0, -s * 0.32);
      g.add(horn);
    }
    g.add(surfacePatch(soft(0xffd0a0), [0, -0.45, 0.9], 0.48, 1.15, 0.85));
  }

  if (id === 'bear') {
    const sweet = gummy(skin.body);
    for (const s of [-1, 1]) {
      g.add(mesh(sphere(0.3), sweet, s * 0.6, 0.76, 0));
      const inner = mesh(sphere(0.17), gummy(0xffb0c4), s * 0.6, 0.77, 0.15);
      inner.scale.set(1, 1, 0.5);
      g.add(inner);
    }
    const snout = mesh(sphere(0.34), gummy(0xffc0cc), 0, -0.06, 0.84);
    snout.scale.set(1.1, 0.85, 0.75);
    g.add(snout);
    const nose = mesh(sphere(0.1), gloss(0x5a2a3a), 0, 0.06, 1.1);
    nose.scale.set(1.3, 0.9, 0.8);
    g.add(nose);
    g.add(surfacePatch(gummy(0xffd0dc), [0, -0.55, 0.85], 0.42, 1.1, 0.9));
  }

  if (id === 'hedgehog') {
    // rounded spines, darker at the root and paler at the tip
    const spineGeo = roundedCone(0.075, 0.42, 0.3, 16);
    const yAttr = spineGeo.attributes.position;
    gradient(spineGeo, (i) => yAttr.getY(i) / 0.42, 0x5a3a26, 0xe8c8a0, 0.2, 1);
    const spineMat = soft(0xffffff, { vertexColors: true, roughness: 0.5 });
    const spines = [];
    const tmp = new THREE.Object3D();
    const n = 110;
    for (let i = 0; i < n; i++) {
      const y = 1 - ((i + 0.5) / n) * 1.45;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = i * 2.399963;
      const v = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);
      if (v.z > 0.35 && v.y < 0.65) continue; // keep the face clear
      tmp.position.copy(v).multiplyScalar(0.9);
      tmp.position.z -= 0.04;
      tmp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().add(new THREE.Vector3(0, 0.15, -0.55)).normalize());
      tmp.scale.setScalar(0.85 + ((i * 37) % 10) / 30);
      tmp.updateMatrix();
      spines.push(spineGeo.clone().applyMatrix4(tmp.matrix));
    }
    g.add(new THREE.Mesh(mergeGeometries(spines), spineMat)); // one draw call for all the spines
    const muzzle = mesh(roundedCone(0.24, 0.42, 0.5), fur(0xf2d6b8), 0, -0.12, 0.92);
    muzzle.rotation.x = Math.PI / 2;
    g.add(muzzle);
    g.add(mesh(sphere(0.085), gloss(0x2a1a1a), 0, -0.12, 1.33));
  }

  if (id === 'squirrel') {
    const russet = fur(skin.body);
    const cream = fur(0xfff0dc);
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.38, 0.8, -0.08);
      ear.rotation.z = -s * 0.25;
      const outer = mesh(roundedCone(0.15, 0.3, 0.35, 24), russet);
      outer.scale.set(1, 1, 0.7);
      const tuft = mesh(roundedCone(0.05, 0.16, 0.5, 12), fur(0x9a5a3a), 0, 0.26, 0);
      ear.add(outer, tuft);
      g.add(ear);
      anims.push((t) => (ear.rotation.z = -s * (0.25 + Math.sin(t * 3.1 + s) * 0.06)));
    }
    // a big bushy tail curling up over the back, paler towards the tip
    const tail = new THREE.Group();
    tail.position.set(0, -0.3, -0.7);
    const tube = taperedTube([[0, 0, 0], [0, 0.3, -0.42], [0, 0.95, -0.55], [0, 1.45, -0.3], [0, 1.6, 0.12], [0, 1.42, 0.38]], (t) => 0.12 + 0.24 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.7), 72, 20);
    const along = tube.geo.attributes.along.array;
    gradient(tube.geo, (i) => along[i], skin.body, 0xffd8b4, 0.55, 1);
    tail.add(new THREE.Mesh(tube.geo, fur(0xffffff, { vertexColors: true })), new THREE.Mesh(tube.caps[0], russet), new THREE.Mesh(tube.caps[1], fur(0xffd8b4)));
    g.add(tail);
    anims.push((t) => (tail.rotation.x = Math.sin(t * 2.4) * 0.08));
    g.add(surfacePatch(cream, [0, -0.35, 0.94], 0.36, 1.0, 1.05, 0.93));
    g.add(onSurface(mesh(sphere(0.05), gloss(0xff9ab0)), [0, 0.43, 0.9], 1.01));
    // little buck teeth just under the smile
    for (const s of [-1, 1]) g.add(onSurface(mesh(new THREE.BoxGeometry(0.035, 0.05, 0.02), gloss(0xffffff)), [s * 0.02, 0.19, 0.98], 1.0));
  }

  if (id === 'cat') {
    const coat = fur(skin.body);
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.46, 0.74, -0.04);
      ear.rotation.set(-0.05, 0, -s * 0.32);
      const outer = mesh(roundedCone(0.26, 0.42, 0.18), coat);
      outer.scale.set(1, 1, 0.6);
      const inner = mesh(roundedCone(0.15, 0.28, 0.2), fur(0xffc8d4), 0, 0.03, 0.08);
      inner.scale.set(1, 1, 0.4);
      ear.add(outer, inner);
      g.add(ear);
      anims.push((t) => (ear.rotation.z = -s * (0.32 + Math.max(0, Math.sin(t * 0.9 + s * 2)) ** 8 * 0.25))); // the odd flick
      // whiskers fanning out from the cheeks
      for (const k of [-1, 0, 1]) {
        const w = mesh(new THREE.CylinderGeometry(0.008, 0.004, 0.42, 5), soft(0x6a5a6a), s * 0.62, 0.3 + k * 0.05, 0.82);
        w.rotation.set(0, -s * 0.3, s * (Math.PI / 2 + k * 0.18));
        g.add(w);
      }
    }
    // darker tabby stripes over the head and back
    const stripe = fur(0xe0905a);
    for (const p of [[0, 0.97, 0.2], [0.25, 0.92, -0.2], [-0.25, 0.92, -0.2], [0, 0.75, -0.65], [0, 0.35, -0.94]]) {
      const m = onSurface(mesh(sphere(0.2, 24, 16), stripe), p, 0.965);
      m.scale.set(1.3, 0.35, 0.3);
      g.add(m);
    }
    g.add(surfacePatch(fur(0xfff4e8), [0, -0.05, 1], 0.32, 1.25, 0.8, 0.94));
    const nose = onSurface(mesh(roundedCone(0.06, 0.06, 0.5, 3), gloss(0xff8aa8)), [0, 0.42, 0.9], 1.0);
    g.add(nose);
    // curling tail that sways lazily
    const tail = new THREE.Group();
    tail.position.set(0, -0.4, -0.78);
    const tube = taperedTube([[0, 0, 0], [0, 0.25, -0.45], [0.18, 0.8, -0.55], [0.35, 1.15, -0.35], [0.3, 1.32, -0.12]], (t) => 0.1 - t * 0.02, 56, 14);
    tail.add(tubeGroup(tube, coat));
    g.add(tail);
    anims.push((t) => (tail.rotation.z = Math.sin(t * 1.6) * 0.3));
  }

  if (id === 'dog') {
    const coat = fur(skin.body);
    const brown = fur(0xc8865a);
    for (const s of [-1, 1]) {
      // floppy ears that bounce as it rolls
      const ear = new THREE.Group();
      ear.position.set(s * 0.52, 0.72, -0.02);
      const tube = taperedTube([[0, 0, 0], [s * 0.22, 0.02, 0.02], [s * 0.36, -0.25, 0.06], [s * 0.38, -0.55, 0.08]], (t) => 0.1 + 0.08 * Math.sin(Math.PI * Math.min(1, t * 1.2)), 40, 16);
      const flap = tubeGroup(tube, brown);
      flap.scale.set(1, 1, 0.55);
      ear.add(flap);
      g.add(ear);
      anims.push((t) => (ear.rotation.z = s * Math.sin(t * 5 + s) * 0.12));
    }
    g.add(surfacePatch(fur(0xfff4e0), [0, -0.05, 1], 0.36, 1.2, 0.85, 0.9));
    const nose = onSurface(mesh(sphere(0.085), gloss(0x2a1f2a)), [0, 0.42, 0.9], 1.02);
    nose.scale.set(1.3, 0.9, 1);
    g.add(nose);
    // a happy little tongue under the smile
    const tongue = onSurface(mesh(sphere(0.07, 24, 16), gloss(0xff8aa8)), [0, 0.16, 0.98], 0.99);
    tongue.scale.set(1, 1.3, 0.45);
    g.add(tongue);
    g.add(surfacePatch(brown, [0.55, 0.7, -0.45], 0.32, 1.1, 0.9, 0.92));
    const tail = new THREE.Group();
    tail.position.set(0, 0.0, -0.9);
    const tube = taperedTube([[0, 0, 0], [0, 0.22, -0.2], [0, 0.48, -0.26]], (t) => 0.09 - t * 0.04, 24, 12);
    tail.add(tubeGroup(tube, coat));
    g.add(tail);
    anims.push((t) => (tail.rotation.z = Math.sin(t * 11) * 0.5));
  }

  if (id === 'raccoon') {
    const coat = fur(skin.body);
    const dark = fur(0x4a4458);
    // the bandit mask sits under the eyes so they still pop on top
    g.add(surfacePatch(dark, [0, 0.58, 0.82], 0.4, 1.75, 0.55, 0.9));
    g.add(surfacePatch(fur(0xfdf8ff), [0, 0.22, 1], 0.26, 1.3, 0.8, 0.95));
    g.add(onSurface(mesh(sphere(0.065), gloss(0x2a1f2a)), [0, 0.42, 0.9], 1.02));
    for (const s of [-1, 1]) {
      const ear = mesh(sphere(0.2, 32, 20), coat, s * 0.52, 0.76, -0.08);
      ear.scale.set(1, 1, 0.5);
      const inner = mesh(sphere(0.12, 24, 16), fur(0xe8e0f0), s * 0.52, 0.77, 0.02);
      inner.scale.set(1, 1, 0.4);
      g.add(ear, inner);
    }
    // ringed tail
    const tail = new THREE.Group();
    tail.position.set(0, -0.3, -0.75);
    const tube = taperedTube([[0, 0, 0], [0, 0.25, -0.4], [0, 0.75, -0.6], [0.05, 1.15, -0.5]], (t) => 0.12 + 0.12 * Math.sin(Math.PI * Math.min(1, t * 1.1)), 64, 18);
    const along = tube.geo.attributes.along.array;
    gradient(tube.geo, (i) => 0.5 + 0.5 * Math.sin(along[i] * Math.PI * 9), skin.body, 0x4a4458, 0.35, 0.65);
    tail.add(new THREE.Mesh(tube.geo, fur(0xffffff, { vertexColors: true })), new THREE.Mesh(tube.caps[0], coat), new THREE.Mesh(tube.caps[1], dark));
    g.add(tail);
    anims.push((t) => (tail.rotation.y = Math.sin(t * 2.2) * 0.3));
  }

  if (id === 'seagull') {
    const yellow = gloss(0xffd04a);
    const wingMat = soft(0xa4aec4);
    const beak = mesh(roundedCone(0.15, 0.44, 0.3), yellow, 0, 0.12, 0.92);
    beak.rotation.x = Math.PI / 2 + 0.12;
    g.add(beak);
    g.add(mesh(sphere(0.04), gloss(0xff5a5a), 0, 0.06, 1.24));
    for (const s of [-1, 1]) {
      // folded grey wings with dark tips, gently flapping
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.86, 0.2, -0.05);
      // long folded wing sweeping down towards the tail
      const wing = mesh(sphere(0.46, 32, 20), wingMat, s * 0.1, -0.05, -0.28);
      wing.scale.set(0.24, 0.5, 1.5);
      wing.rotation.x = -0.4;
      const tip = mesh(sphere(0.2, 20, 14), soft(0x4a4458), s * 0.1, -0.36, -0.86);
      tip.scale.set(0.26, 0.45, 0.9);
      tip.rotation.x = -0.4;
      pivot.add(wing, tip);
      g.add(pivot);
      anims.push((t) => (pivot.rotation.z = s * (0.12 + Math.sin(t * 3 + s) * 0.12)));
      const foot = mesh(sphere(0.18), gloss(0xffa23a), s * 0.32, -0.86, 0.34);
      foot.scale.set(1, 0.35, 1.3);
      g.add(foot);
    }
    for (const [x, r] of [[-0.12, 0.35], [0, 0], [0.12, -0.35]]) {
      const feather = mesh(roundedCone(0.08, 0.34, 0.4, 12), soft(0xc8cede), x, -0.1, -0.95);
      feather.rotation.set(-Math.PI / 2 - 0.3, 0, r);
      g.add(feather);
    }
  }


  // ---------------------------------------------------------------- Skyhaven

  if (id === 'sheep') {
    const wool = fur(skin.body);
    const face = soft(0xd8c2b4);
    // fluffy wool clumps all over the top and back, leaving the face clear
    const golden = Math.PI * (3 - Math.sqrt(5));
    const d = new THREE.Vector3();
    for (let i = 0; i < 60; i++) {
      const y = 1 - (i / 59) * 2, r = Math.sqrt(1 - y * y);
      d.set(Math.cos(golden * i) * r, y, Math.sin(golden * i) * r);
      if (d.y < -0.45 || (d.z > 0.3 && d.y < 0.78)) continue;
      const clump = onSurface(mesh(sphere(0.2 + (i % 3) * 0.03, 16, 12), wool), d.toArray(), 0.97);
      clump.scale.set(1, 1, 0.55);
      g.add(clump);
    }
    // a soft darker face under the eyes, and little floppy ears
    g.add(surfacePatch(face, [0, 0.36, 0.93], 0.4, 1.3, 1.05, 0.87));
    for (const s of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(s * 0.68, 0.6, 0.38);
      const flap = mesh(sphere(0.14, 24, 16), face, s * 0.1, -0.04, 0);
      flap.scale.set(1.5, 0.6, 0.85);
      flap.rotation.z = s * -0.5;
      ear.add(flap);
      g.add(ear);
      anims.push((t) => (ear.rotation.z = s * Math.sin(t * 3.4 + s) * 0.12));
    }
  }

  if (id === 'goat') {
    const coat = fur(skin.body);
    // curly ram horns sweeping back and round, with ridges
    for (const s of [-1, 1]) {
      // hugging the side of the head: up from the crown, back, then curling down and forward
      const tube = taperedTube([[s * 0.28, 0.88, 0.2], [s * 0.42, 1.0, -0.04], [s * 0.64, 0.86, -0.24], [s * 0.76, 0.58, -0.16], [s * 0.7, 0.44, 0.06], [s * 0.6, 0.56, 0.16]], (t) => 0.115 - t * 0.065, 64, 14);
      const along = tube.geo.attributes.along.array;
      gradient(tube.geo, (i) => 0.5 + 0.5 * Math.sin(along[i] * Math.PI * 22), 0xd8c8a8, 0xf4ead8, 0.3, 0.7);
      g.add(new THREE.Mesh(tube.geo, gloss(0xffffff, { vertexColors: true })), new THREE.Mesh(tube.caps[0], gloss(0xd8c8a8)), new THREE.Mesh(tube.caps[1], gloss(0xf4ead8)));
      // ears stick out sideways below the horns
      const ear = new THREE.Group();
      ear.position.set(s * 0.8, 0.3, 0.34);
      const flap = mesh(roundedCone(0.1, 0.3, 0.4, 20), coat);
      flap.scale.set(1, 1, 0.5);
      flap.rotation.z = -s * (Math.PI / 2 + 0.35);
      ear.add(flap);
      g.add(ear);
      anims.push((t) => (ear.rotation.x = Math.max(0, Math.sin(t * 1.3 + s)) ** 6 * 0.35));
    }
    g.add(surfacePatch(fur(0xfff4ea), [0, 0.22, 0.97], 0.3, 1.25, 0.85, 0.92));
    g.add(onSurface(mesh(sphere(0.05), gloss(0xc89aa8)), [0, 0.42, 0.9], 1.01));
    // a little beard tuft under the chin
    const beard = mesh(roundedCone(0.11, 0.36, 0.4, 20), fur(0xd8ccbc), 0, 0.04, 0.99);
    beard.rotation.x = Math.PI - 0.45;
    g.add(beard);
  }

  if (id === 'unicorn') {
    // spiral golden horn
    const hornGeo = roundedCone(0.12, 0.58, 0.18, 32);
    const pos = hornGeo.attributes.position;
    gradient(hornGeo, (i) => 0.5 + 0.5 * Math.sin(pos.getY(i) * 30 + Math.atan2(pos.getZ(i), pos.getX(i)) * 2), 0xf0c860, 0xfff2c8, 0.35, 0.65);
    const horn = mesh(hornGeo, gloss(0xffffff, { vertexColors: true }), 0, 0.88, 0.36);
    horn.rotation.x = 0.42;
    g.add(horn);
    for (const s of [-1, 1]) {
      const ear = mesh(roundedCone(0.12, 0.26, 0.3, 20), soft(skin.body), s * 0.4, 0.82, -0.02);
      ear.scale.set(1, 1, 0.6);
      ear.rotation.z = -s * 0.3;
      const inner = mesh(roundedCone(0.07, 0.17, 0.3, 14), soft(0xffd0e4), s * 0.4, 0.84, 0.03);
      inner.scale.set(1, 1, 0.4);
      inner.rotation.z = -s * 0.3;
      g.add(ear, inner);
    }
    // a flowing pastel rainbow mane over the head and down the back
    const mane = new THREE.Group();
    [0xffb3c6, 0xffd6a0, 0xfff0a0, 0xb8f0c8, 0xa8d8ff, 0xd0b8ff].forEach((c, k) => {
      const x = (k - 2.5) * 0.055;
      const tube = taperedTube([[x, 0.94, 0.28], [x * 1.2, 1.07, -0.08], [x * 1.4, 0.88, -0.56], [x * 1.3, 0.44, -0.92], [x, 0.02, -1.04]], (t) => 0.075 - t * 0.04, 40, 10);
      mane.add(tubeGroup(tube, soft(c)));
    });
    g.add(mane);
    anims.push((t) => (mane.rotation.z = Math.sin(t * 1.8) * 0.06));
    g.add(onSurface(mesh(sphere(0.045), gloss(0xffa8c8)), [0, 0.42, 0.9], 1.01));
  }

  if (id === 'eagle') {
    const white = soft(0xfcfaf6);
    const dark = soft(0x7a5236);
    // white-feathered head over the top and front (the eyes sit on top of it)
    g.add(surfacePatch(white, [0, 0.72, 0.68], 0.62, 1.35, 1.15, 0.83));
    const beak = mesh(roundedCone(0.14, 0.36, 0.3), gloss(0xffcc4a), 0, 0.22, 0.93);
    beak.rotation.x = Math.PI / 2 + 0.55;
    g.add(beak, mesh(sphere(0.055, 16, 12), gloss(0xffb830), 0, 0.03, 1.13));
    for (const s of [-1, 1]) {
      // broad folded wings, slowly flexing
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.84, 0.18, -0.05);
      const wing = mesh(sphere(0.5, 32, 20), dark, s * 0.12, -0.08, -0.25);
      wing.scale.set(0.26, 0.62, 1.4);
      wing.rotation.x = -0.35;
      const tip = mesh(sphere(0.24, 20, 14), soft(0x5a3a28), s * 0.12, -0.46, -0.78);
      tip.scale.set(0.27, 0.5, 0.9);
      tip.rotation.x = -0.35;
      pivot.add(wing, tip);
      g.add(pivot);
      anims.push((t) => (pivot.rotation.z = s * (0.1 + Math.sin(t * 2.2 + s) * 0.14)));
      const foot = mesh(sphere(0.17, 20, 14), gloss(0xffcc4a), s * 0.32, -0.87, 0.32);
      foot.scale.set(1, 0.35, 1.3);
      g.add(foot);
    }
    for (const [x, r] of [[-0.16, 0.42], [-0.06, 0.14], [0.06, -0.14], [0.16, -0.42]]) {
      const feather = mesh(roundedCone(0.08, 0.36, 0.4, 12), white, x, -0.12, -0.95);
      feather.rotation.set(-Math.PI / 2 - 0.3, 0, r);
      g.add(feather);
    }
  }

  if (id === 'owl') {
    const brown = fur(0xa8744e);
    // pale heart-shaped facial disc around the eyes (the eyes still sit on top)
    const disc = soft(0xfff0dc);
    for (const s of [-1, 1]) g.add(surfacePatch(disc, [s * 0.3, 0.55, 0.8], 0.3, 1.05, 1.1, 0.93));
    g.add(surfacePatch(fur(0xffe4c4), [0, -0.3, 0.95], 0.4, 1.1, 1.0, 0.92));
    // speckles on the chest
    for (const [x, y] of [[-0.18, -0.2], [0.1, -0.15], [-0.05, -0.38], [0.22, -0.36], [-0.25, -0.5], [0.05, -0.56]]) {
      const v = new THREE.Vector3(x, y, 0).setZ(Math.sqrt(1 - x * x - y * y));
      const dot = onSurface(mesh(roundedCone(0.04, 0.05, 0.6, 10), brown), v.toArray(), 0.97);
      dot.scale.set(1, 1, 0.4);
      g.add(dot);
    }
    const beak = mesh(roundedCone(0.07, 0.2, 0.35, 16), gloss(0xffa23a), 0, 0.42, 0.88);
    beak.rotation.x = Math.PI / 2 + 0.7;
    g.add(beak);
    for (const s of [-1, 1]) {
      // ear tufts that twitch now and then
      const tuft = new THREE.Group();
      tuft.position.set(s * 0.42, 0.84, 0.12);
      const cone = mesh(roundedCone(0.12, 0.34, 0.35, 20), brown);
      cone.scale.set(1, 1, 0.55);
      cone.rotation.z = -s * 0.45;
      tuft.add(cone);
      g.add(tuft);
      anims.push((t) => (tuft.rotation.z = -s * Math.max(0, Math.sin(t * 1.1 + s * 1.7)) ** 10 * 0.35));
      // wing patches folded at the sides
      const wing = onSurface(mesh(sphere(0.4, 24, 16), brown), [s * 0.9, -0.05, -0.2], 0.92);
      wing.scale.set(0.75, 1.15, 0.32);
      g.add(wing);
      const foot = mesh(sphere(0.15, 20, 14), gloss(0xffa23a), s * 0.28, -0.88, 0.36);
      foot.scale.set(1, 0.35, 1.2);
      g.add(foot);
    }
  }


  // ---------------------------------------------------------------- Sunroam

  if (id === 'lion') {
    const mane = fur(0xb8742e);
    const cream = fur(0xfff0d0);
    // a ring of shaggy mane clumps around the face, fuller toward the back
    const golden = Math.PI * (3 - Math.sqrt(5));
    const d = new THREE.Vector3();
    const face = new THREE.Vector3(0, 0.3, 1).normalize();
    for (let i = 0; i < 90; i++) {
      const y = 1 - (i / 89) * 2, r = Math.sqrt(1 - y * y);
      d.set(Math.cos(golden * i) * r, y, Math.sin(golden * i) * r);
      const ang = d.angleTo(face);
      if (ang < 0.78 || ang > 1.75 || d.y < -0.35) continue;
      const clump = onSurface(mesh(sphere(0.2 + (i % 3) * 0.035, 16, 12), mane), d.toArray(), 0.99);
      clump.scale.set(1, 1, 0.55);
      g.add(clump);
    }
    for (const s of [-1, 1]) {
      const ear = mesh(sphere(0.15, 24, 16), fur(skin.body), s * 0.5, 0.82, 0.3);
      ear.scale.set(1, 1, 0.55);
      g.add(ear, mesh(sphere(0.08, 16, 12), soft(0xffc8b0), s * 0.5, 0.82, 0.37));
    }
    g.add(surfacePatch(cream, [0, -0.02, 0.96], 0.34, 1.35, 0.82, 0.9));
    g.add(onSurface(mesh(sphere(0.06), gloss(0xc87a78)), [0, 0.22, 0.93], 1.01));
    // tail with a tufted tip, swishing gently
    const tail = new THREE.Group();
    tail.position.set(0, -0.35, -0.92);
    const tube = taperedTube([[0, 0, 0], [0.1, 0.1, -0.3], [-0.05, 0.28, -0.5], [0.1, 0.5, -0.6]], (t) => 0.05 - t * 0.012, 24, 8);
    tail.add(tubeGroup(tube, fur(skin.body)), mesh(sphere(0.12, 16, 12), mane, 0.1, 0.54, -0.62));
    g.add(tail);
    anims.push((t) => (tail.rotation.y = Math.sin(t * 1.6) * 0.3));
  }

  if (id === 'parrot') {
    const red = soft(0xff5a4a);
    const blue = soft(0x3a9ae8);
    const yellow = soft(0xffd84a);
    // pale face mask around the eyes, hooked beak
    for (const s of [-1, 1]) g.add(surfacePatch(soft(0xfff4ec), [s * 0.3, 0.55, 0.8], 0.28, 1.05, 1.1, 0.93));
    const beak = mesh(roundedCone(0.13, 0.32, 0.4, 20), gloss(0xe8e2d8), 0, 0.3, 0.9);
    beak.rotation.x = Math.PI / 2 + 0.75;
    g.add(beak, mesh(sphere(0.07, 16, 12), gloss(0x4a4650), 0, 0.12, 1.05));
    // three-feather crest
    [[-0.12, 0.35], [0, 0], [0.12, -0.35]].forEach(([x, r], k) => {
      const f = mesh(roundedCone(0.07, 0.34 - Math.abs(k - 1) * 0.04, 0.4, 14), [yellow, red, yellow][k], x, 0.92, 0.04);
      f.rotation.set(-0.25, 0, -r);
      g.add(f);
    });
    for (const s of [-1, 1]) {
      // folded wings, blue over yellow, flexing slowly
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.84, 0.15, -0.05);
      const wing = mesh(sphere(0.5, 32, 20), blue, s * 0.1, -0.08, -0.22);
      wing.scale.set(0.24, 0.62, 1.3);
      wing.rotation.x = -0.3;
      const tip = mesh(sphere(0.22, 20, 14), yellow, s * 0.1, -0.44, -0.7);
      tip.scale.set(0.25, 0.48, 0.85);
      tip.rotation.x = -0.3;
      pivot.add(wing, tip);
      g.add(pivot);
      anims.push((t) => (pivot.rotation.z = s * (0.08 + Math.sin(t * 2.4 + s) * 0.12)));
      const foot = mesh(sphere(0.15, 20, 14), gloss(0x8a8480), s * 0.3, -0.88, 0.34);
      foot.scale.set(1, 0.35, 1.25);
      g.add(foot);
    }
    // long tail feathers
    [[-0.14, 0.3, blue], [0, 0, red], [0.14, -0.3, yellow]].forEach(([x, r, m]) => {
      const f = mesh(roundedCone(0.08, 0.6, 0.4, 14), m, x, -0.2, -0.95);
      f.rotation.set(-Math.PI / 2 - 0.5, 0, r);
      g.add(f);
    });
  }

  if (id === 'hippo') {
    const pink = soft(0xe0b8d0);
    // a big wide muzzle with two nostrils and a pair of little tusks
    g.add(surfacePatch(pink, [0, 0.05, 0.96], 0.52, 1.45, 0.85, 0.9));
    for (const s of [-1, 1]) {
      g.add(onSurface(mesh(sphere(0.055), gloss(0x7a5a78)), [s * 0.2, 0.2, 0.95], 1.01));
      const tusk = mesh(roundedCone(0.04, 0.12, 0.4, 10), soft(0xfff8ec), s * 0.3, -0.18, 0.96);
      tusk.rotation.x = Math.PI;
      g.add(tusk);
      // tiny ears that flick
      const ear = new THREE.Group();
      ear.position.set(s * 0.52, 0.86, 0.14);
      const flap = mesh(sphere(0.12, 20, 14), soft(skin.body));
      flap.scale.set(1, 0.9, 0.55);
      flap.rotation.z = -s * 0.4;
      ear.add(flap, mesh(sphere(0.06, 14, 10), pink, 0, -0.01, 0.04));
      g.add(ear);
      anims.push((t) => (ear.rotation.z = s * Math.max(0, Math.sin(t * 1.4 + s * 2)) ** 8 * 0.4));
    }
  }

  if (id === 'panda') {
    const black = fur(0x2c2838);
    // round black ears and eye patches (the eyes still sit on top)
    for (const s of [-1, 1]) {
      const ear = mesh(sphere(0.2, 24, 16), black, s * 0.58, 0.8, 0.02);
      ear.scale.set(1, 1, 0.65);
      g.add(ear);
      const patch = surfacePatch(black, [s * 0.3, 0.55, 0.8], 0.26, 0.8, 1.25, 0.93);
      patch.rotation.z = s * 0.45;
      g.add(patch);
      // black arm patches on the sides, little feet
      const arm = onSurface(mesh(sphere(0.38, 24, 16), black), [s * 0.95, -0.15, 0.2], 0.92);
      arm.scale.set(0.5, 1.1, 0.3);
      g.add(arm);
      const foot = mesh(sphere(0.16, 20, 14), black, s * 0.3, -0.88, 0.34);
      foot.scale.set(1, 0.4, 1.2);
      g.add(foot);
    }
    const pandaNose = onSurface(mesh(sphere(0.07), gloss(0x2c2838)), [0, 0.34, 0.93], 1.01);
    pandaNose.scale.set(1.4, 1, 1);
    g.add(pandaNose);
    // a stalk of bamboo hugged to the chest
    const stalk = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8), soft(0x78c050), 0.28, -0.4, 0.92);
    stalk.rotation.z = 0.5;
    g.add(stalk);
  }

  if (id === 'koala') {
    const grey = fur(skin.body);
    const fluff = fur(0xf4f0f4);
    // big round fluffy ears
    for (const s of [-1, 1]) {
      const ear = mesh(sphere(0.3, 28, 20), grey, s * 0.68, 0.7, 0.04);
      ear.scale.set(1, 1, 0.55);
      const inner = mesh(sphere(0.2, 24, 16), fluff, s * 0.68, 0.7, 0.1);
      inner.scale.set(1, 1, 0.5);
      g.add(ear, inner);
      const foot = mesh(sphere(0.15, 20, 14), grey, s * 0.3, -0.88, 0.34);
      foot.scale.set(1, 0.4, 1.2);
      g.add(foot);
    }
    // big oval leathery nose and a pale tummy
    const nose = onSurface(mesh(sphere(0.12, 24, 16), gloss(0x3a3040)), [0, 0.36, 0.92], 1.0);
    nose.scale.set(1.2, 1.5, 0.8);
    g.add(nose);
    g.add(surfacePatch(fluff, [0, -0.35, 0.93], 0.5, 1.0, 1.1, 0.88));
    // a eucalyptus leaf tucked behind one ear
    const leaf = mesh(new THREE.SphereGeometry(0.1, 12, 8).scale(0.45, 1.1, 0.12), soft(0x8fb89a), 0.55, 0.95, 0.12);
    leaf.rotation.z = -0.6;
    g.add(leaf);
  }


  // ---------------------------------------------------------------- Seaglow

  if (id === 'otter') {
    const coat = fur(skin.body);
    const cream = fur(0xf0dcc4);
    // pale muzzle and chest, small round ears, long whiskers and a little shell held to the tummy
    g.add(surfacePatch(cream, [0, 0.06, 0.96], 0.4, 1.3, 0.85, 0.9));
    g.add(surfacePatch(cream, [0, -0.45, 0.9], 0.45, 1.0, 1.1, 0.88));
    g.add(onSurface(mesh(sphere(0.06), gloss(0x3a2e34)), [0, 0.2, 0.95], 1.01));
    for (const s of [-1, 1]) {
      const ear = mesh(sphere(0.12, 20, 14), coat, s * 0.5, 0.84, 0.1);
      ear.scale.set(1, 1, 0.6);
      g.add(ear);
      for (const k of [-1, 0, 1]) {
        const w = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.28, 4), matte(0xfff4e8), s * 0.34, 0.14 + k * 0.05, 0.98);
        w.rotation.z = Math.PI / 2 + s * k * 0.15;
        w.rotation.y = s * 0.25;
        g.add(w);
      }
      const paw = mesh(sphere(0.13, 20, 14), coat, s * 0.2, -0.4, 1.0);
      paw.scale.set(1, 0.8, 0.8);
      g.add(paw);
    }
    const shell = mesh(new THREE.SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1), soft(0xf4d0e0), 0, -0.4, 1.02);
    shell.rotation.x = Math.PI / 2 - 0.2;
    g.add(shell);
    // a rudder-like tail
    const tail = mesh(roundedCone(0.14, 0.55, 0.4, 20), coat, 0, -0.55, -0.85);
    tail.rotation.x = -Math.PI / 2 - 0.5;
    tail.scale.set(1, 1, 0.5);
    g.add(tail);
    anims.push((t) => (tail.rotation.z = Math.sin(t * 1.5) * 0.15));
  }

  if (id === 'pufferfish') {
    const yellow = soft(skin.body);
    const cream = soft(0xfff4d0);
    // pale tummy, a ring of little spikes, pectoral fins that flutter, and a fish tail
    g.add(surfacePatch(cream, [0, -0.35, 0.93], 0.55, 1.2, 1.1, 0.88));
    const golden = Math.PI * (3 - Math.sqrt(5));
    const d = new THREE.Vector3();
    for (let i = 0; i < 46; i++) {
      const y = 1 - (i / 45) * 2, r = Math.sqrt(1 - y * y);
      d.set(Math.cos(golden * i) * r, y, Math.sin(golden * i) * r);
      if (d.z > 0.35 && d.y > -0.2 && d.y < 0.95) continue;
      if (d.y < -0.5) continue;
      const spike = onSurface(mesh(roundedCone(0.05, 0.16, 0.4, 10), soft(0xe8a830)), d.toArray(), 0.98);
      spike.rotateX(Math.PI / 2);
      g.add(spike);
    }
    g.add(onSurface(mesh(sphere(0.07), gloss(0xe86a6a)), [0, 0.2, 0.94], 1.01));
    for (const s of [-1, 1]) {
      const fin = new THREE.Group();
      fin.position.set(s * 0.92, 0.0, 0.2);
      const f = mesh(sphere(0.2, 20, 14), soft(0xffe8a0));
      f.scale.set(0.25, 0.9, 1);
      fin.add(f);
      g.add(fin);
      anims.push((t) => (fin.rotation.y = s * (0.2 + Math.sin(t * 5 + s) * 0.35)));
    }
    const tail = mesh(roundedCone(0.28, 0.4, 0.3, 20), yellow, 0, -0.1, -0.98);
    tail.rotation.x = -Math.PI / 2;
    tail.scale.set(1, 0.3, 1.3);
    g.add(tail);
  }

  if (id === 'shark') {
    const grey = soft(skin.body);
    const white = soft(0xf6f8fc);
    // white belly, tall dorsal fin, side fins and a crescent tail, with a toothy grin
    g.add(surfacePatch(white, [0, -0.45, 0.88], 0.62, 1.4, 1.2, 0.86));
    const dorsal = mesh(roundedCone(0.2, 0.62, 0.3, 20), grey, 0, 1.0, -0.2);
    dorsal.rotation.x = -0.45;
    dorsal.scale.set(0.35, 1, 1);
    g.add(dorsal);
    for (const s of [-1, 1]) {
      const fin = mesh(roundedCone(0.14, 0.5, 0.3, 16), grey, s * 0.88, -0.2, 0.1);
      fin.rotation.set(0.2, 0, -s * (Math.PI / 2 + 0.5));
      fin.scale.set(1, 1, 0.3);
      g.add(fin);
      for (let k = 0; k < 4; k++) {
        const tooth = mesh(new THREE.ConeGeometry(0.025, 0.06, 4), matte(0xffffff), s * (0.05 + k * 0.07), 0.07, 0.99);
        tooth.rotation.x = Math.PI;
        g.add(tooth);
      }
    }
    const tail = new THREE.Group();
    tail.position.set(0, -0.1, -0.95);
    const top = mesh(roundedCone(0.16, 0.5, 0.3, 14), grey, 0, 0.12, -0.06);
    top.rotation.x = -0.4;
    top.scale.set(0.3, 1, 1);
    const bot = mesh(roundedCone(0.12, 0.34, 0.3, 14), grey, 0, -0.1, -0.04);
    bot.rotation.x = Math.PI + 0.5;
    bot.scale.set(0.3, 1, 1);
    tail.add(top, bot);
    g.add(tail);
    anims.push((t) => (tail.rotation.y = Math.sin(t * 2.2) * 0.35));
  }

  if (id === 'jellyfish') {
    const glass = gummy(0xffc8f0);
    // a see-through bell cap with glowing spots, and a skirt of long ribbon tentacles
    const bell = mesh(new THREE.SphereGeometry(1.0, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.42), glass, 0, 0.06, 0);
    bell.scale.setScalar(1.06);
    g.add(bell);
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9, r = 0.45 + (i % 3) * 0.12;
      const spot = mesh(sphere(0.05 + (i % 2) * 0.02, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0ff).multiplyScalar(1.5) }), Math.cos(a) * r, 0.78 + (i % 3) * 0.04 - r * 0.2, Math.sin(a) * r);
      g.add(spot);
    }
    const tentacles = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const tube = taperedTube([[Math.cos(a) * 0.55, -0.65, Math.sin(a) * 0.55], [Math.cos(a) * 0.6, -0.95, Math.sin(a) * 0.6], [Math.cos(a) * 0.5, -1.25, Math.sin(a) * 0.5], [Math.cos(a) * 0.55, -1.5, Math.sin(a) * 0.55]], (t) => 0.05 - t * 0.03, 20, 8);
      const tg = tubeGroup(tube, gummy(i % 2 ? 0xffb0e8 : 0xd8b0ff));
      g.add(tg);
      tentacles.push(tg);
    }
    anims.push((t) => tentacles.forEach((tg, i) => { tg.rotation.z = Math.sin(t * 1.6 + i) * 0.08; tg.rotation.x = Math.cos(t * 1.3 + i * 1.7) * 0.08; }));
  }

  if (id === 'squid') {
    const red = soft(skin.body);
    const pale = soft(0xffd0d8);
    // a pointed mantle fin on top, pale underside, and a skirt of wavy tentacles
    const fin = mesh(roundedCone(0.4, 0.75, 0.3, 24), red, 0, 0.9, -0.1);
    fin.scale.set(1, 1, 0.7);
    fin.rotation.x = -0.2;
    g.add(fin);
    g.add(surfacePatch(pale, [0, -0.3, 0.9], 0.55, 1.15, 1.1, 0.88));
    for (const s of [-1, 1]) {
      const flap = mesh(sphere(0.3, 20, 14), red, s * 0.45, 0.95, -0.15);
      flap.scale.set(0.7, 0.18, 1.0);
      flap.rotation.z = -s * 0.5;
      g.add(flap);
    }
    const arms = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * 0.2 + (i / 5) * Math.PI * 0.6 + Math.PI;
      const x = Math.cos(a) * 0.6;
      const tube = taperedTube([[x, -0.5, 0.75], [x * 1.2, -0.75, 0.9], [x * 1.0, -1.0, 1.0], [x * 1.3, -1.2, 1.1]], (t) => 0.075 - t * 0.05, 20, 8);
      const tg = tubeGroup(tube, soft(i % 2 ? 0xff98a4 : skin.body));
      g.add(tg);
      arms.push(tg);
    }
    anims.push((t) => arms.forEach((tg, i) => (tg.rotation.x = Math.sin(t * 1.8 + i) * 0.1)));
  }


  // ---------------------------------------------------------------- Feastvale

  if (id === 'rooster') {
    const red = soft(0xe83a3a);
    const gold = soft(0xffb830);
    // a red comb and wattle, little beak, folded wings and a fan of tail feathers
    for (let i = 0; i < 3; i++) {
      const bump = mesh(sphere(0.1 - Math.abs(i - 1) * 0.02, 20, 14), red, 0, 0.95 - Math.abs(i - 1) * 0.05, 0.3 - i * 0.2);
      g.add(bump);
    }
    const beak = mesh(roundedCone(0.08, 0.2, 0.35, 16), gloss(0xffa82a), 0, 0.3, 0.92);
    beak.rotation.x = Math.PI / 2 + 0.5;
    g.add(beak);
    const wattle = mesh(sphere(0.08, 16, 12), red, 0, 0.06, 0.96);
    wattle.scale.set(0.8, 1.5, 0.8);
    g.add(wattle);
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.86, 0.1, -0.05);
      const wing = mesh(sphere(0.46, 28, 18), soft(0xfff0e0), s * 0.1, -0.08, -0.2);
      wing.scale.set(0.24, 0.6, 1.2);
      wing.rotation.x = -0.3;
      pivot.add(wing);
      g.add(pivot);
      anims.push((t) => (pivot.rotation.z = s * (0.08 + Math.max(0, Math.sin(t * 1.3 + s)) ** 8 * 0.5)));
      const foot = mesh(sphere(0.14, 20, 14), gloss(0xffb830), s * 0.3, -0.88, 0.34);
      foot.scale.set(1, 0.35, 1.25);
      g.add(foot);
    }
    [[-0.3, 0.55, red], [-0.15, 0.25, gold], [0, 0, soft(0x38a868)], [0.15, -0.25, gold], [0.3, -0.55, red]].forEach(([x, r, m]) => {
      const f = mesh(roundedCone(0.09, 0.62, 0.4, 14), m, x * 0.6, 0.0, -0.9);
      f.rotation.set(-0.6, 0, r);
      f.scale.set(1, 1, 0.4);
      g.add(f);
    });
  }

  if (id === 'monkey') {
    const brown = fur(skin.body);
    const tan = fur(0xf0d4a8);
    // pale heart-shaped face, round ears, and a curling tail
    for (const s of [-1, 1]) {
      g.add(surfacePatch(tan, [s * 0.18, 0.5, 0.82], 0.3, 1.0, 1.05, 0.93));
      const ear = mesh(sphere(0.18, 24, 16), brown, s * 0.78, 0.55, 0.12);
      ear.scale.set(0.6, 1, 1);
      g.add(ear, mesh(sphere(0.1, 16, 12), tan, s * 0.84, 0.55, 0.14));
      const hand = mesh(sphere(0.14, 20, 14), tan, s * 0.5, -0.42, 0.92);
      g.add(hand);
    }
    g.add(surfacePatch(tan, [0, 0.08, 0.96], 0.34, 1.2, 0.85, 0.9));
    for (const s of [-1, 1]) g.add(onSurface(mesh(sphere(0.025), gloss(0x3a2e34)), [s * 0.06, 0.2, 0.95], 1.01));
    const tail = new THREE.Group();
    tail.position.set(0, -0.45, -0.92);
    const tube = taperedTube([[0, 0, 0], [0.05, 0.05, -0.3], [0.25, 0.2, -0.5], [0.3, 0.55, -0.4], [0.15, 0.7, -0.2]], (t) => 0.06 - t * 0.02, 28, 8);
    tail.add(tubeGroup(tube, brown));
    g.add(tail);
    anims.push((t) => (tail.rotation.z = Math.sin(t * 1.8) * 0.15));
  }

  if (id === 'rat') {
    const grey = fur(skin.body);
    const pink = soft(0xffb8c8);
    // big round pink-lined ears, a pointed pink nose, whiskers, long tail and a tiny chef's hat
    for (const s of [-1, 1]) {
      const ear = mesh(sphere(0.3, 28, 20), grey, s * 0.62, 0.68, 0.04);
      ear.scale.set(1, 1, 0.5);
      const inner = mesh(sphere(0.2, 24, 16), pink, s * 0.62, 0.68, 0.08);
      inner.scale.set(1, 1, 0.5);
      g.add(ear, inner);
      for (const k of [-1, 0, 1]) {
        const w = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 4), matte(0xfaf6f0), s * 0.34, 0.12 + k * 0.05, 0.98);
        w.rotation.z = Math.PI / 2 + s * k * 0.15;
        w.rotation.y = s * 0.25;
        g.add(w);
      }
      const foot = mesh(sphere(0.14, 20, 14), pink, s * 0.3, -0.88, 0.34);
      foot.scale.set(1, 0.4, 1.2);
      g.add(foot);
    }
    const nose = onSurface(mesh(sphere(0.09, 20, 14), gloss(0xff8aa8)), [0, 0.22, 0.95], 1.0);
    nose.scale.set(1, 0.8, 1.2);
    g.add(nose);
    const tail = new THREE.Group();
    tail.position.set(0, -0.5, -0.9);
    tail.add(tubeGroup(taperedTube([[0, 0, 0], [0.1, 0.0, -0.4], [-0.15, 0.1, -0.8], [0.1, 0.15, -1.1]], (t) => 0.045 - t * 0.03, 28, 8), soft(0xf0b8c4)));
    g.add(tail);
    anims.push((t) => (tail.rotation.y = Math.sin(t * 1.5) * 0.25));
    const hat = new THREE.Group();
    hat.position.set(0, 0.98, 0.1);
    hat.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), soft(0xffffff), 0, 0.05, 0), mesh(sphere(0.25, 20, 14), soft(0xffffff), 0, 0.22, 0));
    g.add(hat);
  }

  if (id === 'pig') {
    const pink = soft(skin.body);
    const snout = soft(0xff90a8);
    // a round flat snout with nostrils, floppy triangle ears and a curly tail
    const nose = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 24), snout, 0, 0.1, 0.94);
    nose.rotation.x = Math.PI / 2;
    nose.scale.set(1.2, 1, 0.85);
    g.add(nose);
    for (const s of [-1, 1]) {
      g.add(mesh(sphere(0.045, 12, 8), matte(0xb8506a), s * 0.1, 0.1, 1.03));
      const ear = new THREE.Group();
      ear.position.set(s * 0.52, 0.8, 0.2);
      const flap = mesh(roundedCone(0.2, 0.34, 0.3, 20), pink);
      flap.scale.set(1, 1, 0.4);
      flap.rotation.set(0.5, 0, -s * 1.1);
      ear.add(flap);
      g.add(ear);
      anims.push((t) => (ear.rotation.z = s * Math.max(0, Math.sin(t * 1.5 + s)) ** 8 * 0.3));
      const foot = mesh(sphere(0.15, 20, 14), snout, s * 0.3, -0.88, 0.34);
      foot.scale.set(1, 0.4, 1.2);
      g.add(foot);
    }
    const tail = new THREE.Group();
    tail.position.set(0, -0.1, -0.97);
    tail.add(tubeGroup(taperedTube([[0, 0, 0], [0.1, 0.1, -0.1], [0.0, 0.2, -0.1], [-0.1, 0.12, -0.05], [0, 0.02, -0.12]], (t) => 0.04 - t * 0.015, 24, 8), pink));
    g.add(tail);
    anims.push((t) => (tail.rotation.z = Math.sin(t * 3) * 0.2));
  }

  if (id === 'camel') {
    const sand = fur(skin.body);
    const dark = fur(0xa87a48);
    // two soft humps, a long-lashed sleepy look, small ears and a woolly muzzle
    for (const z of [-0.12, -0.65]) {
      const hump = mesh(sphere(0.38, 28, 20), sand, 0, 0.88 - z * 0.15, z);
      hump.scale.set(0.9, 1, 0.9);
      g.add(hump);
    }
    const saddle = mesh(sphere(0.3, 24, 16), dark, 0, 1.0, -0.12);
    saddle.scale.set(0.7, 0.5, 0.7);
    g.add(saddle);
    g.add(surfacePatch(fur(0xf4dcb4), [0, 0.04, 0.96], 0.4, 1.3, 0.9, 0.9));
    for (const s of [-1, 1]) {
      g.add(onSurface(mesh(sphere(0.045), gloss(0x5a4030)), [s * 0.12, 0.18, 0.95], 1.01));
      const ear = mesh(roundedCone(0.1, 0.22, 0.4, 14), sand, s * 0.5, 0.82, 0.12);
      ear.rotation.z = -s * 0.5;
      g.add(ear, mesh(roundedCone(0.05, 0.14, 0.4, 12), soft(0xffc8b8), s * 0.5, 0.84, 0.16));
      const foot = mesh(sphere(0.15, 20, 14), dark, s * 0.3, -0.88, 0.34);
      foot.scale.set(1, 0.4, 1.2);
      g.add(foot);
    }
    const tail = new THREE.Group();
    tail.position.set(0, -0.3, -0.97);
    tail.add(tubeGroup(taperedTube([[0, 0, 0], [0, -0.1, -0.12], [0, -0.3, -0.14]], (t) => 0.035, 12, 6), sand), mesh(sphere(0.07, 12, 8), dark, 0, -0.34, -0.14));
    g.add(tail);
    anims.push((t) => (tail.rotation.x = Math.sin(t * 2) * 0.15));
  }

  if (id === 'ghost') {
    const sheet = soft(0xffffff, { transparent: true, opacity: 0.85 });
    // a wavy sheet hem around the bottom, stubby waving arms and a wisp of a tail
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const drip = mesh(roundedCone(0.2, 0.34, 0.4, 16), sheet, Math.cos(a) * 0.72, -0.76, Math.sin(a) * 0.72);
      drip.rotation.x = Math.PI;
      g.add(drip);
    }
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 0.92, 0.0, 0.1);
      const hand = mesh(sphere(0.2, 20, 14), sheet, s * 0.1, 0.12, 0.05);
      hand.scale.set(1, 1.3, 0.8);
      arm.add(hand);
      g.add(arm);
      anims.push((t) => (arm.rotation.z = -s * (0.3 + Math.sin(t * 2.4 + s) * 0.25)));
    }
    const tail = new THREE.Group();
    tail.position.set(0, -0.55, -0.85);
    tail.add(tubeGroup(taperedTube([[0, 0, 0], [0, -0.1, -0.3], [0.1, 0.05, -0.55], [-0.05, 0.2, -0.7]], (t) => 0.2 - t * 0.17, 28, 12), sheet));
    g.add(tail);
    anims.push((t) => (tail.rotation.y = Math.sin(t * 2) * 0.4));
  }

  if (id === 'bat') {
    const dark = fur(skin.body);
    const membrane = soft(0x7a62a4, { side: THREE.DoubleSide });
    // big pointed ears, a pair of tiny fangs and folded wings that flutter now and then
    for (const s of [-1, 1]) {
      const ear = mesh(roundedCone(0.24, 0.7, 0.2), dark, s * 0.42, 0.82, 0.02);
      ear.rotation.z = -s * 0.28;
      ear.scale.set(1, 1, 0.5);
      const inner = mesh(roundedCone(0.13, 0.46, 0.25), soft(0xe8a8c8), s * 0.42, 0.8, 0.09);
      inner.rotation.z = -s * 0.28;
      inner.scale.set(1, 1, 0.35);
      g.add(ear, inner);
      g.add(onSurface(mesh(new THREE.ConeGeometry(0.035, 0.1, 8).rotateX(Math.PI), matte(0xffffff)), [s * 0.09, 0.07, 0.99], 1.0));
      const wing = new THREE.Group();
      wing.position.set(s * 0.85, 0.05, -0.35);
      const arm = mesh(taperedTube([[0, 0, 0], [s * 0.3, 0.3, -0.1], [s * 0.7, 0.2, -0.3]], (t) => 0.05 - t * 0.02, 16, 6).geo, dark);
      const sail = mesh(new THREE.CircleGeometry(0.5, 3, 0, Math.PI * 2), membrane, s * 0.3, -0.1, -0.2);
      sail.rotation.set(-0.6, s * 0.5, s * 0.3);
      sail.scale.set(1.1, 0.8, 1);
      wing.add(arm, sail);
      g.add(wing);
      anims.push((t) => (wing.rotation.z = s * Math.max(0, Math.sin(t * 1.3 + s * 0.3)) ** 10 * 0.5));
      const foot = mesh(sphere(0.13, 20, 14), dark, s * 0.3, -0.88, 0.34);
      foot.scale.set(1, 0.4, 1.2);
      g.add(foot);
    }
    g.add(surfacePatch(fur(0x8a74b0), [0, -0.2, 1], 0.38, 1.1, 0.8, 0.9));
    g.add(onSurface(mesh(sphere(0.05), gloss(0x2a1f2a)), [0, 0.36, 0.93], 1.01));
  }

  if (id === 'witch') {
    const dark = soft(0x2e2540);
    // a floppy pointed hat with a gold buckle, a long nose and a wiggly broom tail
    const hat = new THREE.Group();
    hat.position.set(0, 0.88, 0.0);
    hat.rotation.x = -0.12;
    hat.add(mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 36), dark, 0, 0.02, 0));
    hat.add(mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.12, 28), dark, 0, 0.09, 0));
    const tip = mesh(roundedCone(0.3, 0.75, 0.3, 28), dark, 0, 0.14, 0);
    tip.rotation.x = -0.35;
    hat.add(tip);
    hat.add(mesh(new THREE.CylinderGeometry(0.325, 0.395, 0.07, 28), soft(0xffb84a), 0, 0.13, 0));
    hat.add(mesh(new THREE.TorusGeometry(0.09, 0.02, 8, 16), soft(0xfff0b0), 0, 0.14, 0.36));
    g.add(hat);
    const nose = onSurface(mesh(roundedCone(0.08, 0.28, 0.4, 16), soft(skin.body)), [0, 0.1, 1], 0.98);
    nose.rotateX(1.1);
    g.add(nose);
    g.add(onSurface(mesh(sphere(0.03), matte(0x4a6a3a)), [0.08, 0.14, 1], 1.02));
    for (const s of [-1, 1]) {
      const foot = mesh(sphere(0.14, 20, 14), dark, s * 0.3, -0.88, 0.34);
      foot.scale.set(1, 0.4, 1.2);
      g.add(foot);
    }
    const broom = new THREE.Group();
    broom.position.set(0, -0.35, -0.95);
    broom.add(tubeGroup(taperedTube([[0, 0, 0], [0, 0.1, -0.3], [0, 0.3, -0.5]], () => 0.03, 12, 6), soft(0x8a6a4a)));
    const bristles = mesh(roundedCone(0.14, 0.32, 0.4, 14), soft(0xd8b060), 0, 0.3, -0.62);
    bristles.rotation.x = -Math.PI / 2 - 0.4;
    broom.add(bristles);
    g.add(broom);
    anims.push((t) => (broom.rotation.y = Math.sin(t * 3) * 0.3));
  }

  if (id === 'zombie') {
    const green = soft(skin.body);
    const rot = soft(0x6aa05c);
    // patchy rotten skin, stitches across the forehead, a tuft of messy hair and a loose jaw tooth
    for (const [d, r] of [[[0.7, 0.2, 0.6], 0.2], [[-0.6, -0.3, 0.7], 0.16], [[0.2, 0.6, -0.7], 0.22], [[-0.5, 0.5, -0.6], 0.15]]) {
      const m = onSurface(mesh(sphere(r), rot), d, 0.975);
      m.scale.set(1, 1, 0.22);
      g.add(m);
    }
    const stitchMat = matte(0x3a3040);
    const line = onSurface(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6).rotateZ(Math.PI / 2), stitchMat), [0.1, 0.78, 0.6], 0.99);
    g.add(line);
    for (const x of [-0.14, -0.05, 0.05, 0.14]) g.add(onSurface(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 6), stitchMat), [0.1 + x, 0.78, 0.6], 0.99));
    for (let i = 0; i < 5; i++) {
      const tuft = mesh(roundedCone(0.07, 0.3, 0.4, 10), soft(0x3a4a30), (i - 2) * 0.1, 0.96, -0.05 + (i % 2) * 0.06);
      tuft.rotation.set(0.1 * (i % 3 - 1), 0, (i - 2) * 0.35);
      g.add(tuft);
    }
    g.add(onSurface(mesh(new THREE.ConeGeometry(0.035, 0.09, 6).rotateX(Math.PI), matte(0xf2ecd8)), [0.12, 0.08, 0.99], 1.0));
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(s * 0.9, -0.1, 0.35);
      const hand = mesh(sphere(0.2, 20, 14), green, s * 0.05, 0, 0.3);
      hand.scale.set(1, 0.9, 1.3);
      arm.add(hand);
      g.add(arm);
      anims.push((t) => (arm.position.y = -0.1 + Math.sin(t * 2 + s * 1.5) * 0.06));
      const foot = mesh(sphere(0.14, 20, 14), rot, s * 0.3, -0.88, 0.34);
      foot.scale.set(1, 0.4, 1.2);
      g.add(foot);
    }
  }

  if (id === 'spider') {
    const dark = fur(skin.body);
    // eight bendy legs, a cluster of extra eyes, little fangs and a red hourglass on the back
    const legs = [];
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const z = 0.45 - i * 0.32;
        const out = 1.2 + (i === 1 || i === 2 ? 0.15 : 0);
        const leg = new THREE.Group();
        leg.position.set(s * 0.8, 0.12, z * 0.8);
        const tube = taperedTube([[0, 0, 0], [s * 0.3, 0.38, z * 0.25], [s * out * 0.65, 0.2, z * 0.7], [s * out * 0.75, -0.55, z * 1.0]], (t) => 0.06 - t * 0.035, 24, 8);
        leg.add(tubeGroup(tube, dark));
        g.add(leg);
        legs.push([leg, s, i]);
      }
    }
    anims.push((t) => legs.forEach(([leg, s, i]) => (leg.rotation.z = s * Math.sin(t * 3 + i * 1.3 + (s > 0 ? 1.6 : 0)) * 0.07)));
    for (const [x, y, r] of [[-0.14, 0.78, 0.055], [0.14, 0.78, 0.055], [-0.05, 0.88, 0.04], [0.05, 0.88, 0.04]]) {
      g.add(onSurface(mesh(sphere(r, 16, 12), gloss(0xff6a8a)), [x * 2.2, y, 0.55], 1.0));
    }
    for (const s of [-1, 1]) g.add(onSurface(mesh(new THREE.ConeGeometry(0.035, 0.12, 8).rotateX(Math.PI), matte(0xf4f0f8)), [s * 0.1, 0.07, 0.99], 1.0));
    const hour = soft(0xe8384a);
    g.add(surfacePatch(hour, [0, 0.25, -1], 0.13, 1, 0.9, 0.99), surfacePatch(hour, [0, -0.05, -1], 0.13, 1, 0.9, 0.99));
  }

  g.userData.animate = (t) => anims.forEach((a) => a(t));
  return g;
}

// ---------------------------------------------------------------- face

// Glossy eyes (flat pupils + catch-lights), a little smile and blush cheeks.
// setOpen(0..1) blends from a sleepy line to wide open; look(x) shifts the pupils.
export function buildEyes(lift = false) {
  const g = new THREE.Group();
  const white = shiny(0xeceaf4);
  const iris = shiny(0x2c2240);
  const shine = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 1.15, 1.15) });
  const lid = matte(0x3a2e4a);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group();
    if (lift) e.position.set(s * 0.38, 0.84, 0.62);
    else e.position.set(s * 0.3, 0.58, 0.76);
    e.rotation.x = lift ? -0.3 : -0.45;
    e.rotation.y = s * 0.18;
    const ball = mesh(sphere(0.2, 48, 32), white);
    ball.scale.set(1, 1.08, 0.75);
    // the pupil hugs the eyeball's surface instead of poking out of it
    const pupil = mesh(sphere(0.125, 40, 28), iris, 0, -0.01, 0.1);
    pupil.scale.set(1, 1.1, 0.55);
    const shine1 = mesh(sphere(0.042, 20, 14), shine, 0.045, 0.055, 0.165);
    const shine2 = mesh(sphere(0.02, 16, 12), shine, -0.04, -0.045, 0.16);
    const closed = mesh(new THREE.TorusGeometry(0.11, 0.022, 12, 32, Math.PI), lid, 0, 0.02, 0.15);
    closed.rotation.z = Math.PI;
    const open = new THREE.Group();
    open.add(ball, pupil, shine1, shine2);
    e.add(open, closed);
    e.userData = { open, closed, pupil, shine1, shine2 };
    eyes.push(e);
    g.add(e);
  }
  // smile + cheeks
  const smile = onSurface(mesh(new THREE.TorusGeometry(0.075, 0.018, 12, 32, Math.PI), lid), lift ? [0, 0.38, 0.92] : [0, 0.28, 0.96], 0.99);
  smile.rotateZ(Math.PI);
  g.add(smile);
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xff9ac0, transparent: true, opacity: 0.55, depthWrite: false });
  for (const s of [-1, 1]) {
    const cheek = onSurface(mesh(new THREE.CircleGeometry(0.11, 32), blushMat), lift ? [s * 0.58, 0.42, 0.7] : [s * 0.52, 0.32, 0.79], 1.0);
    cheek.scale.set(1.25, 0.8, 1);
    g.add(cheek);
  }

  g.userData.setOpen = (v) => {
    for (const e of eyes) {
      e.userData.open.scale.set(1, Math.max(0.05, v), 1);
      e.userData.open.visible = v > 0.08;
      e.userData.closed.visible = v <= 0.08;
    }
  };
  g.userData.look = (x) => eyes.forEach((e) => {
    e.userData.pupil.position.x = x;
    e.userData.shine1.position.x = 0.045 + x;
    e.userData.shine2.position.x = -0.04 + x;
  });
  g.userData.setOpen(1);
  return g;
}
