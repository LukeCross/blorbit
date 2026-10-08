import * as THREE from 'three';

// Graphics quality. 'smooth' is built for low-end laptops and phones: native resolution,
// no post-processing, cheaper materials. 'pretty' adds multisampling, bloom and the colour grade.

export const quality = { tier: 'pretty' };

export const TIERS = {
  smooth: { pixelRatio: 1, post: false },
  pretty: { pixelRatio: 1.5, post: true },
};

export function detectTier() {
  const ua = navigator.userAgent;
  const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua) || (navigator.maxTouchPoints > 1 && window.innerWidth < 1100);
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 8;
  return mobile || cores <= 4 || memory <= 4 ? 'smooth' : 'pretty';
}

export const isSmooth = () => quality.tier === 'smooth';

// ---- materials -------------------------------------------------------------
// Cheap by design: no sheen / clearcoat / transmission / iridescence anywhere.
// Smooth tier uses Lambert (matte) and Phong (shiny); Pretty uses standard PBR.


const PBR_ONLY = ['roughness', 'metalness', 'envMapIntensity'];
const strip = (extra) => {
  const out = { ...extra };
  for (const k of PBR_ONLY) delete out[k];
  return out;
};

export function matte(color, extra = {}) {
  return isSmooth()
    ? new THREE.MeshLambertMaterial({ color, ...strip(extra) })
    : new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...extra });
}

export function shiny(color, extra = {}) {
  return isSmooth()
    ? new THREE.MeshPhongMaterial({ color, shininess: 70, specular: 0x3a3440, ...strip(extra) })
    : new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0, ...extra });
}
