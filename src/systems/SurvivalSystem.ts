import * as THREE from 'three';
import { COMPONENT_GAMEMODE, COMPONENT_PHYSICS, COMPONENT_TRANSFORM } from '../ecs/componentTypes';
import type { ECSWorld } from '../ecs/ECSWorld';
import type { PhysicsComponent, TransformComponent } from '../ecs/componentFactories';
import { GAMEMODE_SURVIVAL } from '../game/gamemode/gameModes';
import { getFoodDefinition } from '../inventory/foodDefinitions';
import type { FoodType } from '../inventory/foodDefinitions';

const MAX_HEALTH = 20;
const MAX_HUNGER = 20;
const FALL_DAMAGE_THRESHOLD = 3;
const STARVATION_TICK_SECONDS = 1.6;
const HUNGER_DRAIN_FULL_SECONDS = 60;
const HUNGER_DRAIN_LOW_SECONDS = 30;
const HUNGER_MOVE_THRESHOLD = 1e-3;

export class SurvivalSystem {
  ecs: ECSWorld;
  playerEntityId: number;
  health: number;
  hunger: number;
  isDead: boolean;
  fallDistance: number;
  lastOnGround: boolean;
  lastPosition: THREE.Vector3;
  starvationTimer: number;
  hungerTimer: number;
  spawnPoint: THREE.Vector3 | null;
  onDeath: (() => void) | null;

  constructor(ecs: ECSWorld, playerEntityId: number, onDeath: (() => void) | null = null) {
    this.ecs = ecs;
    this.playerEntityId = playerEntityId;
    this.health = MAX_HEALTH;
    this.hunger = MAX_HUNGER;
    this.isDead = false;
    this.fallDistance = 0;
    this.lastOnGround = false;
    this.lastPosition = new THREE.Vector3();
    this.starvationTimer = 0;
    this.hungerTimer = 0;
    this.spawnPoint = null;
    this.onDeath = onDeath;
  }

  setSpawnPoint(spawn: THREE.Vector3): void {
    this.spawnPoint = spawn.clone();
  }

  getHealth(): number {
    return this.health;
  }

  getHunger(): number {
    return this.hunger;
  }

  update(dt: number): void {
    if (this.isDead) return;
    const transform = this.ecs.getComponent<TransformComponent>(
      this.playerEntityId,
      COMPONENT_TRANSFORM
    );
    const physics = this.ecs.getComponent<PhysicsComponent>(this.playerEntityId, COMPONENT_PHYSICS);
    const gamemode =
      this.ecs.getComponent<{ mode: string }>(this.playerEntityId, COMPONENT_GAMEMODE)?.mode ??
      GAMEMODE_SURVIVAL;
    if (!transform || !physics || gamemode !== GAMEMODE_SURVIVAL) {
      if (transform) this.lastPosition.copy(transform.position);
      if (physics) this.lastOnGround = physics.onGround;
      this.fallDistance = 0;
      return;
    }

    this.applyHungerDrain(transform.position, dt);
    this.applyFallDamage(transform, physics);
    this.applyStarvationDamage(dt);

    this.lastPosition.copy(transform.position);
    this.lastOnGround = physics.onGround;
  }

  applyHungerDrain(position: THREE.Vector3, dt: number): void {
    const dx = position.x - this.lastPosition.x;
    const dz = position.z - this.lastPosition.z;
    const distance = Math.hypot(dx, dz);
    if (distance <= HUNGER_MOVE_THRESHOLD) return;
    const interval =
      this.hunger >= MAX_HUNGER / 2 ? HUNGER_DRAIN_FULL_SECONDS : HUNGER_DRAIN_LOW_SECONDS;
    this.hungerTimer += dt;
    while (this.hungerTimer >= interval && this.hunger > 0) {
      this.hunger = Math.max(0, this.hunger - 1);
      this.hungerTimer -= interval;
    }
  }

  applyFallDamage(transform: TransformComponent, physics: PhysicsComponent): void {
    if (!physics.onGround) {
      const drop = this.lastPosition.y - transform.position.y;
      if (drop > 0) this.fallDistance += drop;
      return;
    }

    if (!this.lastOnGround && this.fallDistance > 0) {
      const damage = Math.floor(this.fallDistance - FALL_DAMAGE_THRESHOLD);
      if (damage > 0) this.applyDamage(damage);
      this.fallDistance = 0;
    }
  }

  applyStarvationDamage(dt: number): void {
    if (this.hunger > 0) {
      this.starvationTimer = 0;
      return;
    }
    this.starvationTimer += dt;
    if (this.starvationTimer >= STARVATION_TICK_SECONDS) {
      this.starvationTimer = 0;
      this.applyDamage(1);
    }
  }

  applyDamage(amount: number): void {
    if (this.isDead) return;
    const applied = Math.max(0, Number(amount) || 0);
    if (applied <= 0) return;
    this.health = Math.max(0, this.health - applied);
    if (this.health <= 0) {
      this.isDead = true;
      this.onDeath?.();
    }
  }

  canEat(): boolean {
    return this.hunger < MAX_HUNGER && !this.isDead;
  }

  eat(foodType: FoodType): boolean {
    if (!this.canEat()) return false;
    const food = getFoodDefinition(foodType);
    this.hunger = Math.min(MAX_HUNGER, this.hunger + food.hungerRestore);
    return true;
  }

  respawn(): void {
    const transform = this.ecs.getComponent<TransformComponent>(
      this.playerEntityId,
      COMPONENT_TRANSFORM
    );
    const physics = this.ecs.getComponent<PhysicsComponent>(this.playerEntityId, COMPONENT_PHYSICS);
    if (transform && this.spawnPoint) {
      transform.position.copy(this.spawnPoint);
    }
    if (physics) {
      physics.velocity.set(0, 0, 0);
      physics.onGround = false;
    }
    this.health = MAX_HEALTH;
    this.hunger = MAX_HUNGER;
    this.isDead = false;
    this.fallDistance = 0;
    this.lastOnGround = false;
    this.starvationTimer = 0;
    this.hungerTimer = 0;
    if (transform) this.lastPosition.copy(transform.position);
  }
}
