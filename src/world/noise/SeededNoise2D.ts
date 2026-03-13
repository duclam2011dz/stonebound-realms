import { SeededNoise } from './SeededNoise';

export class SeededNoise2D {
  constructor(seed = 'default-seed') {
    this.noiseEngine = new SeededNoise(seed);
  }

  noise(x, y) {
    return this.noiseEngine.perlin2D(x, y);
  }

  fractalNoise(x, y, octaves = 4, persistence = 0.5, lacunarity = 2) {
    return this.noiseEngine.fractalPerlin2D(x, y, octaves, persistence, lacunarity);
  }
}
