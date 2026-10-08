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
};

export const CREATURE_IDS = ['bunny', 'frog', 'fox', 'penguin', 'moth', 'snail', 'turtle', 'lizard', 'bear', 'hedgehog'];

// ---------------------------------------------------------------- materials

// All cheap materials (see quality.js): matte for fur and skin, shiny for shells, beaks, noses.
const fur = (color, extra = {}) => matte(color, { roughness: 0.85, ...extra });
const gloss = (color, extra = {}) => shiny(color, extra);
const gummy = (color) => shiny(color, { transparent: true, opacity: 0.88 });
const soft = (color, extra = {}) => matte(color, { roughness: 0.6, ...extra });

// what each sleeping creature's body is made of
const BODY_STYLE = { fox: fur, bunny: fur, hedgehog: fur, moth: fur, penguin: soft, turtle: soft, frog: gloss, lizard: gloss, snail: gloss, bear: gummy };
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
