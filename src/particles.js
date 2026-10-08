import * as THREE from 'three';

// Additive sparkle pool. Particles fall back toward the planet centre.
export class Particles {
  constructor(scene, max = 2000) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.gravity = new Float32Array(max);
    this.baseSize = new Float32Array(max);
    this.cursor = 0;
    this.live = 0; // how many particles might still be alive; lets idle frames skip all the work

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = geo;

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      vertexShader: /* glsl */ `
        attribute float size;
        attribute float alpha;
        attribute vec3 color;
        varying vec3 vCol;
        varying float vAlpha;
        void main() {
          vCol = color;
          vAlpha = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vCol;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float a = smoothstep(0.5, 0.15, d);
          float core = smoothstep(0.35, 0.0, d);
          gl_FragColor = vec4(vCol * (1.0 + core * 0.6), a * vAlpha * 0.9);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  spawn(p, v, color, size = 0.3, life = 1, gravity = 6) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.max;
    this.pos.set([p.x, p.y, p.z], i * 3);
    this.vel.set([v.x, v.y, v.z], i * 3);
    this.col.set([color.r, color.g, color.b], i * 3);
    this.baseSize[i] = size;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.gravity[i] = gravity;
    this.live = this.max;
  }

  // Fountain of sparkles from a point on the surface
  burst(origin, up, colors, count = 60, speed = 6, size = 0.35, life = 1.4) {
    const v = new THREE.Vector3();
    const n = up.clone().normalize();
    for (let k = 0; k < count; k++) {
      v.randomDirection().multiplyScalar(speed * (0.3 + Math.random() * 0.7));
      v.addScaledVector(n, speed * (0.6 + Math.random() * 0.6));
      const c = colors[Math.floor(Math.random() * colors.length)];
      this.spawn(origin, v, c, size * (0.5 + Math.random()), life * (0.6 + Math.random() * 0.6));
    }
  }

  update(dt) {
    if (this.live === 0) return;
    const drag = Math.exp(-1.8 * dt);
    let alive = 0;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) {
        if (this.alpha[i] !== 0) { this.alpha[i] = 0; this.size[i] = 0; }
        continue;
      }
      alive++;
      this.life[i] -= dt;
      const x = this.pos[i * 3], y = this.pos[i * 3 + 1], z = this.pos[i * 3 + 2];
      const len = Math.hypot(x, y, z) || 1;
      const g = this.gravity[i] * dt / len;
      this.vel[i * 3] = (this.vel[i * 3] - x * g) * drag;
      this.vel[i * 3 + 1] = (this.vel[i * 3 + 1] - y * g) * drag;
      this.vel[i * 3 + 2] = (this.vel[i * 3 + 2] - z * g) * drag;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const k = Math.max(0, this.life[i] / this.maxLife[i]);
      this.alpha[i] = Math.min(1, k * 2.5);
      this.size[i] = this.baseSize[i] * (0.4 + 0.6 * k);
    }
    for (const a of ['position', 'color', 'size', 'alpha']) this.geo.attributes[a].needsUpdate = true;
    // one more pass after the last particle dies so it gets cleared, then go idle
    this.live = alive;
  }
}
