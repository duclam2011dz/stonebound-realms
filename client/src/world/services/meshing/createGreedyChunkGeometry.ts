import * as THREE from 'three';
import type { VoxelStorage } from '../VoxelStorage';
import { BLOCK_ATLAS, BLOCK_FACE_TILES } from '../../../config/constants';
import {
  BLOCK_ID_AIR,
  BLOCK_ID_DIRT,
  BLOCK_ID_GRASS,
  BLOCK_ID_LEAF,
  BLOCK_ID_LAMP,
  BLOCK_ID_PLANK,
  BLOCK_ID_SAND,
  BLOCK_ID_STONE,
  BLOCK_ID_WOOD,
  BLOCK_ID_CRAFTING_TABLE,
  doesBlockOccludeNeighborFaces,
  getBlockRenderLayer,
  type BlockRenderLayer
} from '../BlockPalette';

type BlockTile = { x: number; y: number };
type LightSource = { x: number; y: number; z: number };
type LightSample = { sky: number; block: number };
type MaskBuffers = { types: Uint8Array; signs: Int8Array };
type QuadBuffers = {
  positions: number[];
  normals: number[];
  uvs: number[];
  tilemaps: number[];
  lightmaps: number[];
  indices: number[];
  vertexCount: number;
};

export type ChunkGeometryLayers = {
  solid: THREE.BufferGeometry | null;
  cutout: THREE.BufferGeometry | null;
};

type LayeredQuadBuffers = Record<BlockRenderLayer, QuadBuffers>;

const FACE_UV_EPSILON = 0.0001;
const AXIS_TO_UV_AXES = [
  { uAxis: 2, vAxis: 1 },
  { uAxis: 0, vAxis: 2 },
  { uAxis: 0, vAxis: 1 }
] as const;
const AXES = [0, 1, 2] as const;
const CROSS_SIGNS = [-1, -1, 1];
const TILE_U_SIZE = 1 / BLOCK_ATLAS.columns;
const TILE_V_SIZE = 1 / BLOCK_ATLAS.rows;
const MAX_BLOCK_LIGHT = 15;

function getFaceTile(blockId: number, axis: number, sign: number): BlockTile {
  if (blockId === BLOCK_ID_GRASS) {
    if (axis === 1 && sign > 0) return BLOCK_FACE_TILES.grass.top;
    if (axis === 1 && sign < 0) return BLOCK_FACE_TILES.grass.bottom;
    return BLOCK_FACE_TILES.grass.side;
  }
  if (blockId === BLOCK_ID_WOOD) {
    return axis === 1 ? BLOCK_FACE_TILES.wood.top : BLOCK_FACE_TILES.wood.side;
  }
  if (blockId === BLOCK_ID_LEAF) return BLOCK_FACE_TILES.leaf.all;
  if (blockId === BLOCK_ID_SAND) return BLOCK_FACE_TILES.sand.all;
  if (blockId === BLOCK_ID_STONE) return BLOCK_FACE_TILES.stone.all;
  if (blockId === BLOCK_ID_DIRT) return BLOCK_FACE_TILES.dirt.all;
  if (blockId === BLOCK_ID_LAMP) return BLOCK_FACE_TILES.lamp.all;
  if (blockId === BLOCK_ID_PLANK) return BLOCK_FACE_TILES.plank.all;
  if (blockId === BLOCK_ID_CRAFTING_TABLE) {
    if (axis === 1 && sign > 0) return BLOCK_FACE_TILES.crafting_table.top;
    if (axis === 1 && sign < 0) return BLOCK_FACE_TILES.crafting_table.bottom;
    if (axis === 2 && sign > 0) return BLOCK_FACE_TILES.crafting_table.front;
    return BLOCK_FACE_TILES.crafting_table.side;
  }
  return BLOCK_FACE_TILES.dirt.all;
}

function getSkyHeightForColumn(
  storage: VoxelStorage,
  worldX: number,
  worldZ: number,
  maxHeight: number
): number {
  for (let y = maxHeight - 1; y >= 0; y--) {
    if (storage.getBlockId(worldX, y, worldZ) !== BLOCK_ID_AIR) return y;
  }
  return -1;
}

