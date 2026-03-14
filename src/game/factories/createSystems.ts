import type * as THREE from 'three';
import { BlockInteractionSystem } from '../../systems/BlockInteractionSystem';
import { CameraSystem } from '../../systems/CameraSystem';
import { ChunkStreamingSystem } from '../../systems/ChunkStreamingSystem';
import { DAY_NIGHT_CYCLE_SECONDS, type GameSettings } from '../../config/constants';
import { DayNightSystem } from '../../systems/DayNightSystem';
import { GameModeSystem } from '../../systems/GameModeSystem';
import { PlayerMovementSystem } from '../../systems/PlayerMovementSystem';
import { TargetingSystem } from '../../systems/TargetingSystem';
import { MobSystem } from '../../systems/MobSystem';
import type { InputController } from '../../core/InputController';
import type { VoxelWorld } from '../../world/VoxelWorld';
import type { ECSWorld } from '../../ecs/ECSWorld';
import type { LightingRig } from '../../core/render/setupLighting';

type CreateSystemsOptions = {
  scene: THREE.Scene;
  world: VoxelWorld;
  camera: THREE.PerspectiveCamera;
  input: InputController;
  settings: GameSettings;
  lighting: LightingRig;
  ecs: ECSWorld;
  playerEntityId: number;
};

export type GameSystems = {
  gamemode: GameModeSystem;
  movement: PlayerMovementSystem;
  camera: CameraSystem;
  chunks: ChunkStreamingSystem;
  dayNight: DayNightSystem;
  targeting: TargetingSystem;
  interaction: BlockInteractionSystem;
  mobs: MobSystem;
};

export function createSystems({
  scene,
  world,
  camera,
  input,
  settings,
  lighting,
  ecs,
  playerEntityId
}: CreateSystemsOptions): GameSystems {
  const dayNight = new DayNightSystem({
    scene,
    camera,
    world,
    lighting,
    cycleDurationSeconds: DAY_NIGHT_CYCLE_SECONDS
  });
  return {
    gamemode: new GameModeSystem(ecs, playerEntityId, world),
    movement: new PlayerMovementSystem(input, world, settings),
    camera: new CameraSystem(),
    chunks: new ChunkStreamingSystem(world, settings),
    dayNight,
    targeting: new TargetingSystem(scene, world, camera, settings),
    interaction: new BlockInteractionSystem(world, camera, settings),
    mobs: new MobSystem({
      scene,
      ecs,
      world,
      dayNight,
      settings,
      playerEntityId
    })
  };
}
