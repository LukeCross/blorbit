import * as THREE from 'three';

// The space around the planet: twinkling stars, drifting pastel nebula clouds, a few
// distant planets, and shooting stars streaking past every few seconds.

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const WHITE = new THREE.Color('#ffffff');
const PASTELS = ['#ffd1ea', '#d6c8ff', '#c4f2e2', '#ffe2c6', '#c9e6ff', '#fff1b8'];

function softTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Backdrop {
  constructor(scene, sound) {
    this.sound = sound;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.time = 0;
    this.buildStars();
    this.buildNebula();
    this.buildPlanets();
    this.shooting = [];
    this.nextStar = 2;
    this.shootMul = 1;
    this.bigPlanet = 1;
  }

  // Re-dress the space for a galaxy (see atmosphere.js). Stars snap to their new palette;
  // nebulae and distant planets ease across in update() unless `snap` is set.
  apply(p, snap = false) {
    const col = this.starGeo.getAttribute('color');
    const c = new THREE.Color();
    for (let i = 0; i < col.count; i++) {
      c.set(Math.random() < p.starWhite ? '#ffffff' : pick(p.starPalette));
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
    this.starGeo.setDrawRange(0, Math.round(col.count * p.starFrac));
    this.starUniforms.uSizeMul.value = p.starSize;
    for (const s of this.clouds) {
      s.userData.target = new THREE.Color(pick(p.nebula));
      s.userData.mul = p.nebulaMul;
      if (snap) s.material.color.copy(s.userData.target);
    }
    this.planets.forEach((g, i) => {
      g.userData.target = new THREE.Color(p.planets[i % p.planets.length]);
      g.userData.scaleTo = i === 0 ? p.bigPlanet : 1;
      if (snap) {
        g.userData.body.material.color.copy(g.userData.target);
        g.scale.setScalar(g.userData.scaleTo);
      }
    });
    this.shootMul = p.shootMul;
  }

  // ---- twinkling stars ------------------------------------------------------
  buildStars() {
    const n = 1400;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const size = new Float32Array(n);
    const v = new THREE.Vector3();
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      v.randomDirection().multiplyScalar(rnd(230, 300));
      pos.set([v.x, v.y, v.z], i * 3);
      c.set(Math.random() < 0.6 ? '#ffffff' : pick(PASTELS));
      col.set([c.r, c.g, c.b], i * 3);
      seed[i] = Math.random() * 100;
      size[i] = Math.random() < 0.12 ? rnd(9, 14) : rnd(3, 5.5);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
    this.starGeo = geo;
    this.starUniforms = { uTime: { value: 0 }, uSizeMul: { value: 1 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) } };
    const stars = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: this.starUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        attribute vec3 color;
        attribute float seed;
        attribute float size;
        uniform float uTime;
        uniform float uSizeMul;
        uniform float uPixelRatio;
        varying vec3 vCol;
        varying float vTw;
        void main() {
          vCol = color;
          vTw = 0.55 + 0.45 * sin(uTime * (0.8 + fract(seed) * 2.2) + seed);
          gl_PointSize = size * uSizeMul * uPixelRatio * (0.75 + 0.35 * vTw);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vCol;
        varying float vTw;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float d = length(p);
          float core = smoothstep(0.5, 0.0, d);
          // four-point sparkle for the bigger stars
          float rays = max(smoothstep(0.08, 0.0, abs(p.x)) , smoothstep(0.08, 0.0, abs(p.y))) * smoothstep(0.5, 0.1, d);
          float a = clamp(core * core + rays * 0.6, 0.0, 1.0) * vTw;
          gl_FragColor = vec4(vCol * 2.2, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }));
    stars.frustumCulled = false;
    this.group.add(stars);
  }

  // ---- pastel nebula clouds -------------------------------------------------
  buildNebula() {
    const tex = softTexture();
    this.clouds = [];
    for (let i = 0; i < 9; i++) {
      const mat = new THREE.SpriteMaterial({ map: tex, color: pick(['#ffb8dc', '#c8b4ff', '#a8ecd6', '#ffd0b0', '#b4dcff']), transparent: true, opacity: rnd(0.35, 0.55), depthWrite: false });
      const s = new THREE.Sprite(mat);
      const dir = new THREE.Vector3().randomDirection();
      s.position.copy(dir).multiplyScalar(rnd(170, 210));
      const size = rnd(28, 60);
      s.scale.set(size * rnd(1, 1.8), size, 1);
      s.userData = { dir, drift: new THREE.Vector3().randomDirection().multiplyScalar(0.01), spin: rnd(-0.02, 0.02), base: mat.opacity, mul: 1, phase: Math.random() * 6 };
      this.group.add(s);
      this.clouds.push(s);
    }
  }

  // ---- distant planets ------------------------------------------------------
  buildPlanets() {
    this.planets = [];
    const specs = [
      { color: '#cbb8ff', r: 9, ring: '#ffd6ec' },
      { color: '#ffd2bd', r: 5 },
      { color: '#bdf0de', r: 6.5, ring: '#d9ecff' },
      { color: '#ffe9a8', r: 3.2 },
    ];
    const spots = [new THREE.Vector3(1, 0.5, 0.3), new THREE.Vector3(-0.8, 0.3, 0.6), new THREE.Vector3(0.1, -0.4, -1), new THREE.Vector3(-0.3, 0.9, -0.4)];
    specs.forEach((spec, idx) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(spec.r, 48, 32),
        new THREE.MeshStandardMaterial({ color: spec.color, roughness: 1, emissive: new THREE.Color(spec.color).multiplyScalar(0.35) }),
      );
      g.add(body);
      g.userData.body = body;
      if (spec.ring) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(spec.r * 1.4, spec.r * 2.1, 96),
          new THREE.MeshBasicMaterial({ color: spec.ring, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
        );
        ring.rotation.x = Math.PI / 2.4;
        g.add(ring);
        g.userData.ring = ring;
      }
      g.position.copy(spots[idx]).normalize().multiplyScalar(rnd(150, 190));
      g.rotation.set(rnd(-0.5, 0.5), 0, rnd(-0.6, 0.6));
      g.userData.spin = rnd(0.02, 0.06);
      this.group.add(g);
      this.planets.push(g);
    });
  }

  // ---- shooting stars -------------------------------------------------------
  spawnShootingStar(camera, delay = 0) {
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    // the planet fills the middle of the view, so streak through the open sky around its edge
    const a = Math.random() * Math.PI * 2;
    const ndc = new THREE.Vector3(Math.cos(a) * rnd(0.7, 0.95), Math.sin(a) * rnd(0.72, 0.95), 0.5).unproject(camera);
    const start = camera.position.clone().add(ndc.sub(camera.position).normalize().multiplyScalar(160));
    const sign = Math.random() < 0.5 ? -1 : 1;
    const dir = right.clone().multiplyScalar(-Math.sin(a) * sign).addScaledVector(up, Math.cos(a) * sign - 0.25).normalize();
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uFade: { value: 0 }, uColor: { value: new THREE.Color(pick(['#ffffff', '#fff1f8', '#f2f0ff', '#fff8e0'])) } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float uFade;
          uniform vec3 uColor;
          varying vec2 vUv;
          void main() {
            float along = pow(vUv.x, 2.5);
            float across = 1.0 - abs(vUv.y - 0.5) * 2.0;
            float head = smoothstep(0.9, 1.0, vUv.x);
            float a = along * pow(across, 1.6 - head) * uFade;
            gl_FragColor = vec4(uColor * (2.0 + head * 2.5), min(1.0, a * 1.3));
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    );
    mesh.frustumCulled = false;
    this.group.add(mesh);
    this.shooting.push({ mesh, head: start, dir, speed: rnd(90, 140), len: rnd(26, 44), width: rnd(1.1, 1.7), age: -delay, life: rnd(0.9, 1.4) });
    if (delay === 0) this.sound?.shootingStar();
  }

  update(dt, camera) {
    this.time += dt;
    this.starUniforms.uTime.value = this.time;
    const ease = Math.min(1, dt * 1.5);

    for (const s of this.clouds) {
      const u = s.userData;
      u.dir.add(u.drift.clone().multiplyScalar(dt)).normalize();
      s.position.copy(u.dir).multiplyScalar(s.position.length());
      s.material.rotation += u.spin * dt;
      if (u.target) s.material.color.lerp(u.target, ease);
      s.material.opacity = u.base * u.mul * (0.8 + 0.2 * Math.sin(this.time * 0.3 + u.phase));
    }
    for (const p of this.planets) {
      const u = p.userData;
      p.rotation.y += u.spin * dt;
      if (!u.target) continue;
      u.body.material.color.lerp(u.target, ease);
      u.body.material.emissive.copy(u.body.material.color).multiplyScalar(0.35);
      u.ring?.material.color.copy(u.body.material.color).lerp(WHITE, 0.5);
      p.scale.setScalar(p.scale.x + (u.scaleTo - p.scale.x) * ease);
    }

    // a shooting star every few seconds, now and then a little shower of them
    this.nextStar -= dt;
    if (this.nextStar <= 0) {
      if (Math.random() < 0.15) for (let i = 0; i < 4; i++) this.spawnShootingStar(camera, i * rnd(0.15, 0.35));
      else this.spawnShootingStar(camera);
      this.nextStar = rnd(3, 8) * this.shootMul;
    }

    const toCam = new THREE.Vector3();
    const y = new THREE.Vector3();
    const z = new THREE.Vector3();
    const m = new THREE.Matrix4();
    for (let i = this.shooting.length - 1; i >= 0; i--) {
      const s = this.shooting[i];
      s.age += dt;
      if (s.age < 0) { s.mesh.visible = false; continue; }
      s.mesh.visible = true;
      s.head.addScaledVector(s.dir, s.speed * dt);
      const k = s.age / s.life;
      s.mesh.material.uniforms.uFade.value = Math.min(1, k * 6) * (1 - Math.max(0, (k - 0.6) / 0.4));
      // a ribbon from tail to head, turned to face the camera
      const center = s.head.clone().addScaledVector(s.dir, -s.len / 2);
      toCam.subVectors(camera.position, center).normalize();
      y.crossVectors(toCam, s.dir).normalize();
      z.crossVectors(s.dir, y);
      m.makeBasis(s.dir, y, z).scale(new THREE.Vector3(s.len, s.width, 1)).setPosition(center);
      s.mesh.matrixAutoUpdate = false;
      s.mesh.matrix.copy(m);
      s.mesh.matrixWorldNeedsUpdate = true;
      if (k >= 1) {
        this.group.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
        this.shooting.splice(i, 1);
      }
    }
  }
}