function buildSkyHeights(
  storage: VoxelStorage,
  baseX: number,
  baseZ: number,
  chunkSize: number,
  maxHeight: number,
  chunkData: Uint8Array | null = null
): Int16Array {
  const heights = new Int16Array(chunkSize * chunkSize);
  heights.fill(-1);
  for (let z = 0; z < chunkSize; z++) {
    const worldZ = baseZ + z;
    for (let x = 0; x < chunkSize; x++) {
      const worldX = baseX + x;
      if (chunkData) {
        let height = -1;
        const columnBase = x + z * chunkSize * maxHeight;
        for (let y = maxHeight - 1; y >= 0; y--) {
          if ((chunkData[columnBase + y * chunkSize] ?? BLOCK_ID_AIR) !== BLOCK_ID_AIR) {
            height = y;
            break;
          }
        }
        heights[x + z * chunkSize] = height;
      } else {
        heights[x + z * chunkSize] = getSkyHeightForColumn(storage, worldX, worldZ, maxHeight);
      }
    }
  }
  return heights;
}

function getSkyHeightAt(
  heights: Int16Array,
  baseX: number,
  baseZ: number,
  chunkSize: number,
  maxHeight: number,
  storage: VoxelStorage,
  worldX: number,
  worldZ: number
): number {
  const localX = worldX - baseX;
  const localZ = worldZ - baseZ;
  if (localX >= 0 && localX < chunkSize && localZ >= 0 && localZ < chunkSize) {
    return heights[localX + localZ * chunkSize] ?? -1;
  }
  return getSkyHeightForColumn(storage, worldX, worldZ, maxHeight);
}

function computeSkyLight(
  heights: Int16Array,
  baseX: number,
  baseZ: number,
  chunkSize: number,
  maxHeight: number,
  storage: VoxelStorage,
  worldX: number,
  worldY: number,
  worldZ: number
): number {
  const skyHeight = getSkyHeightAt(
    heights,
    baseX,
    baseZ,
    chunkSize,
    maxHeight,
    storage,
    worldX,
    worldZ
  );
  if (skyHeight < 0) return 1;
  const delta = worldY - skyHeight;
  if (delta <= 0) return 0;
  if (delta < 2) return delta / 2;
  return 1;
}

function buildBlockLightGrid(
  lightSources: LightSource[],
  getCell: (x: number, y: number, z: number) => number,
  baseX: number,
  baseZ: number,
  lodStep: number,
  sizeX: number,
  sizeY: number,
  sizeZ: number
): Uint8Array | null {
  if (!lightSources.length) return null;

  const volume = sizeX * sizeY * sizeZ;
  const light = new Uint8Array(volume);
  let queue = new Int32Array(Math.max(256, volume * 3));
  let head = 0;
  let tail = 0;

  const pushToQueue = (x: number, y: number, z: number) => {
    if (tail + 3 > queue.length) {
      const expanded = new Int32Array(queue.length * 2);
      expanded.set(queue);
      queue = expanded;
    }
    queue[tail++] = x;
    queue[tail++] = y;
    queue[tail++] = z;
  };

  const pushSeed = (x: number, y: number, z: number, level: number) => {
    if (level <= 0) return;
    if (x < 0 || x >= sizeX || y < 0 || y >= sizeY || z < 0 || z >= sizeZ) return;
    const idx = x + y * sizeX + z * sizeX * sizeY;
    if (level <= (light[idx] ?? 0)) return;
    light[idx] = level;
    pushToQueue(x, y, z);
  };

  for (const source of lightSources) {
    const rawX = Math.floor((source.x - baseX) / lodStep);
    const rawY = Math.floor(source.y / lodStep);
    const rawZ = Math.floor((source.z - baseZ) / lodStep);
    const clampX = Math.min(sizeX - 1, Math.max(0, rawX));
    const clampY = Math.min(sizeY - 1, Math.max(0, rawY));
    const clampZ = Math.min(sizeZ - 1, Math.max(0, rawZ));
    const dist =
      Math.max(0, clampX - rawX, rawX - clampX) +
      Math.max(0, clampY - rawY, rawY - clampY) +
      Math.max(0, clampZ - rawZ, rawZ - clampZ);
    const level = Math.max(0, MAX_BLOCK_LIGHT - dist);
    pushSeed(clampX, clampY, clampZ, level);
  }

  while (head < tail) {
    const x = queue[head++] ?? 0;
    const y = queue[head++] ?? 0;
    const z = queue[head++] ?? 0;
    const idx = x + y * sizeX + z * sizeX * sizeY;
    const level = light[idx] ?? 0;
    if (level <= 1) continue;

    const nextLevel = level - 1;
    const tryPush = (nx: number, ny: number, nz: number) => {
      if (nx < 0 || nx >= sizeX || ny < 0 || ny >= sizeY || nz < 0 || nz >= sizeZ) return;
      if (getCell(nx, ny, nz) !== BLOCK_ID_AIR) return;
      const nIdx = nx + ny * sizeX + nz * sizeX * sizeY;
      if (nextLevel <= (light[nIdx] ?? 0)) return;
      light[nIdx] = nextLevel;
      pushToQueue(nx, ny, nz);
    };
    tryPush(x + 1, y, z);
    tryPush(x - 1, y, z);
    tryPush(x, y + 1, z);
    tryPush(x, y - 1, z);
    tryPush(x, y, z + 1);
    tryPush(x, y, z - 1);
  }

  return light;
}

