import { SeededNoise } from './SeededNoise';

export class SeededNoise2D {
  noiseEngine: SeededNoise;

  constructor(seed: string | number = 'default-seed') {
    this.noiseEngine = new SeededNoise(seed);
  }

  noise(x: number, y: number): number {
    return this.noiseEngine.perlin2D(x, y);
  }

  fractalNoise(
    x: number,
    y: number,
    octaves: number = 4,
    persistence: number = 0.5,
    lacunarity: number = 2
  ): number {
    return this.noiseEngine.fractalPerlin2D(x, y, octaves, persistence, lacunarity);
  }
}
