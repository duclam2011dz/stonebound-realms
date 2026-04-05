import type { TerrainHeightModel } from './TerrainHeightModel';

type HeightMap = ArrayLike<number>;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getHeightFromMap(
  heightMap: HeightMap,
  chunkSize: number,
  baseX: number,
  baseZ: number,
  heightModel: TerrainHeightModel,
  lx: number,
  lz: number
): number {
  if (lx >= 0 && lx < chunkSize && lz >= 0 && lz < chunkSize) {
    return heightMap[lx + lz * chunkSize] ?? 0;
  }
  return heightModel.getHeight(baseX + lx, baseZ + lz);
}

export function calculateColumnSlope(
  heightMap: HeightMap,
  chunkSize: number,
  baseX: number,
  baseZ: number,
  heightModel: TerrainHeightModel,
  lx: number,
  lz: number
): number {
  const center = getHeightFromMap(heightMap, chunkSize, baseX, baseZ, heightModel, lx, lz);
  const neighbors = [
    getHeightFromMap(heightMap, chunkSize, baseX, baseZ, heightModel, lx - 1, lz),
    getHeightFromMap(heightMap, chunkSize, baseX, baseZ, heightModel, lx + 1, lz),
    getHeightFromMap(heightMap, chunkSize, baseX, baseZ, heightModel, lx, lz - 1),
    getHeightFromMap(heightMap, chunkSize, baseX, baseZ, heightModel, lx, lz + 1)
  ];

  let slope = 0;
  for (const neighbor of neighbors) {
    slope = Math.max(slope, Math.abs(center - neighbor));
  }
  return clamp(slope, 0, 32);
}
