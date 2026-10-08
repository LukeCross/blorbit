import * as THREE from 'three';
import { SKINS, buildAccessories, buildEyes } from './skins.js';
import { makeShadow, placeShadow } from './shadow.js';
import { shiny, isSmooth } from './quality.js';

const UP = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const basis = new THREE.Matrix4();

// A wobbly bag of water. Throttle rolls it forward/back, steer turns it.
export class Blob {
  constructor(scene) {
    this.radius = 0.8;
    this.maxSpeed = 3.8;
    this.speed = 0; // signed: negative when rolling backwards
    this.turnRate = 3.4;
    this.turnVel = 0;
    this.rollAngle = 0;
    this.distance = 0;
    this.lift = 0;
    this.p = new THREE.Vector3(0, 1, 0);
    this.f = new THREE.Vector3(0, 0, 1);
    this.position = new THREE.Vector3();

    // springs for squash/stretch and jiggle
    this.sy = 1; this.syVel = 0;
    this.wobble = 0.04; this.wobbleVel = 0;
    this.pop = 0;

    this.group = new THREE.Group();
    this.group.matrixAutoUpdate = false;
    this.squash = new THREE.Group();
    this.squash.scale.setScalar(this.radius);
    this.group.add(this.squash);

    this.uniforms = { uTime: { value: 0 }, uWobble: { value: 0.04 }, uRoll: { value: 0 }, uRim: { value: new THREE.Color(0xffffff) } };
    // Fake jelly: plain translucency plus a bright, more opaque rim. Real glass (transmission)
    // made the GPU render the whole scene twice every frame, so this keeps the look cheaply.
    this.material = shiny(SKINS.classic.body, {
      transparent: true,
      opacity: 0.8,
      roughness: 0.12,
      emissive: new THREE.Color(SKINS.classic.body).multiplyScalar(0.18),
    });
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uRim;')
        .replace(
          '#include <tonemapping_fragment>',
          `float rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.2);
          gl_FragColor.rgb += uRim * rim * 0.55;
          gl_FragColor.a = mix(gl_FragColor.a, 1.0, rim * 0.7);
          #include <tonemapping_fragment>`,
        );
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWobble;\nuniform float uRoll;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          // wobble pattern is sampled in the rolling frame so the jelly ripples tumble with the blob
          float cr = cos(uRoll), sr = sin(uRoll);
          vec3 rp = vec3(position.x, position.y * cr + position.z * sr, -position.y * sr + position.z * cr);
          float w = sin(rp.x * 3.1 + uTime * 6.0) * sin(rp.y * 3.7 + uTime * 5.3) * sin(rp.z * 2.9 + uTime * 4.7);
          transformed += normal * w * uWobble;
          // the bottom squishes flat against the ground (ground frame, so it never rolls away)
          // smoothly blended into a flatter base (no crease where the flattening starts)
          float base = smoothstep(-0.45, -1.0, transformed.y);
          transformed.y = mix(transformed.y, -0.62 + (transformed.y + 0.62) * 0.4, base);
          transformed.xz *= 1.0 + base * 0.08;`,
        );
    };
    this.body = new THREE.Mesh(isSmooth() ? new THREE.SphereGeometry(1, 64, 48) : new THREE.SphereGeometry(1, 96, 72), this.material);
    this.squash.add(this.body);

    // Everything with a face or features lives in the roller, which tumbles as the blob rolls.
    this.roller = new THREE.Group();
    this.squash.add(this.roller);

    // Little bubbles suspended inside: they tumble as the blob rolls
    this.bubbles = new THREE.Group();
    const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 });
    for (let i = 0; i < 7; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.08, 10, 8), bubbleMat);
      b.position.randomDirection().multiplyScalar(0.25 + Math.random() * 0.4);
      this.bubbles.add(b);
    }
    this.roller.add(this.bubbles);

    this.accessories = new THREE.Group();
    this.roller.add(this.accessories);
    this.eyes = null;
    this.blinkTimer = 2;
    this.setSkin('classic');

    scene.add(this.group);
    this.shadow = makeShadow(2.4);
    scene.add(this.shadow);
  }

  setSkin(id) {
    const skin = SKINS[id];
    this.skinId = id;
    this.material.color.set(skin.body);
    this.material.emissive.set(skin.body).multiplyScalar(0.18);
    this.uniforms.uRim.value.set(skin.body).lerp(new THREE.Color(0xffffff), 0.6);
    this.accessories.clear();
    if (id !== 'classic') this.accessories.add(buildAccessories(id));
    if (this.eyes) this.roller.remove(this.eyes);
    this.eyes = buildEyes(!!skin.eyeLift);
    this.roller.add(this.eyes);
    this.pop = 1;
    this.syVel -= 6;
  }

  placeAt(dir, forward) {
    this.p.copy(dir).normalize();
    this.f.copy(forward).projectOnPlane(this.p).normalize();
  }

  // Squish impulse used when something exciting happens
  jiggle(amount = 1) {
    this.wobbleVel += amount * 1.2;
    this.syVel -= amount * 4;
  }

  update(dt, steer, throttle, time, planet, liftTargets) {
    // smooth steering; positive steer = turn right
    const prevTurn = this.turnVel;
    this.turnVel += (steer * this.turnRate - this.turnVel) * Math.min(1, dt * 8);
    this.f.applyAxisAngle(this.p, -this.turnVel * dt);

    // squishy acceleration; backing up is slower
    const target = throttle * this.maxSpeed * (throttle < 0 ? 0.6 : 1);
    const prevSpeed = this.speed;
    this.speed += (target - this.speed) * Math.min(1, dt * (target === 0 ? 5 : 4));
    if (Math.abs(this.speed) < 0.01 && target === 0) this.speed = 0;
    const accel = (this.speed - prevSpeed) / Math.max(dt, 1e-4);
    if (Math.abs(accel) > 4) this.wobbleVel += Math.min(0.5, Math.abs(accel) * 0.01);

    // roll forward over the sphere
    const angle = (this.speed * dt) / planet.R;
    const axis = RIGHT.crossVectors(this.p, this.f).normalize();
    tmpQ.setFromAxisAngle(axis, angle);
    this.p.applyQuaternion(tmpQ).normalize();
    this.f.applyQuaternion(tmpQ).projectOnPlane(this.p).normalize();
    this.distance += Math.abs(this.speed) * dt;
    this.rollAngle += (this.speed * dt) / this.radius;
    // when it comes to rest, rock back upright so the face ends up looking forward
    if (Math.abs(this.speed) < 0.4) {
      const upright = Math.round(this.rollAngle / (Math.PI * 2)) * Math.PI * 2;
      this.rollAngle += (upright - this.rollAngle) * Math.min(1, dt * 4 * (1 - Math.abs(this.speed) / 0.4));
    }

    // hop gently over sleeping creatures instead of squashing them
    let lift = 0;
    for (const c of liftTargets) {
      const d = this.p.angleTo(c) * planet.R;
      if (d < 1.7) lift = Math.max(lift, 1.0 * Math.pow(Math.cos((d / 1.7) * Math.PI * 0.5), 2));
    }
    this.lift += (lift - this.lift) * Math.min(1, dt * 10);

    const ground = planet.heightAt(this.p);
    const h = ground + this.radius * 0.8 + this.lift;
    placeShadow(this.shadow, this.p, ground, 1 - this.lift * 0.3, 1 - this.lift * 0.5);
    this.position.copy(this.p).multiplyScalar(h);

    // springs
    const turnAccel = Math.abs(this.turnVel - prevTurn) / Math.max(dt, 1e-4);
    this.wobbleVel += (0.035 + Math.min(0.08, turnAccel * 0.01) - this.wobble) * 90 * dt;
    this.wobbleVel *= Math.exp(-6 * dt);
    this.wobble += this.wobbleVel * dt;
    const syTarget = 1 + Math.sin(this.rollAngle * 2) * 0.035 * Math.min(1, Math.abs(this.speed));
    this.syVel += (syTarget - this.sy) * 160 * dt;
    this.syVel *= Math.exp(-7 * dt);
    this.sy += this.syVel * dt;
    this.pop = Math.max(0, this.pop - dt * 2.5);

    const sy = this.sy * (1 + this.pop * 0.15);
    const sxz = 1 / Math.sqrt(Math.max(0.5, this.sy));
    this.squash.scale.set(sxz * this.radius, sy * this.radius, sxz * this.radius);
    this.squash.position.y = (sy - 1) * this.radius * 0.5;
    this.squash.rotation.z = this.turnVel * 0.1 * Math.min(1, 0.4 + Math.abs(this.speed) / this.maxSpeed);
    this.leanX = (this.leanX ?? 0) + (accel * 0.012 - (this.leanX ?? 0)) * Math.min(1, dt * 8);
    this.squash.rotation.x = Math.max(-0.2, Math.min(0.2, this.leanX));
    this.roller.rotation.x = this.rollAngle;
    this.uniforms.uRoll.value = this.rollAngle;
    this.bubbles.rotation.y = time * 0.3;

    this.uniforms.uTime.value = time;
    this.uniforms.uWobble.value = Math.max(0, this.wobble);

    // eyes: look into turns, blink now and then
    this.blinkTimer -= dt;
    let open = 1;
    if (this.blinkTimer < 0.12) open = Math.abs(this.blinkTimer - 0.06) / 0.06;
    if (this.blinkTimer < 0) this.blinkTimer = 2 + Math.random() * 3;
    this.eyes.userData.setOpen(open);
    this.eyes.userData.look(-this.turnVel * 0.035);
    this.accessories.children.forEach((a) => a.userData.animate?.(time));

    UP.copy(this.p);
    const right = RIGHT.crossVectors(UP, this.f);
    basis.makeBasis(right, UP, this.f).setPosition(this.position);
    this.group.matrix.copy(basis);
    this.group.matrixWorldNeedsUpdate = true;
  }
}
