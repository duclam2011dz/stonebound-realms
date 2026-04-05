import { createProceduralAtlas, type AtlasResult } from './atlas/createProceduralAtlas';
import { drawMobTiles } from './mob/drawMobTiles';

const MOB_ATLAS_COLUMNS = 6;
const MOB_ATLAS_ROWS = 4;
const MOB_TILE_SIZE = 16;
let cachedMobAtlas: AtlasResult | null = null;

export function getProceduralMobAtlasAssets(): AtlasResult {
  if (cachedMobAtlas) return cachedMobAtlas;
  cachedMobAtlas = createProceduralAtlas({
    columns: MOB_ATLAS_COLUMNS,
    rows: MOB_ATLAS_ROWS,
    tileSize: MOB_TILE_SIZE,
    drawTiles: drawMobTiles
  });
  return cachedMobAtlas;
}
