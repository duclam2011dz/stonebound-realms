import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const outDir = 'f:/hobby game (vibe cođing)/output/commands-biome-give-lighting';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/game.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1400);

const runCommand = async (command) =>
  page.evaluate((text) => {
    if (typeof window.execute_game_command !== 'function') {
      return { handled: false, ok: false, message: 'No command bridge' };
    }
    return window.execute_game_command(text);
  }, command);

const readState = async () => {
  const text = await page.evaluate(() => window.render_game_to_text?.() ?? '{}');
  try {
    return JSON.parse(text);
  } catch {
    return { parseError: true, text };
  }
};

const readLighting = async () =>
  page.evaluate(() => {
    const stateText = window.render_game_to_text?.() ?? '{}';
    const state = JSON.parse(stateText);
    const game = window.__game;
    const p = state.player ?? { x: 0, y: 0, z: 0 };
    const world = game?.world;
    const lighting = game?.systems?.dayNight?.lighting;

    return {
      player: p,
      hasSkyAccess: world?.hasSkyAccessAt?.(p.x, p.y + 1.6, p.z) ?? null,
      skyExposure: world?.getSkyExposureAt?.(p.x, p.y + 1.6, p.z, 56) ?? null,
      sunlight: lighting?.sunLight?.intensity ?? null,
      moonlight: lighting?.moonLight?.intensity ?? null,
      ambient: lighting?.ambientLight?.intensity ?? null,
      hemisphere: lighting?.hemisphereLight?.intensity ?? null
    };
  });

const findOpenSkyPosition = async () =>
  page.evaluate(() => {
    const game = window.__game;
    const world = game?.world;
    const stateText = window.render_game_to_text?.() ?? '{}';
    const state = JSON.parse(stateText);
    const p = state.player ?? { x: 0, z: 0 };
    if (!world?.terrain) return null;

    const baseX = Math.floor(p.x);
    const baseZ = Math.floor(p.z);
    for (let radius = 0; radius <= 48; radius += 1) {
      for (let dz = -radius; dz <= radius; dz++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
          const x = baseX + dx;
          const z = baseZ + dz;
          const y = world.terrain.getHeight(x, z) + 2;
          if (!world.hasSkyAccessAt(x + 0.5, y + 0.2, z + 0.5)) continue;
          return { x: x + 0.5, y, z: z + 0.5 };
        }
      }
    }
    return null;
  });

const result = {
  commands: {},
  snapshots: {},
  biomeCounts: {}
};

result.commands.biome = await runCommand('/biome');
result.commands.giveSand70 = await runCommand('/give sand 70');
result.commands.giveDirt10 = await runCommand('/give dirt 10');
result.commands.giveSand10 = await runCommand('/give sand 10');
result.commands.giveInvalid = await runCommand('/give invalid_item 5');
await page.evaluate(() => window.advanceTime?.(400));
result.snapshots.afterGive = await readState();
await page.screenshot({ path: path.join(outDir, 'after-give.png'), omitBackground: false });

await runCommand('/effect clear night_vision');
await runCommand('/time set day');
await page.evaluate(() => window.advanceTime?.(1000));
const openSky = await findOpenSkyPosition();
if (openSky) {
  await runCommand(`/tp ${openSky.x.toFixed(2)} ${openSky.y.toFixed(2)} ${openSky.z.toFixed(2)}`);
  await page.evaluate(() => window.advanceTime?.(300));
}
result.snapshots.openSkyPosition = openSky;
result.snapshots.surfaceLighting = await readLighting();
await page.screenshot({ path: path.join(outDir, 'day-surface.png'), omitBackground: false });

await runCommand('/tp ~ 12 ~');
await page.evaluate(() => window.advanceTime?.(300));
result.snapshots.undergroundLighting = await readLighting();
await page.screenshot({ path: path.join(outDir, 'day-underground.png'), omitBackground: false });

result.biomeCounts = await page.evaluate(() => {
  const game = window.__game;
  const world = game?.world;
  const counts = {};
  if (!world) return counts;

  for (let z = -512; z <= 512; z += 64) {
    for (let x = -512; x <= 512; x += 64) {
      const biome = world.getBiomeAt(x, z);
      counts[biome] = (counts[biome] ?? 0) + 1;
    }
  }
  return counts;
});

fs.writeFileSync(path.join(outDir, 'metrics.json'), JSON.stringify(result, null, 2));
await browser.close();
