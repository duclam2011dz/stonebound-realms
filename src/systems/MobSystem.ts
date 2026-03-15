import * as THREE from 'three';
import type { ECSWorld } from '../ecs/ECSWorld';
import {
  COMPONENT_MOB,
  COMPONENT_MOB_AI,
  COMPONENT_MOB_RENDER,
  COMPONENT_TRANSFORM
} from '../ecs/componentTypes';
import type {
  MobAIComponent,
  MobComponent,
  MobRenderComponent,
  TransformComponent
} from '../ecs/componentFactories';
import type { VoxelWorld } from '../world/VoxelWorld';
import type { DayNightSystem } from './DayNightSystem';
import type { GameSettings } from '../config/constants';
import { BLOCK_ID_GRASS } from '../world/services/BlockPalette';
import { createMobEntity } from '../game/factories/createMobEntity';
import {
  getMobDefinition,
  MOB_TYPES,
  type MobDefinition,
  type MobType
} from '../mobs/mobDefinitions';
import { getProceduralMobAtlasAssets } from '../textures/proceduralMobAtlas';
import { clamp, computeSunDirection } from './dayNight/dayNightMath';

type SpawnOptions = {
  ignoreCap?: boolean;
};

type PathNode = { x: number; z: number };

const MOB_CAP = 20;
const SPAWN_INTERVAL_SECONDS = 4;
const MIN_SPAWN_DISTANCE = 24;
const MAX_SPAWN_DISTANCE = 128;
const PATH_RADIUS = 28;
const REPATH_MIN_SECONDS = 2;
const REPATH_MAX_SECONDS = 4;
const WANDER_MIN_SECONDS = 2.5;
const WANDER_MAX_SECONDS = 5.5;

export class MobSystem {
  scene: THREE.Scene;
  ecs: ECSWorld;
  world: VoxelWorld;
  dayNight: DayNightSystem;
  settings: GameSettings;
  playerEntityId: number;
  spawnTimer: number;
  material: THREE.MeshLambertMaterial;
  atlas: { columns: number; rows: number };
  tempVec: THREE.Vector3;

  constructor(options: {
    scene: THREE.Scene;
    ecs: ECSWorld;
    world: VoxelWorld;
    dayNight: DayNightSystem;
    settings: GameSettings;
    playerEntityId: number;
  }) {
    this.scene = options.scene;
    this.ecs = options.ecs;
    this.world = options.world;
    this.dayNight = options.dayNight;
    this.settings = options.settings;
    this.playerEntityId = options.playerEntityId;
    this.spawnTimer = 0;

    const atlasAssets = getProceduralMobAtlasAssets();
    atlasAssets.texture.colorSpace = THREE.SRGBColorSpace;
    atlasAssets.texture.needsUpdate = true;
    atlasAssets.texture.magFilter = THREE.NearestFilter;
    atlasAssets.texture.minFilter = THREE.NearestFilter;
    atlasAssets.texture.generateMipmaps = false;
    this.material = new THREE.MeshLambertMaterial({ map: atlasAssets.texture });
    this.atlas = { columns: 4, rows: 4 };
    this.tempVec = new THREE.Vector3();
  }

