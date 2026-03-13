import { BLOCK_FACE_TILES } from '../../config/constants';
import { drawDirtTile } from './tiles/drawDirtTile';
import { drawGrassSideTile } from './tiles/drawGrassSideTile';
import { drawGrassTopTile } from './tiles/drawGrassTopTile';
import { drawLeafTile } from './tiles/drawLeafTile';
import { drawSandTile } from './tiles/drawSandTile';
import { drawStoneTile } from './tiles/drawStoneTile';
import { drawWoodTile } from './tiles/drawWoodTile';
import { drawLampTile } from './tiles/drawLampTile';

export function drawBlockTiles(ctx, tileSize) {
  drawGrassTopTile(ctx, BLOCK_FACE_TILES.grass.top.x, BLOCK_FACE_TILES.grass.top.y, tileSize);
  drawGrassSideTile(ctx, BLOCK_FACE_TILES.grass.side.x, BLOCK_FACE_TILES.grass.side.y, tileSize);
  drawDirtTile(ctx, BLOCK_FACE_TILES.grass.bottom.x, BLOCK_FACE_TILES.grass.bottom.y, tileSize);
  drawDirtTile(ctx, BLOCK_FACE_TILES.dirt.all.x, BLOCK_FACE_TILES.dirt.all.y, tileSize);
  drawStoneTile(ctx, BLOCK_FACE_TILES.stone.all.x, BLOCK_FACE_TILES.stone.all.y, tileSize);
  drawWoodTile(ctx, BLOCK_FACE_TILES.wood.all.x, BLOCK_FACE_TILES.wood.all.y, tileSize);
  drawLeafTile(ctx, BLOCK_FACE_TILES.leaf.all.x, BLOCK_FACE_TILES.leaf.all.y, tileSize);
  drawSandTile(ctx, BLOCK_FACE_TILES.sand.all.x, BLOCK_FACE_TILES.sand.all.y, tileSize);
  drawLampTile(ctx, BLOCK_FACE_TILES.lamp.all.x, BLOCK_FACE_TILES.lamp.all.y, tileSize);
}
