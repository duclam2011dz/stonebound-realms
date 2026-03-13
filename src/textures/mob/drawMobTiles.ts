import { colorToCss } from '../shared/color';
import { drawNoiseTile } from '../shared/drawNoiseTile';

export function drawMobTiles(ctx: CanvasRenderingContext2D, tileSize: number): void {
  drawNoiseTile(ctx, 0, 0, tileSize, [126, 172, 126], 8801, 18);
  const startX = 0;
  const startY = 0;

  ctx.fillStyle = colorToCss([20, 20, 20]);
  ctx.fillRect(startX + 4, startY + 5, 3, 3);
  ctx.fillRect(startX + 9, startY + 5, 3, 3);
  ctx.fillStyle = colorToCss([38, 84, 38]);
  ctx.fillRect(startX + 6, startY + 10, 4, 2);
}
