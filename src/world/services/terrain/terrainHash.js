export function coordHash(seed, x, z) {
  let n = seed ^ Math.imul(x, 374761393) ^ Math.imul(z, 668265263);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return (n ^ (n >>> 16)) >>> 0;
}
