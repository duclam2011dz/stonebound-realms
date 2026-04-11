import {
  createGreedyChunkGeometry,
  type ChunkGeometryLayers
} from './meshing/createGreedyChunkGeometry';
import type { VoxelStorage } from './VoxelStorage';

type LightSource = { x: number; y: number; z: number };
type MaskBuffers = { types: Uint8Array; signs: Int8Array };

export class VoxelChunkMesher {
  chunkSize: number;
  maxHeight: number;
  maskPool: Map<number, MaskBuffers>;
  lightSourceProvider: ((cx: number, cz: number) => LightSource[]) | null;

  constructor(
    chunkSize: number,
    maxHeight: number,
    lightSourceProvider: ((cx: number, cz: number) => LightSource[]) | null = null
  ) {
    this.chunkSize = chunkSize;
    this.maxHeight = maxHeight;
    this.maskPool = new Map();
    this.lightSourceProvider = lightSourceProvider;
  }

  createChunkGeometry(
    storage: VoxelStorage,
    cx: number,
    cz: number,
    lodStep: number
  ): ChunkGeometryLayers {
    return createGreedyChunkGeometry({
      storage,
      cx,
      cz,
      lodStep,
      chunkSize: this.chunkSize,
      maxHeight: this.maxHeight,
      maskPool: this.maskPool,
      lightSources: this.lightSourceProvider ? this.lightSourceProvider(cx, cz) : []
    });
  }
}
