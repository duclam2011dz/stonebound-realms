import * as THREE from 'three';

export function createRenderer(hostElement) {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
  renderer.setSize(window.innerWidth, window.innerHeight);
  hostElement.appendChild(renderer.domElement);
  return renderer;
}
