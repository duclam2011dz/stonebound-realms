import { colorToCss } from '../../shared/color';
import { drawNoiseTile } from '../../shared/drawNoiseTile';
import { lcg } from '../../shared/random';

export function drawStoneTile(ctx, tileX, tileY, tileSize) {
  drawNoiseTile(ctx, tileX, tileY, tileSize, [128, 132, 138], 505, 24);
  const startX = tileX * tileSize;
  const startY = tileY * tileSize;
  const rand = lcg(606);
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(rand() * (tileSize - 2));
    const y = Math.floor(rand() * (tileSize - 2));
    ctx.fillStyle = colorToCss([92, 96, 101]);
    ctx.fillRect(startX + x, startY + y, 2, 1);
  }
}
