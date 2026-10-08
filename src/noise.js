// Small seeded RNG + 3D value noise. Everything about a planet derives from one seed.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeNoise3(seed) {
  const rand = mulberry32(seed);
  const perm = new Uint8Array(512);
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    perm[i] = i;
    vals[i] = rand() * 2 - 1;
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];

  const lattice = (x, y, z) => vals[perm[perm[perm[x & 255] + (y & 255)] + (z & 255)]];
  const smooth = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  function noise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const u = smooth(x - xi), v = smooth(y - yi), w = smooth(z - zi);
    return lerp(
      lerp(
        lerp(lattice(xi, yi, zi), lattice(xi + 1, yi, zi), u),
        lerp(lattice(xi, yi + 1, zi), lattice(xi + 1, yi + 1, zi), u),
        v,
      ),
      lerp(
        lerp(lattice(xi, yi, zi + 1), lattice(xi + 1, yi, zi + 1), u),
        lerp(lattice(xi, yi + 1, zi + 1), lattice(xi + 1, yi + 1, zi + 1), u),
        v,
      ),
      w,
    );
  }

  return function fbm(x, y, z, octaves = 3) {
    let sum = 0, amp = 0.5, freq = 1;
    for (let i = 0; i < octaves; i++) {
      sum += noise(x * freq, y * freq, z * freq) * amp;
      freq *= 2.03;
      amp *= 0.5;
    }
    return sum;
  };
}
