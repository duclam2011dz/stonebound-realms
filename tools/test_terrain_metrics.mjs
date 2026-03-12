import fs from "node:fs";
import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"]
});
const page = await browser.newPage();
await page.goto("http://127.0.0.1:4173/game.html", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);

const metrics = await page.evaluate(() => {
  const game = window.__game;
  if (!game) return { error: "no game" };
  const transform = game.ecs.getComponent(game.playerEntityId, "transform");
  const px = Math.floor(transform.position.x);
  const pz = Math.floor(transform.position.z);

  let minHeight = Number.POSITIVE_INFINITY;
  let maxHeight = Number.NEGATIVE_INFINITY;
  let caveAirBlocks = 0;
  let sampledUndergroundBlocks = 0;

  for (let dz = -24; dz <= 24; dz++) {
    for (let dx = -24; dx <= 24; dx++) {
      const x = px + dx;
      const z = pz + dz;
      const top = game.world.terrain.getHeight(x, z);
      minHeight = Math.min(minHeight, top);
      maxHeight = Math.max(maxHeight, top);

      const caveTop = Math.max(8, top - 4);
      for (let y = 8; y < caveTop; y++) {
        sampledUndergroundBlocks += 1;
        if (!game.world.storage.isBlockFilled(x, y, z)) {
          caveAirBlocks += 1;
        }
      }
    }
  }

  return {
    center: { x: px, z: pz },
    minHeight,
    maxHeight,
    caveAirBlocks,
    sampledUndergroundBlocks,
    caveAirRatio: sampledUndergroundBlocks > 0 ? caveAirBlocks / sampledUndergroundBlocks : 0,
    worldMaxHeight: game.world.getMaxHeight()
  };
});

fs.mkdirSync("C:/Users/Admin/.codex/memories/web-terrain-metrics", { recursive: true });
fs.writeFileSync("C:/Users/Admin/.codex/memories/web-terrain-metrics/metrics.json", JSON.stringify(metrics, null, 2));
await browser.close();
