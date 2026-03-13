import { colorToCss } from '../../shared/color';
import { drawNoiseTile } from '../../shared/drawNoiseTile';
import { lcg } from '../../shared/random';

export function drawGrassTopTile(ctx, tileX, tileY, tileSize) {
  drawNoiseTile(ctx, tileX, tileY, tileSize, [88, 163, 61], 101, 26);
  const startX = tileX * tileSize;
  const startY = tileY * tileSize;
  const rand = lcg(2026);
  for (let i = 0; i < 24; i++) {
    const x = Math.floor(rand() * tileSize);
    const y = Math.floor(rand() * tileSize);
    ctx.fillStyle = colorToCss([56, 120, 42]);
    ctx.fillRect(startX + x, startY + y, 1, 1);
  }
}
