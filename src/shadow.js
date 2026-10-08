import * as THREE from 'three';

// Soft round contact shadow that sits on the ground under a character.
let texture = null;
function shadowTexture() {
  if (texture) return texture;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(60,40,110,0.55)');
  grad.addColorStop(0.5, 'rgba(60,40,110,0.25)');
  grad.addColorStop(1, 'rgba(60,40,110,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function makeShadow(size) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }),
  );
  m.renderOrder = 1;
  return m;
}

const Z = new THREE.Vector3(0, 0, 1);
// lay the shadow flat on the ground at dir (unit vector) / height h
export function placeShadow(m, dir, h, scale = 1, opacity = 1) {
  m.position.copy(dir).multiplyScalar(h + 0.04);
  m.quaternion.setFromUnitVectors(Z, dir);
  m.scale.setScalar(scale);
  m.material.opacity = opacity;
}
