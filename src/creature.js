import * as THREE from 'three';
import { SKINS, buildAccessories, buildEyes, bodyMaterial } from './skins.js';
import { makeShadow, placeShadow } from './shadow.js';

let zTexture = null;
function getZTexture() {
  if (zTexture) return zTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.font = 'bold 52px ui-rounded, system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('z', 32, 34);
  zTexture = new THREE.CanvasTexture(c);
  zTexture.colorSpace = THREE.SRGBColorSpace;
  return zTexture;
}

const GREY = new THREE.Color(0x77707e);
const tmp = new THREE.Color();
const basis = new THREE.Matrix4();

// A sleeping creature curled up in the middle of its region. Wakes when the region blooms.
export class Creature {
  constructor(scene, planet, id, dir) {
    this.id = id;
    this.dir = dir.clone().normalize();
    this.state = 'sleeping';
    this.t = 0;
    this.scene = scene;
    this.size = 0.5;

    this.group = new THREE.Group();
    this.group.matrixAutoUpdate = false;
    const forward = new THREE.Vector3(0, 1, 0).projectOnPlane(this.dir);
    if (forward.lengthSq() < 0.01) forward.set(1, 0, 0).projectOnPlane(this.dir);
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(this.dir, forward);
    this.ground = planet.heightAt(this.dir);
    basis.makeBasis(right, this.dir, forward).setPosition(this.dir.clone().multiplyScalar(this.ground));
    this.group.matrix.copy(basis);
    this.group.matrixWorldNeedsUpdate = true;

    this.yaw = new THREE.Group();
    this.model = new THREE.Group();
    this.model.scale.setScalar(this.size);
    this.yaw.add(this.model);
    this.group.add(this.yaw);

    const skin = SKINS[id];
    this.model.add(new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 48),
      bodyMaterial(id),
    ));
    this.accessories = buildAccessories(id);
    this.model.add(this.accessories);
    this.eyes = buildEyes(!!skin.eyeLift);
    this.model.add(this.eyes);
    this.eyes.userData.setOpen(0);

    // remember true colours so we can fade from grey
    this.mats = [];
    this.model.traverse((o) => {
      if (o.isMesh && !this.eyes.children.some((e) => e.getObjectById(o.id))) {
        this.mats.push({ mat: o.material, base: o.material.color.clone() });
      }
    });
    this.setSaturation(0);

    this.zs = [];
    this.zTimer = 0;
    scene.add(this.group);
    this.shadow = makeShadow(1.5);
    placeShadow(this.shadow, this.dir, this.ground);
    scene.add(this.shadow);
  }

  setSaturation(s) {
    for (const { mat, base } of this.mats) mat.color.copy(tmp.copy(GREY).lerp(base, s));
  }

  // resuming a planet: already awake, skip the animation
  setAwake() {
    this.state = 'awake';
    this.t = 0;
    this.setSaturation(1);
    this.eyes.userData.setOpen(1);
    this.model.rotation.z = 0;
    this.zs.forEach((z) => this.group.remove(z));
    this.zs = [];
  }

  wake() {
    if (this.state !== 'sleeping') return;
    this.state = 'waking';
    this.t = 0;
  }

  spawnZ() {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: getZTexture(), transparent: true, depthWrite: false }));
    s.position.set(0.3, 0.9, 0);
    s.scale.setScalar(0.3);
    s.userData.age = 0;
    this.group.add(s);
    this.zs.push(s);
  }

  update(dt, time, blobPos) {
    this.t += dt;
    this.accessories.userData.animate(time * (this.state === 'sleeping' ? 0.2 : 1));

    for (let i = this.zs.length - 1; i >= 0; i--) {
      const z = this.zs[i];
      z.userData.age += dt;
      const a = z.userData.age;
      z.position.set(0.3 + Math.sin(a * 2.5) * 0.2 + a * 0.15, 0.9 + a * 0.55, 0);
      z.scale.setScalar(0.25 + a * 0.12);
      z.material.opacity = Math.max(0, 1 - a / 2.4);
      if (a > 2.4) {
        this.group.remove(z);
        z.material.dispose();
        this.zs.splice(i, 1);
      }
    }

    if (this.state === 'sleeping') {
      const breathe = Math.sin(time * 1.6);
      this.model.scale.set(this.size * (1 + breathe * 0.03), this.size * (0.78 + breathe * 0.04), this.size * (1 + breathe * 0.03));
      this.model.position.y = this.size * 0.72;
      this.model.rotation.z = 0.25;
      this.zTimer -= dt;
      if (this.zTimer <= 0) {
        this.spawnZ();
        this.zTimer = 1.1;
      }
    } else if (this.state === 'waking') {
      const t = this.t;
      this.setSaturation(Math.min(1, t / 0.6));
      this.model.rotation.z = 0.25 * Math.max(0, 1 - t * 3);
      if (t < 0.25) {
        // crouch
        const k = t / 0.25;
        this.model.scale.set(this.size * (1 + k * 0.25), this.size * (0.78 - k * 0.2), this.size * (1 + k * 0.25));
        this.model.position.y = this.size * 0.6;
      } else if (t < 0.95) {
        // big happy spinning hop
        const k = (t - 0.25) / 0.7;
        this.eyes.userData.setOpen(1);
        this.model.position.y = this.size * 0.75 + Math.sin(k * Math.PI) * 1.6;
        this.model.scale.set(this.size * 0.92, this.size * 1.12, this.size * 0.92);
        this.yaw.rotation.y = k * Math.PI * 2;
      } else if (t < 1.25) {
        const k = (t - 0.95) / 0.3;
        const squish = Math.sin(k * Math.PI) * 0.25;
        this.model.scale.set(this.size * (1 + squish), this.size * (1 - squish), this.size * (1 + squish));
        this.model.position.y = this.size * (1 - squish);
      } else {
        this.state = 'awake';
        this.t = 0;
      }
    } else {
      // idle: little hops, turn to watch the blob
      const k = (this.t % 1.6) / 1.6;
      const hop = k < 0.3 ? Math.sin((k / 0.3) * Math.PI) : 0;
      this.model.position.y = this.size + hop * 0.35;
      this.model.scale.set(this.size, this.size * (1 + hop * 0.08), this.size);
      if (blobPos) {
        const local = this.group.worldToLocal(blobPos.clone());
        const target = Math.atan2(local.x, local.z);
        let d = target - this.yaw.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        this.yaw.rotation.y += d * Math.min(1, dt * 4);
      }
    }
  }

  worldTop() {
    return this.dir.clone().multiplyScalar(this.ground + 1.2);
  }

  dispose() {
    this.scene.remove(this.group);
    this.scene.remove(this.shadow);
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
}
