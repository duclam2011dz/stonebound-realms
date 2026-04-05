import type { SeededNoise } from '../../noise/SeededNoise';
import { BIOME_DESERT, BIOME_FOREST, BIOME_HILL, BIOME_PLAIN, biomeIdToName } from './biomeTypes';

export type BiomeWeights = {
  plain: number;
  forest: number;
  hill: number;
  desert: number;
  dominantId: number;
};

const BIOME_BLEND_SIGMA = 0.35;
const BIOME_BLEND_INV = 1 / (2 * BIOME_BLEND_SIGMA * BIOME_BLEND_SIGMA);

function gaussianWeight(dx: number, dz: number): number {
  return Math.exp(-(dx * dx + dz * dz) * BIOME_BLEND_INV);
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export class BiomeModel {
  noise: SeededNoise;

  constructor(noise: SeededNoise) {
    this.noise = noise;
  }

  getBiomeWeights(x: number, z: number): BiomeWeights {
    const biomeWave = this.noise.fractalSimplex2D(
      x * 0.00145 + 90,
      z * 0.00145 - 150,
      4,
      0.54,
      2.03
    );
    const moisture = this.noise.fractalPerlin2D(x * 0.0021 - 320, z * 0.0021 + 280, 3, 0.53, 2.04);
    const ridge = this.noise.fractalPerlin2D(x * 0.00115 + 510, z * 0.00115 - 200, 3, 0.5, 2);
    const heat = this.noise.fractalSimplex2D(x * 0.00175 + 820, z * 0.00175 - 640, 3, 0.56, 2.1);

    const combined = biomeWave * 0.6 + moisture * 0.25 + ridge * 0.15;
    const aridity = heat * 0.7 - moisture * 0.3 - ridge * 0.08;
    const ridgeMask = smoothstep(0.55, 0.18, ridge);

    let plainWeight = gaussianWeight(combined + 0.36, aridity - 0.02);
    let forestWeight = gaussianWeight(combined - 0.02, aridity + 0.18);
    let hillWeight = gaussianWeight(combined - 0.48, aridity - 0.02);
    let desertWeight = gaussianWeight(combined - 0.06, aridity - 0.52) * ridgeMask;

    const total = plainWeight + forestWeight + hillWeight + desertWeight;
    if (total > 1e-6) {
      const inv = 1 / total;
      plainWeight *= inv;
      forestWeight *= inv;
      hillWeight *= inv;
      desertWeight *= inv;
    }

    const dominantId =
      desertWeight >= hillWeight && desertWeight >= forestWeight && desertWeight >= plainWeight
        ? BIOME_DESERT
        : hillWeight >= forestWeight && hillWeight >= plainWeight
          ? BIOME_HILL
          : plainWeight >= forestWeight
            ? BIOME_PLAIN
            : BIOME_FOREST;

    return {
      plain: plainWeight,
      forest: forestWeight,
      hill: hillWeight,
      desert: desertWeight,
      dominantId
    };
  }

  getBiomeId(x: number, z: number): number {
    return this.getBiomeWeights(x, z).dominantId;
  }

  getBiomeName(x: number, z: number): string {
    return biomeIdToName(this.getBiomeId(x, z));
  }

  buildBiomeMap(baseX: number, baseZ: number, chunkSize: number): Uint8Array {
    const biomeMap = new Uint8Array(chunkSize * chunkSize);
    for (let lz = 0; lz < chunkSize; lz++) {
      for (let lx = 0; lx < chunkSize; lx++) {
        const worldX = baseX + lx;
        const worldZ = baseZ + lz;
        biomeMap[lx + lz * chunkSize] = this.getBiomeId(worldX, worldZ);
      }
    }
    return biomeMap;
  }
}
