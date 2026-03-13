import { COMPONENT_GAMEMODE, COMPONENT_PHYSICS } from '../ecs/components';
import { GAMEMODE_SPECTATOR, GAMEMODE_SURVIVAL, isValidGamemode } from '../game/gamemode/gameModes';

export class GameModeSystem {
  constructor(ecs, playerEntityId, world) {
    this.ecs = ecs;
    this.playerEntityId = playerEntityId;
    this.world = world;
    this.setMode(GAMEMODE_SURVIVAL);
  }

  getMode() {
    const gamemode = this.ecs.getComponent(this.playerEntityId, COMPONENT_GAMEMODE);
    return gamemode?.mode ?? GAMEMODE_SURVIVAL;
  }

  setMode(mode) {
    if (!isValidGamemode(mode)) return false;
    const gamemode = this.ecs.getComponent(this.playerEntityId, COMPONENT_GAMEMODE);
    if (!gamemode) return false;
    if (gamemode.mode === mode) {
      this.world.setSpectatorView(mode === GAMEMODE_SPECTATOR);
      return true;
    }

    gamemode.mode = mode;
    const physics = this.ecs.getComponent(this.playerEntityId, COMPONENT_PHYSICS);
    if (physics) {
      physics.velocity.set(0, 0, 0);
      physics.onGround = false;
    }
    this.world.setSpectatorView(mode === GAMEMODE_SPECTATOR);
    return true;
  }
}
