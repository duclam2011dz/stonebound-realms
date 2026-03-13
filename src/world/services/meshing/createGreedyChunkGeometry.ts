import * as THREE from 'three';
import { BLOCK_ATLAS, BLOCK_FACE_TILES } from '../../../config/constants';
import {
  BLOCK_ID_AIR,
  BLOCK_ID_DIRT,
  BLOCK_ID_GRASS,
  BLOCK_ID_LEAF,
  BLOCK_ID_SAND,
  BLOCK_ID_STONE,
  BLOCK_ID_WOOD,
  BLOCK_ID_LAMP
} from '../BlockPalette';

const FACE_UV_EPSILON = 0.0001;
const AXIS_TO_UV_AXES = [
  { uAxis: 2, vAxis: 1 },
  { uAxis: 0, vAxis: 2 },
  { uAxis: 0, vAxis: 1 }
];
const CROSS_SIGNS = [-1, -1, 1];
const TILE_U_SIZE = 1 / BLOCK_ATLAS.columns;
const TILE_V_SIZE = 1 / BLOCK_ATLAS.rows;
const MAX_BLOCK_LIGHT = 15;

function getFaceTile(blockId, axis, sign) {
  if (blockId === BLOCK_ID_GRASS) {
    if (axis === 1 && sign > 0) return BLOCK_FACE_TILES.grass.top;
    if (axis === 1 && sign < 0) return BLOCK_FACE_TILES.grass.bottom;
    return BLOCK_FACE_TILES.grass.side;
  }
  if (blockId === BLOCK_ID_WOOD) return BLOCK_FACE_TILES.wood.all;
  if (blockId === BLOCK_ID_LEAF) return BLOCK_FACE_TILES.leaf.all;
  if (blockId === BLOCK_ID_SAND) return BLOCK_FACE_TILES.sand.all;
  if (blockId === BLOCK_ID_STONE) return BLOCK_FACE_TILES.stone.all;
  if (blockId === BLOCK_ID_DIRT) return BLOCK_FACE_TILES.dirt.all;
  if (blockId === BLOCK_ID_LAMP) return BLOCK_FACE_TILES.lamp.all;
  return BLOCK_FACE_TILES.dirt.all;
}

function getSkyHeightForColumn(storage, worldX, worldZ, maxHeight) {
  for (let y = maxHeight - 1; y >= 0; y--) {
    if (storage.getBlockId(worldX, y, worldZ) !== BLOCK_ID_AIR) return y;
  }
  return -1;
}

