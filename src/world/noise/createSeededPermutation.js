const PERMUTATION_SIZE = 256;

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededPermutation(seed = "default-seed") {
  const seedFn = xmur3(String(seed));
  const rand = mulberry32(seedFn());
  const perm = new Uint8Array(PERMUTATION_SIZE);
  for (let i = 0; i < PERMUTATION_SIZE; i++) perm[i] = i;

  for (let i = PERMUTATION_SIZE - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = perm[i];
    perm[i] = perm[j];
    perm[j] = tmp;
  }

  const permDoubled = new Uint8Array(PERMUTATION_SIZE * 2);
  for (let i = 0; i < PERMUTATION_SIZE * 2; i++) {
    permDoubled[i] = perm[i & 255];
  }

  return permDoubled;
}
