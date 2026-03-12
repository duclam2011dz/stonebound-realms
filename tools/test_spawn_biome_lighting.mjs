import fs from "node:fs";
import { chromium } from "playwright";

const outDir = "C:/Users/Admin/.codex/memories/web-spawn-biome-lighting";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"]
});
const page = await browser.newPage();
await page.goto("http://127.0.0.1:4173/game.html", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);

const metrics = await page.evaluate(() => {
  const game = window.__game;
  if (!game) return { error: "no-game" };
  const transform = game.ecs.getComponent(game.playerEntityId, "transform");
  const physics = game.ecs.getComponent(game.playerEntityId, "physics");
  if (!transform || !physics) return { error: "missing-player-components" };

  const spawnCollision = game.world.collidesPlayer(
    transform.position.x,
    transform.position.y,
    transform.position.z,
    physics.radius,
    physics.height
  );

  const biomeCounts = { plain: 0, forest: 0, hill: 0 };
  for (let z = -1024; z <= 1024; z += 64) {
    for (let x = -1024; x <= 1024; x += 64) {
      const biome = game.world.getBiomeAt(x, z);
      biomeCounts[biome] = (biomeCounts[biome] ?? 0) + 1;
    }
  }

  const dayNight = game.systems.dayNight;
  const cycle = dayNight.cycleDurationSeconds;
  const lighting = game.renderContext.lighting;

  const captureLighting = (label, position) => {
    dayNight.applyToScene(position);
    return {
      label,
      sun: Number(lighting.sunLight.intensity.toFixed(3)),
      moon: Number(lighting.moonLight.intensity.toFixed(3)),
      ambient: Number(lighting.ambientLight.intensity.toFixed(3)),
      hemisphere: Number(lighting.hemisphereLight.intensity.toFixed(3)),
      skyExposure: Number(game.world.getSkyExposureAt(position.x, position.y + 1.6, position.z, 56).toFixed(3))
    };
  };

  dayNight.timeSeconds = cycle * 0.25;
  const noonOutside = captureLighting("noonOutside", transform.position);

  dayNight.timeSeconds = cycle * 0.75;
  const midnightOutside = captureLighting("midnightOutside", transform.position);

  const cavePosition = {
    x: transform.position.x,
    y: Math.max(8, transform.position.y - 34),
    z: transform.position.z
  };
  dayNight.timeSeconds = cycle * 0.75;
  const midnightCave = captureLighting("midnightCave", cavePosition);

  return {
    spawnCollision,
    biomeCounts,
    lighting: {
      noonOutside,
      midnightOutside,
      midnightCave
    }
  };
});

fs.writeFileSync(`${outDir}/metrics.json`, JSON.stringify(metrics, null, 2));
await browser.close();