  update(dt: number): void {
    this.spawnTimer += dt;
    if (this.spawnTimer >= SPAWN_INTERVAL_SECONDS) {
      this.spawnTimer = 0;
      this.trySpawnPassiveGroup();
    }

    const surfaceCache = new Map<string, number>();
    const playerTransform = this.ecs.getComponent<TransformComponent>(
      this.playerEntityId,
      COMPONENT_TRANSFORM
    );
    const playerPosition = playerTransform?.position ?? null;
    const mobEntities = this.ecs.getEntitiesWith([
      COMPONENT_MOB,
      COMPONENT_MOB_AI,
      COMPONENT_MOB_RENDER,
      COMPONENT_TRANSFORM
    ]);

    const positions = mobEntities.map((id) => {
      const transform = this.ecs.getComponent<TransformComponent>(id, COMPONENT_TRANSFORM);
      return { id, position: transform?.position.clone() ?? new THREE.Vector3() };
    });

    for (const entityId of mobEntities) {
      const transform = this.ecs.getComponent<TransformComponent>(entityId, COMPONENT_TRANSFORM);
      const mob = this.ecs.getComponent<MobComponent>(entityId, COMPONENT_MOB);
      const ai = this.ecs.getComponent<MobAIComponent>(entityId, COMPONENT_MOB_AI);
      const render = this.ecs.getComponent<MobRenderComponent>(entityId, COMPONENT_MOB_RENDER);
      if (!transform || !mob || !ai || !render) continue;
      const definition = getMobDefinition(mob.type);
      this.updateMob(
        entityId,
        transform,
        ai,
        render,
        definition,
        positions,
        surfaceCache,
        dt,
        playerPosition
      );
    }
  }

  spawnMob(type: MobType, position: THREE.Vector3, options: SpawnOptions = {}): number | null {
    if (!options.ignoreCap && this.getMobCount() >= MOB_CAP) return null;
    const definition = getMobDefinition(type);
    if (!this.isSpaceClear(position.x, position.y, position.z, definition)) return null;
    return createMobEntity({
      ecs: this.ecs,
      scene: this.scene,
      definition,
      position,
      material: this.material,
      atlas: this.atlas
    });
  }

  getMobCount(): number {
    return this.ecs.getEntitiesWith([COMPONENT_MOB]).length;
  }

  getMobPositions(): Array<{ type: MobType; x: number; y: number; z: number }> {
    return this.ecs
      .getEntitiesWith([COMPONENT_MOB, COMPONENT_TRANSFORM])
      .map((id) => {
        const mob = this.ecs.getComponent<MobComponent>(id, COMPONENT_MOB);
        const transform = this.ecs.getComponent<TransformComponent>(id, COMPONENT_TRANSFORM);
        if (!mob || !transform) return null;
        return {
          type: mob.type,
          x: Number(transform.position.x.toFixed(2)),
          y: Number(transform.position.y.toFixed(2)),
          z: Number(transform.position.z.toFixed(2))
        };
      })
      .filter((entry): entry is { type: MobType; x: number; y: number; z: number } =>
        Boolean(entry)
      );
  }

  trySpawnPassiveGroup(): void {
    if (this.getMobCount() >= MOB_CAP) return;
    const playerTransform = this.ecs.getComponent<TransformComponent>(
      this.playerEntityId,
      COMPONENT_TRANSFORM
    );
    if (!playerTransform) return;

    const dist = MIN_SPAWN_DISTANCE + Math.random() * (MAX_SPAWN_DISTANCE - MIN_SPAWN_DISTANCE);
    const angle = Math.random() * Math.PI * 2;
    const baseX = Math.floor(playerTransform.position.x + Math.cos(angle) * dist);
    const baseZ = Math.floor(playerTransform.position.z + Math.sin(angle) * dist);
    const chunkX = Math.floor(baseX / this.world.chunkSize);
    const chunkZ = Math.floor(baseZ / this.world.chunkSize);
    if (!this.world.storage.isChunkLoaded(chunkX, chunkZ)) return;

    const surfaceY = this.getSurfaceY(baseX, baseZ, new Map());
    if (surfaceY < 0) return;
    const biomeName = this.world.getBiomeAt(baseX, baseZ);
    if (biomeName === 'desert') return;

    const below = this.world.storage.getBlockId(baseX, surfaceY, baseZ);
    if (below !== BLOCK_ID_GRASS) return;

    const spawnY = surfaceY + 1;
    if (!this.isLightValid(baseX + 0.5, spawnY + 0.5, baseZ + 0.5)) return;

    const mobType = MOB_TYPES[Math.floor(Math.random() * MOB_TYPES.length)];
    if (!mobType) return;
    const definition = getMobDefinition(mobType);
    const groupCount =
      definition.groupSize.min +
      Math.floor(Math.random() * (definition.groupSize.max - definition.groupSize.min + 1));

    for (let i = 0; i < groupCount; i++) {
      if (this.getMobCount() >= MOB_CAP) break;
      const offsetX = baseX + Math.floor((Math.random() - 0.5) * 8);
      const offsetZ = baseZ + Math.floor((Math.random() - 0.5) * 8);
      const offsetY = this.getSurfaceY(offsetX, offsetZ, new Map());
      if (offsetY < 0) continue;
      if (this.world.getBiomeAt(offsetX, offsetZ) === 'desert') continue;
      if (this.world.storage.getBlockId(offsetX, offsetY, offsetZ) !== BLOCK_ID_GRASS) continue;
      const mobY = offsetY + 1;
      if (!this.isLightValid(offsetX + 0.5, mobY + 0.5, offsetZ + 0.5)) continue;
      if (!this.isSpaceClear(offsetX + 0.5, mobY, offsetZ + 0.5, definition)) continue;
      this.spawnMob(definition.type, new THREE.Vector3(offsetX + 0.5, mobY, offsetZ + 0.5));
    }
  }

