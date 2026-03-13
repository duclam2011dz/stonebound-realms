import { COMPONENT_GAMEMODE, COMPONENT_PHYSICS } from '../ecs/components';
import { GAMEMODE_SPECTATOR, GAMEMODE_SURVIVAL, isValidGamemode } from '../game/gamemode/gameModes';
import type { ECSWorld } from '../ecs/ECSWorld';
import type { VoxelWorld } from '../world/VoxelWorld';
import type { GamemodeComponent, PhysicsComponent } from '../ecs/componentFactories';

export class GameModeSystem {
  ecs: ECSWorld;
  playerEntityId: number;
  world: VoxelWorld;

  constructor(ecs: ECSWorld, playerEntityId: number, world: VoxelWorld) {
    this.ecs = ecs;
    this.playerEntityId = playerEntityId;
    this.world = world;
    this.setMode(GAMEMODE_SURVIVAL);
  }

  getMode(): string {
    const gamemode = this.ecs.getComponent<GamemodeComponent>(
      this.playerEntityId,
      COMPONENT_GAMEMODE
    );
    return gamemode?.mode ?? GAMEMODE_SURVIVAL;
  }

  setMode(mode: string): boolean {
    if (!isValidGamemode(mode)) return false;
    const gamemode = this.ecs.getComponent<GamemodeComponent>(
      this.playerEntityId,
      COMPONENT_GAMEMODE
    );
    if (!gamemode) return false;
    if (gamemode.mode === mode) {
      this.world.setSpectatorView(mode === GAMEMODE_SPECTATOR);
      return true;
    }

    gamemode.mode = mode;
    const physics = this.ecs.getComponent<PhysicsComponent>(this.playerEntityId, COMPONENT_PHYSICS);
    if (physics) {
      physics.velocity.set(0, 0, 0);
      physics.onGround = false;
    }
    this.world.setSpectatorView(mode === GAMEMODE_SPECTATOR);
    return true;
  }
}
