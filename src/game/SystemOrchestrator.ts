import { COMPONENT_TRANSFORM } from '../ecs/components';

export class SystemOrchestrator {
  constructor(deps) {
    this.ecs = deps.ecs;
    this.playerEntityId = deps.playerEntityId;
    this.systems = deps.systems;
    this.camera = deps.camera;
    this.input = deps.input;
    this.hotbar = deps.hotbar;
    this.inventoryState = deps.inventoryState;
    this.hud = deps.hud;
  }

  runPlayingFrame(dt) {
    const transform = this.ecs.getComponent(this.playerEntityId, COMPONENT_TRANSFORM);
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

  runIdleFrame() {
    const transform = this.ecs.getComponent(this.playerEntityId, COMPONENT_TRANSFORM);
    this.systems.camera.update(this.ecs, this.playerEntityId, this.camera);
    if (transform) this.systems.dayNight.update(1 / 60, transform.position);
    this.systems.targeting.update();
    this.input.consumeActions();
    this.systems.targeting.setBreakState(null);
    this.hud?.setBreakProgress(0);
  }

  forceChunkSync() {
    const transform = this.ecs.getComponent(this.playerEntityId, COMPONENT_TRANSFORM);
    this.systems.chunks.force(transform.position);
  }
}
