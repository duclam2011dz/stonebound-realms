import fs from 'node:fs';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader']
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/pages/game.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

const visibility = await page.evaluate(() => {
  const game = window.__game;
  const dayNight = game.systems.dayNight;
  const cycle = dayNight.cycleDurationSeconds;

  dayNight.timeSeconds = cycle * 0.25;
  dayNight.applyToScene(game.ecs.getComponent(game.playerEntityId, 'transform').position);
  const noon = {
    sunVisible: game.renderContext.lighting.sunBody.visible,
    moonVisible: game.renderContext.lighting.moonBody.visible
  };

  dayNight.timeSeconds = cycle * 0.75;
  dayNight.applyToScene(game.ecs.getComponent(game.playerEntityId, 'transform').position);
  const midnight = {
    sunVisible: game.renderContext.lighting.sunBody.visible,
    moonVisible: game.renderContext.lighting.moonBody.visible
  };

  return { noon, midnight };
});

fs.mkdirSync('C:/Users/Admin/.codex/memories/web-sky-visibility', { recursive: true });
fs.writeFileSync(
  'C:/Users/Admin/.codex/memories/web-sky-visibility/visibility.json',
  JSON.stringify(visibility, null, 2)
);
await browser.close();
