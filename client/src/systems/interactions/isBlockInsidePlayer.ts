import { COMPONENT_PHYSICS, COMPONENT_TRANSFORM } from '../../ecs/components';
import type { ECSWorld } from '../../ecs/ECSWorld';
import type { PhysicsComponent, TransformComponent } from '../../ecs/componentFactories';

export function isBlockInsidePlayer(
  ecs: ECSWorld,
  playerEntityId: number,
  blockX: number,
  blockY: number,
  blockZ: number
): boolean {
  const transform = ecs.getComponent<TransformComponent>(playerEntityId, COMPONENT_TRANSFORM);
  const physics = ecs.getComponent<PhysicsComponent>(playerEntityId, COMPONENT_PHYSICS);
  if (!transform || !physics) return false;

  const pMinX = transform.position.x - physics.radius;
  const pMaxX = transform.position.x + physics.radius;
  const pMinY = transform.position.y;
  const pMaxY = transform.position.y + physics.height;
  const pMinZ = transform.position.z - physics.radius;
  const pMaxZ = transform.position.z + physics.radius;

  const bMinX = blockX;
  const bMaxX = blockX + 1;
  const bMinY = blockY;
  const bMaxY = blockY + 1;
  const bMinZ = blockZ;
  const bMaxZ = blockZ + 1;

  return !(
    bMaxX <= pMinX ||
    bMinX >= pMaxX ||
    bMaxY <= pMinY ||
    bMinY >= pMaxY ||
    bMaxZ <= pMinZ ||
    bMinZ >= pMaxZ
  );
}
