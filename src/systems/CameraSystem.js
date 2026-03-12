import { COMPONENT_PHYSICS, COMPONENT_TRANSFORM } from "../ecs/components.js";

export class CameraSystem {
  update(ecs, playerEntityId, camera) {
    const transform = ecs.getComponent(playerEntityId, COMPONENT_TRANSFORM);
    const physics = ecs.getComponent(playerEntityId, COMPONENT_PHYSICS);
    if (!transform || !physics) return;

    camera.position.set(
      transform.position.x,
      transform.position.y + physics.eyeHeight,
      transform.position.z
    );
    camera.rotation.order = "YXZ";
    camera.rotation.y = transform.yaw;
    camera.rotation.x = transform.pitch;
  }
}

