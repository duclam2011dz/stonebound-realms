import * as THREE from 'three';
import type {
  MobAnimationRole,
  MobCubeDefinition,
  MobDefinition,
  MobPartDefinition,
  MobTextureLayerDefinition
} from './mobDefinitions';

const MODEL_PIXEL_SCALE = 1 / 16;

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

type AnimatedParts = Partial<Record<MobAnimationRole, THREE.Group>>;

export type MobRenderParts = {
  root: THREE.Group;
  materials: Record<string, THREE.MeshLambertMaterial>;
  materialList: THREE.MeshLambertMaterial[];
  animated: AnimatedParts;
};

function createSkinFaces(
  cube: MobCubeDefinition,
  texture: MobTextureLayerDefinition
): MobSkinFaces {
  const { textureOffsetX, textureOffsetY, boxWidth, boxHeight, boxDepth } = cube;
  return {
    textureWidth: texture.textureWidth,
    textureHeight: texture.textureHeight,
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

function applyBoxUVs(geometry: THREE.BoxGeometry, faces: MobSkinFaces): void {
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

  for (let faceIndex = 0; faceIndex < faceOrder.length; faceIndex += 1) {
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

function createCubeMesh(
  cube: MobCubeDefinition,
  texture: MobTextureLayerDefinition,
  material: THREE.MeshLambertMaterial
): THREE.Mesh {
  const inflate = cube.inflate ?? 0;
  const geometry = new THREE.BoxGeometry(
    (cube.boxWidth + inflate * 2) * MODEL_PIXEL_SCALE,
    (cube.boxHeight + inflate * 2) * MODEL_PIXEL_SCALE,
    (cube.boxDepth + inflate * 2) * MODEL_PIXEL_SCALE
  );
  applyBoxUVs(geometry, createSkinFaces(cube, texture));

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(
    (cube.originX + cube.boxWidth * 0.5) * MODEL_PIXEL_SCALE,
    -(cube.originY + cube.boxHeight * 0.5) * MODEL_PIXEL_SCALE,
    (cube.originZ + cube.boxDepth * 0.5) * MODEL_PIXEL_SCALE
  );
  return mesh;
}

function createPartGroup(
  definition: MobDefinition,
  part: MobPartDefinition,
  textures: Record<string, MobTextureLayerDefinition>,
  materials: Record<string, THREE.MeshLambertMaterial>,
  animated: AnimatedParts
): THREE.Group {
  const group = new THREE.Group();
  group.name = part.name;
  group.position.set(
    part.pivotX * MODEL_PIXEL_SCALE,
    (definition.model.groundY - part.pivotY) * MODEL_PIXEL_SCALE,
    part.pivotZ * MODEL_PIXEL_SCALE
  );
  group.rotation.set(-(part.rotationX ?? 0), part.rotationY ?? 0, -(part.rotationZ ?? 0));

  if (part.animationRole) {
    animated[part.animationRole] = group;
  }

  for (const cube of part.cubes) {
    const texture = textures[cube.textureLayer];
    const material = materials[cube.textureLayer];
    if (!texture || !material) {
      throw new Error(
        `Missing mob texture layer "${cube.textureLayer}" for ${definition.type}:${part.name}.`
      );
    }
    group.add(createCubeMesh(cube, texture, material));
  }

  return group;
}

function cloneMaterials(
  materialTemplates: Record<string, THREE.MeshLambertMaterial>
): Record<string, THREE.MeshLambertMaterial> {
  return Object.fromEntries(
    Object.entries(materialTemplates).map(([layer, material]) => {
      const cloned = material.clone();
      cloned.color.copy(material.color);
      cloned.map = material.map ?? null;
      cloned.needsUpdate = true;
      return [layer, cloned];
    })
  );
}

export function createMobModel(
  definition: MobDefinition,
  materialTemplates: Record<string, THREE.MeshLambertMaterial>
): MobRenderParts {
  const root = new THREE.Group();
  const materials = cloneMaterials(materialTemplates);
  const animated: AnimatedParts = {};

  for (const part of definition.model.parts) {
    root.add(createPartGroup(definition, part, definition.model.textureLayers, materials, animated));
  }

  return {
    root,
    materials,
    materialList: Object.values(materials),
    animated
  };
}