  updateMob(
    entityId: number,
    transform: TransformComponent,
    ai: MobAIComponent,
    render: MobRenderComponent,
    definition: MobDefinition,
    mobPositions: Array<{ id: number; position: THREE.Vector3 }>,
    surfaceCache: Map<string, number>,
    dt: number,
    playerPosition: THREE.Vector3 | null
  ): void {
    const mob = this.ecs.getComponent<MobComponent>(entityId, COMPONENT_MOB);
    if (mob) {
      if (mob.hitFlashTimer > 0) {
        mob.hitFlashTimer = Math.max(0, mob.hitFlashTimer - dt);
        render.parts.material.color.set(0xff6a6a);
      } else {
        render.parts.material.color.set(0xffffff);
      }

      if (mob.knockback.lengthSq() > 0.0004) {
        this.tempVec.copy(mob.knockback).multiplyScalar(dt);
        transform.position.add(this.tempVec);
        mob.knockback.multiplyScalar(0.72);
        if (mob.knockback.lengthSq() < 0.0004) {
          mob.knockback.set(0, 0, 0);
        }
      }
    }

    const currentX = transform.position.x;
    const currentZ = transform.position.z;
    const groundY = this.getSurfaceY(Math.floor(currentX), Math.floor(currentZ), surfaceCache);
    if (groundY >= 0) {
      transform.position.y = groundY + 1;
    }

    ai.repathTimer -= dt;
    ai.wanderTimer -= dt;

    const distMoved = transform.position.distanceTo(ai.lastPosition);
    if (distMoved < 0.01) {
      ai.stuckTimer += dt;
    } else {
      ai.stuckTimer = 0;
      ai.lastPosition.copy(transform.position);
    }

    if (ai.panicTimer > 0 && playerPosition) {
      ai.panicTimer = Math.max(0, ai.panicTimer - dt);
      ai.panicPhase += dt * 8;
      const fleeX = transform.position.x - playerPosition.x;
      const fleeZ = transform.position.z - playerPosition.z;
      const fleeDist = Math.hypot(fleeX, fleeZ) || 1;
      const baseDirX = fleeX / fleeDist;
      const baseDirZ = fleeZ / fleeDist;
      const baseAngle = Math.atan2(baseDirZ, baseDirX);
      const jitter = Math.sin(ai.panicPhase) * 0.6;
      const angle = baseAngle + jitter;
      const dirX = Math.cos(angle);
      const dirZ = Math.sin(angle);
      const speed = definition.speed * 1.8;
      transform.position.x += dirX * speed * dt;
      transform.position.z += dirZ * speed * dt;
      transform.yaw = Math.atan2(dirX, dirZ);
      const panicGround =
        groundY >= 0
          ? groundY
          : this.getSurfaceY(
              Math.floor(transform.position.x),
              Math.floor(transform.position.z),
              surfaceCache
            );
      if (panicGround >= 0) transform.position.y = panicGround + 1;
      render.parts.root.position.copy(transform.position);
      render.parts.root.rotation.y = transform.yaw;
      ai.walkPhase += dt * definition.speed * 8;
      const swing = Math.sin(ai.walkPhase) * 0.9;
      if (render.parts.legs.length >= 4) {
        render.parts.legs[0]!.rotation.x = swing;
        render.parts.legs[1]!.rotation.x = -swing;
        render.parts.legs[2]!.rotation.x = -swing;
        render.parts.legs[3]!.rotation.x = swing;
      }
      return;
    }

    if ((ai.repathTimer <= 0 || ai.path.length === 0 || ai.stuckTimer > 2) && ai.wanderTimer <= 0) {
      const nextTarget = this.pickWanderTarget(transform.position, definition, surfaceCache);
      if (nextTarget) {
        ai.path = this.findPath(transform.position, nextTarget, definition, surfaceCache) ?? [];
      } else {
        ai.path = [];
      }
      ai.repathTimer =
        REPATH_MIN_SECONDS + Math.random() * (REPATH_MAX_SECONDS - REPATH_MIN_SECONDS);
      ai.wanderTimer =
        WANDER_MIN_SECONDS + Math.random() * (WANDER_MAX_SECONDS - WANDER_MIN_SECONDS);
      ai.stuckTimer = 0;
    }

    this.followPath(transform, ai, definition, mobPositions, surfaceCache, dt);

    render.parts.root.position.copy(transform.position);
    render.parts.root.rotation.y = transform.yaw;

    const speed = definition.speed;
    const moving = ai.path.length > 0 ? 1 : 0;
    ai.walkPhase += dt * speed * 6 * moving;
    const swing = Math.sin(ai.walkPhase) * 0.6;
    if (render.parts.legs.length >= 4) {
      render.parts.legs[0]!.rotation.x = swing;
      render.parts.legs[1]!.rotation.x = -swing;
      render.parts.legs[2]!.rotation.x = -swing;
      render.parts.legs[3]!.rotation.x = swing;
    }
  }

