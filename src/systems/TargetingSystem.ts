import * as THREE from 'three';
import type { GameSettings } from '../config/constants';
import type { VoxelWorld } from '../world/VoxelWorld';
import type { VoxelHit } from '../world/services/VoxelRaycaster';
import type { BreakState } from './BlockInteractionSystem';
import { getBlockTargetKey } from './interactions/blockBreakProfile';
import { createBreakStageTextures } from './targeting/createBreakStageTextures';

export class TargetingSystem {
  scene: THREE.Scene;
  world: VoxelWorld;
  camera: THREE.PerspectiveCamera;
  settings: GameSettings;
  currentHit: VoxelHit | null;
  breakState: BreakState | null;
  breakTextures: THREE.CanvasTexture[];
  activeBreakStage: number;
  highlightMesh: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>;
  breakMesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;

  constructor(
    scene: THREE.Scene,
    world: VoxelWorld,
    camera: THREE.PerspectiveCamera,
    settings: GameSettings
  ) {
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

  update(): void {
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

  clear(): void {
    this.currentHit = null;
    this.breakState = null;
    this.highlightMesh.visible = false;
    this.breakMesh.visible = false;
    this.activeBreakStage = -1;
  }

  setBreakState(state: BreakState | null): void {
    this.breakState = state;
    if (!state) {
      this.breakMesh.visible = false;
      this.activeBreakStage = -1;
    }
  }

  updateBreakOverlay(block: VoxelHit['block']): void {
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
      const texture = this.breakTextures[stage] ?? this.breakTextures[0] ?? null;
      this.breakMesh.material.map = texture;
      this.breakMesh.material.needsUpdate = true;
      this.activeBreakStage = stage;
    }

    this.breakMesh.visible = true;
    this.breakMesh.position.set(block.x + 0.5, block.y + 0.5, block.z + 0.5);
  }

  getCurrentHit(): VoxelHit | null {
    return this.currentHit;
  }
}