function sampleLodCell(
  storage: VoxelStorage,
  startX: number,
  startY: number,
  startZ: number,
  lodStep: number,
  maxHeight: number
): number {
  for (let oy = 0; oy < lodStep; oy++) {
    const y = startY + oy;
    if (y < 0 || y >= maxHeight) continue;
    for (let oz = 0; oz < lodStep; oz++) {
      for (let ox = 0; ox < lodStep; ox++) {
        const blockId = storage.getBlockId(startX + ox, y, startZ + oz);
        if (blockId !== BLOCK_ID_AIR) return blockId;
      }
    }
  }
  return BLOCK_ID_AIR;
}

function fillChunkCells(
  cells: Uint8Array,
  storage: VoxelStorage,
  cx: number,
  cz: number,
  lodStep: number,
  chunkSize: number,
  maxHeight: number,
  sizeX: number,
  sizeY: number,
  sizeZ: number
): void {
  if (lodStep === 1) {
    const chunkData = storage.getChunkData(cx, cz);
    if (chunkData) cells.set(chunkData);
    return;
  }

  const baseX = cx * chunkSize;
  const baseZ = cz * chunkSize;
  for (let cellZ = 0; cellZ < sizeZ; cellZ++) {
    const worldZ = baseZ + cellZ * lodStep;
    for (let cellY = 0; cellY < sizeY; cellY++) {
      const worldY = cellY * lodStep;
      for (let cellX = 0; cellX < sizeX; cellX++) {
        const worldX = baseX + cellX * lodStep;
        const index = cellX + cellY * sizeX + cellZ * sizeX * sizeY;
        cells[index] = sampleLodCell(storage, worldX, worldY, worldZ, lodStep, maxHeight);
      }
    }
  }
}

function appendQuad(
  buffers: QuadBuffers,
  quad: {
    ax: number;
    ay: number;
    az: number;
    bx: number;
    by: number;
    bz: number;
    cx: number;
    cy: number;
    cz: number;
    dx: number;
    dy: number;
    dz: number;
  },
  axis: number,
  sign: number,
  uvScale: { u: number; v: number },
  tileBounds: { u0: number; u1: number; v0: number; v1: number },
  light: LightSample
): void {
  const { ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz } = quad;
  const { u, v } = uvScale;
  const { u0, u1, v0, v1 } = tileBounds;
  const { positions, normals, uvs, tilemaps, indices, lightmaps } = buffers;

  positions.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz);

  const nx = axis === 0 ? sign : 0;
  const ny = axis === 1 ? sign : 0;
  const nz = axis === 2 ? sign : 0;
  normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);

  uvs.push(0, 0, u, 0, u, v, 0, v);
  tilemaps.push(u0, v0, u1, v1, u0, v0, u1, v1, u0, v0, u1, v1, u0, v0, u1, v1);
  lightmaps.push(
    light.sky,
    light.block,
    light.sky,
    light.block,
    light.sky,
    light.block,
    light.sky,
    light.block
  );

  const base = buffers.vertexCount;
  const forwardWinding = sign === CROSS_SIGNS[axis];
  if (forwardWinding) {
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  } else {
    indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  buffers.vertexCount += 4;
}

