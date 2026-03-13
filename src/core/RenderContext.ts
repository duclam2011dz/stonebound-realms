import * as THREE from 'three';
import { createRenderer } from './render/createRenderer';
import { createScene } from './render/createScene';
import { setupLighting } from './render/setupLighting';

export class RenderContext {
  constructor(hostElement) {
    this.scene = createScene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 400);
    this.renderer = createRenderer(hostElement);
    this.lighting = setupLighting(this.scene);
  }

  applyRenderDistance(renderDistance, chunkSize) {
    const chunkSpan = Math.max(1, renderDistance) * chunkSize;
    const far = Math.max(60, chunkSpan * 2.4);
    const fogNear = Math.max(16, chunkSpan * 0.9);
    const fogFar = Math.max(fogNear + 10, chunkSpan * 2.2);

    this.camera.far = far;
    this.camera.updateProjectionMatrix();
    if (this.scene.fog) {
      this.scene.fog.near = fogNear;
      this.scene.fog.far = fogFar;
    }
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
