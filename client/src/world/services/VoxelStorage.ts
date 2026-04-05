import { BLOCK_ID_AIR, blockIdToType, blockTypeToId, type BlockType } from './BlockPalette';

export class VoxelStorage {
  chunkSize: number;
  maxHeight: number;
  chunkVolume: number;
  chunkData: Map<string, Uint8Array>;
  pendingChunkWrites: Map<string, Map<number, number>>;
  loadedChunks: Set<string>;

  constructor(chunkSize: number, maxHeight: number) {
    this.chunkSize = chunkSize;
    this.maxHeight = maxHeight;
    this.chunkVolume = chunkSize * maxHeight * chunkSize;
    this.chunkData = new Map();
    this.pendingChunkWrites = new Map();
    this.loadedChunks = new Set();
  }

  chunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }

  parseChunkKey(key: string): { cx: number; cz: number } {
    const commaIndex = key.indexOf(',');
    return {
      cx: Number(key.slice(0, commaIndex)),
      cz: Number(key.slice(commaIndex + 1))
    };
  }

  floorDiv(n: number, d: number): number {
    return Math.floor(n / d);
  }

  toLocalCoord(worldCoord: number, chunkCoord: number): number {
    return worldCoord - chunkCoord * this.chunkSize;
  }

  getVoxelIndex(localX: number, y: number, localZ: number): number {
    return localX + y * this.chunkSize + localZ * this.chunkSize * this.maxHeight;
  }

  getChunkData(cx: number, cz: number): Uint8Array | null {
    return this.chunkData.get(this.chunkKey(cx, cz)) ?? null;
  }

  ensureChunkData(cx: number, cz: number): Uint8Array {
    const cKey = this.chunkKey(cx, cz);
    let data = this.chunkData.get(cKey);
    if (!data) {
      data = new Uint8Array(this.chunkVolume);
      const pending = this.pendingChunkWrites.get(cKey);
      if (pending) {
        for (const [voxelIndex, blockId] of pending) {
          data[voxelIndex] = blockId;
        }
        this.pendingChunkWrites.delete(cKey);
      }
      this.chunkData.set(cKey, data);
    }
    return data;
  }

  getBlockId(x: number, y: number, z: number): number {
    if (y < 0 || y >= this.maxHeight) return BLOCK_ID_AIR;
    const cX = this.floorDiv(x, this.chunkSize);
    const cZ = this.floorDiv(z, this.chunkSize);
    const localX = this.toLocalCoord(x, cX);
    const localZ = this.toLocalCoord(z, cZ);
    const voxelIndex = this.getVoxelIndex(localX, y, localZ);
    const chunk = this.getChunkData(cX, cZ);
    if (chunk) return chunk[voxelIndex] ?? BLOCK_ID_AIR;
    return this.pendingChunkWrites.get(this.chunkKey(cX, cZ))?.get(voxelIndex) ?? BLOCK_ID_AIR;
  }

  setBlockId(x: number, y: number, z: number, blockId: number): void {
    if (y < 0 || y >= this.maxHeight) return;
    const cX = this.floorDiv(x, this.chunkSize);
    const cZ = this.floorDiv(z, this.chunkSize);
    const localX = this.toLocalCoord(x, cX);
    const localZ = this.toLocalCoord(z, cZ);
    const voxelIndex = this.getVoxelIndex(localX, y, localZ);
    const cKey = this.chunkKey(cX, cZ);
    const chunk = this.chunkData.get(cKey);

    if (chunk) {
      chunk[voxelIndex] = blockId;
      return;
    }

    if (blockId === BLOCK_ID_AIR) {
      const pending = this.pendingChunkWrites.get(cKey);
      if (!pending) return;
      pending.delete(voxelIndex);
      if (pending.size === 0) this.pendingChunkWrites.delete(cKey);
      return;
    }

    let pending = this.pendingChunkWrites.get(cKey);
    if (!pending) {
      pending = new Map();
      this.pendingChunkWrites.set(cKey, pending);
    }
    pending.set(voxelIndex, blockId);
  }

  setChunkLocalBlockId(
    cx: number,
    cz: number,
    localX: number,
    y: number,
    localZ: number,
    blockId: number
  ): void {
    if (y < 0 || y >= this.maxHeight) return;
    if (localX < 0 || localX >= this.chunkSize) return;
    if (localZ < 0 || localZ >= this.chunkSize) return;
    const chunk = this.ensureChunkData(cx, cz);
    chunk[this.getVoxelIndex(localX, y, localZ)] = blockId;
  }

  isBlockFilled(x: number, y: number, z: number): boolean {
    return this.getBlockId(x, y, z) !== BLOCK_ID_AIR;
  }

  getBlockAt(x: number, y: number, z: number): BlockType | null {
    return blockIdToType(this.getBlockId(x, y, z));
  }

  setBlock(x: number, y: number, z: number, type: BlockType): void {
    const blockId = blockTypeToId(type);
    this.setBlockId(x, y, z, blockId);
  }

  removeBlock(x: number, y: number, z: number): void {
    this.setBlockId(x, y, z, BLOCK_ID_AIR);
  }

  markChunkLoaded(cx: number, cz: number): void {
    this.loadedChunks.add(this.chunkKey(cx, cz));
  }

  isChunkLoaded(cx: number, cz: number): boolean {
    return this.loadedChunks.has(this.chunkKey(cx, cz));
  }

  clearChunk(cx: number, cz: number): void {
    const cKey = this.chunkKey(cx, cz);
    this.chunkData.delete(cKey);
    this.pendingChunkWrites.delete(cKey);
    this.loadedChunks.delete(cKey);
  }
}
