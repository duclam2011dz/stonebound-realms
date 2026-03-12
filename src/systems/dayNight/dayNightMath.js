import * as THREE from "three";

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function computeSunDirection(phase) {
  const orbitalAngle = phase * Math.PI * 2;
  return new THREE.Vector3(
    Math.cos(orbitalAngle + Math.PI),
    Math.sin(orbitalAngle),
    -0.28
  ).normalize();
}

export function blendSkyColor(target, nightColor, dayColor, dawnDuskColor, dayFactor, twilightFactor) {
  target.copy(nightColor).lerp(dayColor, dayFactor);
  if (twilightFactor > 0) {
    target.lerp(dawnDuskColor, twilightFactor * 0.45);
  }
  return target;
}
