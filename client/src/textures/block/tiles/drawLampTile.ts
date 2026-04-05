import { drawNoiseTile } from '../../shared/drawNoiseTile';

export function drawLampTile(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  tileSize: number
): void {
  drawNoiseTile(ctx, tileX, tileY, tileSize, [232, 200, 96], 1601, 12);
  ctx.fillStyle = 'rgba(255, 248, 210, 0.65)';
  ctx.fillRect(
    tileX * tileSize + tileSize * 0.18,
    tileY * tileSize + tileSize * 0.18,
    tileSize * 0.64,
    tileSize * 0.64
  );
  ctx.strokeStyle = 'rgba(255, 220, 140, 0.55)';
  ctx.lineWidth = Math.max(1, Math.floor(tileSize * 0.06));
  ctx.strokeRect(
    tileX * tileSize + tileSize * 0.18,
    tileY * tileSize + tileSize * 0.18,
    tileSize * 0.64,
    tileSize * 0.64
  );
}