function createQuadBuffers(): QuadBuffers {
  return {
    positions: [],
    normals: [],
    uvs: [],
    tilemaps: [],
    lightmaps: [],
    indices: [],
    vertexCount: 0
  };
}

function createLayeredQuadBuffers(): LayeredQuadBuffers {
  return {
    solid: createQuadBuffers(),
    cutout: createQuadBuffers()
  };
}

function createGeometryFromBuffers(buffers: QuadBuffers): THREE.BufferGeometry | null {
  if (buffers.indices.length === 0) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(buffers.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(buffers.normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(buffers.uvs, 2));
  geometry.setAttribute('tilemap', new THREE.Float32BufferAttribute(buffers.tilemaps, 4));
  geometry.setAttribute('lightmap', new THREE.Float32BufferAttribute(buffers.lightmaps, 2));
  geometry.setIndex(buffers.indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function shouldRenderFace(blockId: number, neighborId: number): boolean {
  if (blockId === BLOCK_ID_AIR) return false;
  if (neighborId === BLOCK_ID_AIR) return true;
  return !doesBlockOccludeNeighborFaces(blockId) || !doesBlockOccludeNeighborFaces(neighborId);
}

function emitMaskQuads({
  maskTypes,
  dimensions,
  axis,
  sign,
  x,
  baseX,
  baseZ,
  lodStep,
  chunkSize,
  maxHeight,
  storage,
  skyHeights,
  layerBuffers,
  sampleBlockLight
}: {
  maskTypes: Uint8Array;
  dimensions: [number, number, number];
  axis: (typeof AXES)[number];
  sign: -1 | 1;
  x: [number, number, number];
  baseX: number;
  baseZ: number;
  lodStep: number;
  chunkSize: number;
  maxHeight: number;
  storage: VoxelStorage;
  skyHeights: Int16Array;
  layerBuffers: LayeredQuadBuffers;
  sampleBlockLight: (worldX: number, worldY: number, worldZ: number) => number;
}): void {
  const { uAxis, vAxis } = AXIS_TO_UV_AXES[axis];
  const rowWidth = dimensions[uAxis];
  const rowCount = dimensions[vAxis];
  let n = 0;

  for (let j = 0; j < rowCount; j++) {
    for (let i = 0; i < rowWidth; ) {
      const currentType = maskTypes[n] ?? BLOCK_ID_AIR;
      if (currentType === BLOCK_ID_AIR) {
        i += 1;
        n += 1;
        continue;
      }

      let width = 1;
      while (i + width < rowWidth && maskTypes[n + width] === currentType) {
        width += 1;
      }

      let height = 1;
      let canGrow = true;
      while (j + height < rowCount && canGrow) {
        for (let k = 0; k < width; k++) {
          const index = n + k + height * rowWidth;
          if (maskTypes[index] !== currentType) {
            canGrow = false;
            break;
          }
        }
        if (canGrow) height += 1;
      }

      x[uAxis] = i;
      x[vAxis] = j;

      const du: [number, number, number] = [0, 0, 0];
      const dv: [number, number, number] = [0, 0, 0];
      du[uAxis] = width;
      dv[vAxis] = height;

      const p0x = baseX + x[0] * lodStep;
      const p0y = x[1] * lodStep;
      const p0z = baseZ + x[2] * lodStep;

      const p1x = baseX + (x[0] + du[0]) * lodStep;
      const p1y = (x[1] + du[1]) * lodStep;
      const p1z = baseZ + (x[2] + du[2]) * lodStep;

      const p3x = baseX + (x[0] + dv[0]) * lodStep;
      const p3y = (x[1] + dv[1]) * lodStep;
      const p3z = baseZ + (x[2] + dv[2]) * lodStep;
      const p2x = p1x + (p3x - p0x);
      const p2y = p1y + (p3y - p0y);
      const p2z = p1z + (p3z - p0z);

      const tile = getFaceTile(currentType, axis, sign);
      const centerX = p0x + (p1x - p0x) * 0.5 + (p3x - p0x) * 0.5;
      const centerY = p0y + (p1y - p0y) * 0.5 + (p3y - p0y) * 0.5;
      const centerZ = p0z + (p1z - p0z) * 0.5 + (p3z - p0z) * 0.5;
      const sky = computeSkyLight(
        skyHeights,
        baseX,
        baseZ,
        chunkSize,
        maxHeight,
        storage,
        Math.floor(centerX),
        centerY,
        Math.floor(centerZ)
      );
      const block = sampleBlockLight(centerX, centerY, centerZ);

      appendQuad(
        layerBuffers[getBlockRenderLayer(currentType)],
        {
          ax: p0x,
          ay: p0y,
          az: p0z,
          bx: p1x,
          by: p1y,
          bz: p1z,
          cx: p2x,
          cy: p2y,
          cz: p2z,
          dx: p3x,
          dy: p3y,
          dz: p3z
        },
        axis,
        sign,
        { u: width, v: height },
        {
          u0: tile.x * TILE_U_SIZE + FACE_UV_EPSILON,
          u1: (tile.x + 1) * TILE_U_SIZE - FACE_UV_EPSILON,
          v0: 1 - (tile.y + 1) * TILE_V_SIZE + FACE_UV_EPSILON,
          v1: 1 - tile.y * TILE_V_SIZE - FACE_UV_EPSILON
        },
        { sky, block }
      );

      for (let h = 0; h < height; h++) {
        const rowStart = n + h * rowWidth;
        for (let w = 0; w < width; w++) {
          maskTypes[rowStart + w] = BLOCK_ID_AIR;
        }
      }

      i += width;
      n += width;
    }
  }
}

function getMaskBuffers(maskPool: Map<number, MaskBuffers>, maskSize: number): MaskBuffers {
  let buffers = maskPool.get(maskSize);
  if (!buffers) {
    buffers = {
      types: new Uint8Array(maskSize),
      signs: new Int8Array(maskSize)
    };
    maskPool.set(maskSize, buffers);
  }
  return buffers;
}

export function createGreedyChunkGeometry({
  storage,
  cx,
  cz,
  lodStep,
  chunkSize,
  maxHeight,
  maskPool,
  lightSources = []
}: {
  storage: VoxelStorage;
  cx: number;
  cz: number;
  lodStep: number;
  chunkSize: number;
  maxHeight: number;
  maskPool: Map<number, MaskBuffers>;
  lightSources?: LightSource[];
}): ChunkGeometryLayers {
  const sizeX = Math.max(1, Math.floor(chunkSize / lodStep));
  const sizeY = Math.max(1, Math.floor(maxHeight / lodStep));
  const sizeZ = Math.max(1, Math.floor(chunkSize / lodStep));
  const dimensions: [number, number, number] = [sizeX, sizeY, sizeZ];
  const baseX = cx * chunkSize;
  const baseZ = cz * chunkSize;

  const cellCount = sizeX * sizeY * sizeZ;
  const cells = new Uint8Array(cellCount);
  fillChunkCells(cells, storage, cx, cz, lodStep, chunkSize, maxHeight, sizeX, sizeY, sizeZ);
  const chunkData = storage.getChunkData(cx, cz);
  const skyHeights = buildSkyHeights(storage, baseX, baseZ, chunkSize, maxHeight, chunkData);

  const getCell = (x: number, y: number, z: number): number => {
    if (y < 0 || y >= sizeY) return BLOCK_ID_AIR;
    if (x >= 0 && x < sizeX && z >= 0 && z < sizeZ) {
      return cells[x + y * sizeX + z * sizeX * sizeY] ?? BLOCK_ID_AIR;
    }
    return sampleLodCell(
      storage,
      baseX + x * lodStep,
      y * lodStep,
      baseZ + z * lodStep,
      lodStep,
      maxHeight
    );
  };
  const blockLightGrid = buildBlockLightGrid(
    lightSources,
    getCell,
    baseX,
    baseZ,
    lodStep,
    sizeX,
    sizeY,
    sizeZ
  );
  const sampleBlockLight = (worldX: number, worldY: number, worldZ: number): number => {
    if (!blockLightGrid) return 0;
    const lx = Math.floor((worldX - baseX) / lodStep);
    const ly = Math.floor(worldY / lodStep);
    const lz = Math.floor((worldZ - baseZ) / lodStep);
    if (lx < 0 || lx >= sizeX || ly < 0 || ly >= sizeY || lz < 0 || lz >= sizeZ) return 0;
    const level = blockLightGrid[lx + ly * sizeX + lz * sizeX * sizeY] ?? 0;
    return level / MAX_BLOCK_LIGHT;
  };

  const layerBuffers = createLayeredQuadBuffers();

  for (const axis of AXES) {
    const { uAxis, vAxis } = AXIS_TO_UV_AXES[axis];
    const maskWidth = dimensions[uAxis];
    const maskHeight = dimensions[vAxis];
    const maskSize = maskWidth * maskHeight;
    const { types: maskTypes } = getMaskBuffers(maskPool, maskSize);

    const x: [number, number, number] = [0, 0, 0];
    const q: [number, number, number] = [0, 0, 0];
    q[axis] = 1;

    for (x[axis] = -1; x[axis] < dimensions[axis]; ) {
      const plane = x[axis];
      let n = 0;

      for (x[vAxis] = 0; x[vAxis] < dimensions[vAxis]; x[vAxis]++) {
        for (x[uAxis] = 0; x[uAxis] < dimensions[uAxis]; x[uAxis]++) {
          const a = plane >= 0 ? getCell(x[0], x[1], x[2]) : BLOCK_ID_AIR;
          const b =
            plane < dimensions[axis] - 1
              ? getCell(x[0] + q[0], x[1] + q[1], x[2] + q[2])
              : BLOCK_ID_AIR;
          maskTypes[n] = shouldRenderFace(a, b) ? a : BLOCK_ID_AIR;
          n += 1;
        }
      }

      x[axis] = plane + 1;
      emitMaskQuads({
        maskTypes,
        dimensions,
        axis,
        sign: 1,
        x,
        baseX,
        baseZ,
        lodStep,
        chunkSize,
        maxHeight,
        storage,
        skyHeights,
        layerBuffers,
        sampleBlockLight
      });

      x[axis] = plane;
      n = 0;
      for (x[vAxis] = 0; x[vAxis] < dimensions[vAxis]; x[vAxis]++) {
        for (x[uAxis] = 0; x[uAxis] < dimensions[uAxis]; x[uAxis]++) {
          const a = plane >= 0 ? getCell(x[0], x[1], x[2]) : BLOCK_ID_AIR;
          const b =
            plane < dimensions[axis] - 1
              ? getCell(x[0] + q[0], x[1] + q[1], x[2] + q[2])
              : BLOCK_ID_AIR;
          maskTypes[n] = shouldRenderFace(b, a) ? b : BLOCK_ID_AIR;
          n += 1;
        }
      }

      x[axis] = plane + 1;
      emitMaskQuads({
        maskTypes,
        dimensions,
        axis,
        sign: -1,
        x,
        baseX,
        baseZ,
        lodStep,
        chunkSize,
        maxHeight,
        storage,
        skyHeights,
        layerBuffers,
        sampleBlockLight
      });
    }
  }

  return {
    solid: createGeometryFromBuffers(layerBuffers.solid),
    cutout: createGeometryFromBuffers(layerBuffers.cutout)
  };
}
