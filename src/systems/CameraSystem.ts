import type * as THREE from 'three';
import { COMPONENT_PHYSICS, COMPONENT_TRANSFORM } from '../ecs/components';
import type { ECSWorld } from '../ecs/ECSWorld';
import type { PhysicsComponent, TransformComponent } from '../ecs/componentFactories';

export class CameraSystem {
  update(ecs: ECSWorld, playerEntityId: number, camera: THREE.PerspectiveCamera): void {
    const transform = ecs.getComponent<TransformComponent>(playerEntityId, COMPONENT_TRANSFORM);
    const physics = ecs.getComponent<PhysicsComponent>(playerEntityId, COMPONENT_PHYSICS);
    if (!transform || !physics) return;

    camera.position.set(
      transform.position.x,
      transform.position.y + physics.eyeHeight,
      transform.position.z
    );
    camera.rotation.order = 'YXZ';
    camera.rotation.y = transform.yaw;
    camera.rotation.x = transform.pitch;
  }
}