  followPath(
    transform: TransformComponent,
    ai: MobAIComponent,
    definition: MobDefinition,
    mobPositions: Array<{ id: number; position: THREE.Vector3 }>,
    surfaceCache: Map<string, number>,
    dt: number
  ): void {
    if (ai.path.length === 0) return;
    const target = ai.path[0];
    if (!target) return;
    const targetX = target.x + 0.5;
    const targetZ = target.z + 0.5;
    const targetSurface = this.getSurfaceY(target.x, target.z, surfaceCache);
    const dx = targetX - transform.position.x;
    const dz = targetZ - transform.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.15) {
      ai.path.shift();
      return;
    }

    let dirX = dx / distance;
    let dirZ = dz / distance;

    const separation = this.computeSeparation(transform.position, mobPositions, definition.radius);
    dirX += separation.x;
    dirZ += separation.z;
    const norm = Math.hypot(dirX, dirZ) || 1;
    dirX /= norm;
    dirZ /= norm;

    const forwardBlocked = !this.isWalkableAt(
      transform.position.x + dirX * 0.6,
      transform.position.z + dirZ * 0.6,
      definition,
      surfaceCache
    );
    if (forwardBlocked) {
      const left = { x: -dirZ, z: dirX };
      const right = { x: dirZ, z: -dirX };
      const leftClear = this.isWalkableAt(
        transform.position.x + left.x * 0.6,
        transform.position.z + left.z * 0.6,
        definition,
        surfaceCache
      );
      const rightClear = this.isWalkableAt(
        transform.position.x + right.x * 0.6,
        transform.position.z + right.z * 0.6,
        definition,
        surfaceCache
      );
      if (leftClear || rightClear) {
        const choice =
          leftClear && rightClear ? (Math.random() < 0.5 ? left : right) : leftClear ? left : right;
        dirX = choice.x;
        dirZ = choice.z;
      } else {
        ai.path = [];
        return;
      }
    }

