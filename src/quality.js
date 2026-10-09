import * as THREE from 'three';

// Graphics quality. 'smooth' is built for low-end laptops and phones: native resolution,
// no post-processing, cheaper materials. 'pretty' adds multisampling, bloom and the colour grade.

export const quality = { tier: 'pretty' };

export const TIERS = {
  smooth: { pixelRatio: 1, post: false },
  pretty: { pixelRatio: 1.5, post: true },
};

// Auto always starts on Smooth; Pretty is only used when the player picks it in Settings.
export const detectTier = () => 'smooth';

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
