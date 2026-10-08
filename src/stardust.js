import * as THREE from 'three';
import { mulberry32 } from './noise.js';

// Glittering pickups laid out in little trails, like coins in a platformer.
export class Stardust {
  constructor(scene, planet, clusters = 32) {
    this.scene = scene;
    this.planet = planet;
    this.items = [];
    const v = new THREE.Vector3();
    const rand = mulberry32(planet.seed ^ 0x5d1);
    const randDir = () => {
      const z = rand() * 2 - 1, a = rand() * Math.PI * 2, r = Math.sqrt(1 - z * z);
      return new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), z);
    };
    for (let c = 0; c < clusters; c++) {
      const start = randDir();
      const heading = randDir().projectOnPlane(start).normalize();
      const curve = (rand() - 0.5) * 0.5;
      const n = 5 + Math.floor(rand() * 4);
      let d = start.clone();
      for (let k = 0; k < n; k++) {
        if (!planet.waterPatches.some((p) => !p.path && p.center.angleTo(d) < p.r)) {
          this.items.push({ dir: d.clone(), pos: new THREE.Vector3(), state: 0, phase: rand() * 6, t: 0 });
        }
        const axis = v.crossVectors(d, heading).normalize();
        d.applyAxisAngle(axis, 0.065).normalize();
        heading.applyAxisAngle(axis, 0.065).applyAxisAngle(d, curve).projectOnPlane(d).normalize();
      }
    }
    for (const it of this.items) it.pos.copy(it.dir).multiplyScalar(planet.heightAt(it.dir) + 0.5);
    this.total = this.items.length;
    this.collected = 0;

    this.mesh = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.13, 0),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.2, 2.2) }),
      this.items.length,
    );
    const cols = [0xfff2a0, 0xffd06a, 0xbff8ff, 0xffc8f0].map((c) => new THREE.Color(c));
    this.items.forEach((_, i) => this.mesh.setColorAt(i, cols[i % cols.length]));
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.s = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
  }

  // used when resuming a planet: hide pickups that were already collected
  markCollected(i) {
    this.items[i].state = 2;
    this.collected++;
    this.mesh.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0));
  }

  // returns positions collected this frame
  update(dt, time, blobPos, magnet = 2.4) {
    const got = [];
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (it.state === 2) continue;
      const dist = it.pos.distanceTo(blobPos);
      if (it.state === 0 && dist < magnet) it.state = 1;
      let scale = 1;
      let p = it.pos;
      if (it.state === 1) {
        it.t += dt;
        it.pos.lerp(blobPos, Math.min(1, dt * (6 + it.t * 20)));
        scale = Math.max(0.3, 1 - it.t * 1.5);
        if (it.pos.distanceTo(blobPos) < 0.5) {
          it.state = 2;
          this.collected++;
          got.push(it.pos.clone());
          scale = 0;
        }
      }
      const bob = it.state === 0 ? Math.sin(time * 2.5 + it.phase) * 0.12 : 0;
      this.q.setFromUnitVectors(this.up, it.dir).multiply(new THREE.Quaternion().setFromAxisAngle(this.up, time * 2 + it.phase));
      const pos = p.clone().addScaledVector(it.dir, bob);
      const pulse = 1 + Math.sin(time * 6 + it.phase) * 0.12;
      this.m.compose(pos, this.q, this.s.set(scale * pulse, scale * pulse * 1.3, scale * pulse));
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    return got;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
