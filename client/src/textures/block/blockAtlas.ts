import { BLOCK_ATLAS, BLOCK_FACE_TILES } from '../../config/constants';
import type { AtlasResult } from '../atlas/createProceduralAtlas';
import { createImageAtlas, type AtlasImagePlacement } from '../atlas/createImageAtlas';
import { BLOCK_TEXTURE_ASSET_URLS } from './blockTextureRegistry';

const TILE_SIZE = 16;
let cachedBlockAtlasPromise: Promise<AtlasResult> | null = null;

function buildPlacements(): AtlasImagePlacement[] {
  return [
    {
      tileX: BLOCK_FACE_TILES.grass.top.x,
      tileY: BLOCK_FACE_TILES.grass.top.y,
      imageUrl: BLOCK_TEXTURE_ASSET_URLS.grass.top
    },
    {
      tileX: BLOCK_FACE_TILES.grass.side.x,
      tileY: BLOCK_FACE_TILES.grass.side.y,
      imageUrl: BLOCK_TEXTURE_ASSET_URLS.grass.side
    },
    {
      tileX: BLOCK_FACE_TILES.grass.bottom.x,
      tileY: BLOCK_FACE_TILES.grass.bottom.y,
      imageUrl: BLOCK_TEXTURE_ASSET_URLS.grass.bottom
    },
    {
      tileX: BLOCK_FACE_TILES.dirt.all.x,
      tileY: BLOCK_FACE_TILES.dirt.all.y,
      imageUrl: BLOCK_TEXTURE_ASSET_URLS.dirt.all
    },
    {
      tileX: BLOCK_FACE_TILES.stone.all.x,
      tileY: BLOCK_FACE_TILES.stone.all.y,
      imageUrl: BLOCK_TEXTURE_ASSET_URLS.stone.all
    },
    {
      tileX: BLOCK_FACE_TILES.wood.side.x,
      tileY: BLOCK_FACE_TILES.wood.side.y,
      imageUrl: BLOCK_TEXTURE_ASSET_URLS.wood.side
    },
    {
      tileX: BLOCK_FACE_TILES.wood.top.x,
      tileY: BLOCK_FACE_TILES.wood.top.y,
      imageUrl: BLOCK_TEXTURE_ASSET_URLS.wood.top
    },
    {
      tileX: BLOCK_FACE_TILES.leaf.all.x,
      tileY: BLOCK_FACE_TILES.leaf.all.y,
      imageUrl: BLOCK_TEXTURE_ASSET_URLS.leaf.all
    },
    {
      tileX: BLOCK_FACE_TILES.sand.all.x,
      tileY: BLOCK_FACE_TILES.sand.all.y,
      imageUrl: BLOCK_TEXTURE_ASSET_URLS.sand.all
    },
    {
      tileX: BLOCK_FACE_TILES.plank.all.x,
      tileY: BLOCK_FACE_TILES.plank.all.y,
      imageUrl: BLOCK_TEXTURE_ASSET_URLS.plank.all
    },
    {
      tileX: BLOCK_FACE_TILES.crafting_table.top.x,
      tileY: BLOCK_FACE_TILES.crafting_table.top.y,
      imageUrl: BLOCK_TEXTURE_ASSET_URLS.crafting_table.top
    },
    {
      tileX: BLOCK_FACE_TILES.crafting_table.side.x,
      tileY: BLOCK_FACE_TILES.crafting_table.side.y,
      imageUrl: BLOCK_TEXTURE_ASSET_URLS.crafting_table.side
    },
    {
      tileX: BLOCK_FACE_TILES.crafting_table.front.x,
      tileY: BLOCK_FACE_TILES.crafting_table.front.y,
      imageUrl: BLOCK_TEXTURE_ASSET_URLS.crafting_table.front
    },
    {
      tileX: BLOCK_FACE_TILES.crafting_table.bottom.x,
      tileY: BLOCK_FACE_TILES.crafting_table.bottom.y,
      imageUrl: BLOCK_TEXTURE_ASSET_URLS.crafting_table.bottom
    }
  ];
}

function drawFallbackTiles(ctx: CanvasRenderingContext2D, tileSize: number): void {
  const tileX = BLOCK_FACE_TILES.lamp.all.x * tileSize;
  const tileY = BLOCK_FACE_TILES.lamp.all.y * tileSize;

  ctx.fillStyle = '#4b3823';
  ctx.fillRect(tileX, tileY, tileSize, tileSize);
  ctx.fillStyle = '#d8b36a';
  ctx.fillRect(tileX + 2, tileY + 2, tileSize - 4, tileSize - 4);
  ctx.fillStyle = '#fff2b8';
  ctx.fillRect(tileX + 5, tileY + 5, tileSize - 10, tileSize - 10);
}

export function loadBlockAtlasAssets(): Promise<AtlasResult> {
  if (cachedBlockAtlasPromise) return cachedBlockAtlasPromise;
  cachedBlockAtlasPromise = createImageAtlas({
    columns: BLOCK_ATLAS.columns,
    rows: BLOCK_ATLAS.rows,
    tileSize: TILE_SIZE,
    placements: buildPlacements(),
    drawFallbackTiles
  });
  return cachedBlockAtlasPromise;
}
