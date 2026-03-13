import type * as THREE from 'three';
import { COMPONENT_TRANSFORM } from '../ecs/components';
import type { ECSWorld } from '../ecs/ECSWorld';
import type { GameSystems } from './factories/createSystems';
import type { InputController } from '../core/InputController';
import type { Hotbar } from '../ui/Hotbar';
import type { InventoryState } from '../inventory/InventoryState';
import type { Hud } from '../ui/Hud';

type OrchestratorDeps = {
  ecs: ECSWorld;
  playerEntityId: number;
  systems: GameSystems;
  camera: THREE.PerspectiveCamera;
  input: InputController;
  hotbar: Hotbar;
  inventoryState: InventoryState;
  hud: Hud | null;
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

  constructor(deps: OrchestratorDeps) {
    this.ecs = deps.ecs;
    this.playerEntityId = deps.playerEntityId;
    this.systems = deps.systems;
    this.camera = deps.camera;
    this.input = deps.input;
    this.hotbar = deps.hotbar;
    this.inventoryState = deps.inventoryState;
    this.hud = deps.hud;
  }

  runPlayingFrame(dt: number): void {
    const transform = this.ecs.getComponent<{ position: THREE.Vector3 }>(
      this.playerEntityId,
      COMPONENT_TRANSFORM
    );
    if (!transform) return;
    this.systems.movement.update(this.ecs, this.playerEntityId, dt);
    this.systems.chunks.update(transform.position);
    this.systems.camera.update(this.ecs, this.playerEntityId, this.camera);
    this.systems.dayNight.update(dt, transform.position);
    this.systems.targeting.update();

    const actions = this.input.consumeActions();
    if (actions.reloadChunks) this.systems.chunks.force(transform.position);

    const breakState = this.systems.interaction.update(
      actions,
      dt,
      this.ecs,
      this.playerEntityId,
      this.hotbar,
      this.inventoryState,
      this.systems.targeting.getCurrentHit()
    );
    this.systems.targeting.setBreakState(breakState);
    this.hud?.setBreakProgress(breakState?.progress ?? 0);
  }

  runIdleFrame(): void {
    const transform = this.ecs.getComponent<{ position: THREE.Vector3 }>(
      this.playerEntityId,
      COMPONENT_TRANSFORM
    );
    this.systems.camera.update(this.ecs, this.playerEntityId, this.camera);
    if (transform) this.systems.dayNight.update(1 / 60, transform.position);
    this.systems.targeting.update();
    this.input.consumeActions();
    this.systems.targeting.setBreakState(null);
    this.hud?.setBreakProgress(0);
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
