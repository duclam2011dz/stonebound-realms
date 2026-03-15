import { colorToCss } from '../../shared/color';
import { drawNoiseTile } from '../../shared/drawNoiseTile';

export function drawCraftingTableTile(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  tileSize: number
): void {
  drawNoiseTile(ctx, tileX, tileY, tileSize, [130, 95, 58], 1451, 16);
  const startX = tileX * tileSize;
  const startY = tileY * tileSize;

  ctx.fillStyle = colorToCss([88, 63, 38]);
  ctx.fillRect(startX, startY, tileSize, 1);
  ctx.fillRect(startX, startY + tileSize - 1, tileSize, 1);
  ctx.fillRect(startX, startY, 1, tileSize);
  ctx.fillRect(startX + tileSize - 1, startY, 1, tileSize);

  ctx.fillStyle = colorToCss([168, 129, 82]);
  const mid = Math.floor(tileSize / 2);
  ctx.fillRect(startX + mid - 1, startY + 2, 2, tileSize - 4);
  ctx.fillRect(startX + 2, startY + mid - 1, tileSize - 4, 2);
}
