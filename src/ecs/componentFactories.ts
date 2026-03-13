import * as THREE from 'three';

export function createTransform(position) {
  return {
    position: position.clone(),
    yaw: 0,
    pitch: 0
  };
}

export function createPhysics(config) {
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

export function createController() {
  return {
    enabled: true
  };
}

export function createGamemode(initialMode = 'survival') {
  return {
    mode: initialMode
  };
}
