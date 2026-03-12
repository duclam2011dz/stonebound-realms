import { colorToCss, tint } from "./color.js";
import { lcg } from "./random.js";

export function drawNoiseTile(ctx, tileX, tileY, tileSize, baseColor, seed, strength = 22) {
  const rand = lcg(seed);
  const startX = tileX * tileSize;
  const startY = tileY * tileSize;
  ctx.fillStyle = colorToCss(baseColor);
  ctx.fillRect(startX, startY, tileSize, tileSize);

  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      const n = (rand() - 0.5) * strength;
      ctx.fillStyle = colorToCss(tint(baseColor, n));
      ctx.fillRect(startX + x, startY + y, 1, 1);
    }
  }
}
