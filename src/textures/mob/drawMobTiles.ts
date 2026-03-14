import { colorToCss } from '../shared/color';
import { drawNoiseTile } from '../shared/drawNoiseTile';

type MobTile = {
  color: [number, number, number];
  accent: [number, number, number];
  seed: number;
};

const MOB_TILES: MobTile[] = [
  { color: [220, 152, 162], accent: [160, 92, 98], seed: 2201 }, // pig
  { color: [96, 74, 58], accent: [62, 46, 36], seed: 4311 }, // cow
  { color: [232, 234, 232], accent: [186, 188, 186], seed: 9821 }, // sheep
  { color: [250, 246, 210], accent: [210, 192, 96], seed: 7133 } // chicken
];

function drawMobTile(
  ctx: CanvasRenderingContext2D,
  tileSize: number,
  tileIndex: number,
  tile: MobTile
): void {
  const startX = tileIndex * tileSize;
  const startY = 0;
  drawNoiseTile(ctx, startX, startY, tileSize, tile.color, tile.seed, 18);

  ctx.fillStyle = colorToCss([20, 20, 20]);
  ctx.fillRect(startX + 4, startY + 5, 3, 3);
  ctx.fillRect(startX + 9, startY + 5, 3, 3);
  ctx.fillStyle = colorToCss(tile.accent);
  ctx.fillRect(startX + 6, startY + 10, 4, 2);
}

export function drawMobTiles(ctx: CanvasRenderingContext2D, tileSize: number): void {
  MOB_TILES.forEach((tile, index) => drawMobTile(ctx, tileSize, index, tile));
}
