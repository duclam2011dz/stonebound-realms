import * as THREE from 'three';
import {
  CHUNK_SIZE,
  DEFAULT_SETTINGS,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  WORLD_MAX_HEIGHT,
  type GameSettings
} from '../config/constants';
import { getProceduralAtlasAssets } from '../textures/proceduralBlockAtlas';
import { createVoxelMaterial } from '../core/render/lighting/createVoxelMaterial';
import { TerrainGenerator } from './services/TerrainGenerator';
import { VoxelChunkMesher } from './services/VoxelChunkMesher';
import { VoxelRaycaster, type VoxelHit } from './services/VoxelRaycaster';
import { VoxelStorage } from './services/VoxelStorage';
import { ChunkTaskQueue } from './services/chunks/ChunkTaskQueue';
import { planVisibleChunks } from './services/chunks/planVisibleChunks';
import { BLOCK_ID_LAMP, type BlockType } from './services/BlockPalette';

type WorldConfig = {
  worldName?: string;
  seed?: string;
};

type LightSource = { x: number; y: number; z: number };

type SunOcclusion = {
  directVisibility: number;
  ambientVisibility: number;
  caveFactor: number;
  skyOpenFraction: number;
  overheadBlocked: boolean;
  frontBlocked: boolean;
};

type SpawnPoint = { x: number; y: number; z: number };

function createFallbackMaterial(): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color: 0x7b5438 });
}

function buildSpawnOffsets(maxRadius = 6): Array<{ x: number; z: number; distanceSq: number }> {
  const offsets = [{ x: 0, z: 0, distanceSq: 0 }];
  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
        offsets.push({ x: dx, z: dz, distanceSq: dx * dx + dz * dz });
      }
    }
  }
  offsets.sort((a, b) => a.distanceSq - b.distanceSq);
  return offsets;
}

const SPAWN_OFFSETS = buildSpawnOffsets();
const SKY_SAMPLE_OFFSETS: ReadonlyArray<{ x: number; z: number }> = Object.freeze([
  { x: 0, z: 0 },
  { x: 1, z: 0 },
  { x: -1, z: 0 },
  { x: 0, z: 1 },
  { x: 0, z: -1 }
]);
const DIRECTIONAL_SAMPLE_OFFSETS: ReadonlyArray<{ x: number; y: number; z: number }> =
  Object.freeze([
    { x: 0, y: 0, z: 0 },
    { x: 0.24, y: -0.18, z: 0.24 },
    { x: -0.24, y: -0.18, z: -0.24 }
  ]);
