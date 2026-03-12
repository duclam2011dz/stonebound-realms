import { colorToCss } from "../../shared/color.js";
import { drawNoiseTile } from "../../shared/drawNoiseTile.js";
import { lcg } from "../../shared/random.js";

export function drawDirtTile(ctx, tileX, tileY, tileSize) {
  drawNoiseTile(ctx, tileX, tileY, tileSize, [118, 82, 50], 303, 28);
  const startX = tileX * tileSize;
  const startY = tileY * tileSize;
  const rand = lcg(404);
  for (let i = 0; i < 28; i++) {
    const x = Math.floor(rand() * tileSize);
    const y = Math.floor(rand() * tileSize);
    ctx.fillStyle = colorToCss([89, 61, 37]);
    ctx.fillRect(startX + x, startY + y, 1, 1);
  }
}
