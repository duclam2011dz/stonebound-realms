import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const outDir = path.resolve('output/pause-settings-ui');
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

const readState = async () =>
  page.evaluate(() => JSON.parse(window.render_game_to_text?.() ?? '{}'));
const advance = async (ms) => page.evaluate((deltaMs) => window.advanceTime?.(deltaMs), ms);

const initialState = await readState();
const helpHiddenOnStart = await page.$eval('#help', (element) =>
  element.classList.contains('is-hidden')
);
if (!helpHiddenOnStart) {
  throw new Error('Expected help UI to be hidden by default when the game loads.');
}

await page.keyboard.press('Escape');
await page.waitForTimeout(220);

const pausedVisible = await page.$eval('#pauseOverlay', (element) =>
  element.classList.contains('is-visible')
);
const pausedState = await readState();
await advance(1200);
const pausedAfterAdvance = await readState();

if (!pausedVisible) {
  throw new Error('Pause overlay did not open after pressing Escape.');
}
if (pausedState.mode !== 'paused') {
  throw new Error(`Expected paused mode in render_game_to_text, received "${pausedState.mode}".`);
}

const initialPlayer = initialState.player ?? {};
const pausedPlayer = pausedAfterAdvance.player ?? {};
if (
  initialPlayer.x !== pausedPlayer.x ||
  initialPlayer.y !== pausedPlayer.y ||
  initialPlayer.z !== pausedPlayer.z
) {
  throw new Error('Player position changed while the pause overlay was active.');
}

const initialPhase = pausedState.world?.dayNight?.phase;
const advancedPhase = pausedAfterAdvance.world?.dayNight?.phase;
if (initialPhase !== advancedPhase) {
  throw new Error('Day/night phase advanced while the game was paused.');
}

await page.click('#pauseSettingsButton');
await page.waitForTimeout(150);
await page.$$eval('.settings-category-button', (buttons) => {
  const target = buttons.find((button) => button.textContent?.includes('Movement'));
  if (target instanceof HTMLElement) target.click();
});
await page.waitForTimeout(100);

const pauseCategoryHeights = await page.$$eval(
  '#pauseSettingsCategories .settings-category-button',
  (elements) =>
    elements.map((element) => Math.round(element.getBoundingClientRect().height))
);
const pauseCategoryHeightSpread =
  Math.max(...pauseCategoryHeights) - Math.min(...pauseCategoryHeights);
if (pauseCategoryHeightSpread > 12 || Math.max(...pauseCategoryHeights) > 92) {
  throw new Error(
    `Pause category buttons stretched unexpectedly: ${pauseCategoryHeights.join(', ')}.`
  );
}

await page.locator('#pauseSettingsFields').hover();
await page.mouse.wheel(0, 1600);
await page.waitForTimeout(120);
const pauseFieldScroll = await page.$eval('#pauseSettingsFields', (element) => ({
  scrollTop: element.scrollTop,
  scrollHeight: element.scrollHeight,
  clientHeight: element.clientHeight
}));
if (pauseFieldScroll.scrollHeight <= pauseFieldScroll.clientHeight || pauseFieldScroll.scrollTop <= 0) {
  throw new Error('Expected pause settings field list to scroll with the mouse wheel.');
}

await page.$$eval('.settings-category-button', (buttons) => {
  const target = buttons.find((button) => button.textContent?.includes('Camera'));
  if (target instanceof HTMLElement) target.click();
});
await page.fill('#pauseSettingsSearch', 'look');

const filteredLabels = await page.$$eval('#pauseSettingsFields .setting-card-label', (elements) =>
  elements.map((element) => element.textContent?.trim() ?? '')
);
if (filteredLabels.length !== 1 || filteredLabels[0] !== 'Look Sensitivity') {
  throw new Error(`Expected only Look Sensitivity after category+search filter, got ${filteredLabels.join(', ')}.`);
}

await page.screenshot({
  path: path.join(outDir, 'pause-settings.png'),
  omitBackground: false
});

