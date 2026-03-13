type Offset = { dx: number; dz: number; ringDistance: number; distanceSq: number };
type PlanEntry = {
  cx: number;
  cz: number;
  key: string;
  ringDistance: number;
  distanceSq: number;
};

const offsetCache = new Map<number, ReadonlyArray<Offset>>();

function getOffsetsForDistance(renderDistance: number): ReadonlyArray<Offset> {
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

export function planVisibleChunks(
  centerChunkX: number,
  centerChunkZ: number,
  renderDistance: number,
  chunkKeyFn: (cx: number, cz: number) => string
): PlanEntry[] {
  const offsets = getOffsetsForDistance(renderDistance);
  const plan: PlanEntry[] = [];
  for (const offset of offsets) {
    const cx = centerChunkX + offset.dx;
    const cz = centerChunkZ + offset.dz;
    plan.push({
      cx,
      cz,
      key: chunkKeyFn(cx, cz),
      ringDistance: offset.ringDistance,
      distanceSq: offset.distanceSq
    });
  }
  return plan;
}
