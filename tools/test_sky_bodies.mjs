import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const outDir = 'C:/Users/Admin/.codex/memories/web-game-sky';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/pages/game.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

const runCommand = async (command) =>
  page.evaluate((text) => window.execute_game_command?.(text) ?? null, command);

await page.evaluate(() => {
  const game = window.__game;
  const transform = game?.ecs?.getComponent?.(game.playerEntityId, 'transform');
  if (transform) {
    transform.pitch = 1.25;
    transform.yaw = 0;
  }
});

await runCommand('/time set day');
await page.evaluate(() => window.advanceTime?.(1200));
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(outDir, 'day-sky.png'), omitBackground: false });

await runCommand('/time set night');
await page.evaluate(() => window.advanceTime?.(1200));
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(outDir, 'night-sky.png'), omitBackground: false });

await browser.close();
