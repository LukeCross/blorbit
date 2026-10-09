// Front (top row) and back (bottom row) of each creature skin, animated at a fixed time.
// ?skins=a,b,c picks which; ?t=seconds sets the animation pose.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SKINS, buildAccessories, buildEyes, bodyMaterial } from '../src/skins.js';

const params = new URLSearchParams(location.search);
const ids = (params.get('skins') || Object.keys(SKINS).filter((k) => k !== 'classic').join(',')).split(',');
const t = Number(params.get('t') || 0.4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd8d0f4);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.7;
scene.add(new THREE.HemisphereLight(0xf0ecff, 0xffd8c8, 1.35));
const sun = new THREE.DirectionalLight(0xfff4e6, 1.9);
sun.position.set(3, 6, 8);
scene.add(sun);

const CELL = 3.4, W = ids.length * CELL, H = 2 * CELL;
const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 0.1, 100);
const aspect = window.innerWidth / window.innerHeight;
if (W / H > aspect) { camera.top = W / aspect / 2; camera.bottom = -camera.top; } else { camera.left = -H * aspect / 2; camera.right = -camera.left; }
camera.position.set(0, 1.5, 20);
camera.lookAt(0, 0, 0);
camera.updateProjectionMatrix();
camera.updateMatrixWorld();

const tris = {};
const count = (o) => { let n = 0; o.traverse((m) => { if (m.isMesh) n += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; }); return n; };
ids.forEach((id, i) => {
  for (const [row, yaw] of [[0, -0.45], [1, Math.PI + 0.5]]) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), bodyMaterial(id)));
    const acc = buildAccessories(id);
    acc.userData.animate?.(t);
    g.add(acc);
    g.add(buildEyes(!!SKINS[id].eyeLift));
    g.position.set((i - (ids.length - 1) / 2) * CELL, (0.5 - row) * CELL - 0.2, 0);
    g.rotation.y = yaw;
    scene.add(g);
    if (row === 0) tris[id] = count(acc);
  }
  const p = new THREE.Vector3((i - (ids.length - 1) / 2) * CELL, -CELL - 0.1, 0).project(camera);
  const el = document.createElement('div');
  el.textContent = `${SKINS[id].name} · ${tris[id]} tris`;
  el.style.left = `${(p.x * 0.5 + 0.5) * window.innerWidth}px`;
  el.style.top = `${(-p.y * 0.5 + 0.5) * window.innerHeight}px`;
  document.getElementById('labels').append(el);
});
renderer.render(scene, camera);
window.skinTris = tris;
window.boothReady = true;