    const step = definition.speed * dt;
    transform.position.x += dirX * step;
    transform.position.z += dirZ * step;
    transform.yaw = Math.atan2(dirX, dirZ);
    const groundY =
      targetSurface >= 0
        ? targetSurface
        : this.getSurfaceY(
            Math.floor(transform.position.x),
            Math.floor(transform.position.z),
            surfaceCache
          );
    if (groundY >= 0) transform.position.y = groundY + 1;
  }

  computeSeparation(
    position: THREE.Vector3,
    mobPositions: Array<{ id: number; position: THREE.Vector3 }>,
    radius: number
  ): { x: number; z: number } {
    let pushX = 0;
    let pushZ = 0;
    const range = Math.max(1, radius * 2.2);
    for (const entry of mobPositions) {
      const other = entry.position;
      const dx = position.x - other.x;
      const dz = position.z - other.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1e-4 || dist > range) continue;
      const force = (range - dist) / range;
      pushX += (dx / dist) * force * 0.4;
      pushZ += (dz / dist) * force * 0.4;
    }
    return { x: pushX, z: pushZ };
  }

  pickWanderTarget(
    position: THREE.Vector3,
    definition: MobDefinition,
    surfaceCache: Map<string, number>
  ): PathNode | null {
    if (Math.random() < 0.2) return null;
    const wanderRadius = 8 + Math.random() * 8;
    const angle = Math.random() * Math.PI * 2;
    const targetX = Math.floor(position.x + Math.cos(angle) * wanderRadius);
    const targetZ = Math.floor(position.z + Math.sin(angle) * wanderRadius);
    const surfaceY = this.getSurfaceY(targetX, targetZ, surfaceCache);
    if (surfaceY < 0) return null;
    if (!this.isWalkableNode(targetX, targetZ, surfaceY, definition)) return null;
    return { x: targetX, z: targetZ };
  }

  findPath(
    start: THREE.Vector3,
    goal: PathNode,
    definition: MobDefinition,
    surfaceCache: Map<string, number>
  ): PathNode[] | null {
    const startX = Math.floor(start.x);
    const startZ = Math.floor(start.z);
    const startY = this.getSurfaceY(startX, startZ, surfaceCache);
    if (startY < 0) return null;

    const bounds = {
      minX: startX - PATH_RADIUS,
      maxX: startX + PATH_RADIUS,
      minZ: startZ - PATH_RADIUS,
      maxZ: startZ + PATH_RADIUS
    };

    const key = (x: number, z: number) => `${x}|${z}`;
    const open: Array<{ x: number; z: number; y: number; f: number; g: number }> = [];
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();

    const startKey = key(startX, startZ);
    open.push({ x: startX, z: startZ, y: startY, g: 0, f: this.heuristic(startX, startZ, goal) });
    gScore.set(startKey, 0);

    while (open.length) {
      let bestIndex = 0;
      for (let i = 1; i < open.length; i++) {
        if ((open[i]?.f ?? 0) < (open[bestIndex]?.f ?? 0)) bestIndex = i;
      }
      const current = open.splice(bestIndex, 1)[0];
      if (!current) break;
      if (current.x === goal.x && current.z === goal.z) {
        return this.reconstructPath(cameFrom, key, current);
      }

      const neighbors = [
        { x: current.x + 1, z: current.z },
        { x: current.x - 1, z: current.z },
        { x: current.x, z: current.z + 1 },
        { x: current.x, z: current.z - 1 }
      ];

      for (const next of neighbors) {
        if (
          next.x < bounds.minX ||
          next.x > bounds.maxX ||
          next.z < bounds.minZ ||
          next.z > bounds.maxZ
        )
          continue;
        const neighborY = this.getSurfaceY(next.x, next.z, surfaceCache);
        if (neighborY < 0) continue;
        if (Math.abs(neighborY - current.y) > 1) continue;
        if (!this.isWalkableNode(next.x, next.z, neighborY, definition)) continue;

        const tentative = (gScore.get(key(current.x, current.z)) ?? 0) + 1;
        const nKey = key(next.x, next.z);
        if (tentative < (gScore.get(nKey) ?? Number.POSITIVE_INFINITY)) {
          cameFrom.set(nKey, key(current.x, current.z));
          gScore.set(nKey, tentative);
          const f = tentative + this.heuristic(next.x, next.z, goal);
          open.push({ x: next.x, z: next.z, y: neighborY, g: tentative, f });
        }
      }
    }

    return null;
  }

  heuristic(x: number, z: number, goal: PathNode): number {
    return Math.abs(goal.x - x) + Math.abs(goal.z - z);
  }

  reconstructPath(
    cameFrom: Map<string, string>,
    keyFn: (x: number, z: number) => string,
    current: PathNode
  ): PathNode[] {
    const path = [current];
    let currentKey = keyFn(current.x, current.z);
    while (cameFrom.has(currentKey)) {
      const prevKey = cameFrom.get(currentKey);
      if (!prevKey) break;
      const [xStr, zStr] = prevKey.split('|');
      const x = Number(xStr);
      const z = Number(zStr);
      path.push({ x, z });
      currentKey = prevKey;
    }
    path.reverse();
    if (path.length > 0) path.shift();
    return path;
  }

  getSurfaceY(x: number, z: number, cache: Map<string, number>): number {
    const key = `${x}|${z}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    for (let y = this.world.maxHeight - 1; y >= 0; y--) {
      if (this.world.isBlockFilled(x, y, z)) {
        cache.set(key, y);
        return y;
      }
    }
    cache.set(key, -1);
    return -1;
  }

  isWalkableNode(x: number, z: number, surfaceY: number, definition: MobDefinition): boolean {
    if (surfaceY < 0) return false;
    return this.isSpaceClear(x + 0.5, surfaceY + 1, z + 0.5, definition);
  }

  isWalkableAt(
    worldX: number,
    worldZ: number,
    definition: MobDefinition,
    surfaceCache: Map<string, number>
  ): boolean {
    const x = Math.floor(worldX);
    const z = Math.floor(worldZ);
    const y = this.getSurfaceY(x, z, surfaceCache);
    return this.isWalkableNode(x, z, y, definition);
  }

  isSpaceClear(x: number, y: number, z: number, definition: MobDefinition): boolean {
    const radius = definition.radius;
    const height = Math.max(1, Math.ceil(definition.height));
    const minX = Math.floor(x - radius);
    const maxX = Math.floor(x + radius);
    const minZ = Math.floor(z - radius);
    const maxZ = Math.floor(z + radius);
    const minY = Math.floor(y);
    const maxY = Math.floor(y + height);
    for (let bx = minX; bx <= maxX; bx++) {
      for (let bz = minZ; bz <= maxZ; bz++) {
        for (let by = minY; by <= maxY; by++) {
          if (this.world.isBlockFilled(bx, by, bz)) return false;
        }
      }
    }
    return true;
  }

  isLightValid(x: number, y: number, z: number): boolean {
    const time = this.dayNight.getTimeState();
    const sunDir = computeSunDirection(time.phase);
    const dayFactor = clamp(sunDir.y * 1.35 + 0.06, 0, 1);
    if (dayFactor <= 0.05) return false;
    const occlusion = this.world.getSunOcclusionAt(x, y, z, sunDir);
    const lightLevel = Math.round(dayFactor * occlusion.directVisibility * 15);
    return lightLevel >= 9;
  }
}
