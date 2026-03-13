import * as THREE from 'three';

const EPS = 1e-5;

type LookTransform = { yaw: number; pitch: number };
type LookDelta = { dx: number; dy: number };
type InputLike = { isKeyDown: (code: string) => boolean };

export function applyLook(transform: LookTransform, look: LookDelta, sensitivity: number): void {
  transform.yaw -= look.dx * sensitivity;
  transform.pitch -= look.dy * sensitivity;
  const maxPitch = Math.PI / 2 - 0.01;
  transform.pitch = THREE.MathUtils.clamp(transform.pitch, -maxPitch, maxPitch);
}

export function buildMovementVector(
  outForward: THREE.Vector3,
  outRight: THREE.Vector3,
  outMove: THREE.Vector3,
  yaw: number,
  input: InputLike
): void {
  outForward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  outRight.set(Math.cos(yaw), 0, -Math.sin(yaw));
  outMove.set(0, 0, 0);
  if (input.isKeyDown('KeyW')) outMove.add(outForward);
  if (input.isKeyDown('KeyS')) outMove.sub(outForward);
  if (input.isKeyDown('KeyD')) outMove.add(outRight);
  if (input.isKeyDown('KeyA')) outMove.sub(outRight);
}

export function applyGroundFriction(velocity: THREE.Vector3, friction: number, dt: number): void {
  const speed = Math.hypot(velocity.x, velocity.z);
  if (speed < EPS) return;
  const drop = speed * friction * dt;
  const nextSpeed = Math.max(0, speed - drop);
  const ratio = nextSpeed / speed;
  velocity.x *= ratio;
  velocity.z *= ratio;
}

export function applyAirDrag(velocity: THREE.Vector3, drag: number, dt: number): void {
  const damping = Math.max(0, 1 - drag * dt);
  velocity.x *= damping;
  velocity.z *= damping;
}

export function applyAcceleration(
  velocity: THREE.Vector3,
  wishDir: THREE.Vector3,
  wishSpeed: number,
  accel: number,
  dt: number
): void {
  if (wishDir.lengthSq() <= EPS) return;
  const currentSpeed = velocity.x * wishDir.x + velocity.z * wishDir.z;
  const addSpeed = wishSpeed - currentSpeed;
  if (addSpeed <= 0) return;

  const accelSpeed = Math.min(addSpeed, accel * dt * wishSpeed);
  velocity.x += accelSpeed * wishDir.x;
  velocity.z += accelSpeed * wishDir.z;
}
