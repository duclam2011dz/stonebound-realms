import { SeededNoise } from '../noise/SeededNoise';
import { BLOCK_ID_DIRT, BLOCK_ID_GRASS, BLOCK_ID_SAND, BLOCK_ID_STONE } from './BlockPalette';
import { hashSeedToInt, seededSpawnPosition } from './seedUtils';
import { CaveCarver } from './terrain/CaveCarver';
import { BiomeModel } from './terrain/BiomeModel';
import { calculateColumnSlope } from './terrain/heightMapUtils';
import { TerrainHeightModel } from './terrain/TerrainHeightModel';
import { TreeGenerator } from './terrain/TreeGenerator';
import { BIOME_DESERT } from './terrain/biomeTypes';
import type { VoxelStorage } from './VoxelStorage';

export class TerrainGenerator {
  chunkSize: number;
  maxHeight: number;
  seed: string;
  seedInt: number;
  seedDisplay: string;
  noise: SeededNoise;
  biomeModel: BiomeModel;
  heightModel: TerrainHeightModel;
  caveCarver: CaveCarver;
  treeGenerator: TreeGenerator;

  constructor(chunkSize: number, maxHeight: number, seed: string = '') {
    this.chunkSize = chunkSize;
    this.maxHeight = maxHeight;
    this.seed = seed;
    this.seedInt = hashSeedToInt(seed);
    this.seedDisplay = seed ? String(seed) : String(this.seedInt);

    this.noise = new SeededNoise(this.seedInt);
    this.biomeModel = new BiomeModel(this.noise);
    this.heightModel = new TerrainHeightModel(this.noise, this.maxHeight, this.biomeModel);
    this.caveCarver = new CaveCarver(this.noise, this.maxHeight, this.chunkSize, this.seedInt);
    this.treeGenerator = new TreeGenerator(this.noise, this.maxHeight, this.seedInt);
  }

  getHeight(x: number, z: number): number {
    const weights = this.biomeModel.getBiomeWeights(x, z);
    return this.heightModel.getBlendedHeight(x, z, weights);
  }

  getBiomeAt(x: number, z: number): string {
    return this.biomeModel.getBiomeName(x, z);
  }

  getBiomeIdAt(x: number, z: number): number {
    return this.biomeModel.getBiomeId(x, z);
  }

  getBlockId(y: number, topY: number, biomeId: number): number {
    if (biomeId === BIOME_DESERT) {
      if (y === topY) return BLOCK_ID_SAND;
      if (y >= topY - 4) return BLOCK_ID_SAND;
      return BLOCK_ID_STONE;
    }
    if (y === topY) return topY > 76 ? BLOCK_ID_STONE : BLOCK_ID_GRASS;
    if (y >= topY - 3) return BLOCK_ID_DIRT;
    return BLOCK_ID_STONE;
  }

  generateChunk(storage: VoxelStorage, cx: number, cz: number): void {
    if (storage.isChunkLoaded(cx, cz)) return;
    const baseX = cx * this.chunkSize;
    const baseZ = cz * this.chunkSize;
    const biomeMap = this.biomeModel.buildBiomeMap(baseX, baseZ, this.chunkSize);
    const heightMap = this.heightModel.buildHeightMap(baseX, baseZ, this.chunkSize);
    storage.ensureChunkData(cx, cz);

    for (let lz = 0; lz < this.chunkSize; lz++) {
      for (let lx = 0; lx < this.chunkSize; lx++) {
        const columnIndex = lx + lz * this.chunkSize;
        const topY = heightMap[columnIndex] ?? 0;
        const biomeId = biomeMap[columnIndex] ?? this.biomeModel.getBiomeId(baseX + lx, baseZ + lz);

        for (let y = 0; y <= topY; y++) {
          storage.setChunkLocalBlockId(cx, cz, lx, y, lz, this.getBlockId(y, topY, biomeId));
        }
      }
    }

    this.caveCarver.carveChunk(storage, cx, cz, (x, z) => this.getHeight(x, z));

    for (let lz = 0; lz < this.chunkSize; lz++) {
      for (let lx = 0; lx < this.chunkSize; lx++) {
        const columnIndex = lx + lz * this.chunkSize;
        const topY = heightMap[columnIndex] ?? 0;
        const worldX = baseX + lx;
        const worldZ = baseZ + lz;
        const biomeId = biomeMap[columnIndex] ?? this.biomeModel.getBiomeId(worldX, worldZ);
        const slope = calculateColumnSlope(
          heightMap,
          this.chunkSize,
          baseX,
          baseZ,
          this.heightModel,
          lx,
          lz
        );

        if (!this.treeGenerator.shouldPlaceTree(worldX, worldZ, topY, slope, biomeId)) continue;
        this.treeGenerator.generateTree(storage, worldX, topY, worldZ);
      }
    }

    storage.markChunkLoaded(cx, cz);
  }

  createSpawnPoint(): { x: number; y: number; z: number } {
    if (!this.seed) {
      const randomX = Math.floor((Math.random() - 0.5) * 1024);
      const randomZ = Math.floor((Math.random() - 0.5) * 1024);
      return { x: randomX, y: this.getHeight(randomX, randomZ) + 4, z: randomZ };
    }

    const point = seededSpawnPosition(this.seedInt, 1024);
    return { x: point.x, y: this.getHeight(point.x, point.z) + 4, z: point.z };
  }

  getSeedDisplay(): string {
    return this.seedDisplay;
  }
}
