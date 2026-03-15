import * as THREE from 'three';
import type { MobDefinition } from './mobDefinitions';

export type MobRenderParts = {
  root: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  legs: THREE.Mesh[];
  material: THREE.MeshLambertMaterial;
};

function applyBoxUVs(
  geometry: THREE.BoxGeometry,
  tileX: number,
  tileY: number,
  columns: number,
  rows: number
): void {
  const uvs = geometry.attributes.uv;
  const u0 = tileX / columns;
  const u1 = (tileX + 1) / columns;
  const v0 = 1 - (tileY + 1) / rows;
  const v1 = 1 - tileY / rows;

  if (!uvs) return;
  for (let i = 0; i < uvs.count; i += 4) {
    uvs.setXY(i + 0, u0, v1);
    uvs.setXY(i + 1, u1, v1);
    uvs.setXY(i + 2, u0, v0);
    uvs.setXY(i + 3, u1, v0);
  }
  uvs.needsUpdate = true;
}

function createPart(
  size: { width: number; height: number; length: number },
  definition: MobDefinition,
  material: THREE.MeshLambertMaterial,
  atlas: { columns: number; rows: number }
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(size.width, size.height, size.length);
  applyBoxUVs(geometry, definition.atlasTile.x, definition.atlasTile.y, atlas.columns, atlas.rows);
  return new THREE.Mesh(geometry, material);
}

export function createMobModel(
  definition: MobDefinition,
  material: THREE.MeshLambertMaterial,
  atlas: { columns: number; rows: number }
): MobRenderParts {
  const root = new THREE.Group();

  const mobMaterial = material.clone();
  mobMaterial.color.set(0xffffff);

  const body = createPart(definition.body, definition, mobMaterial, atlas);
  const head = createPart(definition.head, definition, mobMaterial, atlas);
  const legSize = definition.leg.size;
  const legHeight = definition.leg.height;
  const legGeometry = new THREE.BoxGeometry(legSize, legHeight, legSize);
  applyBoxUVs(
    legGeometry,
    definition.atlasTile.x,
    definition.atlasTile.y,
    atlas.columns,
    atlas.rows
  );
  const legs = [
    new THREE.Mesh(legGeometry, mobMaterial),
    new THREE.Mesh(legGeometry, mobMaterial),
    new THREE.Mesh(legGeometry, mobMaterial),
    new THREE.Mesh(legGeometry, mobMaterial)
  ];

  const bodyCenterY = legHeight + definition.body.height * 0.5;
  body.position.set(0, bodyCenterY, 0);
  const headCenterY = legHeight + definition.head.height * 0.5;
  const headOffsetZ = definition.body.length * 0.5 + definition.head.length * 0.25;
  head.position.set(0, headCenterY + 0.05, headOffsetZ);

  const legOffsetX = definition.body.width * 0.35;
  const legOffsetZ = definition.body.length * 0.32;
  legs[0]!.position.set(-legOffsetX, legHeight * 0.5, legOffsetZ);
  legs[1]!.position.set(legOffsetX, legHeight * 0.5, legOffsetZ);
  legs[2]!.position.set(-legOffsetX, legHeight * 0.5, -legOffsetZ);
  legs[3]!.position.set(legOffsetX, legHeight * 0.5, -legOffsetZ);

  root.add(body);
  root.add(head);
  for (const leg of legs) root.add(leg);

  return { root, body, head, legs, material: mobMaterial };
}
