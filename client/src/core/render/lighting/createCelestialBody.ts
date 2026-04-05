import * as THREE from 'three';

export function createCelestialBody(size: number, color: number): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
  const material = new THREE.MeshBasicMaterial({
    color,
    depthWrite: false,
    fog: false,
    toneMapped: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 10;
  mesh.visible = false;
  return mesh;
}
