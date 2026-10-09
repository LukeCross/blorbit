import * as THREE from 'three';
import { matte } from './quality.js';

// Little ambient animals that move in once an area is restored.

const lambert = (c, extra) => matte(c, extra);
const unlit = (c, extra) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.6), ...extra });
const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const basis = new THREE.Matrix4();
const right = new THREE.Vector3();
const toAnchor = new THREE.Vector3();

function wings(color, w, h, opacity = 1, emissive = false) {
  const mat = (emissive ? unlit : lambert)(color, { side: THREE.DoubleSide, transparent: opacity < 1, opacity });
  const geo = new THREE.CircleGeometry(1, 24).scale(w, h, 1);
  const out = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    const wing = new THREE.Mesh(geo, mat);
    wing.rotation.x = -Math.PI / 2;
    wing.position.x = s * w;
    pivot.add(wing);
    pivot.userData.side = s;
    out.push(pivot);
  }
  return out;
}

const KINDS = {
  butterfly: { flying: true, speed: 1.1, hover: [0.6, 1.3], turn: 2.5, build: () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.1, 2, 6).rotateX(Math.PI / 2), lambert(0x2a2030)));
    const w = wings(rnd([0xffa0d0, 0x8ad0ff, 0xffd84a, 0xff8a4a, 0xc8a0ff, 0xffffff]), 0.1, 0.08);
    g.add(...w);
    return { g, wings: w, flap: 14, amp: 0.9 };
  } },
  moth: { flying: true, speed: 0.9, hover: [0.6, 1.4], turn: 2.5, build: () => {
    const g = new THREE.Group();
    const w = wings(rnd([0xe8e0ff, 0xc8f0ff]), 0.11, 0.08, 1, true);
    g.add(...w);
    return { g, wings: w, flap: 10, amp: 0.8 };
  } },
  dragonfly: { flying: true, speed: 2.4, hover: [0.4, 0.9], turn: 4, build: () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.24, 2, 6).rotateX(Math.PI / 2), unlit(rnd([0x4ad8ff, 0x6aff9a, 0x9a7aff]))));
    const w = wings(0xe0f8ff, 0.12, 0.03, 0.6);
    g.add(...w);
    return { g, wings: w, flap: 40, amp: 0.4 };
  } },
  bee: { flying: true, speed: 1.8, hover: [0.4, 0.9], turn: 5, build: () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8).scale(1, 1, 1.4), lambert(0xffc83a)));
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.015, 6, 16), lambert(0x2a2020)));
    const w = wings(0xffffff, 0.05, 0.035, 0.7);
    w.forEach((p) => (p.position.y = 0.05));
    g.add(...w);
    return { g, wings: w, flap: 40, amp: 0.5 };
  } },
  firefly: { flying: true, speed: 0.5, hover: [0.4, 1.6], turn: 1.5, build: () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), unlit(rnd([0xd8ff6a, 0xfff07a, 0x9affd0]))));
    return { g, glow: true };
  } },
  ember: { flying: true, speed: 0.6, hover: [0.3, 1.8], turn: 2, build: () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), unlit(rnd([0xff7a2a, 0xffb03a, 0xff4a2a]))));
    return { g, glow: true };
  } },
  bird: { flying: false, speed: 1.2, hover: [0, 0], turn: 3, hop: true, build: () => {
    const g = new THREE.Group();
    const col = rnd([0x5a8aff, 0xff6a5a, 0xffd04a, 0x8a6a4a, 0xffffff]);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8).scale(1, 0.9, 1.2).translate(0, 0.1, 0), lambert(col)));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8).translate(0, 0.2, 0.08), lambert(col)));
    g.add(new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 8).rotateX(Math.PI / 2).translate(0, 0.2, 0.17), lambert(0xffa02a)));
    g.add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 8).rotateX(-Math.PI / 2 - 0.4).translate(0, 0.13, -0.14), lambert(col)));
    return { g };
  } },
  crab: { flying: false, speed: 0.8, hover: [0, 0], turn: 2, sideways: true, build: () => {
    const g = new THREE.Group();
    const red = lambert(0xff5a3a);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10).scale(1.3, 0.55, 1).translate(0, 0.08, 0), red));
    for (const s of [-1, 1]) {
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8).scale(1, 0.7, 1.2).translate(s * 0.17, 0.1, 0.1), red));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8).translate(s * 0.05, 0.16, 0.08), lambert(0x111111)));
    }
    return { g };
  } },
  // Seaglow: schooling minnows and drifting jellyfish (they swim a little above the seabed)
  minnow: { flying: true, speed: 1.4, hover: [0.25, 0.9], turn: 4, build: () => {
    const g = new THREE.Group();
    const col = rnd([0xffb04a, 0x6ad8ff, 0xff7ab0, 0xffe86a, 0x9affc8]);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8).scale(0.55, 0.8, 1.5), unlit(col, { transparent: true, opacity: 0.9 })));
    g.add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 8).rotateX(-Math.PI / 2).translate(0, 0, -0.13), unlit(col)));
    return { g };
  } },
  jelly: { flying: true, speed: 0.25, hover: [0.5, 1.5], turn: 1.2, build: () => {
    const g = new THREE.Group();
    const col = rnd([0xff9ae0, 0x9ab8ff, 0x9affe0, 0xd89aff]);
    const mat = unlit(col, { transparent: true, opacity: 0.75 });
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.06, 0), mat));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.004, 0.2, 4).translate(Math.cos(a) * 0.06, -0.05, Math.sin(a) * 0.06), mat));
    }
    return { g, glow: true };
  } },
  // Gloomhollow: flapping bats and little see-through ghosts that bob along
  bat: { flying: true, speed: 1.5, hover: [0.6, 1.6], turn: 4, build: () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8).scale(0.9, 0.9, 1.2), lambert(0x2a2236)));
    for (const s of [-1, 1]) g.add(new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 6).translate(s * 0.03, 0.06, 0.03), lambert(0x2a2236)));
    const w = wings(rnd([0x3a2e4a, 0x4a2e52, 0x2e2a40]), 0.11, 0.05);
    g.add(...w);
    return { g, wings: w, flap: 18, amp: 0.8 };
  } },
  ghost: { flying: true, speed: 0.4, hover: [0.3, 1.2], turn: 1.5, build: () => {
    const g = new THREE.Group();
    const mat = unlit(0xe8f0ff, { transparent: true, opacity: 0.7 });
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10).translate(0, 0.08, 0), mat));
    g.add(new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 12).rotateX(Math.PI).translate(0, -0.02, 0), mat));
    for (const s of [-1, 1]) g.add(new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6).translate(s * 0.035, 0.1, 0.075), lambert(0x222233)));
    return { g, glow: true };
  } },
  // Stompvale: gliding pterosaurs and tiny waddling hatchlings
  pterosaur: { flying: true, speed: 1.2, hover: [1.0, 2.0], turn: 1.8, build: () => {
    const g = new THREE.Group();
    const skin = rnd([0xe8a05a, 0xd88a6a, 0xc8a078]);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8).scale(0.8, 0.8, 1.5), lambert(skin)));
    g.add(new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.2, 6).rotateX(Math.PI / 2).translate(0, 0.01, 0.18), lambert(0xf0c890)));
    g.add(new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.14, 4).rotateX(-Math.PI / 2 - 0.5).translate(0, 0.07, -0.1), lambert(0xd85a3a)));
    const w = wings(skin, 0.2, 0.07);
    g.add(...w);
    return { g, wings: w, flap: 6, amp: 0.7 };
  } },
  hatchling: { flying: false, speed: 0.6, hover: [0, 0], turn: 3, build: () => {
    const g = new THREE.Group();
    const col = rnd([0x7ac86a, 0x6ac8b8, 0xe8b85a]);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8).scale(1, 0.85, 1.25).translate(0, 0.1, 0), lambert(col)));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8).translate(0, 0.17, 0.12), lambert(col)));
    g.add(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 6).rotateX(-Math.PI / 2 - 0.3).translate(0, 0.09, -0.16), lambert(col)));
    for (const x of [-1, 1]) {
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6).translate(x * 0.03, 0.19, 0.17), lambert(0x111111)));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6).scale(1, 0.6, 1.3).translate(x * 0.05, 0.02, 0.03), lambert(0xf0e6c8)));
    }
    return { g };
  } },
  fish: { jumper: true, build: () => {
    const g = new THREE.Group();
    const col = rnd([0xff8a3a, 0xffd04a, 0x8ad0ff, 0xff6a9a]);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8).scale(0.6, 0.8, 1.5), lambert(col)));
    g.add(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.1, 10).rotateX(Math.PI / 2).translate(0, 0, -0.16), lambert(col)));
    return { g };
  } },
};

