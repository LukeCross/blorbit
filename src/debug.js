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
    logEmoji(log);
  }, 4000);
}

// the bundled emoji font (src/emoji.css, src/emojifont.js): which build is in use, and does it draw?
function logEmoji(log) {
  const tech = (t) => (CSS.supports?.(`font-tech(${t})`) ? 'yes' : 'no');
  log(`emoji font: supports COLRv1 ${tech('color-COLRv1')}, SVG ${tech('color-SVG')}; :heading ${CSS.supports?.('selector(:heading)') ? 'yes (Safari 27+ swap)' : 'no'}`);
  const faces = [...document.fonts].filter((f) => f.family === 'Blorbit Emoji' || f.family === '"Blorbit Emoji"');
  log(`emoji faces: ${faces.map((f) => f.status).join(' ') || 'none'}`);
  const files = performance.getEntriesByType('resource').filter((r) => r.name.includes('/fonts/emoji/'));
  log(`emoji files: ${files.map((r) => r.name.split('/').pop()).join(', ') || 'none'}`);
  // canvas pixel counts (a blank glyph gives ~0), though Safari 27 draws SVG emoji on a canvas but not in text
  const colourful = (text, font) => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.font = font;
    g.fillText(text, 4, 52);
    const d = g.getImageData(0, 0, 64, 64).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128 && Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 60) n++;
    return n;
  };
  for (const e of ['✨', '🌸', '❄️', '🐸']) log(`  ${e} bundled ${colourful(e, '48px "Blorbit Emoji"')} px, system ${colourful(e, '48px system-ui')} px`);
  // page text: the font as the game uses it, the system emoji, and each build loaded on its own
  const builds = { svg: 'Blorbit Emoji Svg', colr: 'Blorbit Emoji Colr' };
  for (const [kind, family] of Object.entries(builds)) {
    const face = new FontFace(family, `url(/fonts/emoji/${kind}-7.woff2)`);
    document.fonts.add(face);
    face.load().then(() => log(`${kind} build alone: canvas ${colourful('🌸', `48px "${family}"`)} px`), (e) => log(`${kind} build alone: failed ${e}`));
  }
  const row = document.createElement('div');
  row.style.cssText = 'position:fixed;left:8px;bottom:calc(45vh + 12px);z-index:99999;padding:6px 10px;border-radius:8px;background:#fff;color:#000;font:14px monospace';
  const cell = (label, family) => `<div>${label} <span style="font:400 26px ${family}, monospace">🌸🐸</span></div>`;
  row.innerHTML = cell('A page', "'Blorbit Emoji'") + cell('B system', "'Apple Color Emoji', system-ui") + cell('C svg', `'${builds.svg}'`) + cell('D colr', `'${builds.colr}'`);
  document.body.append(row);
}
