import { colorToCss } from "../../shared/color.js";
import { drawNoiseTile } from "../../shared/drawNoiseTile.js";

export function drawWoodTile(ctx, tileX, tileY, tileSize) {
  drawNoiseTile(ctx, tileX, tileY, tileSize, [123, 90, 56], 1101, 18);
  const startX = tileX * tileSize;
  const startY = tileY * tileSize;

  ctx.fillStyle = colorToCss([94, 66, 38]);
  for (let x = 1; x < tileSize; x += 3) {
    ctx.fillRect(startX + x, startY, 1, tileSize);
  }
}
