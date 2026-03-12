import * as THREE from "three";
import { getBlockTargetKey } from "./interactions/blockBreakProfile.js";
import { createBreakStageTextures } from "./targeting/createBreakStageTextures.js";

export class TargetingSystem {
  constructor(scene, world, camera, settings) {
    this.scene = scene;
    this.world = world;
    this.camera = camera;
    this.settings = settings;
    this.currentHit = null;
    this.breakState = null;
    this.breakTextures = createBreakStageTextures();
    this.activeBreakStage = -1;

    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02));
    const material = new THREE.LineBasicMaterial({ color: 0x000000 });
    this.highlightMesh = new THREE.LineSegments(edges, material);
    this.highlightMesh.visible = false;
    this.scene.add(this.highlightMesh);

    const breakGeometry = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const breakMaterial = new THREE.MeshBasicMaterial({
      map: this.breakTextures[0] ?? null,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    this.breakMesh = new THREE.Mesh(breakGeometry, breakMaterial);
    this.breakMesh.visible = false;
    this.scene.add(this.breakMesh);
  }

  update() {
    this.currentHit = this.world.raycastFromCamera(this.camera, this.settings.maxRayDistance);

    const block = this.currentHit?.block;
    if (!block) {
      this.highlightMesh.visible = false;
      this.breakMesh.visible = false;
      return;
    }

    this.highlightMesh.visible = true;
    this.highlightMesh.position.set(block.x + 0.5, block.y + 0.5, block.z + 0.5);
    this.updateBreakOverlay(block);
  }

  setBreakState(state) {
    this.breakState = state;
    if (!state) {
      this.breakMesh.visible = false;
      this.activeBreakStage = -1;
    }
  }

  updateBreakOverlay(block) {
    if (!this.breakState || !this.breakTextures.length) {
      this.breakMesh.visible = false;
      return;
    }

    const targetKey = getBlockTargetKey(block.x, block.y, block.z);
    if (this.breakState.targetKey !== targetKey || this.breakState.progress <= 0) {
      this.breakMesh.visible = false;
      return;
    }

    const stage = Math.min(
      this.breakTextures.length - 1,
      Math.floor(this.breakState.progress * this.breakTextures.length)
    );
    if (stage !== this.activeBreakStage) {
      this.breakMesh.material.map = this.breakTextures[stage];
      this.breakMesh.material.needsUpdate = true;
      this.activeBreakStage = stage;
    }

    this.breakMesh.visible = true;
    this.breakMesh.position.set(block.x + 0.5, block.y + 0.5, block.z + 0.5);
  }

  getCurrentHit() {
    return this.currentHit;
  }
}