export class Critters {
  constructor(scene, planet, onSplash) {
    this.scene = scene;
    this.planet = planet;
    this.onSplash = onSplash;
    this.list = [];
    this.group = new THREE.Group();
    scene.add(this.group);
  }

  spawn(kind, anchor, radius) {
    if (this.list.length > 140 || !KINDS[kind]) return;
    const def = KINDS[kind];
    const built = def.build();
    built.g.matrixAutoUpdate = false;
    this.group.add(built.g);
    const dir = anchor.clone().applyAxisAngle(new THREE.Vector3().randomDirection().cross(anchor).normalize(), Math.random() * radius * 0.6).normalize();
    const heading = new THREE.Vector3().randomDirection().projectOnPlane(dir).normalize();
    this.list.push({
      kind, def, ...built, dir, heading, anchor: anchor.clone(), radius: Math.max(radius, 0.12),
      t: Math.random() * 10, born: 0, hover: def.hover ? def.hover[0] + Math.random() * (def.hover[1] - def.hover[0]) : 0,
      jumpAt: 1 + Math.random() * 3, jumpT: -1,
    });
  }

  update(dt) {
    const R = this.planet.R;
    for (const c of this.list) {
      c.t += dt;
      c.born = Math.min(1, c.born + dt * 2);
      let lift = c.hover;
      let scale = c.born;
      const fwd = c.heading;

      if (c.def.jumper) {
        // fish: hidden underwater, leaps out in an arc now and then
        if (c.jumpT < 0) {
          c.jumpAt -= dt;
          scale = 0;
          if (c.jumpAt <= 0) {
            c.jumpT = 0;
            c.dir.copy(c.anchor).applyAxisAngle(new THREE.Vector3().randomDirection().cross(c.anchor).normalize(), Math.random() * c.radius * 0.7).normalize();
            c.heading.randomDirection().projectOnPlane(c.dir).normalize();
            this.onSplash?.(c.dir);
          }
        } else {
          c.jumpT += dt / 0.8;
          const k = c.jumpT;
          lift = Math.sin(k * Math.PI) * 0.9 - 0.1;
          this.advance(c, 1.0 * dt / R);
          c.g.userData.pitch = (0.5 - k) * 2.2;
          if (k >= 1) {
            c.jumpT = -1;
            c.jumpAt = 1.5 + Math.random() * 4;
            this.onSplash?.(c.dir);
          }
        }
      } else {
        // wander, steering back toward home when straying
        const turn = (Math.sin(c.t * 1.3 + c.hover * 10) + Math.sin(c.t * 2.9)) * 0.5 * c.def.turn;
        c.heading.applyAxisAngle(c.dir, turn * dt);
        if (c.dir.angleTo(c.anchor) > c.radius) {
          toAnchor.copy(c.anchor).projectOnPlane(c.dir).normalize();
          c.heading.lerp(toAnchor, Math.min(1, dt * 2)).projectOnPlane(c.dir).normalize();
        }
        let speed = c.def.speed;
        if (c.def.hop) {
          const k = (c.t % 0.7) / 0.7;
          const hopping = Math.floor(c.t / 0.7) % 3 !== 2; // pause every third beat
          lift = hopping ? Math.sin(k * Math.PI) * 0.18 : 0;
          speed = hopping ? speed : 0;
        }
        const moveDir = c.def.sideways ? right.crossVectors(c.dir, c.heading).normalize().multiplyScalar(Math.sin(c.t * 0.8) > 0 ? 1 : -1) : null;
        if (moveDir) {
          const ang = (speed * dt) / R;
          c.dir.applyAxisAngle(right.crossVectors(c.dir, moveDir).normalize(), ang).normalize();
          c.heading.projectOnPlane(c.dir).normalize();
        } else {
          this.advance(c, (speed * dt) / R);
        }
        if (c.def.flying) lift += Math.sin(c.t * 2.2 + c.hover * 5) * 0.12;
      }

      if (c.wings) for (const w of c.wings) w.rotation.z = w.userData.side * Math.sin(c.t * c.flap) * c.amp;
      if (c.glow) scale *= 0.8 + Math.sin(c.t * 4 + c.hover * 9) * 0.25;

      const h = this.planet.heightAt(c.dir) + lift;
      right.crossVectors(c.dir, fwd).normalize();
      basis.makeBasis(right, c.dir, fwd);
      if (c.g.userData.pitch) basis.multiply(new THREE.Matrix4().makeRotationX(c.g.userData.pitch));
      basis.scale(new THREE.Vector3(scale, scale, scale)).setPosition(c.dir.clone().multiplyScalar(h));
      c.g.matrix.copy(basis);
      c.g.matrixWorldNeedsUpdate = true;
    }
  }

  advance(c, angle) {
    const axis = right.crossVectors(c.dir, c.heading).normalize();
    c.dir.applyAxisAngle(axis, angle).normalize();
    c.heading.applyAxisAngle(axis, angle).projectOnPlane(c.dir).normalize();
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
  }
}
