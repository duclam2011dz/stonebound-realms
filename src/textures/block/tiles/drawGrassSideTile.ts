import { colorToCss, tint } from '../../shared/color';
import { lcg } from '../../shared/random';

export function drawGrassSideTile(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  tileSize: number
): void {
  const startX = tileX * tileSize;
  const startY = tileY * tileSize;
  const half = tileSize / 2;

  ctx.fillStyle = colorToCss([84, 156, 57]);
  ctx.fillRect(startX, startY, tileSize, half);
  ctx.fillStyle = colorToCss([115, 80, 49]);
  ctx.fillRect(startX, startY + half, tileSize, half);

  const grassRand = lcg(707);
  for (let y = 0; y < half; y++) {
    for (let x = 0; x < tileSize; x++) {
      const n = (grassRand() - 0.5) * 24;
      ctx.fillStyle = colorToCss(tint([84, 156, 57], n));
      ctx.fillRect(startX + x, startY + y, 1, 1);
    }
  }

  const dirtRand = lcg(808);
  for (let y = half; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      const n = (dirtRand() - 0.5) * 24;
      ctx.fillStyle = colorToCss(tint([115, 80, 49], n));
      ctx.fillRect(startX + x, startY + y, 1, 1);
    }
  }

  ctx.fillStyle = colorToCss([62, 124, 43]);
  for (let i = 0; i < 14; i++) {
    const x = Math.floor((i * 5) % tileSize);
    const y = Math.floor((i * 3) % half);
    ctx.fillRect(startX + x, startY + y, 1, 2);
  }
}
