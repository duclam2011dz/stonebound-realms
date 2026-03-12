import { BIOME_DESERT, BIOME_FOREST, BIOME_HILL, BIOME_PLAIN, biomeIdToName } from "./biomeTypes.js";

export class BiomeModel {
  constructor(noise) {
    this.noise = noise;
  }

  getBiomeId(x, z) {
    const biomeWave = this.noise.fractalSimplex2D(x * 0.00145 + 90, z * 0.00145 - 150, 4, 0.54, 2.03);
    const moisture = this.noise.fractalPerlin2D(x * 0.0021 - 320, z * 0.0021 + 280, 3, 0.53, 2.04);
    const ridge = this.noise.fractalPerlin2D(x * 0.00115 + 510, z * 0.00115 - 200, 3, 0.5, 2);
    const heat = this.noise.fractalSimplex2D(x * 0.00175 + 820, z * 0.00175 - 640, 3, 0.56, 2.1);

    const combined = biomeWave * 0.6 + moisture * 0.25 + ridge * 0.15;
    const aridity = heat * 0.7 - moisture * 0.3 - ridge * 0.08;

    if (aridity > 0.22 && ridge < 0.38) return BIOME_DESERT;
    if (combined > 0.24) return BIOME_HILL;
    if (combined < -0.22) return BIOME_PLAIN;

    return BIOME_FOREST;
  }

  getBiomeName(x, z) {
    return biomeIdToName(this.getBiomeId(x, z));
  }

  buildBiomeMap(baseX, baseZ, chunkSize) {
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
