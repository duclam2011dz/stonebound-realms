function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getHeightFromMap(heightMap, chunkSize, baseX, baseZ, heightModel, lx, lz) {
  if (lx >= 0 && lx < chunkSize && lz >= 0 && lz < chunkSize) {
    return heightMap[lx + lz * chunkSize];
  }
  return heightModel.getHeight(baseX + lx, baseZ + lz);
}

export function calculateColumnSlope(heightMap, chunkSize, baseX, baseZ, heightModel, lx, lz) {
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
