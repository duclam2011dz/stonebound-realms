import * as THREE from 'three';
import type { MobDefinition, MobSkinBoxLayout } from './mobDefinitions';

export type MobRenderParts = {
  root: THREE.Group;
  body: THREE.Mesh;
  head: THREE.Mesh;
  legs: THREE.Mesh[];
  material: THREE.MeshLambertMaterial;
};

type MobSkinFaceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  flipX?: boolean;
  flipY?: boolean;
};

type MobSkinFaces = {
  textureWidth: number;
  textureHeight: number;
  right: MobSkinFaceRect;
  left: MobSkinFaceRect;
  top: MobSkinFaceRect;
  bottom: MobSkinFaceRect;
  front: MobSkinFaceRect;
  back: MobSkinFaceRect;
};

function createSkinFaces(
  layout: MobSkinBoxLayout,
  textureWidth: number,
  textureHeight: number
): MobSkinFaces {
  const { textureOffsetX, textureOffsetY, boxWidth, boxHeight, boxDepth } = layout;
  return {
    textureWidth,
    textureHeight,
    right: {
      x: textureOffsetX + boxDepth + boxWidth,
      y: textureOffsetY + boxDepth,
      width: boxDepth,
      height: boxHeight
    },
    left: {
      x: textureOffsetX,
      y: textureOffsetY + boxDepth,
      width: boxDepth,
      height: boxHeight
    },
    top: {
      x: textureOffsetX + boxDepth,
      y: textureOffsetY,
      width: boxWidth,
      height: boxDepth
    },
    bottom: {
      x: textureOffsetX + boxDepth + boxWidth,
      y: textureOffsetY,
      width: boxWidth,
      height: boxDepth
    },
    front: {
      x: textureOffsetX + boxDepth,
      y: textureOffsetY + boxDepth,
      width: boxWidth,
      height: boxHeight
    },
    back: {
      x: textureOffsetX + boxDepth + boxWidth + boxDepth,
      y: textureOffsetY + boxDepth,
      width: boxWidth,
      height: boxHeight
    }
  };
}

function applyBoxUVs(
  geometry: THREE.BoxGeometry,
  faces: MobSkinFaces
): void {
  const uvs = geometry.attributes.uv;
  if (!uvs) return;
  const faceOrder: Array<keyof Omit<MobSkinFaces, 'textureWidth' | 'textureHeight'>> = [
    'right',
    'left',
    'top',
    'bottom',
    'front',
    'back'
  ];
  for (let faceIndex = 0; faceIndex < faceOrder.length; faceIndex++) {
    const faceKey = faceOrder[faceIndex];
    if (!faceKey) continue;
    const face = faces[faceKey];
    const u0 = face.x / faces.textureWidth;
    const u1 = (face.x + face.width) / faces.textureWidth;
    const v0 = 1 - (face.y + face.height) / faces.textureHeight;
    const v1 = 1 - face.y / faces.textureHeight;
    const leftU = face.flipX ? u1 : u0;
    const rightU = face.flipX ? u0 : u1;
    const topV = face.flipY ? v0 : v1;
    const bottomV = face.flipY ? v1 : v0;
    const offset = faceIndex * 4;
    uvs.setXY(offset + 0, leftU, topV);
    uvs.setXY(offset + 1, rightU, topV);
    uvs.setXY(offset + 2, leftU, bottomV);
    uvs.setXY(offset + 3, rightU, bottomV);
  }
  uvs.needsUpdate = true;
}

function createPart(
  size: { width: number; height: number; length: number },
  faces: MobSkinFaces,
  material: THREE.MeshLambertMaterial
): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(size.width, size.height, size.length);
  applyBoxUVs(geometry, faces);
  return new THREE.Mesh(geometry, material);
}

export function createMobModel(
  definition: MobDefinition,
  material: THREE.MeshLambertMaterial
): MobRenderParts {
  const root = new THREE.Group();

  const mobMaterial = material.clone();
  mobMaterial.color.set(0xffffff);
  mobMaterial.map = material.map ?? null;
  mobMaterial.needsUpdate = true;

  const headFaces = createSkinFaces(
    definition.skin.head,
    definition.skin.textureWidth,
    definition.skin.textureHeight
  );
  const bodyFaces = createSkinFaces(
    definition.skin.body,
    definition.skin.textureWidth,
    definition.skin.textureHeight
  );
  const legFaces = createSkinFaces(
    definition.skin.leg,
    definition.skin.textureWidth,
    definition.skin.textureHeight
  );

  const body = createPart(definition.body, bodyFaces, mobMaterial);
  const head = createPart(definition.head, headFaces, mobMaterial);
  const legSize = definition.leg.size;
  const legHeight = definition.leg.height;
  const legGeometry = new THREE.BoxGeometry(legSize, legHeight, legSize);
  applyBoxUVs(legGeometry, legFaces);
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
