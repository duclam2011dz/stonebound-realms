import * as THREE from 'three';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeSunDirection(phase: number): THREE.Vector3 {
  const orbitalAngle = phase * Math.PI * 2;
  return new THREE.Vector3(
    Math.cos(orbitalAngle + Math.PI),
    Math.sin(orbitalAngle),
    -0.28
  ).normalize();
}

export function blendSkyColor(
  target: THREE.Color,
  nightColor: THREE.Color,
  dayColor: THREE.Color,
  dawnDuskColor: THREE.Color,
  dayFactor: number,
  twilightFactor: number
): THREE.Color {
  target.copy(nightColor).lerp(dayColor, dayFactor);
  if (twilightFactor > 0) {
    target.lerp(dawnDuskColor, twilightFactor * 0.45);
  }
  return target;
}