function buildSkyHeights(storage, baseX, baseZ, chunkSize, maxHeight, chunkData = null) {
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
          if (chunkData[columnBase + y * chunkSize] !== BLOCK_ID_AIR) {
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

function getSkyHeightAt(heights, baseX, baseZ, chunkSize, maxHeight, storage, worldX, worldZ) {
  const localX = worldX - baseX;
  const localZ = worldZ - baseZ;
  if (localX >= 0 && localX < chunkSize && localZ >= 0 && localZ < chunkSize) {
    return heights[localX + localZ * chunkSize];
  }
  return getSkyHeightForColumn(storage, worldX, worldZ, maxHeight);
}

function computeSkyLight(
  heights,
  baseX,
  baseZ,
  chunkSize,
  maxHeight,
  storage,
  worldX,
  worldY,
  worldZ
) {
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

function buildBlockLightGrid(lightSources, getCell, baseX, baseZ, lodStep, sizeX, sizeY, sizeZ) {
  if (!lightSources.length) return null;

  const volume = sizeX * sizeY * sizeZ;
  const light = new Uint8Array(volume);
  let queue = new Int32Array(Math.max(256, volume * 3));
  let head = 0;
  let tail = 0;

  const pushToQueue = (x, y, z) => {
    if (tail + 3 > queue.length) {
      const expanded = new Int32Array(queue.length * 2);
      expanded.set(queue);
      queue = expanded;
    }
    queue[tail++] = x;
    queue[tail++] = y;
    queue[tail++] = z;
  };

  const pushSeed = (x, y, z, level) => {
    if (level <= 0) return;
    if (x < 0 || x >= sizeX || y < 0 || y >= sizeY || z < 0 || z >= sizeZ) return;
    const idx = x + y * sizeX + z * sizeX * sizeY;
    if (level <= light[idx]) return;
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
    const x = queue[head++];
    const y = queue[head++];
    const z = queue[head++];
    const idx = x + y * sizeX + z * sizeX * sizeY;
    const level = light[idx];
    if (level <= 1) continue;

    const nextLevel = level - 1;
    const tryPush = (nx, ny, nz) => {
      if (nx < 0 || nx >= sizeX || ny < 0 || ny >= sizeY || nz < 0 || nz >= sizeZ) return;
      if (getCell(nx, ny, nz) !== BLOCK_ID_AIR) return;
      const nIdx = nx + ny * sizeX + nz * sizeX * sizeY;
      if (nextLevel <= light[nIdx]) return;
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

function sampleLodCell(storage, startX, startY, startZ, lodStep, maxHeight) {
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
  cells,
  storage,
  cx,
  cz,
  lodStep,
  chunkSize,
  maxHeight,
  sizeX,
  sizeY,
  sizeZ
) {
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

function appendSubQuad(buffers, quad, axis, sign, uv, light) {
  const { ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz } = quad;
  const { u0, u1, v0, v1 } = uv;
  const { positions, normals, uvs, indices, lightmaps } = buffers;

  positions.push(ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz);

  const nx = axis === 0 ? sign : 0;
  const ny = axis === 1 ? sign : 0;
  const nz = axis === 2 ? sign : 0;
  normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);

  uvs.push(u0, v0, u1, v0, u1, v1, u0, v1);
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

function appendTiledQuad(buffers, quadData, light) {
  const { p0x, p0y, p0z, p1x, p1y, p1z, p3x, p3y, p3z, width, height, axis, sign, tile } = quadData;

  const uv = {
    u0: tile.x * TILE_U_SIZE + FACE_UV_EPSILON,
    u1: (tile.x + 1) * TILE_U_SIZE - FACE_UV_EPSILON,
    v0: 1 - (tile.y + 1) * TILE_V_SIZE + FACE_UV_EPSILON,
    v1: 1 - tile.y * TILE_V_SIZE - FACE_UV_EPSILON
  };

  const edgeUx = (p1x - p0x) / width;
  const edgeUy = (p1y - p0y) / width;
  const edgeUz = (p1z - p0z) / width;
  const edgeVx = (p3x - p0x) / height;
  const edgeVy = (p3y - p0y) / height;
  const edgeVz = (p3z - p0z) / height;

  for (let v = 0; v < height; v++) {
    const baseVx = p0x + edgeVx * v;
    const baseVy = p0y + edgeVy * v;
    const baseVz = p0z + edgeVz * v;
    for (let u = 0; u < width; u++) {
      const ax = baseVx + edgeUx * u;
      const ay = baseVy + edgeUy * u;
      const az = baseVz + edgeUz * u;
      const bx = ax + edgeUx;
      const by = ay + edgeUy;
      const bz = az + edgeUz;
      const dx = ax + edgeVx;
      const dy = ay + edgeVy;
      const dz = az + edgeVz;
      const cx = bx + edgeVx;
      const cy = by + edgeVy;
      const cz = bz + edgeVz;

      appendSubQuad(
        buffers,
        {
          ax,
          ay,
          az,
          bx,
          by,
          bz,
          cx,
          cy,
          cz,
          dx,
          dy,
          dz
        },
        axis,
        sign,
        uv,
        light
      );
    }
  }
}

function getMaskBuffers(maskPool, maskSize) {
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
}) {
  const sizeX = Math.max(1, Math.floor(chunkSize / lodStep));
  const sizeY = Math.max(1, Math.floor(maxHeight / lodStep));
  const sizeZ = Math.max(1, Math.floor(chunkSize / lodStep));
  const dimensions = [sizeX, sizeY, sizeZ];
  const baseX = cx * chunkSize;
  const baseZ = cz * chunkSize;

  const cellCount = sizeX * sizeY * sizeZ;
  const cells = new Uint8Array(cellCount);
  fillChunkCells(cells, storage, cx, cz, lodStep, chunkSize, maxHeight, sizeX, sizeY, sizeZ);
  const chunkData = storage.getChunkData(cx, cz);
  const skyHeights = buildSkyHeights(storage, baseX, baseZ, chunkSize, maxHeight, chunkData);

  const getCell = (x, y, z) => {
    if (y < 0 || y >= sizeY) return BLOCK_ID_AIR;
    if (x >= 0 && x < sizeX && z >= 0 && z < sizeZ) {
      return cells[x + y * sizeX + z * sizeX * sizeY];
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
  const sampleBlockLight = (worldX, worldY, worldZ) => {
    if (!blockLightGrid) return 0;
    const lx = Math.floor((worldX - baseX) / lodStep);
    const ly = Math.floor(worldY / lodStep);
    const lz = Math.floor((worldZ - baseZ) / lodStep);
    if (lx < 0 || lx >= sizeX || ly < 0 || ly >= sizeY || lz < 0 || lz >= sizeZ) return 0;
    return blockLightGrid[lx + ly * sizeX + lz * sizeX * sizeY] / MAX_BLOCK_LIGHT;
  };

  const buffers = {
    positions: [],
    normals: [],
    uvs: [],
    lightmaps: [],
    indices: [],
    vertexCount: 0
  };

  for (let axis = 0; axis < 3; axis++) {
    const { uAxis, vAxis } = AXIS_TO_UV_AXES[axis];
    const maskWidth = dimensions[uAxis];
    const maskHeight = dimensions[vAxis];
    const maskSize = maskWidth * maskHeight;
    const { types: maskTypes, signs: maskSigns } = getMaskBuffers(maskPool, maskSize);

    const x = [0, 0, 0];
    const q = [0, 0, 0];
    q[axis] = 1;

    for (x[axis] = -1; x[axis] < dimensions[axis]; ) {
      let n = 0;
      for (x[vAxis] = 0; x[vAxis] < dimensions[vAxis]; x[vAxis]++) {
        for (x[uAxis] = 0; x[uAxis] < dimensions[uAxis]; x[uAxis]++) {
          const a = x[axis] >= 0 ? getCell(x[0], x[1], x[2]) : BLOCK_ID_AIR;
          const b =
            x[axis] < dimensions[axis] - 1
              ? getCell(x[0] + q[0], x[1] + q[1], x[2] + q[2])
              : BLOCK_ID_AIR;
          if ((a === BLOCK_ID_AIR) === (b === BLOCK_ID_AIR)) {
            maskTypes[n] = BLOCK_ID_AIR;
            maskSigns[n] = 0;
          } else if (a !== BLOCK_ID_AIR) {
            maskTypes[n] = a;
            maskSigns[n] = 1;
          } else {
            maskTypes[n] = b;
            maskSigns[n] = -1;
          }
          n += 1;
        }
      }

      x[axis] += 1;
      n = 0;
      for (let j = 0; j < dimensions[vAxis]; j++) {
        for (let i = 0; i < dimensions[uAxis]; ) {
          const currentType = maskTypes[n];
          if (currentType === BLOCK_ID_AIR) {
            i += 1;
            n += 1;
            continue;
          }
          const currentSign = maskSigns[n];

          let width = 1;
          while (
            i + width < dimensions[uAxis] &&
            maskTypes[n + width] === currentType &&
            maskSigns[n + width] === currentSign
          ) {
            width += 1;
          }

          let height = 1;
          let canGrow = true;
          while (j + height < dimensions[vAxis] && canGrow) {
            for (let k = 0; k < width; k++) {
              const index = n + k + height * dimensions[uAxis];
              if (maskTypes[index] !== currentType || maskSigns[index] !== currentSign) {
                canGrow = false;
                break;
              }
            }
            if (canGrow) height += 1;
          }

          x[uAxis] = i;
          x[vAxis] = j;

          const du = [0, 0, 0];
          const dv = [0, 0, 0];
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

          const tile = getFaceTile(currentType, axis, currentSign);
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

          appendTiledQuad(
            buffers,
            {
              p0x,
              p0y,
              p0z,
              p1x,
              p1y,
              p1z,
              p3x,
              p3y,
              p3z,
              width,
              height,
              axis,
              sign: currentSign,
              tile
            },
            { sky, block }
          );

          for (let h = 0; h < height; h++) {
            const rowStart = n + h * dimensions[uAxis];
            for (let w = 0; w < width; w++) {
              maskTypes[rowStart + w] = BLOCK_ID_AIR;
              maskSigns[rowStart + w] = 0;
            }
          }

          i += width;
          n += width;
        }
      }
    }
  }

  if (buffers.indices.length === 0) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(buffers.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(buffers.normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(buffers.uvs, 2));
  geometry.setAttribute('lightmap', new THREE.Float32BufferAttribute(buffers.lightmaps, 2));
  geometry.setIndex(buffers.indices);
  geometry.computeBoundingSphere();
  return geometry;
}
