import * as THREE from 'three';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9cccf6);
  scene.fog = new THREE.Fog(0x9cccf6, 20, 120);
  return scene;
}
