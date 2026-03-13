import { COMPONENT_PHYSICS, COMPONENT_TRANSFORM } from '../../ecs/components';

export function isBlockInsidePlayer(ecs, playerEntityId, blockX, blockY, blockZ) {
  const transform = ecs.getComponent(playerEntityId, COMPONENT_TRANSFORM);
  const physics = ecs.getComponent(playerEntityId, COMPONENT_PHYSICS);
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
