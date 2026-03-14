import * as THREE from 'three';
import type { ECSWorld } from '../../ecs/ECSWorld';
import {
  COMPONENT_MOB,
  COMPONENT_MOB_AI,
  COMPONENT_MOB_RENDER,
  COMPONENT_TRANSFORM,
  createMob,
  createMobAI,
  createMobRender,
  createTransform
} from '../../ecs/components';
import type { MobDefinition, MobType } from '../../mobs/mobDefinitions';
import { createMobModel } from '../../mobs/createMobModel';

type CreateMobEntityOptions = {
  ecs: ECSWorld;
  scene: THREE.Scene;
  definition: MobDefinition;
  position: THREE.Vector3;
  material: THREE.MeshLambertMaterial;
  atlas: { columns: number; rows: number };
};

export function createMobEntity({
  ecs,
  scene,
  definition,
  position,
  material,
  atlas
}: CreateMobEntityOptions): number {
  const entityId = ecs.createEntity();
  ecs.addComponent(entityId, COMPONENT_TRANSFORM, createTransform(position));
  ecs.addComponent(entityId, COMPONENT_MOB, createMob(definition.type as MobType));
  ecs.addComponent(entityId, COMPONENT_MOB_AI, createMobAI());

  const parts = createMobModel(definition, material, atlas);
  ecs.addComponent(entityId, COMPONENT_MOB_RENDER, createMobRender(parts));
  scene.add(parts.root);
  return entityId;
}
