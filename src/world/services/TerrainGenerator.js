import { SeededNoise } from "../noise/SeededNoise.js";
import {
  BLOCK_ID_DIRT,
  BLOCK_ID_GRASS,
  BLOCK_ID_SAND,
  BLOCK_ID_STONE
} from "./BlockPalette.js";
import { hashSeedToInt, seededSpawnPosition } from "./seedUtils.js";
import { CaveCarver } from "./terrain/CaveCarver.js";
import { BiomeModel } from "./terrain/BiomeModel.js";
import { calculateColumnSlope } from "./terrain/heightMapUtils.js";
import { TerrainHeightModel } from "./terrain/TerrainHeightModel.js";
import { TreeGenerator } from "./terrain/TreeGenerator.js";
import { BIOME_DESERT } from "./terrain/biomeTypes.js";

export class TerrainGenerator {
  constructor(chunkSize, maxHeight, seed = "") {
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

  getHeight(x, z) {
    const biomeId = this.biomeModel.getBiomeId(x, z);
    return this.heightModel.getHeight(x, z, biomeId);
  }

  getBiomeAt(x, z) {
    return this.biomeModel.getBiomeName(x, z);
  }

  getBiomeIdAt(x, z) {
    return this.biomeModel.getBiomeId(x, z);
  }

  getBlockId(y, topY, biomeId) {
    if (biomeId === BIOME_DESERT) {
      if (y === topY) return BLOCK_ID_SAND;
      if (y >= topY - 4) return BLOCK_ID_SAND;
      return BLOCK_ID_STONE;
    }
    if (y === topY) return topY > 76 ? BLOCK_ID_STONE : BLOCK_ID_GRASS;
    if (y >= topY - 3) return BLOCK_ID_DIRT;
    return BLOCK_ID_STONE;
  }

  generateChunk(storage, cx, cz) {
    if (storage.isChunkLoaded(cx, cz)) return;
    const baseX = cx * this.chunkSize;
    const baseZ = cz * this.chunkSize;
    const biomeMap = this.biomeModel.buildBiomeMap(baseX, baseZ, this.chunkSize);
    const heightMap = this.heightModel.buildHeightMap(baseX, baseZ, this.chunkSize, biomeMap);
    storage.ensureChunkData(cx, cz);

    for (let lz = 0; lz < this.chunkSize; lz++) {
      for (let lx = 0; lx < this.chunkSize; lx++) {
        const columnIndex = lx + lz * this.chunkSize;
        const topY = heightMap[columnIndex];
        const biomeId = biomeMap[columnIndex];

        for (let y = 0; y <= topY; y++) {
          storage.setChunkLocalBlockId(cx, cz, lx, y, lz, this.getBlockId(y, topY, biomeId));
        }
      }
    }

    this.caveCarver.carveChunk(storage, cx, cz, (x, z) => this.getHeight(x, z));

    for (let lz = 0; lz < this.chunkSize; lz++) {
      for (let lx = 0; lx < this.chunkSize; lx++) {
        const columnIndex = lx + lz * this.chunkSize;
        const topY = heightMap[columnIndex];
        const worldX = baseX + lx;
        const worldZ = baseZ + lz;
        const biomeId = biomeMap[columnIndex];
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

  createSpawnPoint() {
    if (!this.seed) {
      const randomX = Math.floor((Math.random() - 0.5) * 1024);
      const randomZ = Math.floor((Math.random() - 0.5) * 1024);
      return { x: randomX, y: this.getHeight(randomX, randomZ) + 4, z: randomZ };
    }

    const point = seededSpawnPosition(this.seedInt, 1024);
    return { x: point.x, y: this.getHeight(point.x, point.z) + 4, z: point.z };
  }

  getSeedDisplay() {
    return this.seedDisplay;
  }
}
