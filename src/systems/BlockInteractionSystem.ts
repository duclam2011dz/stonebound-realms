import type * as THREE from 'three';
import type { ECSWorld } from '../ecs/ECSWorld';
import type { GamemodeComponent } from '../ecs/componentFactories';
import { COMPONENT_GAMEMODE } from '../ecs/components';
import { GAMEMODE_SPECTATOR, GAMEMODE_SURVIVAL } from '../game/gamemode/gameModes';
import type { InputActions } from '../core/input/InputState';
import type { Hotbar } from '../ui/Hotbar';
import type { InventoryState } from '../inventory/InventoryState';
import type { GameSettings } from '../config/constants';
import type { VoxelWorld } from '../world/VoxelWorld';
import type { VoxelHit } from '../world/services/VoxelRaycaster';
import { getBlockTargetKey, getBreakDurationMs } from './interactions/blockBreakProfile';
import { isBlockInsidePlayer } from './interactions/isBlockInsidePlayer';

export type BreakState = { targetKey: string; progress: number };

export class BlockInteractionSystem {
  world: VoxelWorld;
  camera: THREE.PerspectiveCamera;
  settings: GameSettings;
  breakTargetKey: string | null;
  breakProgress: number;
  breakDurationMs: number;

  constructor(world: VoxelWorld, camera: THREE.PerspectiveCamera, settings: GameSettings) {
    this.world = world;
    this.camera = camera;
    this.settings = settings;
    this.breakTargetKey = null;
    this.breakProgress = 0;
    this.breakDurationMs = 0;
  }

  update(
    actions: InputActions,
    dt: number,
    ecs: ECSWorld,
    playerEntityId: number,
    hotbar: Hotbar,
    inventoryState: InventoryState | null,
    targetHit: VoxelHit | null = null
  ): BreakState | null {
    const gamemode =
      ecs.getComponent<GamemodeComponent>(playerEntityId, COMPONENT_GAMEMODE)?.mode ??
      GAMEMODE_SURVIVAL;
    const isSpectator = gamemode === GAMEMODE_SPECTATOR;
    const selectedBlockType = hotbar.getSelectedBlockType();
    const shouldRaycast = actions.breakHeld || actions.placeBlock || this.breakTargetKey !== null;
    const hit = shouldRaycast
      ? (targetHit ?? this.world.raycastFromCamera(this.camera, this.settings.maxRayDistance))
      : null;

    if (isSpectator) {
      this.resetBreakState();
      return null;
    }

    this.updateBreakProgress(actions.breakHeld, hit, dt, inventoryState);

    if (actions.placeBlock && selectedBlockType && hit) {
      const placed = this.world.placeBlockAtHit(
        hit,
        selectedBlockType,
        (x, y, z) => !isBlockInsidePlayer(ecs, playerEntityId, x, y, z)
      );
      if (placed) {
        hotbar.consumeSelectedBlock(1);
      }
    }

    if (!this.breakTargetKey) return null;
    return {
      targetKey: this.breakTargetKey,
      progress: this.breakProgress
    };
  }

  updateBreakProgress(
    breakHeld: boolean,
    hit: VoxelHit | null,
    dt: number,
    inventoryState: InventoryState | null
  ): void {
    if (!breakHeld || !hit?.block) {
      this.resetBreakState();
      return;
    }

    const { x, y, z } = hit.block;
    const blockType = this.world.getBlockTypeAt(x, y, z);
    if (!blockType) {
      this.resetBreakState();
      return;
    }

    const targetKey = getBlockTargetKey(x, y, z);
    if (targetKey !== this.breakTargetKey) {
      this.breakTargetKey = targetKey;
      this.breakDurationMs = getBreakDurationMs(blockType);
      this.breakProgress = 0;
    }

    const durationMs = Math.max(1, this.breakDurationMs);
    this.breakProgress = Math.min(1, this.breakProgress + (dt * 1000) / durationMs);
    if (this.breakProgress >= 1) {
      const brokenType = this.world.breakBlockAtHit(hit);
      if (brokenType && inventoryState) {
        inventoryState.addBlock(brokenType, 1);
      }
      this.resetBreakState();
    }
  }

  resetBreakState(): void {
    this.breakTargetKey = null;
    this.breakProgress = 0;
    this.breakDurationMs = 0;
  }
}
