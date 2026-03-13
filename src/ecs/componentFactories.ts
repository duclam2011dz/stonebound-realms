import * as THREE from 'three';

export type TransformComponent = {
  position: THREE.Vector3;
  yaw: number;
  pitch: number;
};

export type PhysicsComponent = {
  velocity: THREE.Vector3;
  onGround: boolean;
  radius: number;
  height: number;
  eyeHeight: number;
  moveSpeed: number;
  jumpSpeed: number;
};

export type ControllerComponent = {
  enabled: boolean;
};

export type GamemodeComponent = {
  mode: string;
};

export type PhysicsConfig = {
  radius: number;
  height: number;
  eyeHeight: number;
  moveSpeed: number;
  jumpSpeed: number;
};

export function createTransform(position: THREE.Vector3): TransformComponent {
  return {
    position: position.clone(),
    yaw: 0,
    pitch: 0
  };
}

export function createPhysics(config: PhysicsConfig): PhysicsComponent {
  return {
    velocity: new THREE.Vector3(),
    onGround: false,
    radius: config.radius,
    height: config.height,
    eyeHeight: config.eyeHeight,
    moveSpeed: config.moveSpeed,
    jumpSpeed: config.jumpSpeed
  };
}

export function createController(): ControllerComponent {
  return {
    enabled: true
  };
}

export function createGamemode(initialMode = 'survival'): GamemodeComponent {
  return {
    mode: initialMode
  };
}
