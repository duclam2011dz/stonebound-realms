import type * as THREE from 'three';
import { COMPONENT_PHYSICS, COMPONENT_TRANSFORM } from '../../ecs/components';
import type { ECSWorld } from '../../ecs/ECSWorld';
import type { InventoryState } from '../../inventory/InventoryState';
import type { VoxelWorld } from '../../world/VoxelWorld';
import { isValidBlockType } from '../../world/services/BlockPalette';
import { isValidGamemode } from '../gamemode/gameModes';
import { parseRelativeCoordinate } from './parseRelativeCoordinate';
import type { GameModeSystem } from '../../systems/GameModeSystem';
import type { DayNightSystem } from '../../systems/DayNightSystem';
import type { ChunkStreamingSystem } from '../../systems/ChunkStreamingSystem';
import type { CameraSystem } from '../../systems/CameraSystem';

type CommandResult = { handled: boolean; ok?: boolean; message?: string };

type CommandSystems = {
  dayNight: DayNightSystem;
  chunks: ChunkStreamingSystem;
  camera: CameraSystem;
  gamemode: GameModeSystem;
};

type CommandServiceOptions = {
  ecs: ECSWorld;
  playerEntityId: number;
  systems: CommandSystems;
  world: VoxelWorld;
  camera: THREE.PerspectiveCamera;
  inventoryState?: InventoryState;
};

function ok(message: string): CommandResult {
  return { handled: true, ok: true, message };
}

function fail(message: string): CommandResult {
  return { handled: true, ok: false, message };
}

export class GameCommandService {
  private ecs: ECSWorld;
  private playerEntityId: number;
  private systems: CommandSystems;
  private world: VoxelWorld;
  private camera: THREE.PerspectiveCamera;
  private inventoryState: InventoryState | undefined;

  constructor({
    ecs,
    playerEntityId,
    systems,
    world,
    camera,
    inventoryState
  }: CommandServiceOptions) {
    this.ecs = ecs;
    this.playerEntityId = playerEntityId;
    this.systems = systems;
    this.world = world;
    this.camera = camera;
    this.inventoryState = inventoryState;
  }

  execute(rawCommandText: string): CommandResult {
    const text = String(rawCommandText ?? '').trim();
    if (!text.startsWith('/')) return { handled: false };
    const parts = text.slice(1).split(/\s+/).filter(Boolean);
    if (!parts.length) return fail('Command not found.');

    const command = parts[0];
    if (!command) return fail('Command not found.');
    const commandLower = command.toLowerCase();
    if (commandLower === 'time') return this.executeTime(parts.slice(1));
    if (commandLower === 'tp') return this.executeTeleport(parts.slice(1));
    if (commandLower === 'effect') return this.executeEffect(parts.slice(1));
    if (commandLower === 'biome') return this.executeBiome(parts.slice(1));
    if (commandLower === 'give') return this.executeGive(parts.slice(1));
    if (commandLower === 'gamemode') return this.executeGamemode(parts.slice(1));
    return { handled: false };
  }

  executeTime(args: string[]): CommandResult {
    if (args.length !== 2) {
      return fail('Usage: /time set day|night');
    }
    const action = args[0];
    const modeRaw = args[1];
    if (!action || !modeRaw || action.toLowerCase() !== 'set') {
      return fail('Usage: /time set day|night');
    }

    const mode = modeRaw.toLowerCase();
    if (mode !== 'day' && mode !== 'night') {
      return fail('Usage: /time set day|night');
    }

    this.systems.dayNight.setTimePreset(mode);
    return ok(`Time set to ${mode}.`);
  }

