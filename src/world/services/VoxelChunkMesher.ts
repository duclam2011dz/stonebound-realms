import { createGreedyChunkGeometry } from './meshing/createGreedyChunkGeometry';

export class VoxelChunkMesher {
  constructor(chunkSize, maxHeight, lightSourceProvider = null) {
    this.chunkSize = chunkSize;
    this.maxHeight = maxHeight;
    this.maskPool = new Map();
    this.lightSourceProvider = lightSourceProvider;
  }

  createChunkGeometry(storage, cx, cz, lodStep) {
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
