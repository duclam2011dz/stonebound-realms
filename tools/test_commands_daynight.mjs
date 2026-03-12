import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const outDir = "C:/Users/Admin/.codex/memories/web-game-commands";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader"]
});
const page = await browser.newPage();
await page.goto("http://127.0.0.1:4173/game.html", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);

const runCommand = async (command) => page.evaluate((text) => {
  if (typeof window.execute_game_command !== "function") return { handled: false, ok: false, message: "No command bridge" };
  return window.execute_game_command(text);
}, command);

const snapshots = [];

snapshots.push({ label: "initial", state: await page.evaluate(() => window.render_game_to_text?.() ?? "") });

const timeNight = await runCommand("/time set night");
await page.evaluate(() => window.advanceTime?.(1000));
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(outDir, "night-no-vision.png"), omitBackground: false });
snapshots.push({ label: "time-night", result: timeNight, state: await page.evaluate(() => window.render_game_to_text?.() ?? "") });

const nightVision = await runCommand("/effect give night_vision");
await page.evaluate(() => window.advanceTime?.(400));
await page.waitForTimeout(150);
await page.screenshot({ path: path.join(outDir, "night-vision.png"), omitBackground: false });
snapshots.push({ label: "night-vision", result: nightVision, state: await page.evaluate(() => window.render_game_to_text?.() ?? "") });

const tpResult = await runCommand("/tp ~ 70 ~");
await page.evaluate(() => window.advanceTime?.(200));
await page.waitForTimeout(150);
await page.screenshot({ path: path.join(outDir, "after-tp.png"), omitBackground: false });
snapshots.push({ label: "tp", result: tpResult, state: await page.evaluate(() => window.render_game_to_text?.() ?? "") });

const timeDay = await runCommand("/time set day");
await page.evaluate(() => window.advanceTime?.(1000));
await page.waitForTimeout(150);
await page.screenshot({ path: path.join(outDir, "day.png"), omitBackground: false });
snapshots.push({ label: "time-day", result: timeDay, state: await page.evaluate(() => window.render_game_to_text?.() ?? "") });

fs.writeFileSync(path.join(outDir, "command-results.json"), JSON.stringify(snapshots, null, 2));
await browser.close();