  executeTeleport(args: string[]): CommandResult {
    if (args.length !== 3) {
      return fail('Usage: /tp <x> <y> <z>');
    }
    const [xArg, yArg, zArg] = args;
    if (!xArg || !yArg || !zArg) {
      return fail('Usage: /tp <x> <y> <z>');
    }

    const transform = this.ecs.getComponent<{
      position: THREE.Vector3;
      yaw: number;
      pitch: number;
    }>(this.playerEntityId, COMPONENT_TRANSFORM);
    const physics = this.ecs.getComponent<{
      velocity: THREE.Vector3;
      onGround: boolean;
    }>(this.playerEntityId, COMPONENT_PHYSICS);
    if (!transform) return fail('Player transform not found.');

    const nextX = parseRelativeCoordinate(xArg, transform.position.x);
    const nextY = parseRelativeCoordinate(yArg, transform.position.y);
    const nextZ = parseRelativeCoordinate(zArg, transform.position.z);
    if (nextX === null || nextY === null || nextZ === null) {
      return fail('Usage: /tp <x> <y> <z>');
    }

    const maxY = this.world.getMaxHeight() - 2;
    const clampedY = Math.min(maxY, Math.max(1, nextY));
    transform.position.set(nextX, clampedY, nextZ);
    if (physics) {
      physics.velocity.set(0, 0, 0);
      physics.onGround = false;
    }

    this.systems.chunks.force(transform.position);
    this.systems.camera.update(this.ecs, this.playerEntityId, this.camera);
    return ok(`Teleported to (${nextX.toFixed(2)}, ${clampedY.toFixed(2)}, ${nextZ.toFixed(2)}).`);
  }

  executeEffect(args: string[]): CommandResult {
    if (args.length !== 2) {
      return fail('Usage: /effect give night_vision');
    }
    const actionRaw = args[0];
    const effectRaw = args[1];
    if (!actionRaw || !effectRaw) {
      return fail('Usage: /effect give night_vision');
    }

    const action = actionRaw.toLowerCase();
    const effectName = effectRaw.toLowerCase();
    if (effectName !== 'night_vision') {
      return fail('Usage: /effect give night_vision');
    }

    if (action === 'give') {
      this.systems.dayNight.setNightVisionEnabled(true);
      return ok('Night vision enabled.');
    }

    if (action === 'clear' || action === 'remove') {
      this.systems.dayNight.setNightVisionEnabled(false);
      return ok('Night vision disabled.');
    }

    return fail('Usage: /effect give night_vision');
  }

  executeBiome(args: string[]): CommandResult {
    if (args.length !== 0) {
      return fail('Usage: /biome');
    }

    const transform = this.ecs.getComponent<{ position: THREE.Vector3 }>(
      this.playerEntityId,
      COMPONENT_TRANSFORM
    );
    if (!transform) return fail('Player transform not found.');
    const biome = this.world.getBiomeAt(transform.position.x, transform.position.z);
    const x = Math.floor(transform.position.x);
    const z = Math.floor(transform.position.z);
    return ok(`Current biome: ${biome} at (${x}, ${z}).`);
  }

  executeGive(args: string[]): CommandResult {
    if (args.length !== 2) {
      return fail('Usage: /give <item> <amount>');
    }

    const item = String(args[0] ?? '').toLowerCase();
    const amount = Math.floor(Number(args[1]));
    if (!isValidBlockType(item) || !Number.isFinite(amount) || amount <= 0) {
      return fail('Usage: /give <item> <amount>');
    }

    if (!this.inventoryState) {
      return fail('Inventory is not available.');
    }

    const remaining = this.inventoryState.addBlock(item, amount);
    const added = amount - remaining;
    if (added <= 0) return fail('Inventory full.');
    if (remaining > 0) return ok(`Gave ${added} ${item}. Inventory full for ${remaining}.`);
    return ok(`Gave ${added} ${item}.`);
  }

  executeGamemode(args: string[]): CommandResult {
    if (args.length !== 1) {
      return fail('Usage: /gamemode survival|spectator');
    }

    const modeRaw = args[0];
    if (!modeRaw) {
      return fail('Usage: /gamemode survival|spectator');
    }
    const mode = modeRaw.toLowerCase();
    if (!isValidGamemode(mode)) {
      return fail('Usage: /gamemode survival|spectator');
    }

    const changed = this.systems.gamemode.setMode(mode);
    if (!changed) {
      return fail('Unable to change gamemode.');
    }
    return ok(`Gamemode set to ${mode}.`);
  }
}
