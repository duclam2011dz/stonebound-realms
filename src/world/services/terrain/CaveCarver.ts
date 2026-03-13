import { BLOCK_ID_AIR } from '../BlockPalette';
import { coordHash } from './terrainHash';

const TAU = Math.PI * 2;
const REGION_SIZE = 64;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function floorDiv(n, d) {
  return Math.floor(n / d);
}

function createRng(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

export class CaveCarver {
  constructor(noise, maxHeight, chunkSize, seedInt) {
    this.noise = noise;
    this.maxHeight = maxHeight;
    this.chunkSize = chunkSize;
    this.seedInt = seedInt >>> 0;
  }

  carveChunk(storage, cx, cz, getSurfaceY) {
    const chunkMinX = cx * this.chunkSize;
    const chunkMinZ = cz * this.chunkSize;
    const chunkMaxX = chunkMinX + this.chunkSize - 1;
    const chunkMaxZ = chunkMinZ + this.chunkSize - 1;
    const influenceMargin = 26;
    const bounds = {
      minX: chunkMinX - influenceMargin,
      maxX: chunkMaxX + influenceMargin,
      minZ: chunkMinZ - influenceMargin,
      maxZ: chunkMaxZ + influenceMargin
    };

    const surfaceCache = new Map();
    const getSurfaceYCached = (x, z) => {
      const key = `${x}|${z}`;
      const cached = surfaceCache.get(key);
      if (cached !== undefined) return cached;
      const value = getSurfaceY(x, z);
      surfaceCache.set(key, value);
      return value;
    };

    const minRegionX = floorDiv(bounds.minX, REGION_SIZE);
    const maxRegionX = floorDiv(bounds.maxX, REGION_SIZE);
    const minRegionZ = floorDiv(bounds.minZ, REGION_SIZE);
    const maxRegionZ = floorDiv(bounds.maxZ, REGION_SIZE);

    for (let regionZ = minRegionZ; regionZ <= maxRegionZ; regionZ++) {
      for (let regionX = minRegionX; regionX <= maxRegionX; regionX++) {
        this.carveRegionWorms(storage, regionX, regionZ, bounds, getSurfaceYCached);
      }
    }
  }

  carveRegionWorms(storage, regionX, regionZ, bounds, getSurfaceY) {
    const regionSeed = coordHash(this.seedInt ^ 0x9e3779b9, regionX, regionZ);
    const rng = createRng(regionSeed);
    const wormCount = 2 + Math.floor(rng() * 3);

    for (let i = 0; i < wormCount; i++) {
      const startX = regionX * REGION_SIZE + rng() * REGION_SIZE;
      const startZ = regionZ * REGION_SIZE + rng() * REGION_SIZE;
      const surfaceY = getSurfaceY(Math.floor(startX), Math.floor(startZ));
      if (surfaceY < 16) continue;

      const startY = clamp(surfaceY - (8 + rng() * 34), 8, this.maxHeight - 10);
      const yaw = rng() * TAU;
      const pitch = -(0.08 + rng() * 0.2);
      const segmentCount = 44 + Math.floor(rng() * 78);
      const baseRadius = 1.25 + rng() * 2.35;
      this.carveWorm(
        storage,
        startX,
        startY,
        startZ,
        yaw,
        pitch,
        segmentCount,
        baseRadius,
        rng,
        bounds,
        getSurfaceY
      );
    }
  }

  carveWorm(
    storage,
    startX,
    startY,
    startZ,
    startYaw,
    startPitch,
    segmentCount,
    baseRadius,
    rng,
    bounds,
    getSurfaceY
  ) {
    let x = startX;
    let y = startY;
    let z = startZ;
    let yaw = startYaw;
    let pitch = startPitch;
    const phase = rng() * TAU;

    for (let step = 0; step < segmentCount; step++) {
      if (y < 5 || y >= this.maxHeight - 4) break;

      const curvature = this.noise.simplex3D(x * 0.022, y * 0.022, z * 0.022);
      yaw += (rng() - 0.5) * 0.34 + curvature * 0.07;
      pitch += (rng() - 0.56) * 0.11 - 0.006;
      pitch = clamp(pitch, -0.9, 0.28);

      const stepLength = 1.2 + rng() * 0.38;
      const cosPitch = Math.cos(pitch);
      x += Math.cos(yaw) * cosPitch * stepLength;
      y += Math.sin(pitch) * stepLength;
      z += Math.sin(yaw) * cosPitch * stepLength;

      const pulse = Math.sin(step * 0.12 + phase) * 0.5 + 0.5;
      const detail = this.noise.simplex3D(x * 0.046, y * 0.046, z * 0.046);
      const largePocket = Math.max(0, detail - 0.2) * 1.9;
      const radius = clamp(baseRadius * (0.62 + pulse * 0.88) + largePocket, 1.1, 5.8);
      const radiusY = radius * (0.62 + rng() * 0.24);

      this.carveEllipsoid(storage, x, y, z, radius, radiusY, radius, bounds, getSurfaceY);
    }
  }

  carveEllipsoid(
    storage,
    centerX,
    centerY,
    centerZ,
    radiusX,
    radiusY,
    radiusZ,
    bounds,
    getSurfaceY
  ) {
    const minX = Math.floor(centerX - radiusX);
    const maxX = Math.floor(centerX + radiusX);
    const minY = Math.max(4, Math.floor(centerY - radiusY));
    const maxY = Math.min(this.maxHeight - 3, Math.floor(centerY + radiusY));
    const minZ = Math.floor(centerZ - radiusZ);
    const maxZ = Math.floor(centerZ + radiusZ);

    for (let x = minX; x <= maxX; x++) {
      if (x < bounds.minX || x > bounds.maxX) continue;
      const dx = (x + 0.5 - centerX) / radiusX;
      const dx2 = dx * dx;
      if (dx2 > 1) continue;

      for (let z = minZ; z <= maxZ; z++) {
        if (z < bounds.minZ || z > bounds.maxZ) continue;
        const dz = (z + 0.5 - centerZ) / radiusZ;
        const dz2 = dz * dz;
        if (dx2 + dz2 > 1) continue;
        const surfaceY = getSurfaceY(x, z);

        for (let y = minY; y <= maxY; y++) {
          if (y >= surfaceY - 3) continue;
          const dy = (y + 0.5 - centerY) / radiusY;
          const distance = dx2 + dy * dy + dz2;
          if (distance > 1) continue;
          storage.setBlockId(x, y, z, BLOCK_ID_AIR);
        }
      }
    }
  }
}
