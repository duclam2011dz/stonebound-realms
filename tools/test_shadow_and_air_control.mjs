import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const outDir = 'f:/hobby game (vibe cođing)/output/shadow-air-control';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/game.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

const runCommand = async (command) =>
  page.evaluate((text) => window.execute_game_command?.(text), command);
const advance = async (ms) => page.evaluate((deltaMs) => window.advanceTime?.(deltaMs), ms);

await runCommand('/time set day');
await advance(1000);

const setShadowScenario = async (mode) =>
  page.evaluate((scenarioMode) => {
    const game = window.__game;
    if (!game) return null;
    const world = game.world;
    const dayNight = game.systems.dayNight;
    const state = JSON.parse(window.render_game_to_text?.() ?? '{}');
    const player = state.player;
    if (!player) return null;

    const px = Math.floor(player.x);
    const py = Math.floor(player.y);
    const pz = Math.floor(player.z);

    const clearRange = () => {
      for (let dz = -3; dz <= 3; dz++) {
        for (let dx = -3; dx <= 3; dx++) {
          for (let dy = 1; dy <= 8; dy++) {
            world.removeBlock(px + dx, py + dy, pz + dz);
          }
        }
      }
    };

    const buildOverhead = () => {
      world.setBlock(px, py + 3, pz, 'stone');
    };

    const buildFrontWall = () => {
      const sunDir = dayNight.sunDirection;
      const stepX = Math.abs(sunDir.x) >= Math.abs(sunDir.z) ? Math.sign(sunDir.x || 1) : 0;
      const stepZ = stepX === 0 ? Math.sign(sunDir.z || 1) : 0;
      const baseX = px + stepX * 2;
      const baseZ = pz + stepZ * 2;
      for (let h = 0; h <= 4; h++) {
        world.setBlock(baseX, py + h, baseZ, 'stone');
        world.setBlock(baseX + stepZ, py + h, baseZ + stepX, 'stone');
        world.setBlock(baseX - stepZ, py + h, baseZ - stepX, 'stone');
      }
    };

    const buildCavePocket = () => {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          world.setBlock(px + dx, py + 3, pz + dz, 'stone');
        }
      }
      for (let dy = 0; dy <= 3; dy++) {
        for (let i = -2; i <= 2; i++) {
          world.setBlock(px - 2, py + dy, pz + i, 'stone');
          world.setBlock(px + 2, py + dy, pz + i, 'stone');
          world.setBlock(px + i, py + dy, pz - 2, 'stone');
          world.setBlock(px + i, py + dy, pz + 2, 'stone');
        }
      }
    };

    clearRange();
    if (scenarioMode === 'overhead') buildOverhead();
    if (scenarioMode === 'front') buildFrontWall();
    if (scenarioMode === 'both') {
      buildOverhead();
      buildFrontWall();
    }
    if (scenarioMode === 'cave') buildCavePocket();

    const sunInfo = world.getSunOcclusionAt(
      player.x,
      player.y + 1.6,
      player.z,
      dayNight.sunDirection
    );
    return {
      scenarioMode,
      sunInfo,
      sunIntensity: dayNight.lighting.sunLight.intensity,
      ambientIntensity: dayNight.lighting.ambientLight.intensity,
      hemisphereIntensity: dayNight.lighting.hemisphereLight.intensity
    };
  }, mode);

const scenarios = ['open', 'overhead', 'front', 'both', 'cave'];
const shadowMetrics = {};
for (const scenario of scenarios) {
  shadowMetrics[scenario] = await setShadowScenario(scenario);
  await advance(320);
  shadowMetrics[scenario] = await setShadowScenario(scenario);
  await page.screenshot({
    path: path.join(outDir, `shadow-${scenario}.png`),
    omitBackground: false
  });
}

await setShadowScenario('open');
await advance(200);
await page.evaluate(() => {
  const game = window.__game;
  if (!game) return;
  const world = game.world;
  const transform = game.ecs.getComponent(game.playerEntityId, 'transform');
  const physics = game.ecs.getComponent(game.playerEntityId, 'physics');
  if (!transform || !physics) return;

  const baseX = Math.floor(transform.position.x);
  const baseZ = Math.floor(transform.position.z);
  const floorY = world.terrain.getHeight(baseX, baseZ);

  for (let dz = -7; dz <= 7; dz++) {
    for (let dx = -7; dx <= 7; dx++) {
      for (let dy = 0; dy <= 10; dy++) {
        world.removeBlock(baseX + dx, floorY + dy, baseZ + dz);
      }
      world.setBlock(baseX + dx, floorY - 1, baseZ + dz, 'stone');
    }
  }

  transform.position.set(baseX + 0.5, floorY, baseZ + 0.5);
  physics.velocity.set(0, 0, 0);
  physics.onGround = false;
});
await advance(180);
await page.evaluate(() => {
  const input = window.__game?.input?.state;
  if (!input) return;
  input.keys.set('KeyW', true);
  input.keys.set('Space', false);
});
await advance(280);
await page.evaluate(() => {
  const input = window.__game?.input?.state;
  if (!input) return;
  input.keys.set('Space', true);
});
await advance(130);
await page.evaluate(() => {
  const input = window.__game?.input?.state;
  if (!input) return;
  input.keys.set('Space', false);
});
await advance(90);
const beforeRelease = await page.evaluate(() => {
  const state = JSON.parse(window.render_game_to_text?.() ?? '{}');
  const v = state.player?.velocity ?? { x: 0, z: 0 };
  return {
    onGround: Boolean(state.player?.onGround),
    speed: Math.hypot(v.x, v.z)
  };
});
await page.evaluate(() => {
  const input = window.__game?.input?.state;
  if (!input) return;
  input.keys.set('KeyW', false);
});
await advance(260);
const afterRelease = await page.evaluate(() => {
  const state = JSON.parse(window.render_game_to_text?.() ?? '{}');
  const v = state.player?.velocity ?? { x: 0, z: 0 };
  return {
    onGround: Boolean(state.player?.onGround),
    speed: Math.hypot(v.x, v.z)
  };
});
await page.evaluate(() => {
  const input = window.__game?.input?.state;
  if (!input) return;
  input.keys.set('KeyW', false);
  input.keys.set('Space', false);
});
await page.screenshot({ path: path.join(outDir, 'air-control.png'), omitBackground: false });

const metrics = {
  shadowMetrics,
  airControl: {
    beforeRelease,
    afterRelease
  }
};
fs.writeFileSync(path.join(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
await browser.close();
