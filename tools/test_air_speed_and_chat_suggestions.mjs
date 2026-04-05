import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const outDir = path.resolve('output/air-chat-suggestions');
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

const advance = async (ms) => page.evaluate((deltaMs) => window.advanceTime?.(deltaMs), ms);

const openChatWith = async (value) => {
  await page.evaluate((text) => {
    window.__game?.chat.openInputWithText(text);
    const input = document.getElementById('chatInput');
    input?.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
};

const getSuggestions = async () =>
  page.$$eval('#chatSuggestions .chat-suggestion', (elements) =>
    elements.map((element) => {
      const label = element.querySelector('.chat-suggestion-label')?.textContent?.trim() ?? '';
      const description =
        element.querySelector('.chat-suggestion-description')?.textContent?.trim() ?? '';
      return {
        label,
        description,
        selected: element.classList.contains('is-selected')
      };
    })
  );

const getInputValue = async () =>
  page.$eval('#chatInput', (element) => /** @type {HTMLInputElement} */ (element).value);

const getSuggestionScroll = async () =>
  page.$eval('#chatSuggestions', (element) => ({
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight
  }));

const getPlayerMotion = async () =>
  page.evaluate(() => {
    const state = JSON.parse(window.render_game_to_text?.() ?? '{}');
    const velocity = state.player?.velocity ?? { x: 0, y: 0, z: 0 };
    return {
      onGround: Boolean(state.player?.onGround),
      speed: Math.hypot(velocity.x, velocity.z),
      velocity
    };
  });

await advance(400);

await openChatWith('/g');
const input = page.locator('#chatInput');
await input.focus();
const commandSuggestions = await getSuggestions();
await input.press('ArrowDown');
await input.press('Tab');
const commandAutocompleteValue = await getInputValue();
const gamemodeSuggestions = await getSuggestions();
await input.press('ArrowDown');
await input.press('Tab');
const argumentAutocompleteValue = await getInputValue();

await openChatWith('/give ');
const giveSuggestions = await getSuggestions();
for (let index = 0; index < 12; index += 1) {
  await input.press('ArrowDown');
}
const giveScroll = await getSuggestionScroll();
await page.screenshot({
  path: path.join(outDir, 'chat-suggestions.png'),
  omitBackground: false
});

await page.evaluate(() => {
  window.__game?.chat.closeInput();
});

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

  for (let dz = -7; dz <= 7; dz += 1) {
    for (let dx = -7; dx <= 7; dx += 1) {
      for (let dy = 0; dy <= 10; dy += 1) {
        world.removeBlock(baseX + dx, floorY + dy, baseZ + dz);
      }
      world.setBlock(baseX + dx, floorY - 1, baseZ + dz, 'stone');
    }
  }

  transform.position.set(baseX + 0.5, floorY, baseZ + 0.5);
  physics.velocity.set(0, 0, 0);
  physics.onGround = false;
});

await advance(240);
await page.evaluate(() => {
  const inputState = window.__game?.input?.state;
  if (!inputState) return;
  inputState.keys.set('KeyW', true);
  inputState.keys.set('Space', false);
});
await advance(520);
const groundMotion = await getPlayerMotion();

await page.evaluate(() => {
  const inputState = window.__game?.input?.state;
  if (!inputState) return;
  inputState.keys.set('Space', true);
});
await advance(120);
await page.evaluate(() => {
  const inputState = window.__game?.input?.state;
  if (!inputState) return;
  inputState.keys.set('Space', false);
});
await advance(120);
const airMotion = await getPlayerMotion();
await page.evaluate(() => {
  const inputState = window.__game?.input?.state;
  if (!inputState) return;
  inputState.keys.set('KeyW', false);
  inputState.keys.set('Space', false);
});
await page.screenshot({
  path: path.join(outDir, 'air-movement.png'),
  omitBackground: false
});

if (!commandSuggestions.some((item) => item.label === '/gamemode')) {
  throw new Error('Expected /gamemode to appear in command suggestions for /g.');
}
if (commandAutocompleteValue !== '/gamemode ') {
  throw new Error(`Expected Tab to complete /gamemode, received "${commandAutocompleteValue}".`);
}
if (!gamemodeSuggestions.some((item) => item.label === 'survival')) {
  throw new Error('Expected gamemode argument suggestions after /gamemode.');
}
if (argumentAutocompleteValue !== '/gamemode spectator') {
  throw new Error(
    `Expected Tab to complete selected gamemode argument, received "${argumentAutocompleteValue}".`
  );
}
if (giveSuggestions.length < 12) {
  throw new Error(
    `Expected a scrollable give suggestion list, received ${giveSuggestions.length}.`
  );
}
if (giveScroll.scrollHeight <= giveScroll.clientHeight || giveScroll.scrollTop <= 0) {
  throw new Error('Expected chat suggestion list to scroll while navigating deep entries.');
}
if (!groundMotion.onGround) {
  throw new Error('Expected player to be grounded while measuring base movement speed.');
}
if (airMotion.onGround) {
  throw new Error('Expected player to still be airborne while measuring jump movement speed.');
}
if (groundMotion.speed <= 0.1) {
  throw new Error(`Ground speed too low to compare: ${groundMotion.speed}`);
}

const airSpeedRatio = airMotion.speed / groundMotion.speed;
if (airSpeedRatio > 0.68) {
  throw new Error(
    `Expected airborne speed to stay near 2/3 of ground speed, received ratio ${airSpeedRatio.toFixed(3)}.`
  );
}

const metrics = {
  chat: {
    commandSuggestions,
    commandAutocompleteValue,
    gamemodeSuggestions,
    argumentAutocompleteValue,
    giveSuggestionCount: giveSuggestions.length,
    giveScroll
  },
  movement: {
    groundMotion,
    airMotion,
    airSpeedRatio
  }
};

fs.writeFileSync(path.join(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
await browser.close();
