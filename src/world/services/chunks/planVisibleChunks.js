const offsetCache = new Map();

function getOffsetsForDistance(renderDistance) {
  let cached = offsetCache.get(renderDistance);
  if (cached) return cached;

  const maxDistanceSq = renderDistance * renderDistance;
  const offsets = [];
  for (let dx = -renderDistance; dx <= renderDistance; dx++) {
    for (let dz = -renderDistance; dz <= renderDistance; dz++) {
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq > maxDistanceSq) continue;
      offsets.push({
        dx,
        dz,
        ringDistance: Math.max(Math.abs(dx), Math.abs(dz)),
        distanceSq
      });
    }
  }

  offsets.sort((a, b) => a.distanceSq - b.distanceSq || a.ringDistance - b.ringDistance);
  cached = Object.freeze(offsets);
  offsetCache.set(renderDistance, cached);
  return cached;
}

export function planVisibleChunks(centerChunkX, centerChunkZ, renderDistance, chunkKeyFn) {
  const offsets = getOffsetsForDistance(renderDistance);
  const plan = new Array(offsets.length);
  for (let i = 0; i < offsets.length; i++) {
    const offset = offsets[i];
    const cx = centerChunkX + offset.dx;
    const cz = centerChunkZ + offset.dz;
    plan[i] = {
      cx,
      cz,
      key: chunkKeyFn(cx, cz),
      ringDistance: offset.ringDistance,
      distanceSq: offset.distanceSq
    };
  }
  return plan;
}
