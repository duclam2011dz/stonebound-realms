import { BlockInteractionSystem } from "../../systems/BlockInteractionSystem.js";
import { CameraSystem } from "../../systems/CameraSystem.js";
import { ChunkStreamingSystem } from "../../systems/ChunkStreamingSystem.js";
import { DAY_NIGHT_CYCLE_SECONDS } from "../../config/constants.js";
import { DayNightSystem } from "../../systems/DayNightSystem.js";
import { GameModeSystem } from "../../systems/GameModeSystem.js";
import { PlayerMovementSystem } from "../../systems/PlayerMovementSystem.js";
import { TargetingSystem } from "../../systems/TargetingSystem.js";

export function createSystems({ scene, world, camera, input, settings, lighting, ecs, playerEntityId }) {
  return {
    gamemode: new GameModeSystem(ecs, playerEntityId, world),
    movement: new PlayerMovementSystem(input, world, settings),
    camera: new CameraSystem(),
    chunks: new ChunkStreamingSystem(world, settings),
    dayNight: new DayNightSystem({ scene, camera, world, lighting, cycleDurationSeconds: DAY_NIGHT_CYCLE_SECONDS }),
    targeting: new TargetingSystem(scene, world, camera, settings),
    interaction: new BlockInteractionSystem(world, camera, settings)
  };
}
