import type { SeededNoise } from '../../noise/SeededNoise';
import type { VoxelStorage } from '../VoxelStorage';
import { BLOCK_ID_LEAF, BLOCK_ID_WOOD } from '../BlockPalette';
import { BIOME_DESERT, BIOME_FOREST, BIOME_HILL, BIOME_PLAIN } from './biomeTypes';
import { coordHash } from './terrainHash';

export class TreeGenerator {
  noise: SeededNoise;
  maxHeight: number;
  seedInt: number;

  constructor(noise: SeededNoise, maxHeight: number, seedInt: number) {
    this.noise = noise;
    this.maxHeight = maxHeight;
    this.seedInt = seedInt;
  }

  shouldPlaceTree(x: number, z: number, topY: number, slope: number, biomeId: number): boolean {
    if (biomeId === BIOME_DESERT) return false;
    if (topY < 12 || topY > this.maxHeight - 18) return false;
    if (biomeId === BIOME_HILL && slope > 1.35) return false;
    if (biomeId !== BIOME_HILL && slope > 2) return false;

    const biome = this.noise.fractalSimplex2D(x * 0.018 + 120, z * 0.018 + 120, 2, 0.55, 2);
    if (biomeId === BIOME_PLAIN && biome < 0.04) return false;
    if (biomeId === BIOME_HILL && biome < -0.04) return false;
    const fertility = this.noise.fractalPerlin2D(x * 0.045 + 420, z * 0.045 + 420, 2, 0.6, 2);
    if (biomeId === BIOME_FOREST && fertility < -0.08) return false;
    if (biomeId !== BIOME_FOREST && fertility < -0.01) return false;
    const mountainBand = this.noise.fractalPerlin2D(x * 0.004 - 140, z * 0.004 + 140, 2, 0.52, 2);
    if (biomeId === BIOME_HILL && mountainBand > 0.58 && topY > 76) return false;

    const randomValue = coordHash(this.seedInt, x, z);
    let density = 24;
    if (biomeId === BIOME_FOREST) density = biome > 0.35 ? 10 : 14;
    if (biomeId === BIOME_PLAIN) density = biome > 0.42 ? 28 : 42;
    if (biomeId === BIOME_HILL) density = biome > 0.38 ? 20 : 30;
    return randomValue % density === 0;
  }

  generateTree(storage: VoxelStorage, x: number, topY: number, z: number): void {
    const treeRand = coordHash(this.seedInt, x * 13, z * 17);
    const trunkHeight = 4 + (treeRand % 4);
    const canopyY = topY + trunkHeight;

    for (let y = 1; y <= trunkHeight; y++) {
      const ty = topY + y;
      if (ty >= this.maxHeight - 1) break;
      storage.setBlockId(x, ty, z, BLOCK_ID_WOOD);
    }

    const canopyRadius = 2 + (treeRand % 2);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -canopyRadius; dx <= canopyRadius; dx++) {
        for (let dz = -canopyRadius; dz <= canopyRadius; dz++) {
          const distance = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
          if (distance > canopyRadius * 2) continue;
          const leafY = canopyY + dy;
          if (leafY <= topY || leafY >= this.maxHeight - 1) continue;
          const wx = x + dx;
          const wz = z + dz;
          const existing = storage.getBlockId(wx, leafY, wz);
          if (existing && existing !== BLOCK_ID_LEAF) continue;
          storage.setBlockId(wx, leafY, wz, BLOCK_ID_LEAF);
        }
      }
    }

    if (canopyY + 2 < this.maxHeight - 1) {
      storage.setBlockId(x, canopyY + 2, z, BLOCK_ID_LEAF);
    }
  }
}
