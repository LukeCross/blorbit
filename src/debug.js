// On-screen debug panel, only when the URL has ?debug. For devices where the browser console isn't
// reachable (an iPad with no Mac to plug into): shows the GPU, its limits and any errors, including
// shader compile/link failures, which three.js otherwise only writes to the console.

import { groundDebug } from './planet.js';

export function initDebug(renderer) {
  if (!new URLSearchParams(location.search).has('debug')) return;

  const box = document.createElement('pre');
  box.style.cssText = 'position:fixed;left:0;right:0;bottom:0;max-height:45vh;overflow:auto;margin:0;padding:8px;z-index:99999;background:rgba(0,0,0,.85);color:#9f9;font:11px/1.35 monospace;white-space:pre-wrap;word-break:break-all;user-select:text;-webkit-user-select:text';
  const lines = [];
  const log = (s) => {
    lines.push(String(s));
    box.textContent = lines.join('\n');
    box.scrollTop = box.scrollHeight;
  };
  document.body.append(box);

  // cycles what the planet's ground shader outputs, to see which input is bad
  const MODES = ['normal', 'magenta', 'dead colour', 'alive colour', 'normals', 'noise', 'dyn xyz', 'style xyz', 'fresnel', 'diffuse', 'position', 'spec', 'water spec', 'sin(uTime)', 'uTime', 'NaN check', 'final red', 'dead', 'alive', 'dead/alive mix', 'after glow', 'after cloud/sea', 'after lighting', 'after slime+spec', 'after flash', 'slime', 'N.H', 'glowing', 'pulse', 'after glowing lines'];
  const btn = document.createElement('button');
  const show = () => (btn.textContent = `ground view: ${groundDebug.value} ${MODES[groundDebug.value]} (tap)`);
  btn.style.cssText = 'position:fixed;right:8px;bottom:calc(45vh + 12px);z-index:99999;padding:10px 14px;font:14px monospace;border-radius:8px;border:2px solid #9f9;background:#000;color:#9f9';
  btn.onclick = () => {
    groundDebug.value = (groundDebug.value + 1) % MODES.length;
    show();
  };
  show();
  document.body.append(btn);

  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const p = (k) => gl.getParameter(k);
  log(`UA: ${navigator.userAgent}`);
  log(`GPU: ${ext ? p(ext.UNMASKED_RENDERER_WEBGL) : p(gl.RENDERER)} | ${p(gl.VERSION)}`);
  log(`vertex attribs ${p(gl.MAX_VERTEX_ATTRIBS)}, varying vectors ${p(gl.MAX_VARYING_VECTORS)}, frag uniforms ${p(gl.MAX_FRAGMENT_UNIFORM_VECTORS)}`);
  log(`frag highp float precision: ${gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision} bits`);
  log(`canvas ${renderer.domElement.width}x${renderer.domElement.height}, pixel ratio ${renderer.getPixelRatio()}`);

  for (const level of ['error', 'warn']) {
    const orig = console[level].bind(console);
    console[level] = (...a) => {
      orig(...a);
      log(`[${level}] ${a.map((x) => (x instanceof Error ? x.stack : String(x))).join(' ')}`);
    };
  }
  window.addEventListener('error', (e) => log(`[uncaught] ${e.message} (${e.filename}:${e.lineno})`));
  window.addEventListener('unhandledrejection', (e) => log(`[rejection] ${e.reason?.stack || e.reason}`));
  renderer.domElement.addEventListener('webglcontextlost', () => log('[webgl] context lost'));

  // after a few seconds: did the programs link, and is anything being drawn?
  setTimeout(() => {
    const progs = renderer.info.programs || [];
    log(`programs compiled: ${progs.length}, draw calls: ${renderer.info.render.calls}, triangles: ${renderer.info.render.triangles}`);
    log(`gl error: ${gl.getError()}`);
  }, 4000);
}
