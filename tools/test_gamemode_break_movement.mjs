import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const outDir = 'C:/Users/Admin/.codex/memories/web-game-feature-checks';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/game.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

const metrics = [];

const advanceFrames = async (frames) => {
  for (let i = 0; i < frames; i++) {
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

metrics.push({ label: 'initial', state: await readState() });

const spectatorResult = await runCommand('/gamemode spectator');
await advanceFrames(8);
const spectatorState = await readState();
await page.screenshot({ path: path.join(outDir, 'spectator-surface.png'), omitBackground: false });
metrics.push({ label: 'gamemode-spectator', result: spectatorResult, state: spectatorState });

const yBeforeFlyUp = spectatorState?.player?.y ?? 0;
await page.keyboard.down('Space');
await advanceFrames(60);
await page.keyboard.up('Space');
const yAfterFlyUp = (await readState())?.player?.y ?? 0;

await page.keyboard.down('ShiftLeft');
await advanceFrames(60);
await page.keyboard.up('ShiftLeft');
const yAfterFlyDown = (await readState())?.player?.y ?? 0;

metrics.push({
  label: 'spectator-fly',
  yBeforeFlyUp,
  yAfterFlyUp,
  yAfterFlyDown
});

await runCommand('/tp ~ 20 ~');
await advanceFrames(20);
await page.screenshot({
  path: path.join(outDir, 'spectator-underground.png'),
  omitBackground: false
});

const survivalResult = await runCommand('/gamemode survival');

await page.evaluate(() => {
  const game = window.__game;
  const transform = game.ecs.getComponent(game.playerEntityId, 'transform');
  const physics = game.ecs.getComponent(game.playerEntityId, 'physics');
  if (!transform || !physics) return;

  transform.position.set(0.5, 92, 0.5);
  transform.yaw = 0;
  transform.pitch = 0;
  physics.velocity.set(0, 0, 0);
  physics.onGround = false;

  for (let x = -3; x <= 3; x++) {
    for (let y = 88; y <= 95; y++) {
      for (let z = -8; z <= 3; z++) {
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
await page.keyboard.down('KeyW');
await page.keyboard.down('KeyD');
let maxDiagonalSpeed = 0;
for (let i = 0; i < 120; i++) {
  await advanceFrames(1);
  const state = await readState();
  const speed = Math.hypot(state?.player?.velocity?.x ?? 0, state?.player?.velocity?.z ?? 0);
  if (speed > maxDiagonalSpeed) maxDiagonalSpeed = speed;
}
await page.keyboard.up('KeyW');
await page.keyboard.up('KeyD');

metrics.push({
  label: 'survival-diagonal-speed',
  result: survivalResult,
  maxDiagonalSpeed
});

const breakTarget = await page.evaluate(() => {
  const game = window.__game;
  const transform = game.ecs.getComponent(game.playerEntityId, 'transform');
  const physics = game.ecs.getComponent(game.playerEntityId, 'physics');
  if (!transform) return null;

  transform.position.set(0.5, 72, 0.5);
  transform.yaw = 0;
  transform.pitch = 0;
  if (physics) {
    physics.velocity.set(0, 0, 0);
    physics.onGround = false;
  }

  game.world.updateVisibleChunksAround(transform.position, true);
  while (game.world.hasPendingChunkWork()) {
    game.world.processChunkQueue(64, 16);
  }

  const baseX = 0;
  const baseY = 73;
  const baseZ = -3;

  for (let x = baseX - 1; x <= baseX + 1; x++) {
    for (let y = baseY - 1; y <= baseY + 1; y++) {
      for (let z = baseZ - 4; z <= baseZ + 1; z++) {
        game.world.removeBlock(x, y, z);
      }
    }
  }
  game.world.setBlock(baseX, baseY, baseZ, 'stone');
  game.world.rebuildChunksAroundBlock(baseX, baseZ);

  for (let i = 0; i < 10; i++) {
    game.world.processChunkQueue(32, 8);
  }

  for (let i = 0; i < 8; i++) {
    transform.pitch = -0.02 * i;
    game.systems.camera.update(game.ecs, game.playerEntityId, game.renderContext.camera);
    const hit = game.world.raycastFromCamera(
      game.renderContext.camera,
      game.settings.maxRayDistance
    );
    if (hit?.block?.x === baseX && hit?.block?.y === baseY && hit?.block?.z === baseZ) {
      return { x: baseX, y: baseY, z: baseZ };
    }
  }
  return null;
});

if (breakTarget) {
  await page.evaluate(() => {
    const game = window.__game;
    const controller = game.ecs.getComponent(game.playerEntityId, 'controller');
    if (controller) controller.enabled = false;
  });
  await page.evaluate(() => {
    window.__game.input.state.breakHeld = true;
  });
  await advanceFrames(5);
  const stillFilledPartial = await page.evaluate((target) => {
    return window.__game.world.isBlockFilled(target.x, target.y, target.z);
  }, breakTarget);
  await page.screenshot({ path: path.join(outDir, 'break-partial.png'), omitBackground: false });

  await advanceFrames(80);
  const stillFilledAfter = await page.evaluate((target) => {
    return window.__game.world.isBlockFilled(target.x, target.y, target.z);
  }, breakTarget);
  await page.screenshot({ path: path.join(outDir, 'break-complete.png'), omitBackground: false });
  await page.evaluate(() => {
    window.__game.input.state.breakHeld = false;
    const game = window.__game;
    const controller = game.ecs.getComponent(game.playerEntityId, 'controller');
    if (controller) controller.enabled = true;
  });

  metrics.push({
    label: 'break-hold',
    target: breakTarget,
    stillFilledPartial,
    stillFilledAfter
  });
} else {
  metrics.push({
    label: 'break-hold',
    warning: 'No block target found for break test.'
  });
}

fs.writeFileSync(path.join(outDir, 'feature-metrics.json'), JSON.stringify(metrics, null, 2));
await browser.close();
