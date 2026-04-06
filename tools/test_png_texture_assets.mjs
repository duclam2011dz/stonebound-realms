import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const outDir = path.resolve('output/png-texture-assets');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader']
});
const page = await browser.newPage({
  viewport: { width: 1600, height: 960 }
});

await page.goto('http://127.0.0.1:4173/pages/game.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1600);

await page.waitForFunction(
  () => {
    const game = window.__game;
    if (!game) return false;
    const blockReady = Boolean(game.world?.blockMaterial?.map?.image);
    const mobMaterials = game.systems?.mobs?.materials;
    if (!mobMaterials) return false;
    return (
      blockReady &&
      ['pig', 'cow', 'chicken', 'sheep'].every((type) =>
        Object.values(mobMaterials[type] ?? {}).every((material) => Boolean(material?.map?.image))
      )
    );
  },
  { timeout: 60000 }
);

const setupMetrics = await page.evaluate(() => {
  const game = window.__game;
  if (!game) return null;

  const transform = game.ecs.getComponent(game.playerEntityId, 'transform');
  const physics = game.ecs.getComponent(game.playerEntityId, 'physics');
  if (!transform || !physics) return null;

  const baseX = Math.floor(transform.position.x);
  const baseY = Math.min(104, game.world.getMaxHeight() - 12);
  const baseZ = Math.floor(transform.position.z);

  game.world.ensureChunksAroundWorld(baseX, baseZ, 2);
  game.systems.dayNight.setTimePreset('day');
  game.systems.dayNight.applyToScene(transform.position);

  for (let dz = -18; dz <= 10; dz += 1) {
    for (let dx = -16; dx <= 16; dx += 1) {
      for (let dy = -2; dy <= 18; dy += 1) {
        game.world.removeBlock(baseX + dx, baseY + dy, baseZ + dz);
      }
      game.world.setBlock(baseX + dx, baseY, baseZ + dz, 'stone');
    }
  }

  const displayBlocks = [
    'grass',
    'dirt',
    'stone',
    'wood',
    'leaf',
    'sand',
    'plank',
    'crafting_table',
    'lamp'
  ];

  for (let index = 0; index < displayBlocks.length; index += 1) {
    const blockType = displayBlocks[index];
    const x = baseX - 4 + index;
    game.world.setBlock(x, baseY + 1, baseZ - 4, 'stone');
    game.world.setBlock(x, baseY + 2, baseZ - 4, blockType);
  }

  transform.position.set(baseX + 0.5, baseY + 1.2, baseZ + 5.75);
  transform.yaw = 0;
  transform.pitch = -0.22;
  physics.velocity.set(0, 0, 0);
  physics.onGround = true;

  game.inventoryState.setSlot(0, { kind: 'block', blockType: 'grass', quantity: 16 });
  game.inventoryState.setSlot(1, { kind: 'block', blockType: 'crafting_table', quantity: 3 });
  game.inventoryState.setSlot(2, { kind: 'item', itemType: 'stick', quantity: 8 });
  game.inventoryState.setSlot(3, { kind: 'item', itemType: 'wooden_pickaxe', quantity: 1 });
  game.inventoryState.setSlot(4, { kind: 'item', itemType: 'wooden_sword', quantity: 1 });
  game.inventoryState.setSlot(5, { kind: 'item', itemType: 'stone_pickaxe', quantity: 1 });
  game.inventoryState.setSlot(6, { kind: 'item', itemType: 'stone_sword', quantity: 1 });
  game.inventoryState.setSlot(7, { kind: 'block', blockType: 'sand', quantity: 12 });
  game.inventoryState.setSlot(8, { kind: 'block', blockType: 'wood', quantity: 10 });

  const mobSpawns = [
    { type: 'pig', x: baseX - 4.5, y: baseY + 1, z: baseZ - 10.5 },
    { type: 'cow', x: baseX - 1.5, y: baseY + 1, z: baseZ - 10.25 },
    { type: 'chicken', x: baseX + 1.5, y: baseY + 1, z: baseZ - 10.25 },
    { type: 'sheep', x: baseX + 4.5, y: baseY + 1, z: baseZ - 10.25 }
  ];

  const spawned = [];
  const Vector3 = game.renderContext.camera.position.constructor;
  for (const spawn of mobSpawns) {
    const entityId = game.systems.mobs.spawnMob(
      spawn.type,
      new Vector3(spawn.x, spawn.y, spawn.z),
      { ignoreCap: true }
    );
    if (!entityId) continue;
    const mobTransform = game.ecs.getComponent(entityId, 'transform');
    const mobRender = game.ecs.getComponent(entityId, 'mob_render');
    if (mobTransform) {
      mobTransform.yaw = Math.PI;
    }
    if (mobRender && mobTransform) {
      mobRender.parts.root.position.copy(mobTransform.position);
      mobRender.parts.root.rotation.y = mobTransform.yaw + Math.PI;
    }
    spawned.push({ type: spawn.type, entityId });
  }

  game.world.updateVisibleChunksAround(transform.position, true);
  game.world.processChunkQueue(400, 4000);
  game.systems.camera.update(game.ecs, game.playerEntityId, game.renderContext.camera);
  game.paused = true;
  game.renderContext.render();

  const blockMap = game.world.blockMaterial.map;
  const mobTextureSizes = Object.fromEntries(
    Object.entries(game.systems.mobs.materials).map(([type, materials]) => [
      type,
      Object.fromEntries(
        Object.entries(materials).map(([layer, material]) => [
          layer,
          {
            width: material.map?.image?.width ?? 0,
            height: material.map?.image?.height ?? 0
          }
        ])
      )
    ])
  );

  const mobRenderSummary = Object.fromEntries(
    spawned.map(({ type, entityId }) => {
      const render = game.ecs.getComponent(entityId, 'mob_render');
      return [
        type,
        {
          partCount: render?.parts?.root?.children?.length ?? 0,
          materialLayers: Object.keys(render?.parts?.materials ?? {}),
          animatedRoles: Object.keys(render?.parts?.animated ?? {})
        }
      ];
    })
  );

  return {
    showcaseOrigin: { x: baseX, y: baseY, z: baseZ },
    displayBlocks,
    spawned,
    blockAtlas: {
      width: blockMap?.image?.width ?? 0,
      height: blockMap?.image?.height ?? 0
    },
    mobTextureSizes,
    mobRenderSummary
  };
});

if (!setupMetrics) {
  throw new Error('Failed to prepare the PNG texture showcase scene.');
}

await page.waitForTimeout(300);
await page.screenshot({
  path: path.join(outDir, 'world-textures.png'),
  omitBackground: false
});

await page.evaluate((origin) => {
  const game = window.__game;
  if (!game) return;
  const camera = game.renderContext.camera;
  camera.position.set(origin.x + 0.5, origin.y + 2.8, origin.z - 16.5);
  camera.lookAt(origin.x + 0.5, origin.y + 1.1, origin.z - 10.25);
  game.renderContext.render();
}, setupMetrics.showcaseOrigin);
await page.waitForTimeout(100);
await page.screenshot({
  path: path.join(outDir, 'mob-textures.png'),
  omitBackground: false
});

const walkPoseMetrics = await page.evaluate((spawned) => {
  const game = window.__game;
  if (!game) return null;

  const poseSummary = {};
  for (const { type, entityId } of spawned) {
    const render = game.ecs.getComponent(entityId, 'mob_render');
    if (!render) continue;
    game.systems.mobs.applyMobAnimation(render, type, 0.72, 1.25, true);

    const animated = render.parts.animated;
    poseSummary[type] = Object.fromEntries(
      Object.entries(animated).map(([role, groups]) => [
        role,
        (groups ?? []).map((group) => ({
          x: Number(group.rotation.x.toFixed(4)),
          y: Number(group.rotation.y.toFixed(4)),
          z: Number(group.rotation.z.toFixed(4))
        }))
      ])
    );
  }

  game.renderContext.render();
  return poseSummary;
}, setupMetrics.spawned);

const orientationMetrics = await page.evaluate((spawned) => {
  const game = window.__game;
  if (!game) return null;
  const Vector3 = game.renderContext.camera.position.constructor;

  return Object.fromEntries(
    spawned.map(({ type, entityId }) => {
      const transform = game.ecs.getComponent(entityId, 'transform');
      const render = game.ecs.getComponent(entityId, 'mob_render');
      if (!transform || !render) {
        return [type, null];
      }

      const forward = new Vector3(0, 0, -1).applyQuaternion(render.parts.root.quaternion);
      const expectedX = Math.sin(transform.yaw);
      const expectedZ = Math.cos(transform.yaw);
      const dot = expectedX * forward.x + expectedZ * forward.z;
      return [type, Number(dot.toFixed(4))];
    })
  );
}, setupMetrics.spawned);

await page.waitForTimeout(100);
await page.screenshot({
  path: path.join(outDir, 'mob-walk-cycle.png'),
  omitBackground: false
});

if (!walkPoseMetrics?.sheep?.rightFrontLeg || walkPoseMetrics.sheep.rightFrontLeg.length < 2) {
  throw new Error('Expected sheep walk pose to animate both the leg skin and wool leg overlay.');
}

const sheepRightFrontLegRotations = walkPoseMetrics.sheep.rightFrontLeg.map((entry) => entry.x);
const sheepRightFrontLegSpread =
  Math.max(...sheepRightFrontLegRotations) - Math.min(...sheepRightFrontLegRotations);
if (sheepRightFrontLegSpread > 1e-4) {
  throw new Error(
    `Expected sheep wool leg overlay to stay in sync with the base leg, received rotations ${sheepRightFrontLegRotations.join(', ')}.`
  );
}

if (
  !orientationMetrics ||
  Object.values(orientationMetrics).some((dot) => dot === null || dot < 0.98)
) {
  throw new Error(
    `Expected mob facing direction to match movement yaw, received ${JSON.stringify(orientationMetrics)}.`
  );
}

const hotbarBackgrounds = await page.$$eval('#hotbar .hotbar-swatch', (elements) =>
  elements.map((element) => {
    const node = /** @type {HTMLElement} */ (element);
    return node.style.backgroundImage;
  })
);

if (hotbarBackgrounds.slice(0, 7).some((value) => !value || value === 'none')) {
  throw new Error(
    `Expected PNG-backed hotbar swatches, received ${hotbarBackgrounds.join(' | ')}.`
  );
}

await page.evaluate(() => {
  const game = window.__game;
  if (!game) return;
  game.inventoryOpen = true;
  game.inventoryUI.setOpen(true);
  game.renderContext.render();
});
await page.waitForTimeout(120);

const inventoryBackgrounds = await page.$$eval('#inventoryGrid .inventory-swatch', (elements) =>
  elements.slice(0, 7).map((element) => {
    const node = /** @type {HTMLElement} */ (element);
    return node.style.backgroundImage;
  })
);

await page.screenshot({
  path: path.join(outDir, 'inventory-textures.png'),
  omitBackground: false
});

if (inventoryBackgrounds.some((value) => !value || value === 'none')) {
  throw new Error(
    `Expected PNG-backed inventory swatches in the first seven slots, received ${inventoryBackgrounds.join(' | ')}.`
  );
}

const metrics = {
  ...setupMetrics,
  walkPoseMetrics,
  orientationMetrics,
  hotbarBackgrounds,
  inventoryBackgrounds
};

fs.writeFileSync(path.join(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
await browser.close();
