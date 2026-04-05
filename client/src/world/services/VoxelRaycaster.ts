import * as THREE from 'three';

export type VoxelHit = {
  point: THREE.Vector3;
  block: { x: number; y: number; z: number };
  face: { normal: THREE.Vector3 };
};

type BlockFilledFn = (x: number, y: number, z: number) => boolean;

export class VoxelRaycaster {
  private rayOrigin: THREE.Vector3;
  private rayDirection: THREE.Vector3;
  private rayHit: VoxelHit;

  constructor() {
    this.rayOrigin = new THREE.Vector3();
    this.rayDirection = new THREE.Vector3();
    this.rayHit = {
      point: new THREE.Vector3(),
      block: { x: 0, y: 0, z: 0 },
      face: { normal: new THREE.Vector3() }
    };
  }

  raycast(
    camera: THREE.Camera,
    maxDistance: number,
    isBlockFilled: BlockFilledFn
  ): VoxelHit | null {
    this.rayOrigin.copy(camera.position);
    camera.getWorldDirection(this.rayDirection);
    this.rayDirection.normalize();

    let x = Math.floor(this.rayOrigin.x);
    let y = Math.floor(this.rayOrigin.y);
    let z = Math.floor(this.rayOrigin.z);

    const stepX = this.rayDirection.x > 0 ? 1 : -1;
    const stepY = this.rayDirection.y > 0 ? 1 : -1;
    const stepZ = this.rayDirection.z > 0 ? 1 : -1;

    const invDx = this.rayDirection.x !== 0 ? 1 / this.rayDirection.x : Number.POSITIVE_INFINITY;
    const invDy = this.rayDirection.y !== 0 ? 1 / this.rayDirection.y : Number.POSITIVE_INFINITY;
    const invDz = this.rayDirection.z !== 0 ? 1 / this.rayDirection.z : Number.POSITIVE_INFINITY;

    const tDeltaX = Math.abs(invDx);
    const tDeltaY = Math.abs(invDy);
    const tDeltaZ = Math.abs(invDz);

    const nextBoundaryX = stepX > 0 ? x + 1 : x;
    const nextBoundaryY = stepY > 0 ? y + 1 : y;
    const nextBoundaryZ = stepZ > 0 ? z + 1 : z;

    let tMaxX =
      this.rayDirection.x !== 0
        ? (nextBoundaryX - this.rayOrigin.x) * invDx
        : Number.POSITIVE_INFINITY;
    let tMaxY =
      this.rayDirection.y !== 0
        ? (nextBoundaryY - this.rayOrigin.y) * invDy
        : Number.POSITIVE_INFINITY;
    let tMaxZ =
      this.rayDirection.z !== 0
        ? (nextBoundaryZ - this.rayOrigin.z) * invDz
        : Number.POSITIVE_INFINITY;

    if (tMaxX < 0) tMaxX = 0;
    if (tMaxY < 0) tMaxY = 0;
    if (tMaxZ < 0) tMaxZ = 0;

    let distance = 0;
    let steps = 0;

    while (distance <= maxDistance && steps < 256) {
      if (isBlockFilled(x, y, z)) {
        this.rayHit.point.copy(this.rayDirection).multiplyScalar(distance).add(this.rayOrigin);
        this.rayHit.block.x = x;
        this.rayHit.block.y = y;
        this.rayHit.block.z = z;
        return this.rayHit;
      }

      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        x += stepX;
        distance = tMaxX;
        tMaxX += tDeltaX;
        this.rayHit.face.normal.set(-stepX, 0, 0);
      } else if (tMaxY < tMaxZ) {
        y += stepY;
        distance = tMaxY;
        tMaxY += tDeltaY;
        this.rayHit.face.normal.set(0, -stepY, 0);
      } else {
        z += stepZ;
        distance = tMaxZ;
        tMaxZ += tDeltaZ;
        this.rayHit.face.normal.set(0, 0, -stepZ);
      }
      steps += 1;
    }

    return null;
  }
}
