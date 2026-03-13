import { BLOCK_ATLAS } from '../config/constants';
import { createProceduralAtlas } from './atlas/createProceduralAtlas';
import { drawBlockTiles } from './block/drawBlockTiles';

const TILE_SIZE = 16;
let cachedAtlasAssets = null;

export function getProceduralAtlasAssets() {
  if (cachedAtlasAssets) return cachedAtlasAssets;
  cachedAtlasAssets = createProceduralAtlas({
    columns: BLOCK_ATLAS.columns,
    rows: BLOCK_ATLAS.rows,
    tileSize: TILE_SIZE,
    drawTiles: drawBlockTiles
  });
  return cachedAtlasAssets;
}
