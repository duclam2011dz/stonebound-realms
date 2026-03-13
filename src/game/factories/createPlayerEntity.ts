import * as THREE from 'three';
import {
  COMPONENT_CONTROLLER,
  COMPONENT_GAMEMODE,
  COMPONENT_PHYSICS,
  COMPONENT_TRANSFORM,
  createController,
  createGamemode,
  createPhysics,
  createTransform
} from '../../ecs/components';
import {
  EYE_HEIGHT,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  type GameSettings
} from '../../config/constants';
import type { ECSWorld } from '../../ecs/ECSWorld';

export function createPlayerEntity(ecs: ECSWorld, settings: GameSettings): number {
  const entityId = ecs.createEntity();
  ecs.addComponent(entityId, COMPONENT_TRANSFORM, createTransform(new THREE.Vector3(0, 20, 0)));
  ecs.addComponent(
    entityId,
    COMPONENT_PHYSICS,
    createPhysics({
      radius: PLAYER_RADIUS,
      height: PLAYER_HEIGHT,
      eyeHeight: EYE_HEIGHT,
      moveSpeed: settings.moveSpeed,
      jumpSpeed: settings.jumpSpeed
    })
  );
  ecs.addComponent(entityId, COMPONENT_CONTROLLER, createController());
  ecs.addComponent(entityId, COMPONENT_GAMEMODE, createGamemode('survival'));
  return entityId;
}
