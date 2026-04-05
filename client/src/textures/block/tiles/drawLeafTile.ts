import { colorToCss } from '../../shared/color';
import { drawNoiseTile } from '../../shared/drawNoiseTile';
import { lcg } from '../../shared/random';

export function drawLeafTile(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  tileSize: number
): void {
  drawNoiseTile(ctx, tileX, tileY, tileSize, [60, 130, 56], 1201, 28);
  const startX = tileX * tileSize;
  const startY = tileY * tileSize;
  const rand = lcg(1202);

  ctx.fillStyle = colorToCss([46, 92, 42]);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rand() * tileSize);
    const y = Math.floor(rand() * tileSize);
    ctx.fillRect(startX + x, startY + y, 1, 1);
  }

  ctx.fillStyle = colorToCss([120, 170, 112]);
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(rand() * tileSize);
    const y = Math.floor(rand() * tileSize);
    ctx.fillRect(startX + x, startY + y, 1, 1);
  }
}
