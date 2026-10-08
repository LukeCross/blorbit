import * as THREE from 'three';

// Visual polish: pastel gradient sky, soft atmosphere halo, and a final colour grade
// that pulls everything into the same dreamy pastel palette.

// Screen-space vertical gradient used as the scene background; eases between biome skies.
export class Sky {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 4;
    this.canvas.height = 256;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    // twilight pastel: a deeper periwinkle overhead so stars show, soft blush at the horizon
    this.top = new THREE.Color('#9a8ae0');
    this.bottom = new THREE.Color('#ffd9ec');
    this.targetTop = this.top.clone();
    this.targetBottom = this.bottom.clone();
    this.draw();
  }

  set(top, bottom) {
    this.targetTop.set(top);
    this.targetBottom.set(bottom);
  }

  draw() {
    const g = this.ctx.createLinearGradient(0, 0, 0, 256);
    const mid = this.top.clone().lerp(this.bottom, 0.6).lerp(new THREE.Color('#fff7fb'), 0.15);
    g.addColorStop(0, `#${this.top.getHexString()}`);
    g.addColorStop(0.65, `#${mid.getHexString()}`);
    g.addColorStop(1, `#${this.bottom.getHexString()}`);
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, 4, 256);
    this.texture.needsUpdate = true;
  }

  update(dt) {
    const k = Math.min(1, dt * 1.2);
    const before = this.top.getHex() + this.bottom.getHex() * 7;
    this.top.lerp(this.targetTop, k);
    this.bottom.lerp(this.targetBottom, k);
    if (this.top.getHex() + this.bottom.getHex() * 7 !== before) this.draw();
  }
}

// Soft glowing rim around the planet so it sits in the sky like a little moon.
export function makeAtmosphere(radius) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 64, 48),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color('#fff2fb') } },
      vertexShader: /* glsl */ `
        varying vec3 vN;
        void main() {
          vN = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying vec3 vN;
        void main() {
          float i = pow(max(0.0, 0.62 - dot(vN, vec3(0.0, 0.0, 1.0))), 3.0);
          gl_FragColor = vec4(uColor * i * 0.28, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
}

// Final grade: gently lifts shadows toward lavender, softens saturation, adds a
// faint vignette and a touch of dither so gradients never band.
export const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, 0.92);
      col = col * 0.95 + vec3(0.04, 0.03, 0.06) * (1.0 - l);
      float d = distance(vUv, vec2(0.5));
      col *= mix(1.0, 0.93, smoothstep(0.45, 0.9, d));
      col += (hash(vUv * 1000.0) - 0.5) / 255.0;
      gl_FragColor = vec4(col, c.a);
    }`,
};
