import { createProceduralAtlas } from './atlas/createProceduralAtlas';
import { drawMobTiles } from './mob/drawMobTiles';

const MOB_ATLAS_COLUMNS = 4;
const MOB_ATLAS_ROWS = 4;
const MOB_TILE_SIZE = 16;
let cachedMobAtlas = null;

export function getProceduralMobAtlasAssets() {
  if (cachedMobAtlas) return cachedMobAtlas;
  cachedMobAtlas = createProceduralAtlas({
    columns: MOB_ATLAS_COLUMNS,
    rows: MOB_ATLAS_ROWS,
    tileSize: MOB_TILE_SIZE,
    drawTiles: drawMobTiles
  });
  return cachedMobAtlas;
}
