import * as THREE from 'three';
import type { MobType } from '../mobs/mobDefinitions';
import type { MobRenderParts } from '../mobs/createMobModel';

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

export type MobComponent = {
  type: MobType;
  health: number;
  maxHealth: number;
  hitFlashTimer: number;
  knockback: THREE.Vector3;
};

export type MobAIComponent = {
  path: Array<{ x: number; z: number }>;
  repathTimer: number;
  wanderTimer: number;
  stuckTimer: number;
  lastPosition: THREE.Vector3;
  walkPhase: number;
  panicTimer: number;
  panicPhase: number;
};

export type MobRenderComponent = {
  parts: MobRenderParts;
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

export function createMob(type: MobType, maxHealth = 8): MobComponent {
  return {
    type,
    health: maxHealth,
    maxHealth,
    hitFlashTimer: 0,
    knockback: new THREE.Vector3()
  };
}

export function createMobAI(): MobAIComponent {
  return {
    path: [],
    repathTimer: 0,
    wanderTimer: 0,
    stuckTimer: 0,
    lastPosition: new THREE.Vector3(),
    walkPhase: 0,
    panicTimer: 0,
    panicPhase: 0
  };
}

export function createMobRender(parts: MobRenderParts): MobRenderComponent {
  return { parts };
}
