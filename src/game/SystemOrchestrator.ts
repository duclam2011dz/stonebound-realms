import type * as THREE from 'three';
import { COMPONENT_TRANSFORM } from '../ecs/components';
import type { ECSWorld } from '../ecs/ECSWorld';
import type { GameSystems } from './factories/createSystems';
import type { InputController } from '../core/InputController';
import type { Hotbar } from '../ui/Hotbar';
import type { InventoryState } from '../inventory/InventoryState';
import type { Hud } from '../ui/Hud';
import { GAMEMODE_SPECTATOR } from './gamemode/gameModes';
import { isBlockSlot, isFoodSlot } from '../inventory/itemTypes';

type OrchestratorDeps = {
  ecs: ECSWorld;
  playerEntityId: number;
  systems: GameSystems;
  camera: THREE.PerspectiveCamera;
  input: InputController;
  hotbar: Hotbar;
  inventoryState: InventoryState;
  hud: Hud | null;
  onOpenCraftingTable?: () => void;
};

export class SystemOrchestrator {
  ecs: ECSWorld;
  playerEntityId: number;
  systems: GameSystems;
  camera: THREE.PerspectiveCamera;
  input: InputController;
  hotbar: Hotbar;
  inventoryState: InventoryState;
  hud: Hud | null;
  onOpenCraftingTable: (() => void) | null;

  constructor(deps: OrchestratorDeps) {
    this.ecs = deps.ecs;
    this.playerEntityId = deps.playerEntityId;
    this.systems = deps.systems;
    this.camera = deps.camera;
    this.input = deps.input;
    this.hotbar = deps.hotbar;
    this.inventoryState = deps.inventoryState;
    this.hud = deps.hud;
    this.onOpenCraftingTable = deps.onOpenCraftingTable ?? null;
  }

  runPlayingFrame(dt: number): void {
    const transform = this.ecs.getComponent<{ position: THREE.Vector3 }>(
      this.playerEntityId,
      COMPONENT_TRANSFORM
    );
    if (!transform) return;
    if (this.systems.survival.isDead) {
      this.runIdleFrame();
      return;
    }
    this.systems.movement.update(this.ecs, this.playerEntityId, dt);
    this.systems.chunks.update(transform.position);
    this.systems.camera.update(this.ecs, this.playerEntityId, this.camera);
    this.systems.dayNight.update(dt, transform.position);
    this.systems.mobs.update(dt);
    this.systems.survival.update(dt);
    this.systems.combat.update(dt);
    if (this.systems.survival.isDead) {
      this.runIdleFrame();
      return;
    }

    const gamemode = this.systems.gamemode.getMode();
    const isSpectator = gamemode === GAMEMODE_SPECTATOR;
    if (!isSpectator) {
      this.systems.targeting.update();
    } else {
      this.systems.targeting.clear();
    }

    const actions = this.input.consumeActions();
    if (actions.reloadChunks) this.systems.chunks.force(transform.position);

    const targetHit = this.systems.targeting.getCurrentHit();
    const selectedItem = this.hotbar.getSelectedItem();
    const isFood = isFoodSlot(selectedItem);
    const isBlock = isBlockSlot(selectedItem);
    let placeBlock = actions.placeBlock;

    if (!isSpectator && placeBlock && targetHit?.block) {
      const blockType = this.systems.interaction.world.getBlockTypeAt(
        targetHit.block.x,
        targetHit.block.y,
        targetHit.block.z
      );
      if (blockType === 'crafting_table') {
        this.onOpenCraftingTable?.();
        placeBlock = false;
      }
    }

    if (!isSpectator && placeBlock && isFood && selectedItem) {
      if (this.systems.survival.eat(selectedItem.foodType)) {
        this.inventoryState.removeFromSlot(this.hotbar.getSelectedSlotIndex(), 1);
      }
    }

    let attacked = false;
    if (!isSpectator && actions.attackRequested) {
      attacked = this.systems.combat.tryAttack(selectedItem);
    }

    const breakState = !isSpectator
      ? this.systems.interaction.update(
          {
            breakHeld: attacked ? false : actions.breakHeld,
            placeBlock: placeBlock && isBlock && !isFood,
            reloadChunks: actions.reloadChunks,
            attackRequested: false
          },
          dt,
          this.ecs,
          this.playerEntityId,
          this.hotbar,
          this.inventoryState,
          targetHit
        )
      : null;
    this.systems.targeting.setBreakState(breakState);
    this.hud?.setBreakProgress(breakState?.progress ?? 0);
    this.hud?.setAttackCooldownProgress(this.systems.combat.getCooldownProgress());
    this.hud?.setHealth(this.systems.survival.getHealth());
    this.hud?.setHunger(this.systems.survival.getHunger());
  }

  runIdleFrame(): void {
    const transform = this.ecs.getComponent<{ position: THREE.Vector3 }>(
      this.playerEntityId,
      COMPONENT_TRANSFORM
    );
    this.systems.camera.update(this.ecs, this.playerEntityId, this.camera);
    if (transform) this.systems.dayNight.update(1 / 60, transform.position);
    this.systems.targeting.clear();
    this.input.consumeActions();
    this.systems.targeting.setBreakState(null);
    this.hud?.setBreakProgress(0);
    this.hud?.setAttackCooldownProgress(this.systems.combat.getCooldownProgress());
    this.hud?.setHealth(this.systems.survival.getHealth());
    this.hud?.setHunger(this.systems.survival.getHunger());
  }

  forceChunkSync(): void {
    const transform = this.ecs.getComponent<{ position: THREE.Vector3 }>(
      this.playerEntityId,
      COMPONENT_TRANSFORM
    );
    if (!transform) return;
    this.systems.chunks.force(transform.position);
  }
}
