import fs from "node:fs";
import { chromium } from "playwright";

const outDir = "C:/Users/Admin/.codex/memories/web-gameplay-rd12-inventory";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"]
});
const page = await browser.newPage();
await page.goto("http://127.0.0.1:4173/game.html", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1400);

const metrics = await page.evaluate(() => {
  const game = window.__game;
  if (!game) return { error: "no-game" };

  const advanceFrames = (frames) => {
    for (let i = 0; i < frames; i++) game.advanceTime(1000 / 60);
  };

  const inventory = game.inventoryState;
  const transform = game.ecs.getComponent(game.playerEntityId, "transform");
  const physics = game.ecs.getComponent(game.playerEntityId, "physics");
  const controller = game.ecs.getComponent(game.playerEntityId, "controller");
  if (!transform || !physics || !controller) return { error: "missing-player-components" };

  const clearInventory = () => {
    for (let i = 0; i < inventory.size; i++) {
      inventory.slots[i] = null;
    }
    inventory.nextInsertionIndex = -1;
    inventory.emitChange();
  };

  const scanInventory = () => {
    const result = [];
    for (let i = 0; i < inventory.size; i++) {
      const slot = inventory.getSlot(i);
      if (!slot) continue;
      result.push({ index: i, blockType: slot.blockType, quantity: slot.quantity });
    }
    return result;
  };

  game.settings.renderDistance = 12;
  game.settings.lodStartDistance = 4;
  game.orchestrator.forceChunkSync();
  advanceFrames(240);
  const renderDistanceMetrics = {
    renderDistance: game.settings.renderDistance,
    lodStartDistance: game.settings.lodStartDistance,
    loadedChunks: game.world.storage.loadedChunks.size,
    pendingChunkTasks: game.world.getPendingChunkCount()
  };

  transform.position.set(0.5, 92, 0.5);
  transform.yaw = 0;
  transform.pitch = 0;
  physics.velocity.set(0, 0, 0);
  physics.onGround = false;
  for (let x = -4; x <= 4; x++) {
    for (let y = 88; y <= 95; y++) {
      for (let z = -10; z <= 4; z++) {
        game.world.removeBlock(x, y, z);
      }
    }
  }
  game.world.updateVisibleChunksAround(transform.position, true);
  while (game.world.hasPendingChunkWork()) {
    game.world.processChunkQueue(96, 24);
  }
  game.systems.camera.update(game.ecs, game.playerEntityId, game.renderContext.camera);

  let maxDiagonalSpeed = 0;
  game.input.state.keys.set("KeyW", true);
  game.input.state.keys.set("KeyD", true);
  for (let i = 0; i < 120; i++) {
    game.advanceTime(1000 / 60);
    const speed = Math.hypot(physics.velocity.x, physics.velocity.z);
    if (speed > maxDiagonalSpeed) maxDiagonalSpeed = speed;
  }
  game.input.state.keys.set("KeyW", false);
  game.input.state.keys.set("KeyD", false);

  clearInventory();
  transform.position.set(0.5, 72, 0.5);
  transform.yaw = 0;
  transform.pitch = 0;
  physics.velocity.set(0, 0, 0);
  physics.onGround = false;
  game.world.updateVisibleChunksAround(transform.position, true);
  while (game.world.hasPendingChunkWork()) {
    game.world.processChunkQueue(96, 24);
  }

  for (let x = -1; x <= 1; x++) {
    for (let y = 71; y <= 74; y++) {
      for (let z = -7; z <= 0; z++) {
        game.world.removeBlock(x, y, z);
      }
    }
  }
  game.world.setBlock(0, 73, -3, "stone");
  game.world.setBlock(0, 73, -4, "stone");
  game.world.rebuildChunksAroundBlock(0, -3);
  game.world.rebuildChunksAroundBlock(0, -4);
  while (game.world.hasPendingChunkWork()) {
    game.world.processChunkQueue(96, 24);
  }

  game.systems.camera.update(game.ecs, game.playerEntityId, game.renderContext.camera);
  controller.enabled = false;
  game.input.state.breakHeld = true;
  advanceFrames(8);
  const progressMid = game.systems.targeting.breakState?.progress ?? 0;
  const progressBarRoot = document.getElementById("breakProgress");
  const progressBarFill = document.getElementById("breakProgressFill");
  const breakBarMid = {
    visible: !progressBarRoot?.classList.contains("is-hidden"),
    width: progressBarFill?.style.width ?? ""
  };

  let guard = 0;
  while (game.world.isBlockFilled(0, 73, -3) && guard < 220) {
    advanceFrames(1);
    guard += 1;
  }
  game.input.state.breakHeld = false;
  controller.enabled = true;
  advanceFrames(2);
  const brokeTargetBeforePlace = !game.world.isBlockFilled(0, 73, -3);

  const postBreakInventory = scanInventory();
  const stoneSlot = postBreakInventory.find((slot) => slot.blockType === "stone") ?? null;
  if (stoneSlot && stoneSlot.index < 9) {
    game.hotbar.setSelected(stoneSlot.index);
  }
  transform.yaw = 0;
  transform.pitch = 0;
  game.systems.camera.update(game.ecs, game.playerEntityId, game.renderContext.camera);
  game.input.state.placeRequested = true;
  advanceFrames(1);
  const postPlaceInventory = scanInventory();
  const placedAtHole = game.world.isBlockFilled(0, 73, -3);

  clearInventory();
  inventory.addBlock("grass", 130);
  inventory.addBlock("grass", 10);
  const stackLayout = scanInventory();

  clearInventory();
  inventory.setSlot(5, { blockType: "dirt", quantity: 5 });
  inventory.addBlock("stone", 1);
  const insertionOrderLayout = scanInventory();
  const insertedStoneSlot = insertionOrderLayout.find((slot) => slot.blockType === "stone")?.index ?? -1;

  const centerX = 0;
  const centerZ = 0;
  const range = 26;
  const yMin = 8;
  const yMax = 68;
  const sx = range * 2 + 1;
  const sy = yMax - yMin + 1;
  const sz = range * 2 + 1;
  const volume = sx * sy * sz;
  const air = new Uint8Array(volume);
  const visited = new Uint8Array(volume);
  const indexAt = (lx, ly, lz) => lx + ly * sx + lz * sx * sy;

  let caveAirCount = 0;
  let sampledCells = 0;
  let smallCount = 0;
  let mediumCount = 0;
  let largeCount = 0;

  for (let lz = 0; lz < sz; lz++) {
    for (let lx = 0; lx < sx; lx++) {
      const wx = centerX + lx - range;
      const wz = centerZ + lz - range;
      const surfaceY = game.world.terrain.getHeight(wx, wz);
      for (let ly = 0; ly < sy; ly++) {
        const wy = yMin + ly;
        if (wy >= surfaceY - 4) continue;
        sampledCells += 1;
        const idx = indexAt(lx, ly, lz);
        if (game.world.storage.isBlockFilled(wx, wy, wz)) continue;
        air[idx] = 1;
        caveAirCount += 1;
      }
    }
  }

  const neighborOffsets = [
    [1, 0, 0], [-1, 0, 0],
    [0, 1, 0], [0, -1, 0],
    [0, 0, 1], [0, 0, -1]
  ];
  let largestComponent = 0;
  let componentCount = 0;
  const queue = new Int32Array(volume);

  for (let idx = 0; idx < volume; idx++) {
    if (!air[idx] || visited[idx]) continue;
    componentCount += 1;
    let qHead = 0;
    let qTail = 0;
    queue[qTail++] = idx;
    visited[idx] = 1;
    let size = 0;

    while (qHead < qTail) {
      const current = queue[qHead++];
      size += 1;
      const lz = Math.floor(current / (sx * sy));
      const rem = current - lz * sx * sy;
      const ly = Math.floor(rem / sx);
      const lx = rem - ly * sx;

      let openNeighbors = 0;
      for (const [dx, dy, dz] of neighborOffsets) {
        const nx = lx + dx;
        const ny = ly + dy;
        const nz = lz + dz;
        if (nx < 0 || nx >= sx || ny < 0 || ny >= sy || nz < 0 || nz >= sz) continue;
        const nIndex = indexAt(nx, ny, nz);
        if (!air[nIndex]) continue;
        openNeighbors += 1;
        if (visited[nIndex]) continue;
        visited[nIndex] = 1;
        queue[qTail++] = nIndex;
      }

      if (openNeighbors <= 2) smallCount += 1;
      else if (openNeighbors <= 4) mediumCount += 1;
      else largeCount += 1;
    }

    if (size > largestComponent) largestComponent = size;
  }

  return {
    renderDistanceMetrics,
    maxDiagonalSpeed,
    breakProgressMid: progressMid,
    breakBarMid,
    brokeTargetBlock: brokeTargetBeforePlace,
    inventoryAfterBreak: postBreakInventory,
    placedAtHole,
    inventoryAfterPlace: postPlaceInventory,
    stackLayout,
    insertionOrderLayout,
    insertedStoneSlot,
    caveMetrics: {
      sampledCells,
      caveAirCount,
      caveAirRatio: sampledCells > 0 ? caveAirCount / sampledCells : 0,
      largestComponent,
      componentCount,
      widthBuckets: {
        small: smallCount,
        medium: mediumCount,
        large: largeCount
      }
    }
  };
});

fs.writeFileSync(`${outDir}/metrics.json`, JSON.stringify(metrics, null, 2));
await browser.close();
