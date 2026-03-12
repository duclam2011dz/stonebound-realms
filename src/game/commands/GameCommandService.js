import { COMPONENT_PHYSICS, COMPONENT_TRANSFORM } from "../../ecs/components.js";
import { isValidBlockType } from "../../world/services/BlockPalette.js";
import { isValidGamemode } from "../gamemode/gameModes.js";
import { parseRelativeCoordinate } from "./parseRelativeCoordinate.js";

function ok(message) {
  return { handled: true, ok: true, message };
}

function fail(message) {
  return { handled: true, ok: false, message };
}

export class GameCommandService {
  constructor({ ecs, playerEntityId, systems, world, camera, inventoryState }) {
    this.ecs = ecs;
    this.playerEntityId = playerEntityId;
    this.systems = systems;
    this.world = world;
    this.camera = camera;
    this.inventoryState = inventoryState;
  }

  execute(rawCommandText) {
    const text = String(rawCommandText ?? "").trim();
    if (!text.startsWith("/")) return { handled: false };
    const parts = text.slice(1).split(/\s+/).filter(Boolean);
    if (!parts.length) return fail("Command not found.");

    const command = parts[0].toLowerCase();
    if (command === "time") return this.executeTime(parts.slice(1));
    if (command === "tp") return this.executeTeleport(parts.slice(1));
    if (command === "effect") return this.executeEffect(parts.slice(1));
    if (command === "biome") return this.executeBiome(parts.slice(1));
    if (command === "give") return this.executeGive(parts.slice(1));
    if (command === "gamemode") return this.executeGamemode(parts.slice(1));
    return { handled: false };
  }

  executeTime(args) {
    if (args.length !== 2 || args[0].toLowerCase() !== "set") {
      return fail("Usage: /time set day|night");
    }

    const mode = args[1].toLowerCase();
    if (mode !== "day" && mode !== "night") {
      return fail("Usage: /time set day|night");
    }

    this.systems.dayNight.setTimePreset(mode);
    return ok(`Time set to ${mode}.`);
  }

  executeTeleport(args) {
    if (args.length !== 3) {
      return fail("Usage: /tp <x> <y> <z>");
    }

    const transform = this.ecs.getComponent(this.playerEntityId, COMPONENT_TRANSFORM);
    const physics = this.ecs.getComponent(this.playerEntityId, COMPONENT_PHYSICS);
    if (!transform) return fail("Player transform not found.");

    const nextX = parseRelativeCoordinate(args[0], transform.position.x);
    const nextY = parseRelativeCoordinate(args[1], transform.position.y);
    const nextZ = parseRelativeCoordinate(args[2], transform.position.z);
    if (![nextX, nextY, nextZ].every(Number.isFinite)) {
      return fail("Usage: /tp <x> <y> <z>");
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

  executeEffect(args) {
    if (args.length !== 2) {
      return fail("Usage: /effect give night_vision");
    }

    const action = args[0].toLowerCase();
    const effectName = args[1].toLowerCase();
    if (effectName !== "night_vision") {
      return fail("Usage: /effect give night_vision");
    }

    if (action === "give") {
      this.systems.dayNight.setNightVisionEnabled(true);
      return ok("Night vision enabled.");
    }

    if (action === "clear" || action === "remove") {
      this.systems.dayNight.setNightVisionEnabled(false);
      return ok("Night vision disabled.");
    }

    return fail("Usage: /effect give night_vision");
  }

  executeBiome(args) {
    if (args.length !== 0) {
      return fail("Usage: /biome");
    }

    const transform = this.ecs.getComponent(this.playerEntityId, COMPONENT_TRANSFORM);
    if (!transform) return fail("Player transform not found.");
    const biome = this.world.getBiomeAt(transform.position.x, transform.position.z);
    const x = Math.floor(transform.position.x);
    const z = Math.floor(transform.position.z);
    return ok(`Current biome: ${biome} at (${x}, ${z}).`);
  }

  executeGive(args) {
    if (args.length !== 2) {
      return fail("Usage: /give <item> <amount>");
    }

    const item = String(args[0] ?? "").toLowerCase();
    const amount = Math.floor(Number(args[1]));
    if (!isValidBlockType(item) || !Number.isFinite(amount) || amount <= 0) {
      return fail("Usage: /give <item> <amount>");
    }

    if (!this.inventoryState) {
      return fail("Inventory is not available.");
    }

    const remaining = this.inventoryState.addBlock(item, amount);
    const added = amount - remaining;
    if (added <= 0) return fail("Inventory full.");
    if (remaining > 0) return ok(`Gave ${added} ${item}. Inventory full for ${remaining}.`);
    return ok(`Gave ${added} ${item}.`);
  }

  executeGamemode(args) {
    if (args.length !== 1) {
      return fail("Usage: /gamemode survival|spectator");
    }

    const mode = args[0].toLowerCase();
    if (!isValidGamemode(mode)) {
      return fail("Usage: /gamemode survival|spectator");
    }

    const changed = this.systems.gamemode.setMode(mode);
    if (!changed) {
      return fail("Unable to change gamemode.");
    }
    return ok(`Gamemode set to ${mode}.`);
  }
}
