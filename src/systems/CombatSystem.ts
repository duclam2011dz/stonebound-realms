import * as THREE from 'three';
import {
  COMPONENT_GAMEMODE,
  COMPONENT_MOB,
  COMPONENT_MOB_AI,
  COMPONENT_MOB_RENDER,
  COMPONENT_TRANSFORM
} from '../ecs/componentTypes';
import type { ECSWorld } from '../ecs/ECSWorld';
import type {
  MobAIComponent,
  MobComponent,
  MobRenderComponent,
  TransformComponent
} from '../ecs/componentFactories';
import { GAMEMODE_SURVIVAL } from '../game/gamemode/gameModes';
import type { InventoryState } from '../inventory/InventoryState';
import type { InventorySlot } from '../inventory/itemTypes';
import { isItemSlot } from '../inventory/itemTypes';
import { WOODEN_SWORD_DAMAGE } from '../inventory/itemDefinitions';
import { getMobDefinition } from '../mobs/mobDefinitions';

const ATTACK_RANGE = 3.2;
const ATTACK_COOLDOWN_SECONDS = 0.85;
const BASE_DAMAGE = 1;
const HIT_FLASH_SECONDS = 0.18;
const KNOCKBACK_STRENGTH = 4.2;
const PANIC_SECONDS = 2.6;

export class CombatSystem {
  ecs: ECSWorld;
  playerEntityId: number;
  camera: THREE.PerspectiveCamera;
  inventory: InventoryState;
  attackTimer: number;
  tempDir: THREE.Vector3;
  tempVec: THREE.Vector3;

  constructor(
    ecs: ECSWorld,
    playerEntityId: number,
    camera: THREE.PerspectiveCamera,
    inventory: InventoryState
  ) {
    this.ecs = ecs;
    this.playerEntityId = playerEntityId;
    this.camera = camera;
    this.inventory = inventory;
    this.attackTimer = ATTACK_COOLDOWN_SECONDS;
    this.tempDir = new THREE.Vector3();
    this.tempVec = new THREE.Vector3();
  }

  update(dt: number): void {
    this.attackTimer = Math.min(ATTACK_COOLDOWN_SECONDS, this.attackTimer + dt);
  }

  getCooldownProgress(): number {
    return Math.min(1, Math.max(0, this.attackTimer / ATTACK_COOLDOWN_SECONDS));
  }

  tryAttack(heldItem: InventorySlot | null = null): boolean {
    const gamemode =
      this.ecs.getComponent<{ mode: string }>(this.playerEntityId, COMPONENT_GAMEMODE)?.mode ??
      GAMEMODE_SURVIVAL;
    if (gamemode !== GAMEMODE_SURVIVAL) return false;

    const target = this.findTargetMob();
    const strength = this.getCooldownProgress();
    this.attackTimer = 0;

    if (!target) return false;

    const mob = this.ecs.getComponent<MobComponent>(target.id, COMPONENT_MOB);
    const ai = this.ecs.getComponent<MobAIComponent>(target.id, COMPONENT_MOB_AI);
    const mobTransform = this.ecs.getComponent<TransformComponent>(target.id, COMPONENT_TRANSFORM);
    const playerTransform = this.ecs.getComponent<TransformComponent>(
      this.playerEntityId,
      COMPONENT_TRANSFORM
    );
    if (!mob) return false;
    const baseDamage =
      isItemSlot(heldItem) && heldItem.itemType === 'wooden_sword'
        ? WOODEN_SWORD_DAMAGE
        : BASE_DAMAGE;
    const scaled = baseDamage * (0.2 + 0.8 * strength);
    mob.health = Math.max(0, mob.health - scaled);
    mob.hitFlashTimer = HIT_FLASH_SECONDS;

    if (mobTransform && playerTransform) {
      const dirX = mobTransform.position.x - playerTransform.position.x;
      const dirZ = mobTransform.position.z - playerTransform.position.z;
      const dist = Math.hypot(dirX, dirZ) || 1;
      const push = KNOCKBACK_STRENGTH * (0.6 + 0.4 * strength);
      mob.knockback.x += (dirX / dist) * push;
      mob.knockback.z += (dirZ / dist) * push;
    }

    if (ai) {
      ai.panicTimer = PANIC_SECONDS;
      ai.panicPhase = Math.random() * Math.PI * 2;
      ai.path = [];
      ai.stuckTimer = 0;
    }

    if (mob.health <= 0) {
      this.killMob(target.id, mob);
    }
    return true;
  }

  killMob(entityId: number, mob: MobComponent): void {
    const render = this.ecs.getComponent<MobRenderComponent>(entityId, COMPONENT_MOB_RENDER);
    if (render) {
      render.parts.root.parent?.remove(render.parts.root);
    }
    this.ecs.removeEntity(entityId);

    const definition = getMobDefinition(mob.type);
    const drop = definition.drops;
    if (drop) {
      this.inventory.addFood(drop.food, drop.amount);
    }
  }

  findTargetMob(): { id: number; distance: number } | null {
    this.camera.getWorldDirection(this.tempDir);
    const origin = this.camera.position;
    let best: { id: number; distance: number } | null = null;

    const mobEntities = this.ecs.getEntitiesWith([COMPONENT_MOB, COMPONENT_TRANSFORM]);
    for (const entityId of mobEntities) {
      const transform = this.ecs.getComponent<TransformComponent>(entityId, COMPONENT_TRANSFORM);
      const mob = this.ecs.getComponent<MobComponent>(entityId, COMPONENT_MOB);
      if (!transform || !mob) continue;
      const definition = getMobDefinition(mob.type);
      const centerY = transform.position.y + definition.height * 0.5;
      this.tempVec.set(
        transform.position.x - origin.x,
        centerY - origin.y,
        transform.position.z - origin.z
      );
      const projected = this.tempVec.dot(this.tempDir);
      if (projected < 0 || projected > ATTACK_RANGE) continue;
      const distSq = this.tempVec.lengthSq() - projected * projected;
      const radius = Math.max(0.25, definition.radius);
      if (distSq > radius * radius) continue;
      if (!best || projected < best.distance) {
        best = { id: entityId, distance: projected };
      }
    }

    return best;
  }
}
