import { colorToCss, tint, type RGB } from '../shared/color';
import { drawNoiseTile } from '../shared/drawNoiseTile';

type MobTile = {
  color: RGB;
  accent: RGB;
  seed: number;
};

const MOB_TILES: MobTile[] = [
  { color: [220, 152, 162], accent: [160, 92, 98], seed: 2201 }, // pig
  { color: [96, 74, 58], accent: [56, 42, 32], seed: 4311 }, // cow
  { color: [232, 234, 232], accent: [186, 188, 186], seed: 9821 }, // sheep
  { color: [250, 246, 210], accent: [210, 192, 96], seed: 7133 } // chicken
];

function drawMobTile(
  ctx: CanvasRenderingContext2D,
  tileSize: number,
  tileX: number,
  tileY: number,
  tile: MobTile,
  variant: 'head-front' | 'head-side' | 'body' | 'body-top' | 'leg' | 'hoof'
): void {
  const startX = tileX * tileSize;
  const startY = tileY * tileSize;
  const seed = tile.seed + tileX * 41 + tileY * 101;

  if (variant === 'body-top') {
    drawNoiseTile(ctx, tileX, tileY, tileSize, tint(tile.color, 10), seed, 18);
  } else if (variant === 'leg') {
    drawNoiseTile(ctx, tileX, tileY, tileSize, tint(tile.color, -18), seed, 16);
  } else if (variant === 'hoof') {
    drawNoiseTile(ctx, tileX, tileY, tileSize, tint(tile.accent, -28), seed, 12);
  } else {
    drawNoiseTile(ctx, tileX, tileY, tileSize, tile.color, seed, 18);
  }

  if (variant === 'head-front') {
    ctx.fillStyle = colorToCss([24, 24, 24]);
    ctx.fillRect(startX + 4, startY + 5, 3, 3);
    ctx.fillRect(startX + 9, startY + 5, 3, 3);
    ctx.fillStyle = colorToCss(tile.accent);
    ctx.fillRect(startX + 6, startY + 9, 4, 3);
  } else if (variant === 'head-side') {
    ctx.fillStyle = colorToCss(tint(tile.accent, -10));
    ctx.fillRect(startX + 3, startY + 3, 3, 4);
    ctx.fillStyle = colorToCss(tint(tile.color, 8));
    ctx.fillRect(startX + 8, startY + 4, 4, 2);
  } else if (variant === 'body') {
    ctx.fillStyle = colorToCss(tint(tile.accent, -8));
    ctx.fillRect(startX + 3, startY + 6, 6, 4);
  } else if (variant === 'body-top') {
    ctx.fillStyle = colorToCss(tint(tile.accent, 6));
    ctx.fillRect(startX + 2, startY + 2, 8, 3);
  } else if (variant === 'leg') {
    ctx.fillStyle = colorToCss(tint(tile.accent, -20));
    ctx.fillRect(startX + 3, startY + 11, 6, 3);
  } else if (variant === 'hoof') {
    ctx.fillStyle = colorToCss(tint(tile.accent, -45));
    ctx.fillRect(startX + 2, startY + 9, 10, 5);
    ctx.fillStyle = colorToCss(tint(tile.accent, 8));
    ctx.fillRect(startX + 4, startY + 10, 4, 2);
  }
}

export function drawMobTiles(ctx: CanvasRenderingContext2D, tileSize: number): void {
  MOB_TILES.forEach((tile, row) => {
    drawMobTile(ctx, tileSize, 0, row, tile, 'head-front');
    drawMobTile(ctx, tileSize, 1, row, tile, 'head-side');
    drawMobTile(ctx, tileSize, 2, row, tile, 'body');
    drawMobTile(ctx, tileSize, 3, row, tile, 'body-top');
    drawMobTile(ctx, tileSize, 4, row, tile, 'leg');
    drawMobTile(ctx, tileSize, 5, row, tile, 'hoof');
  });
}
