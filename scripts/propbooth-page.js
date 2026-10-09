// Renders prop kinds in a grid: each cell shows the restored prop (left) and its grey withered stand-in (right).
// ?kinds=a,b,c picks which kinds; ?cols=N sets the grid width.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PROP_KINDS } from '../src/props.js';
import { mulberry32 } from '../src/noise.js';

const params = new URLSearchParams(location.search);
const kinds = (params.get('kinds') || Object.keys(PROP_KINDS).join(',')).split(',');
const cols = Number(params.get('cols') || 6);
const rows = Math.ceil(kinds.length / cols);
const CELL = 3.2;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd8d0f4);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.7;
scene.add(new THREE.HemisphereLight(0xf0ecff, 0xffd8c8, 1.35));
const sun = new THREE.DirectionalLight(0xfff4e6, 1.9);
sun.position.set(4, 8, 6);
scene.add(sun);

const W = cols * CELL, H = rows * CELL;
const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 0.1, 100);
camera.position.set(0, 3.2, 10);
camera.lookAt(0, 0, 0);
const aspect = window.innerWidth / window.innerHeight;
if (W / H > aspect) { camera.top = W / aspect / 2; camera.bottom = -camera.top; } else { camera.left = -H * aspect / 2; camera.right = -camera.left; }
camera.updateProjectionMatrix();
camera.updateMatrixWorld();

const rand = mulberry32(7);
const deadMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
const deadCol = new THREE.Color(0x9a90ab).multiplyScalar(1.06);
const it = { alive: new THREE.Color(0x7fcf6a), pos: new THREE.Vector3() };
const m = new THREE.Matrix4();
const tris = {};
const labels = document.getElementById('labels');

kinds.forEach((kind, k) => {
  const def = PROP_KINDS[kind];
  if (!def) return;
  const parts = def.parts();
  const box = new THREE.Box3();
  tris[kind] = 0;
  for (const { geo } of parts) {
    geo.computeBoundingBox();
    box.union(geo.boundingBox);
    tris[kind] += (geo.index ? geo.index.count : geo.attributes.position.count) / 3;
  }
  const size = box.getSize(new THREE.Vector3());
  const fit = Math.min(1.25 / Math.max(size.x, size.z, 0.01), 2.3 / Math.max(size.y, 0.01));
  const cx = (k % cols - (cols - 1) / 2) * CELL, cy = ((rows - 1) / 2 - Math.floor(k / cols)) * CELL - CELL * 0.35;
  for (const [dx, dead] of [[-0.75, false], [0.75, true]]) {
    const g = new THREE.Group();
    g.position.set(cx + dx, cy, 0);
    g.rotation.y = 0.5;
    const s = fit * (dead ? 0.9 : 1);
    g.scale.set(s, fit * (dead ? 0.75 : 1), s);
    for (const { geo, mat, color } of parts) {
      const mesh = new THREE.InstancedMesh(geo, dead ? deadMat : mat, 1);
      mesh.setMatrixAt(0, m.identity());
      if (dead) mesh.setColorAt(0, deadCol);
      else if (color) mesh.setColorAt(0, color(it, rand).lerp(new THREE.Color(0xffffff), 0.1));
      g.add(mesh);
    }
    scene.add(g);
  }
  const p = new THREE.Vector3(cx, cy - 0.25, 0).project(camera);
  const el = document.createElement('div');
  el.textContent = `${kind} · ${tris[kind]} tris`;
  el.style.left = `${(p.x * 0.5 + 0.5) * window.innerWidth}px`;
  el.style.top = `${(-p.y * 0.5 + 0.5) * window.innerHeight}px`;
  labels.append(el);
});
renderer.render(scene, camera);
window.propTris = tris;
window.boothReady = true;
