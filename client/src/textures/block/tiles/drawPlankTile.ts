import { colorToCss } from '../../shared/color';
import { drawNoiseTile } from '../../shared/drawNoiseTile';

export function drawPlankTile(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  tileSize: number
): void {
  drawNoiseTile(ctx, tileX, tileY, tileSize, [154, 118, 78], 1201, 14);
  const startX = tileX * tileSize;
  const startY = tileY * tileSize;

  ctx.fillStyle = colorToCss([118, 86, 55]);
  for (let y = 2; y < tileSize; y += 4) {
    ctx.fillRect(startX, startY + y, tileSize, 1);
  }

  ctx.fillStyle = colorToCss([182, 144, 98]);
  for (let y = 0; y < tileSize; y += 4) {
    ctx.fillRect(startX + 1, startY + y, tileSize - 2, 1);
  }
}
