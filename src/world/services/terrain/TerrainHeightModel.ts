import { BIOME_DESERT, BIOME_FOREST, BIOME_HILL, BIOME_PLAIN } from './biomeTypes';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export class TerrainHeightModel {
  constructor(noise, maxHeight, biomeModel) {
    this.noise = noise;
    this.maxHeight = maxHeight;
    this.biomeModel = biomeModel;
  }

  getHeight(x, z, biomeId = this.biomeModel.getBiomeId(x, z)) {
    const continental = this.noise.fractalPerlin2D(x * 0.00195, z * 0.00195, 4, 0.52, 2.03);
    const erosion = this.noise.fractalPerlin2D(x * 0.009 + 700, z * 0.009 + 700, 2, 0.5, 2);
    const detail = this.noise.fractalSimplex2D(x * 0.0085, z * 0.0085, 3, 0.56, 2.1);

    let baseHeight = 34;
    if (biomeId === BIOME_PLAIN) {
      const flatWave = this.noise.fractalPerlin2D(x * 0.0049, z * 0.0049, 3, 0.52, 2.05);
      baseHeight = 30 + continental * 8 + flatWave * 4 + detail * 2 + erosion * 2.2;
    } else if (biomeId === BIOME_FOREST) {
      const rolling = this.noise.fractalSimplex2D(
        x * 0.0063 + 320,
        z * 0.0063 - 260,
        4,
        0.56,
        2.12
      );
      baseHeight = 34 + continental * 10 + rolling * 7 + detail * 2.5 + erosion * 2.6;
    } else if (biomeId === BIOME_HILL) {
      const ridgeSource = this.noise.fractalSimplex2D(
        x * 0.0032 + 210,
        z * 0.0032 + 210,
        5,
        0.5,
        2.05
      );
      const ridge = 1 - Math.abs(ridgeSource);
      const ridgeBoost = ridge * ridge;
      const mountainMaskNoise = this.noise.fractalPerlin2D(
        x * 0.0011 - 420,
        z * 0.0011 + 300,
        3,
        0.5,
        2
      );
      const mountainMask = clamp((mountainMaskNoise + 1) * 0.5, 0, 1);
      const highland = ridgeBoost * (14 + mountainMask * 34);
      const hills = this.noise.fractalSimplex2D(x * 0.0066, z * 0.0066, 4, 0.55, 2.1);
      baseHeight = 38 + continental * 11 + hills * 9 + highland + erosion * 3.4;
    } else if (biomeId === BIOME_DESERT) {
      const dunes = this.noise.fractalSimplex2D(x * 0.0074 + 140, z * 0.0074 - 95, 4, 0.58, 2.2);
      const longWaves = this.noise.fractalPerlin2D(
        x * 0.0023 - 450,
        z * 0.0023 + 390,
        3,
        0.52,
        2.05
      );
      const duneRidges = Math.abs(dunes) * 6.8;
      baseHeight =
        28 + continental * 7 + longWaves * 4.5 + duneRidges + detail * 1.8 + erosion * 1.4;
    }

    return clamp(Math.floor(baseHeight), 8, this.maxHeight - 6);
  }

  buildHeightMap(baseX, baseZ, chunkSize, biomeMap = null) {
    const heightMap = new Int16Array(chunkSize * chunkSize);
    for (let lz = 0; lz < chunkSize; lz++) {
      for (let lx = 0; lx < chunkSize; lx++) {
        const worldX = baseX + lx;
        const worldZ = baseZ + lz;
        const biomeId = biomeMap
          ? biomeMap[lx + lz * chunkSize]
          : this.biomeModel.getBiomeId(worldX, worldZ);
        heightMap[lx + lz * chunkSize] = this.getHeight(worldX, worldZ, biomeId);
      }
    }
    return heightMap;
  }
}