const UPWARD_SKY_RAYS: ReadonlyArray<{ x: number; y: number; z: number }> = Object.freeze([
  { x: 0, y: 1, z: 0 },
  { x: 0.5, y: 0.866, z: 0 },
  { x: -0.5, y: 0.866, z: 0 },
  { x: 0, y: 0.866, z: 0.5 },
  { x: 0, y: 0.866, z: -0.5 },
  { x: 0.38, y: 0.82, z: 0.38 },
  { x: -0.38, y: 0.82, z: 0.38 },
  { x: 0.38, y: 0.82, z: -0.38 },
  { x: -0.38, y: 0.82, z: -0.38 }
]);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export class VoxelWorld {
  scene: THREE.Scene;
  settings: GameSettings;
  chunkSize: number;
  maxHeight: number;
  worldConfig: WorldConfig;
  renderDistance: number;
  lodStartDistance: number;
  currentChunkX: number;
  currentChunkZ: number;
  hasChunkCenter: boolean;
  storage: VoxelStorage;
  terrain: TerrainGenerator;
  lampSourcesByChunk: Map<string, LightSource[]>;
  mesher: VoxelChunkMesher;
  raycaster: VoxelRaycaster;
  chunkMeshes: Map<string, THREE.Mesh>;
  chunkLodSteps: Map<string, number>;
  desiredChunks: Set<string>;
  chunkTaskQueue: ChunkTaskQueue;
  visibleEpoch: number;
  blockMaterial: THREE.MeshLambertMaterial;
  spectatorViewEnabled: boolean;

  constructor(scene: THREE.Scene, settings: GameSettings, worldConfig: WorldConfig = {}) {
    this.scene = scene;
    this.settings = settings;
    this.chunkSize = CHUNK_SIZE;
    this.maxHeight = WORLD_MAX_HEIGHT;
    this.worldConfig = worldConfig;
    this.renderDistance = settings.renderDistance ?? DEFAULT_SETTINGS.renderDistance;
    this.lodStartDistance = settings.lodStartDistance ?? DEFAULT_SETTINGS.lodStartDistance;
    this.currentChunkX = 0;
    this.currentChunkZ = 0;
    this.hasChunkCenter = false;

    this.storage = new VoxelStorage(this.chunkSize, this.maxHeight);
    this.terrain = new TerrainGenerator(this.chunkSize, this.maxHeight, worldConfig.seed ?? '');
    this.lampSourcesByChunk = new Map();
    this.mesher = new VoxelChunkMesher(this.chunkSize, this.maxHeight, (cx, cz) =>
      this.getChunkLightSources(cx, cz)
    );
    this.raycaster = new VoxelRaycaster();

    this.chunkMeshes = new Map();
    this.chunkLodSteps = new Map();
    this.desiredChunks = new Set();
    this.chunkTaskQueue = new ChunkTaskQueue();
    this.visibleEpoch = 0;
    this.blockMaterial = createFallbackMaterial();
    this.spectatorViewEnabled = false;

    this.initializeBlockAtlas();
  }

  initializeBlockAtlas(): void {
    const atlasAssets = getProceduralAtlasAssets();
    this.blockMaterial.dispose();
    this.blockMaterial = createVoxelMaterial(atlasAssets.texture);
    this.applyBlockMaterialViewMode();
    this.rebuildAllVisibleChunks();
  }

  applyBlockMaterialViewMode(): void {
    this.blockMaterial.transparent = this.spectatorViewEnabled;
    this.blockMaterial.opacity = this.spectatorViewEnabled ? 0.18 : 1;
    this.blockMaterial.depthWrite = !this.spectatorViewEnabled;
    this.blockMaterial.side = this.spectatorViewEnabled ? THREE.DoubleSide : THREE.FrontSide;
    this.blockMaterial.needsUpdate = true;
  }

  setSpectatorView(enabled: boolean): void {
    const nextEnabled = Boolean(enabled);
    if (nextEnabled === this.spectatorViewEnabled) return;
    this.spectatorViewEnabled = nextEnabled;
    this.applyBlockMaterialViewMode();
  }

  setRenderDistance(nextRenderDistance: number): void {
    this.renderDistance = Math.max(1, Math.floor(nextRenderDistance));
  }

  setLodStartDistance(nextLodStartDistance: number): void {
    const parsed = Math.max(1, Math.floor(nextLodStartDistance));
    this.lodStartDistance = Math.min(parsed, this.renderDistance);
  }

  getChunkLodStep(cx: number, cz: number): number {
    const ringDistance = Math.max(
      Math.abs(cx - this.currentChunkX),
      Math.abs(cz - this.currentChunkZ)
    );
    if (ringDistance >= this.lodStartDistance + 6) return 4;
    if (ringDistance >= this.lodStartDistance) return 2;
    return 1;
  }

  rebuildAllVisibleChunks(): void {
    for (const cKey of this.storage.loadedChunks) {
      const { cx, cz } = this.storage.parseChunkKey(cKey);
      this.enqueueChunkTask(cx, cz, 0, true);
    }
  }

  generateChunk(cx: number, cz: number): void {
    this.terrain.generateChunk(this.storage, cx, cz);
    this.refreshChunkLampSources(cx, cz);
  }

  refreshChunkLampSources(cx: number, cz: number): LightSource[] {
    const cKey = this.storage.chunkKey(cx, cz);
    const chunk = this.storage.getChunkData(cx, cz);
    if (!chunk) {
      this.lampSourcesByChunk.delete(cKey);
      return [];
    }

    const sources = [];
    const baseX = cx * this.chunkSize;
    const baseZ = cz * this.chunkSize;
    for (let z = 0; z < this.chunkSize; z++) {
      for (let x = 0; x < this.chunkSize; x++) {
        const columnBase = x + z * this.chunkSize * this.maxHeight;
        for (let y = 0; y < this.maxHeight; y++) {
          if (chunk[columnBase + y * this.chunkSize] !== BLOCK_ID_LAMP) continue;
          sources.push({ x: baseX + x + 0.5, y: y + 0.5, z: baseZ + z + 0.5 });
        }
      }
    }

    this.lampSourcesByChunk.set(cKey, sources);
    return sources;
  }

  getChunkLightSources(cx: number, cz: number): LightSource[] {
    const sources = [];
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const list = this.lampSourcesByChunk.get(this.storage.chunkKey(cx + dx, cz + dz));
        if (!list || list.length === 0) continue;
        sources.push(...list);
      }
    }
    return sources;
  }

  getSpawnPoint(): SpawnPoint {
    const rawSpawn = this.terrain.createSpawnPoint();
    this.ensureChunksAroundWorld(rawSpawn.x, rawSpawn.z, 1);
    return this.findSafeSpawnPoint(rawSpawn);
  }

  getSeedString(): string {
    return this.terrain.getSeedDisplay();
  }

  getBiomeAt(x: number, z: number): string {
    return this.terrain.getBiomeAt(Math.floor(x), Math.floor(z));
  }

  getMaxHeight(): number {
    return this.maxHeight;
  }

  ensureChunksAroundWorld(worldX: number, worldZ: number, range = 1): void {
    const centerCX = this.storage.floorDiv(worldX, this.chunkSize);
    const centerCZ = this.storage.floorDiv(worldZ, this.chunkSize);
    for (let dz = -range; dz <= range; dz++) {
      for (let dx = -range; dx <= range; dx++) {
        const cx = centerCX + dx;
        const cz = centerCZ + dz;
        if (!this.storage.isChunkLoaded(cx, cz)) {
          this.generateChunk(cx, cz);
        }
      }
    }
  }

  findSafeSpawnPoint(rawSpawn: SpawnPoint): SpawnPoint {
    const baseX = Math.floor(rawSpawn.x);
    const baseZ = Math.floor(rawSpawn.z);

    for (const offset of SPAWN_OFFSETS) {
      const x = baseX + offset.x;
      const z = baseZ + offset.z;
      this.ensureChunksAroundWorld(x, z, 1);
      const surfaceY = this.terrain.getHeight(x, z);
      const minY = Math.max(2, surfaceY - 6);
      const maxY = Math.min(this.maxHeight - 3, surfaceY + 6);

      for (let y = maxY; y >= minY; y--) {
        if (!this.storage.isBlockFilled(x, y - 1, z)) continue;
        const px = x + 0.5;
        const pz = z + 0.5;
        if (this.collidesPlayer(px, y, pz, PLAYER_RADIUS, PLAYER_HEIGHT)) continue;
        return { x, y, z };
      }
    }

    return { x: baseX, y: rawSpawn.y, z: baseZ };
  }

  disposeChunkMesh(cKey: string): void {
    const mesh = this.chunkMeshes.get(cKey);
    if (!mesh) return;
    this.scene.remove(mesh);
    mesh.geometry.dispose();
    this.chunkMeshes.delete(cKey);
  }

  unloadChunk(cx: number, cz: number): void {
    const cKey = this.storage.chunkKey(cx, cz);
    this.disposeChunkMesh(cKey);
    this.chunkLodSteps.delete(cKey);
    this.storage.clearChunk(cx, cz);
    this.lampSourcesByChunk.delete(cKey);
  }

  buildChunkMesh(cx: number, cz: number): void {
    const cKey = this.storage.chunkKey(cx, cz);
    this.disposeChunkMesh(cKey);
    this.chunkLodSteps.delete(cKey);
    if (!this.storage.isChunkLoaded(cx, cz)) return;

    const lodStep = this.getChunkLodStep(cx, cz);
    const geometry = this.mesher.createChunkGeometry(this.storage, cx, cz, lodStep);
    if (!geometry) return;

    const mesh = new THREE.Mesh(geometry, this.blockMaterial);
    mesh.frustumCulled = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.scene.add(mesh);

    this.chunkMeshes.set(cKey, mesh);
    this.chunkLodSteps.set(cKey, lodStep);
  }

  enqueueChunkTask(cx: number, cz: number, priority = 0, forceMesh = false): void {
    const key = this.storage.chunkKey(cx, cz);
    this.chunkTaskQueue.enqueue(key, {
      key,
      cx,
      cz,
      priority,
      forceMesh,
      desiredEpoch: this.visibleEpoch
    });
  }

  processChunkQueue(maxTasks = 2, timeBudgetMs = 5): number {
    const start = performance.now();
    let processed = 0;

    while (processed < maxTasks && this.chunkTaskQueue.size > 0) {
      if (performance.now() - start > timeBudgetMs) break;
      const task = this.chunkTaskQueue.pop();
      if (!task) break;
      const { cx, cz, key, forceMesh } = task;

      if (this.desiredChunks.size > 0 && !this.desiredChunks.has(key)) {
        if (this.storage.isChunkLoaded(cx, cz)) this.unloadChunk(cx, cz);
        continue;
      }

      if (!this.storage.isChunkLoaded(cx, cz)) {
        this.generateChunk(cx, cz);
      }

      const expectedLod = this.getChunkLodStep(cx, cz);
      const currentLod = this.chunkLodSteps.get(key);
      if (forceMesh || currentLod !== expectedLod || !this.chunkMeshes.has(key)) {
        this.buildChunkMesh(cx, cz);
      }
      processed += 1;
    }

    return processed;
  }

  hasPendingChunkWork(): boolean {
    return this.chunkTaskQueue.size > 0;
  }

  getPendingChunkCount(): number {
    return this.chunkTaskQueue.size;
  }

  rebuildChunksAroundBlock(x: number, z: number): void {
    const cx = this.storage.floorDiv(x, this.chunkSize);
    const cz = this.storage.floorDiv(z, this.chunkSize);
    this.enqueueChunkTask(cx, cz, 0, true);
    this.enqueueChunkTask(cx + 1, cz, 0, true);
    this.enqueueChunkTask(cx - 1, cz, 0, true);
    this.enqueueChunkTask(cx, cz + 1, 0, true);
    this.enqueueChunkTask(cx, cz - 1, 0, true);
  }

  updateVisibleChunksAround(position: THREE.Vector3, force = false): void {
    const pxChunk = this.storage.floorDiv(position.x, this.chunkSize);
    const pzChunk = this.storage.floorDiv(position.z, this.chunkSize);
    const chunkChanged =
      !this.hasChunkCenter || pxChunk !== this.currentChunkX || pzChunk !== this.currentChunkZ;
    if (!force && !chunkChanged) return;

    this.hasChunkCenter = true;
    this.currentChunkX = pxChunk;
    this.currentChunkZ = pzChunk;
    this.visibleEpoch += 1;
    const desiredPlan = planVisibleChunks(pxChunk, pzChunk, this.renderDistance, (cx, cz) =>
      this.storage.chunkKey(cx, cz)
    );
    const desired = new Set<string>();

    for (const entry of desiredPlan) {
      desired.add(entry.key);
      const loaded = this.storage.isChunkLoaded(entry.cx, entry.cz);
      const currentLod = this.chunkLodSteps.get(entry.key);
      const expectedLod = this.getChunkLodStep(entry.cx, entry.cz);
      if (!loaded || force || expectedLod !== currentLod) {
        this.enqueueChunkTask(entry.cx, entry.cz, entry.ringDistance, force);
      }
    }

    this.desiredChunks = desired;
    for (const cKey of Array.from(this.storage.loadedChunks)) {
      if (desired.has(cKey)) continue;
      const { cx, cz } = this.storage.parseChunkKey(cKey);
      this.unloadChunk(cx, cz);
    }
  }

  isBlockFilled(x: number, y: number, z: number): boolean {
    return this.storage.isBlockFilled(x, y, z);
  }

  getBlockTypeAt(x: number, y: number, z: number): BlockType | null {
    return this.storage.getBlockAt(x, y, z);
  }

  setBlock(x: number, y: number, z: number, type: BlockType): void {
    this.storage.setBlock(x, y, z, type);
  }

  removeBlock(x: number, y: number, z: number): void {
    this.storage.removeBlock(x, y, z);
  }

  collidesPlayer(x: number, y: number, z: number, radius: number, height: number): boolean {
    const minX = Math.floor(x - radius);
    const maxX = Math.floor(x + radius);
    const minY = Math.floor(y);
    const maxY = Math.floor(y + height);
    const minZ = Math.floor(z - radius);
    const maxZ = Math.floor(z + radius);
    for (let bx = minX; bx <= maxX; bx++) {
      for (let by = minY; by <= maxY; by++) {
        for (let bz = minZ; bz <= maxZ; bz++) {
          if (this.storage.isBlockFilled(bx, by, bz)) return true;
        }
      }
    }
    return false;
  }

  raycastFromCamera(camera: THREE.Camera, maxDistance: number): VoxelHit | null {
    return this.raycaster.raycast(camera, maxDistance, (x, y, z) =>
      this.storage.isBlockFilled(x, y, z)
    );
  }

  getSkyExposureAt(x: number, y: number, z: number, sampleHeight = 40): number {
    const blockX = Math.floor(x);
    const blockZ = Math.floor(z);
    const startY = Math.max(0, Math.floor(y) + 1);
    if (startY >= this.maxHeight - 1) return 1;

    const span = Math.max(4, Math.floor(sampleHeight));
    let totalExposure = 0;

    for (const offset of SKY_SAMPLE_OFFSETS) {
      const sampleX = blockX + offset.x;
      const sampleZ = blockZ + offset.z;
      let blockerY = -1;
      for (let sy = startY; sy < this.maxHeight; sy++) {
        if (!this.storage.isBlockFilled(sampleX, sy, sampleZ)) continue;
        blockerY = sy;
        break;
      }

      if (blockerY < 0) {
        totalExposure += 1;
        continue;
      }

      const clearHeight = blockerY - startY;
      if (clearHeight > span) {
        totalExposure += 0.24;
      } else {
        totalExposure += Math.max(0, clearHeight / span) * 0.1;
      }
    }

    return totalExposure / SKY_SAMPLE_OFFSETS.length;
  }

  hasSkyAccessAt(x: number, y: number, z: number): boolean {
    const blockX = Math.floor(x);
    const blockZ = Math.floor(z);
    const startY = Math.max(0, Math.floor(y) + 1);
    if (startY >= this.maxHeight - 1) return true;

    for (let sy = startY; sy < this.maxHeight; sy++) {
      if (this.storage.isBlockFilled(blockX, sy, blockZ)) return false;
    }
    return true;
  }

  traceFilledRay(
    originX: number,
    originY: number,
    originZ: number,
    dirX: number,
    dirY: number,
    dirZ: number,
    maxDistance = 32,
    step = 0.5
  ): { hit: boolean; distance: number; blockY: number } {
    const safeStep = Math.max(0.2, step);
    const maxDist = Math.max(safeStep, maxDistance);

    for (let distance = safeStep; distance <= maxDist; distance += safeStep) {
      const sx = originX + dirX * distance;
      const sy = originY + dirY * distance;
      const sz = originZ + dirZ * distance;
      if (sy >= this.maxHeight) {
        return { hit: false, distance, blockY: -1 };
      }
      if (sy < 0) continue;
      const bx = Math.floor(sx);
      const by = Math.floor(sy);
      const bz = Math.floor(sz);
      if (this.storage.isBlockFilled(bx, by, bz)) {
        return { hit: true, distance, blockY: by };
      }
    }

    return { hit: false, distance: maxDist, blockY: -1 };
  }

  sampleUpwardSkyFraction(x: number, y: number, z: number, maxDistance = 28): number {
    let openRays = 0;
    for (const ray of UPWARD_SKY_RAYS) {
      const rayLen = Math.hypot(ray.x, ray.y, ray.z) || 1;
      const hit = this.traceFilledRay(
        x,
        y,
        z,
        ray.x / rayLen,
        ray.y / rayLen,
        ray.z / rayLen,
        maxDistance,
        0.5
      ).hit;
      if (!hit) openRays += 1;
    }
    return openRays / UPWARD_SKY_RAYS.length;
  }

  getDirectionalVisibilityAt(
    x: number,
    y: number,
    z: number,
    direction: THREE.Vector3,
    maxDistance = 34
  ): number {
    const dirLength = Math.hypot(direction.x, direction.y, direction.z);
    if (dirLength <= 1e-6) return 1;
    const dirX = direction.x / dirLength;
    const dirY = direction.y / dirLength;
    const dirZ = direction.z / dirLength;
    if (dirY <= 0) return 0;

    let visibleSamples = 0;
    for (const offset of DIRECTIONAL_SAMPLE_OFFSETS) {
      const hit = this.traceFilledRay(
        x + offset.x,
        y + offset.y,
        z + offset.z,
        dirX,
        dirY,
        dirZ,
        maxDistance,
        0.5
      ).hit;
      if (!hit) visibleSamples += 1;
    }
    return visibleSamples / DIRECTIONAL_SAMPLE_OFFSETS.length;
  }

  getSunOcclusionAt(x: number, y: number, z: number, sunDirection: THREE.Vector3): SunOcclusion {
    const dirLength = Math.hypot(sunDirection.x, sunDirection.y, sunDirection.z);
    if (dirLength <= 1e-6 || sunDirection.y <= 0) {
      return {
        directVisibility: 1,
        ambientVisibility: 1,
        caveFactor: 0,
        skyOpenFraction: 1,
        overheadBlocked: false,
        frontBlocked: false
      };
    }

    const dirX = sunDirection.x / dirLength;
    const dirY = sunDirection.y / dirLength;
    const dirZ = sunDirection.z / dirLength;
    const feetY = Math.floor(y - 1.62);
    const frontRayOffsets = [-1.1, -0.55, -0.05];

    let frontHits = 0;
    let frontMaxHeight = 0;
    for (const yOffset of frontRayOffsets) {
      const trace = this.traceFilledRay(x, y + yOffset, z, dirX, dirY, dirZ, 38, 0.5);
      if (!trace.hit) continue;
      frontHits += 1;
      frontMaxHeight = Math.max(frontMaxHeight, trace.blockY - feetY);
    }

    const overheadBlocked = this.traceFilledRay(x, y + 0.05, z, 0, 1, 0, 6, 0.5).hit;
    const frontBlockedFraction = frontHits / frontRayOffsets.length;
    const frontBlocked = frontBlockedFraction > 0;
    const frontHeightFactor = clamp(frontMaxHeight / 6, 0, 1);
    const lowSunBoost = clamp((0.58 - dirY) / 0.58, 0, 1);

    const frontShadow = frontBlocked
      ? clamp(frontBlockedFraction * (0.34 + frontHeightFactor * 0.38 + lowSunBoost * 0.34), 0, 1)
      : 0;
    const overheadShadow = overheadBlocked ? clamp(0.24 + dirY * 0.92, 0, 1) : 0;
    const directionalVisibility = this.getDirectionalVisibilityAt(x, y, z, sunDirection, 36);
    const directionalShadow = 1 - directionalVisibility;

    let structuralShadow = overheadShadow;
    if (frontShadow > 0) {
      const frontalWeight = overheadBlocked ? 1 : 0.5;
      structuralShadow = Math.max(structuralShadow, frontShadow * frontalWeight);
    }
    structuralShadow = Math.max(
      structuralShadow,
      directionalShadow * (overheadBlocked ? 0.82 : 0.34)
    );

    const skyOpenFraction = this.sampleUpwardSkyFraction(x, y - 0.22, z, 28);
    const skyVisibilityBlend = Math.max(skyOpenFraction, directionalVisibility * 0.85);
    const caveFactor = clamp((0.22 - skyVisibilityBlend) / 0.22, 0, 1);
    const directVisibility = clamp(1 - Math.max(structuralShadow, caveFactor * 0.85), 0, 1);
    const ambientVisibility =
      caveFactor > 0.96 ? 0.04 : clamp(0.22 + skyVisibilityBlend * 0.78, 0.04, 1);

    return {
      directVisibility,
      ambientVisibility,
      caveFactor,
      skyOpenFraction,
      overheadBlocked,
      frontBlocked
    };
  }

  breakBlockAtHit(hit: VoxelHit | null): BlockType | null {
    const block = hit?.block;
    if (!block) return null;
    const blockType = this.storage.getBlockAt(block.x, block.y, block.z);
    if (!blockType) return null;
    this.storage.removeBlock(block.x, block.y, block.z);
    if (blockType === 'lamp') {
      const cx = this.storage.floorDiv(block.x, this.chunkSize);
      const cz = this.storage.floorDiv(block.z, this.chunkSize);
      this.refreshChunkLampSources(cx, cz);
    }
    this.rebuildChunksAroundBlock(block.x, block.z);
    return blockType;
  }

  placeBlockAtHit(
    hit: VoxelHit | null,
    blockType: BlockType,
    canPlaceAtFn: (x: number, y: number, z: number) => boolean
  ): boolean {
    const block = hit?.block;
    if (!block || !hit.face) return false;

    const nx = block.x + Math.round(hit.face.normal.x);
    const ny = block.y + Math.round(hit.face.normal.y);
    const nz = block.z + Math.round(hit.face.normal.z);
    if (ny < 0 || ny >= this.maxHeight) return false;
    if (this.storage.isBlockFilled(nx, ny, nz)) return false;
    if (!canPlaceAtFn(nx, ny, nz)) return false;

    this.storage.setBlock(nx, ny, nz, blockType);
    if (blockType === 'lamp') {
      const cx = this.storage.floorDiv(nx, this.chunkSize);
      const cz = this.storage.floorDiv(nz, this.chunkSize);
      this.refreshChunkLampSources(cx, cz);
    }
    this.rebuildChunksAroundBlock(nx, nz);
    return true;
  }
}
