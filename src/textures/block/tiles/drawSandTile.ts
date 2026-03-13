import { colorToCss, tint } from '../../shared/color';
import { drawNoiseTile } from '../../shared/drawNoiseTile';
import { lcg } from '../../shared/random';

export function drawSandTile(ctx, tileX, tileY, tileSize) {
  drawNoiseTile(ctx, tileX, tileY, tileSize, [214, 191, 122], 1301, 20);
  const startX = tileX * tileSize;
  const startY = tileY * tileSize;
  const rand = lcg(1302);

  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      const n = (rand() - 0.5) * 18;
      ctx.fillStyle = colorToCss(tint([214, 191, 122], n));
      ctx.fillRect(startX + x, startY + y, 1, 1);
    }
  }

  ctx.fillStyle = colorToCss([196, 171, 106]);
  for (let i = 0; i < 20; i++) {
    const px = Math.floor(rand() * tileSize);
    const py = Math.floor(rand() * tileSize);
    ctx.fillRect(startX + px, startY + py, 1, 1);
  }
}
