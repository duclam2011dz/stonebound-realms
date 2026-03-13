import * as THREE from 'three';
import { createCelestialBody } from './lighting/createCelestialBody';

export function setupLighting(scene) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambientLight);

  const hemisphereLight = new THREE.HemisphereLight(0xe2f3ff, 0x4c3d2d, 0.9);
  scene.add(hemisphereLight);

  const sunLight = new THREE.DirectionalLight(0xfff3cc, 1.05);
  sunLight.position.set(18, 30, 10);
  sunLight.target.position.set(0, 0, 0);
  scene.add(sunLight);
  scene.add(sunLight.target);

  const moonLight = new THREE.DirectionalLight(0xc5d6ff, 0.22);
  moonLight.position.set(-18, 24, -8);
  moonLight.target.position.set(0, 0, 0);
  scene.add(moonLight);
  scene.add(moonLight.target);

  const sunBody = createCelestialBody(10, 0xffdd88);
  const moonBody = createCelestialBody(9, 0xd8e4ff);
  scene.add(sunBody);
  scene.add(moonBody);

  return {
    ambientLight,
    hemisphereLight,
    sunLight,
    moonLight,
    sunBody,
    moonBody
  };
}
