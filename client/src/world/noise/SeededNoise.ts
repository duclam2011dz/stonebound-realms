import { createSeededPermutation } from './createSeededPermutation';

const SQRT3 = Math.sqrt(3);
const F2 = 0.5 * (SQRT3 - 1);
const G2 = (3 - SQRT3) / 6;
const F3 = 1 / 3;
const G3 = 1 / 6;

const GRAD3: Array<[number, number, number]> = [
  [1, 1, 0],
  [-1, 1, 0],
  [1, -1, 0],
  [-1, -1, 0],
  [1, 0, 1],
  [-1, 0, 1],
  [1, 0, -1],
  [-1, 0, -1],
  [0, 1, 1],
  [0, -1, 1],
  [0, 1, -1],
  [0, -1, -1]
];

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function grad2(hash: number, x: number, y: number): number {
  switch (hash & 3) {
    case 0:
      return x + y;
    case 1:
      return -x + y;
    case 2:
      return x - y;
    default:
      return -x - y;
  }
}

function grad3Perlin(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function dot2(grad: [number, number, number], x: number, y: number): number {
  return grad[0] * x + grad[1] * y;
}

function dot3(grad: [number, number, number], x: number, y: number, z: number): number {
  return grad[0] * x + grad[1] * y + grad[2] * z;
}

export class SeededNoise {
  perm: Uint8Array;

  constructor(seed: string | number = 'default-seed') {
    this.perm = createSeededPermutation(seed);
  }

  perlin2D(x: number, y: number): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const perm = this.perm;
    const p = (index: number) => perm[index] ?? 0;
    const aa = p(p(xi) + yi);
    const ab = p(p(xi) + yi + 1);
    const ba = p(p(xi + 1) + yi);
    const bb = p(p(xi + 1) + yi + 1);

    const u = fade(xf);
    const v = fade(yf);

    const x1 = lerp(grad2(aa, xf, yf), grad2(ba, xf - 1, yf), u);
    const x2 = lerp(grad2(ab, xf, yf - 1), grad2(bb, xf - 1, yf - 1), u);
    return lerp(x1, x2, v);
  }

  perlin3D(x: number, y: number, z: number): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const zi = Math.floor(z) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);

    const perm = this.perm;
    const p = (index: number) => perm[index] ?? 0;
    const aaa = p(p(p(xi) + yi) + zi);
    const aba = p(p(p(xi) + yi + 1) + zi);
    const aab = p(p(p(xi) + yi) + zi + 1);
    const abb = p(p(p(xi) + yi + 1) + zi + 1);
    const baa = p(p(p(xi + 1) + yi) + zi);
    const bba = p(p(p(xi + 1) + yi + 1) + zi);
    const bab = p(p(p(xi + 1) + yi) + zi + 1);
    const bbb = p(p(p(xi + 1) + yi + 1) + zi + 1);

    const u = fade(xf);
    const v = fade(yf);
    const w = fade(zf);

    const x1 = lerp(grad3Perlin(aaa, xf, yf, zf), grad3Perlin(baa, xf - 1, yf, zf), u);
    const x2 = lerp(grad3Perlin(aba, xf, yf - 1, zf), grad3Perlin(bba, xf - 1, yf - 1, zf), u);
    const y1 = lerp(x1, x2, v);

    const x3 = lerp(grad3Perlin(aab, xf, yf, zf - 1), grad3Perlin(bab, xf - 1, yf, zf - 1), u);
    const x4 = lerp(
      grad3Perlin(abb, xf, yf - 1, zf - 1),
      grad3Perlin(bbb, xf - 1, yf - 1, zf - 1),
      u
    );
    const y2 = lerp(x3, x4, v);

    return lerp(y1, y2, w);
  }

  simplex2D(xin: number, yin: number): number {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);

    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const perm = this.perm;
    const p = (index: number) => perm[index] ?? 0;
    const gi0 = p(ii + p(jj)) % 12;
    const gi1 = p(ii + i1 + p(jj + j1)) % 12;
    const gi2 = p(ii + 1 + p(jj + 1)) % 12;

    let n0 = 0;
    let n1 = 0;
    let n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      t0 *= t0;
      const grad0 = GRAD3[gi0] ?? GRAD3[0]!;
      n0 = t0 * t0 * dot2(grad0, x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      t1 *= t1;
      const grad1 = GRAD3[gi1] ?? GRAD3[0]!;
      n1 = t1 * t1 * dot2(grad1, x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      t2 *= t2;
      const grad2Value = GRAD3[gi2] ?? GRAD3[0]!;
      n2 = t2 * t2 * dot2(grad2Value, x2, y2);
    }

    return 70 * (n0 + n1 + n2);
  }

  simplex3D(xin: number, yin: number, zin: number): number {
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const z0 = zin - (k - t);

    let i1 = 0;
    let j1 = 0;
    let k1 = 0;
    let i2 = 0;
    let j2 = 0;
    let k2 = 0;

    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      } else if (x0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      } else {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      }
    } else if (y0 < z0) {
      i1 = 0;
      j1 = 0;
      k1 = 1;
      i2 = 0;
      j2 = 1;
      k2 = 1;
    } else if (x0 < z0) {
      i1 = 0;
      j1 = 1;
      k1 = 0;
      i2 = 0;
      j2 = 1;
      k2 = 1;
    } else {
      i1 = 0;
      j1 = 1;
      k1 = 0;
      i2 = 1;
      j2 = 1;
      k2 = 0;
    }

    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3;
    const y2 = y0 - j2 + 2 * G3;
    const z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3;
    const y3 = y0 - 1 + 3 * G3;
    const z3 = z0 - 1 + 3 * G3;

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    const perm = this.perm;
    const p = (index: number) => perm[index] ?? 0;
    const gi0 = p(ii + p(jj + p(kk))) % 12;
    const gi1 = p(ii + i1 + p(jj + j1 + p(kk + k1))) % 12;
    const gi2 = p(ii + i2 + p(jj + j2 + p(kk + k2))) % 12;
    const gi3 = p(ii + 1 + p(jj + 1 + p(kk + 1))) % 12;

    let n0 = 0;
    let n1 = 0;
    let n2 = 0;
    let n3 = 0;

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 > 0) {
      t0 *= t0;
      const grad0 = GRAD3[gi0] ?? GRAD3[0]!;
      n0 = t0 * t0 * dot3(grad0, x0, y0, z0);
    }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 > 0) {
      t1 *= t1;
      const grad1 = GRAD3[gi1] ?? GRAD3[0]!;
      n1 = t1 * t1 * dot3(grad1, x1, y1, z1);
    }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 > 0) {
      t2 *= t2;
      const grad2Value = GRAD3[gi2] ?? GRAD3[0]!;
      n2 = t2 * t2 * dot3(grad2Value, x2, y2, z2);
    }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 > 0) {
      t3 *= t3;
      const grad3Value = GRAD3[gi3] ?? GRAD3[0]!;
      n3 = t3 * t3 * dot3(grad3Value, x3, y3, z3);
    }

    return 32 * (n0 + n1 + n2 + n3);
  }

  fractalPerlin2D(
    x: number,
    y: number,
    octaves: number = 4,
    persistence: number = 0.5,
    lacunarity: number = 2
  ): number {
    return this.fractal((fx, fy) => this.perlin2D(fx, fy), x, y, octaves, persistence, lacunarity);
  }

  fractalSimplex2D(
    x: number,
    y: number,
    octaves: number = 4,
    persistence: number = 0.5,
    lacunarity: number = 2
  ): number {
    return this.fractal((fx, fy) => this.simplex2D(fx, fy), x, y, octaves, persistence, lacunarity);
  }

  fractalPerlin3D(
    x: number,
    y: number,
    z: number,
    octaves: number = 4,
    persistence: number = 0.5,
    lacunarity: number = 2
  ): number {
    return this.fractal3D(
      (fx, fy, fz) => this.perlin3D(fx, fy, fz),
      x,
      y,
      z,
      octaves,
      persistence,
      lacunarity
    );
  }

  fractalSimplex3D(
    x: number,
    y: number,
    z: number,
    octaves: number = 4,
    persistence: number = 0.5,
    lacunarity: number = 2
  ): number {
    return this.fractal3D(
      (fx, fy, fz) => this.simplex3D(fx, fy, fz),
      x,
      y,
      z,
      octaves,
      persistence,
      lacunarity
    );
  }

  fractal(
    noiseFn: (x: number, y: number) => number,
    x: number,
    y: number,
    octaves: number,
    persistence: number,
    lacunarity: number
  ): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += noiseFn(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return maxValue > 0 ? total / maxValue : 0;
  }

  fractal3D(
    noiseFn: (x: number, y: number, z: number) => number,
    x: number,
    y: number,
    z: number,
    octaves: number,
    persistence: number,
    lacunarity: number
  ): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += noiseFn(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return maxValue > 0 ? total / maxValue : 0;
  }
}
