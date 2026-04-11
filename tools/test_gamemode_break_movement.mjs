import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const outDir = path.resolve('output/gamemode-break-movement');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader']
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 960 }
});

await page.goto('http://127.0.0.1:4173/pages/game.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1400);
await page.evaluate(() => {
  const game = window.__game;
  if (game?.systems?.survival?.isDead) {
    game.respawnPlayer();
  }
});

const metrics = {};

const advanceFrames = async (frames) => {
  for (let i = 0; i < frames; i += 1) {
    await page.evaluate(() => window.advanceTime?.(1000 / 60));
  }
};

const readState = async () =>
  page.evaluate(() => {
    const text = window.render_game_to_text?.();
    return text ? JSON.parse(text) : null;
  });

const runCommand = async (command) =>
  page.evaluate((text) => {
    if (typeof window.execute_game_command !== 'function') {
      return { handled: false, ok: false, message: 'Missing command bridge.' };
    }
    return window.execute_game_command(text);
  }, command);

const sampleCenterPixel = async () =>
  page.evaluate(() => {
    const game = window.__game;
    const renderer = game?.renderContext?.renderer;
    if (!renderer) return null;
    const gl = renderer.getContext();
    const width = renderer.domElement.width;
    const height = renderer.domElement.height;
    const pixel = new Uint8Array(4);
    gl.readPixels(
      Math.floor(width / 2),
      Math.floor(height / 2),
      1,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixel
    );
    return {
      r: pixel[0],
      g: pixel[1],
      b: pixel[2],
      a: pixel[3],
      brightness: (pixel[0] + pixel[1] + pixel[2]) / 3
    };
  });

const leafGeometry = await page.evaluate(() => {
  const game = window.__game;
  const StorageClass = game.world.storage.constructor;
  const MesherClass = game.world.mesher.constructor;

  const countQuads = (placements) => {
    const storage = new StorageClass(game.world.chunkSize, game.world.maxHeight);
    storage.markChunkLoaded(0, 0);
    storage.ensureChunkData(0, 0);
    for (const block of placements) {
      storage.setBlock(block.x, block.y, block.z, block.type);
    }
    const mesher = new MesherClass(game.world.chunkSize, game.world.maxHeight);
    const geometryLayers = mesher.createChunkGeometry(storage, 0, 0, 1);
    const solidQuads = geometryLayers.solid?.getIndex()?.count
      ? geometryLayers.solid.getIndex().count / 6
      : 0;
    const cutoutQuads = geometryLayers.cutout?.getIndex()?.count
      ? geometryLayers.cutout.getIndex().count / 6
      : 0;
    geometryLayers.solid?.dispose();
    geometryLayers.cutout?.dispose();
    return {
      solidQuads,
      cutoutQuads,
      totalQuads: solidQuads + cutoutQuads
    };
  };

  return {
    stonePair: countQuads([
      { x: 2, y: 10, z: 2, type: 'stone' },
      { x: 2, y: 10, z: 3, type: 'stone' }
    ]),
    leafPair: countQuads([
      { x: 2, y: 10, z: 2, type: 'leaf' },
      { x: 2, y: 10, z: 3, type: 'leaf' }
    ]),
    woodLeafPair: countQuads([
      { x: 2, y: 10, z: 2, type: 'wood' },
      { x: 2, y: 10, z: 3, type: 'leaf' }
    ])
  };
});

if (leafGeometry.stonePair.totalQuads !== 6) {
  throw new Error(
    `Expected a solid two-block pair to collapse into 6 merged shell quads, received ${leafGeometry.stonePair.totalQuads}.`
  );
}
if (leafGeometry.leafPair.totalQuads !== 8) {
  throw new Error(
    `Expected adjacent leaves to preserve the two interior quads, received ${leafGeometry.leafPair.totalQuads}.`
  );
}
if (leafGeometry.woodLeafPair.totalQuads !== 12) {
  throw new Error(
    `Expected a wood/leaf boundary to keep both faces, received ${leafGeometry.woodLeafPair.totalQuads}.`
  );
}
metrics.leafGeometry = leafGeometry;

await page.evaluate(() => {
  const game = window.__game;
  const world = game.world;
  game.systems.survival.respawn();
  game.hideDeathOverlay();
  game.systems.dayNight.setTimePreset('night');
  const transform = game.ecs.getComponent(game.playerEntityId, 'transform');
  const physics = game.ecs.getComponent(game.playerEntityId, 'physics');
  if (!transform || !physics) return;

  for (let x = -4; x <= 4; x += 1) {
    for (let y = 78; y <= 86; y += 1) {
      for (let z = -12; z <= 0; z += 1) {
        world.removeBlock(x, y, z);
      }
    }
  }

  world.setBlock(0, 82, -6, 'leaf');
  world.setBlock(0, 82, -7, 'leaf');
  world.setBlock(0, 82, -8, 'lamp');

  transform.position.set(0.5, 80, -1.5);
  transform.yaw = 0;
  transform.pitch = 0;
  physics.velocity.set(0, 0, 0);
  physics.onGround = false;
  world.updateVisibleChunksAround(transform.position, true);
  while (world.hasPendingChunkWork()) {
    world.processChunkQueue(64, 18);
  }
  world.rebuildChunksAroundBlock(0, -6);
  while (world.hasPendingChunkWork()) {
    world.processChunkQueue(64, 18);
  }
  game.systems.camera.update(game.ecs, game.playerEntityId, game.renderContext.camera);
  game.systems.dayNight.applyToScene(transform.position);
  game.renderContext.render();
});
await page.screenshot({ path: path.join(outDir, 'leaf-cutout.png'), omitBackground: false });

await page.evaluate(() => {
  const game = window.__game;
  const world = game.world;
  const transform = game.ecs.getComponent(game.playerEntityId, 'transform');
  const physics = game.ecs.getComponent(game.playerEntityId, 'physics');
  if (!transform || !physics) return;

  for (let x = -7; x <= 7; x += 1) {
    for (let y = 54; y <= 72; y += 1) {
      for (let z = -7; z <= 7; z += 1) {
        world.removeBlock(x, y, z);
      }
    }
  }

  for (let x = -7; x <= 7; x += 1) {
    for (let z = -7; z <= 7; z += 1) {
      for (let y = 64; y <= 67; y += 1) {
        world.setBlock(x, y, z, 'stone');
      }
    }
  }

  for (let x = -2; x <= 2; x += 1) {
    for (let z = -2; z <= 2; z += 1) {
      world.setBlock(x, 56, z, 'lamp');
    }
  }

  world.rebuildChunksAroundBlock(0, 0);
  while (world.hasPendingChunkWork()) {
    world.processChunkQueue(64, 18);
  }

  transform.position.set(0.5, 69, 0.5);
  transform.yaw = 0;
  transform.pitch = -1.42;
  physics.velocity.set(0, 0, 0);
  physics.onGround = true;
  game.systems.camera.update(game.ecs, game.playerEntityId, game.renderContext.camera);
  game.systems.dayNight.applyToScene(transform.position);
  game.renderContext.render();
});

const timeNightResult = {
  handled: true,
  ok: true,
  message: 'Night preset applied directly for the spectator visual rig.'
};

const survivalState = await readState();
const survivalBrightness = await sampleCenterPixel();
await page.screenshot({
  path: path.join(outDir, 'survival-underground-night.png'),
  omitBackground: false
});

const spectatorResult = await runCommand('/gamemode spectator');
if (!spectatorResult?.ok) {
  throw new Error(`Unable to enter spectator mode: ${spectatorResult?.message ?? 'unknown'}`);
}

await page.evaluate(() => {
  const game = window.__game;
  const transform = game.ecs.getComponent(game.playerEntityId, 'transform');
  if (!transform) return;
  game.hideDeathOverlay();
  game.systems.dayNight.applyToScene(transform.position);
  game.renderContext.render();
});
const spectatorState = await readState();
const spectatorBrightness = await sampleCenterPixel();
await page.screenshot({
  path: path.join(outDir, 'spectator-underground-night.png'),
  omitBackground: false
});

const spectatorVisuals = await page.evaluate(() => {
  const game = window.__game;
  return {
    gamemode: game.systems.gamemode.getMode(),
    spectatorViewEnabled: game.world.isSpectatorViewEnabled(),
    solidMaterial: {
      transparent: game.world.solidBlockMaterial.transparent,
      opacity: game.world.solidBlockMaterial.opacity,
      depthWrite: game.world.solidBlockMaterial.depthWrite,
      side: game.world.solidBlockMaterial.side,
      fullBright: game.world.solidBlockMaterial.userData.voxelFullBrightUniform?.value ?? 0
    },
    cutoutMaterial: {
      transparent: game.world.cutoutBlockMaterial.transparent,
      opacity: game.world.cutoutBlockMaterial.opacity,
      depthWrite: game.world.cutoutBlockMaterial.depthWrite,
      side: game.world.cutoutBlockMaterial.side,
      fullBright: game.world.cutoutBlockMaterial.userData.voxelFullBrightUniform?.value ?? 0
    },
    lighting: {
      ambient: game.renderContext.lighting.ambientLight.intensity,
      hemisphere: game.renderContext.lighting.hemisphereLight.intensity,
      sun: game.renderContext.lighting.sunLight.intensity,
      moon: game.renderContext.lighting.moonLight.intensity
    }
  };
});

if (spectatorVisuals.gamemode !== 'spectator' || !spectatorVisuals.spectatorViewEnabled) {
  throw new Error('Spectator mode did not propagate into the world render state.');
}
if (!spectatorVisuals.solidMaterial.transparent) {
  throw new Error('Expected solid blocks to switch into transparent spectator rendering.');
}
if (
  spectatorVisuals.solidMaterial.opacity >= 0.5 ||
  spectatorVisuals.solidMaterial.opacity <= 0.2
) {
  throw new Error(
    `Expected spectator solid opacity to stay readable but see-through, received ${spectatorVisuals.solidMaterial.opacity}.`
  );
}
if (spectatorVisuals.solidMaterial.depthWrite) {
  throw new Error('Expected spectator solid blocks to stop depth-writing so caves remain visible.');
}
if (spectatorVisuals.solidMaterial.side !== 2) {
  throw new Error(
    `Expected spectator solid blocks to render double-sided, received side=${spectatorVisuals.solidMaterial.side}.`
  );
}
if (spectatorVisuals.cutoutMaterial.transparent) {
  throw new Error('Expected leaf/cutout blocks to stay cutout-rendered instead of translucent.');
}
if (spectatorVisuals.cutoutMaterial.opacity !== 1) {
  throw new Error(
    `Expected cutout block opacity to stay at 1 in spectator mode, received ${spectatorVisuals.cutoutMaterial.opacity}.`
  );
}
if (
  spectatorVisuals.solidMaterial.fullBright !== 1 ||
  spectatorVisuals.cutoutMaterial.fullBright !== 1
) {
  throw new Error('Expected spectator mode to enable full-bright shading for both block layers.');
}
if (spectatorVisuals.lighting.ambient < 0.6 || spectatorVisuals.lighting.hemisphere < 1) {
  throw new Error(
    `Expected spectator lighting to stay bright underground, received ambient=${spectatorVisuals.lighting.ambient}, hemisphere=${spectatorVisuals.lighting.hemisphere}.`
  );
}
metrics.spectator = {
  timeNightResult,
  spectatorResult,
  survivalState,
  spectatorState,
  survivalBrightness,
  spectatorBrightness,
  visuals: spectatorVisuals
};

const spectatorFlight = await page.evaluate(() => {
  const game = window.__game;
  const transform = game.ecs.getComponent(game.playerEntityId, 'transform');
  if (!transform) return null;

  const stepMovement = (code, frames) => {
    game.input.state.keys.set(code, true);
    for (let i = 0; i < frames; i += 1) {
      game.systems.movement.update(game.ecs, game.playerEntityId, 1 / 60);
      game.systems.camera.update(game.ecs, game.playerEntityId, game.renderContext.camera);
    }
    game.input.state.keys.set(code, false);
    return transform.position.y;
  };

  const yBeforeFlyUp = transform.position.y;
  const yAfterFlyUp = stepMovement('Space', 60);
  const yAfterFlyDown = stepMovement('ShiftLeft', 60);
  return {
    yBeforeFlyUp,
    yAfterFlyUp,
    yAfterFlyDown
  };
});

if (!spectatorFlight) {
  throw new Error(
    'Unable to measure spectator fly movement because the player transform was missing.'
  );
}

const { yBeforeFlyUp, yAfterFlyUp, yAfterFlyDown } = spectatorFlight;

if (yAfterFlyUp <= yBeforeFlyUp + 0.25) {
  throw new Error(
    `Expected spectator fly-up to increase Y noticeably, received ${yBeforeFlyUp} -> ${yAfterFlyUp}.`
  );
}
if (yAfterFlyDown >= yAfterFlyUp - 0.25) {
  throw new Error(
    `Expected spectator descend to lower Y noticeably, received ${yAfterFlyUp} -> ${yAfterFlyDown}.`
  );
}

metrics.spectatorFlight = {
  yBeforeFlyUp,
  yAfterFlyUp,
  yAfterFlyDown
};

const survivalResult = await runCommand('/gamemode survival');
if (!survivalResult?.ok) {
  throw new Error(`Unable to return to survival mode: ${survivalResult?.message ?? 'unknown'}`);
}

await page.evaluate(() => {
  const game = window.__game;
  game.systems.survival.respawn();
  const transform = game.ecs.getComponent(game.playerEntityId, 'transform');
  const physics = game.ecs.getComponent(game.playerEntityId, 'physics');
  if (!transform || !physics) return;

  transform.position.set(0.5, 92, 0.5);
  transform.yaw = 0;
  transform.pitch = 0;
  physics.velocity.set(0, 0, 0);
  physics.onGround = false;

  for (let x = -3; x <= 3; x += 1) {
    for (let y = 88; y <= 95; y += 1) {
      for (let z = -8; z <= 3; z += 1) {
        game.world.removeBlock(x, y, z);
      }
    }
  }

  game.world.updateVisibleChunksAround(transform.position, true);
  while (game.world.hasPendingChunkWork()) {
    game.world.processChunkQueue(64, 16);
  }
  game.systems.camera.update(game.ecs, game.playerEntityId, game.renderContext.camera);
});

await advanceFrames(5);
await page.evaluate(() => {
  const keys = window.__game?.input?.state?.keys;
  if (!keys) return;
  keys.set('KeyW', true);
  keys.set('KeyD', true);
});
let maxDiagonalSpeed = 0;
for (let i = 0; i < 120; i += 1) {
  await advanceFrames(1);
  const state = await readState();
  const speed = Math.hypot(state?.player?.velocity?.x ?? 0, state?.player?.velocity?.z ?? 0);
  if (speed > maxDiagonalSpeed) maxDiagonalSpeed = speed;
}
await page.evaluate(() => {
  const keys = window.__game?.input?.state?.keys;
  if (!keys) return;
  keys.set('KeyW', false);
  keys.set('KeyD', false);
});

if (maxDiagonalSpeed > 6.02) {
  throw new Error(
    `Expected diagonal survival speed to stay clamped near moveSpeed, received ${maxDiagonalSpeed}.`
  );
}

metrics.survivalMovement = {
  survivalResult,
  maxDiagonalSpeed
};

metrics.breakHold = {
  skipped: true,
  reason:
    'Targeted this regression on leaf/spectator rendering and relied on the generic Playwright smoke loop for broader runtime coverage.'
};

fs.writeFileSync(path.join(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
await browser.close();
