import * as THREE from 'three';
import {
  COMPONENT_CONTROLLER,
  COMPONENT_GAMEMODE,
  COMPONENT_PHYSICS,
  COMPONENT_TRANSFORM
} from '../ecs/components';
import { GAMEMODE_SPECTATOR, GAMEMODE_SURVIVAL } from '../game/gamemode/gameModes';
import {
  applyAcceleration,
  applyAirDrag,
  applyGroundFriction,
  applyLook,
  buildMovementVector
} from './movement/movementMath';
import type { ECSWorld } from '../ecs/ECSWorld';
import type { InputController } from '../core/InputController';
import type { VoxelWorld } from '../world/VoxelWorld';
import type { GameSettings } from '../config/constants';
import type {
  ControllerComponent,
  GamemodeComponent,
  PhysicsComponent,
  TransformComponent
} from '../ecs/componentFactories';

export class PlayerMovementSystem {
  input: InputController;
  world: VoxelWorld;
  settings: GameSettings;
  forward: THREE.Vector3;
  right: THREE.Vector3;
  movement: THREE.Vector3;
  spectatorMove: THREE.Vector3;

  constructor(input: InputController, world: VoxelWorld, settings: GameSettings) {
    this.input = input;
    this.world = world;
    this.settings = settings;
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.movement = new THREE.Vector3();
    this.spectatorMove = new THREE.Vector3();
  }

  update(ecs: ECSWorld, playerEntityId: number, dt: number): void {
    const transform = ecs.getComponent<TransformComponent>(playerEntityId, COMPONENT_TRANSFORM);
    const physics = ecs.getComponent<PhysicsComponent>(playerEntityId, COMPONENT_PHYSICS);
    const controller = ecs.getComponent<ControllerComponent>(playerEntityId, COMPONENT_CONTROLLER);
    const gamemode =
      ecs.getComponent<GamemodeComponent>(playerEntityId, COMPONENT_GAMEMODE)?.mode ??
      GAMEMODE_SURVIVAL;
    if (!transform || !physics || !controller?.enabled) return;

    applyLook(transform, this.input.consumeLookDelta(), this.settings.lookSensitivity);
    physics.moveSpeed = this.settings.moveSpeed;
    physics.jumpSpeed = this.settings.jumpSpeed;
    if (gamemode === GAMEMODE_SPECTATOR) {
      this.updateSpectator(transform, physics, dt);
      return;
    }

    this.updateSurvival(transform, physics, dt);
  }

  updateSurvival(transform: TransformComponent, physics: PhysicsComponent, dt: number): void {
    buildMovementVector(this.forward, this.right, this.movement, transform.yaw, this.input);
    const hasWishMove = this.movement.lengthSq() > 0;
    if (hasWishMove) this.movement.normalize();
    const movingBackward = this.input.isKeyDown('KeyS') && !this.input.isKeyDown('KeyW');
    const wishSpeed = physics.moveSpeed * (movingBackward ? 2 / 3 : 1);

    if (physics.onGround) {
      applyGroundFriction(physics.velocity, this.settings.groundFriction, dt);
      if (hasWishMove) {
        applyAcceleration(
          physics.velocity,
          this.movement,
          wishSpeed,
          this.settings.groundAcceleration,
          dt
        );
      }
    } else {
      applyAirDrag(physics.velocity, this.settings.airDrag, dt);
      if (hasWishMove) {
        applyAcceleration(
          physics.velocity,
          this.movement,
          wishSpeed,
          this.settings.airAcceleration,
          dt
        );
      } else {
        applyGroundFriction(physics.velocity, this.settings.airBrake, dt);
      }
    }
    this.clampHorizontalSpeed(physics.velocity, physics.moveSpeed);

    physics.velocity.y -= this.settings.gravity * dt;
    if (this.input.isKeyDown('Space') && physics.onGround) {
      physics.velocity.y = physics.jumpSpeed;
      physics.onGround = false;
    }

    const nextX = transform.position.x + physics.velocity.x * dt;
    if (
      !this.world.collidesPlayer(
        nextX,
        transform.position.y,
        transform.position.z,
        physics.radius,
        physics.height
      )
    ) {
      transform.position.x = nextX;
    } else {
      physics.velocity.x = 0;
    }

    const nextZ = transform.position.z + physics.velocity.z * dt;
    if (
      !this.world.collidesPlayer(
        transform.position.x,
        transform.position.y,
        nextZ,
        physics.radius,
        physics.height
      )
    ) {
      transform.position.z = nextZ;
    } else {
      physics.velocity.z = 0;
    }

    const nextY = transform.position.y + physics.velocity.y * dt;
    if (
      !this.world.collidesPlayer(
        transform.position.x,
        nextY,
        transform.position.z,
        physics.radius,
        physics.height
      )
    ) {
      transform.position.y = nextY;
      physics.onGround = false;
    } else {
      if (physics.velocity.y < 0) physics.onGround = true;
      physics.velocity.y = 0;
    }
  }

  updateSpectator(transform: TransformComponent, physics: PhysicsComponent, dt: number): void {
    physics.velocity.set(0, 0, 0);
    physics.onGround = false;

    buildMovementVector(this.forward, this.right, this.spectatorMove, transform.yaw, this.input);
    if (this.input.isKeyDown('Space')) this.spectatorMove.y += 1;
    if (this.input.isKeyDown('ShiftLeft') || this.input.isKeyDown('ShiftRight'))
      this.spectatorMove.y -= 1;

    if (this.spectatorMove.lengthSq() <= 0) return;
    this.spectatorMove.normalize();
    const flySpeed = physics.moveSpeed * 1.75;
    transform.position.addScaledVector(this.spectatorMove, flySpeed * dt);
  }

  clampHorizontalSpeed(velocity: THREE.Vector3, maxSpeed: number): void {
    const hardLimit = Math.max(0, maxSpeed - 1e-4);
    const speed = Math.hypot(velocity.x, velocity.z);
    if (speed <= hardLimit || speed <= 1e-8) return;

    const ratio = hardLimit / speed;
    velocity.x *= ratio;
    velocity.z *= ratio;

    const postClampSpeed = Math.hypot(velocity.x, velocity.z);
    if (postClampSpeed > hardLimit && postClampSpeed > 1e-8) {
      const correction = hardLimit / postClampSpeed;
      velocity.x *= correction;
      velocity.z *= correction;
    }
  }
}