await page.click('#pauseSettingsBackButton');
await page.click('#pauseSaveButton');
const saveStatus = await page.$eval('#pauseStatus', (element) => element.textContent?.trim() ?? '');
if (!saveStatus.includes('placeholder')) {
  throw new Error(`Expected placeholder save status, received "${saveStatus}".`);
}

let fullscreenStateAfterF11 = false;
await page.keyboard.press('Escape');
await page.waitForTimeout(220);
const resumedState = await readState();
const pauseStillVisible = await page.$eval('#pauseOverlay', (element) =>
  element.classList.contains('is-visible')
);

if (pauseStillVisible) {
  throw new Error('Pause overlay stayed visible after closing with Escape.');
}
if (resumedState.mode !== 'playing') {
  throw new Error(`Expected playing mode after closing pause, received "${resumedState.mode}".`);
}

await page.goto('http://127.0.0.1:4173/pages/menu.html', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);
await page.click('#settingsButton');
await page.waitForTimeout(120);
await page.$$eval('#settingsCategories .settings-category-button', (buttons) => {
  const target = buttons.find((button) => button.textContent?.includes('Movement'));
  if (target instanceof HTMLElement) target.click();
});
await page.waitForTimeout(100);

const menuCategoryHeights = await page.$$eval(
  '#settingsCategories .settings-category-button',
  (elements) =>
    elements.map((element) => Math.round(element.getBoundingClientRect().height))
);
const menuCategoryHeightSpread = Math.max(...menuCategoryHeights) - Math.min(...menuCategoryHeights);
if (menuCategoryHeightSpread > 12 || Math.max(...menuCategoryHeights) > 92) {
  throw new Error(`Menu category buttons stretched unexpectedly: ${menuCategoryHeights.join(', ')}.`);
}

await page.locator('#settingsFields').hover();
await page.mouse.wheel(0, 1600);
await page.waitForTimeout(120);
const menuFieldScroll = await page.$eval('#settingsFields', (element) => ({
  scrollTop: element.scrollTop,
  scrollHeight: element.scrollHeight,
  clientHeight: element.clientHeight
}));
if (menuFieldScroll.scrollHeight <= menuFieldScroll.clientHeight || menuFieldScroll.scrollTop <= 0) {
  throw new Error('Expected menu settings field list to scroll with the mouse wheel.');
}

await page.$$eval('#settingsCategories .settings-category-button', (buttons) => {
  const target = buttons.find((button) => button.textContent?.includes('Interface'));
  if (target instanceof HTMLElement) target.click();
});
await page.waitForTimeout(100);
const helpSettingLabel = await page.$eval(
  '#settingsFields .setting-card-label',
  (element) => element.textContent?.trim() ?? ''
);
const helpSettingValue = await page.$eval(
  '#settingsFields .setting-value-badge',
  (element) => element.textContent?.trim() ?? ''
);
if (helpSettingLabel !== 'Show Help UI' || helpSettingValue !== 'Off') {
  throw new Error(
    `Expected interface help setting to default to Off, received "${helpSettingLabel}" / "${helpSettingValue}".`
  );
}

await page.keyboard.press('F11');
await page.waitForTimeout(180);
fullscreenStateAfterF11 = await page.evaluate(() => Boolean(document.fullscreenElement));
if (fullscreenStateAfterF11) {
  await page.keyboard.press('F11');
  await page.waitForTimeout(180);
}

const metrics = {
  pause: {
    pausedVisible,
    initialPhase,
    advancedPhase,
    saveStatus,
    helpHiddenOnStart,
    fieldScroll: pauseFieldScroll,
    categoryHeights: pauseCategoryHeights
  },
  settings: {
    filteredLabels,
    menuFieldScroll,
    menuCategoryHeights,
    helpSettingLabel,
    helpSettingValue
  },
  fullscreen: {
    activeAfterF11: fullscreenStateAfterF11
  }
};

fs.writeFileSync(path.join(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2));
await browser.close();
