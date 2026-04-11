export const BLOCK_ID_AIR = 0;
export const BLOCK_ID_GRASS = 1;
export const BLOCK_ID_DIRT = 2;
export const BLOCK_ID_STONE = 3;
export const BLOCK_ID_WOOD = 4;
export const BLOCK_ID_LEAF = 5;
export const BLOCK_ID_SAND = 6;
export const BLOCK_ID_LAMP = 7;
export const BLOCK_ID_PLANK = 8;
export const BLOCK_ID_CRAFTING_TABLE = 9;

export type BlockRenderLayer = 'solid' | 'cutout';

const BLOCK_IDS_BY_TYPE = Object.freeze({
  grass: BLOCK_ID_GRASS,
  dirt: BLOCK_ID_DIRT,
  stone: BLOCK_ID_STONE,
  wood: BLOCK_ID_WOOD,
  leaf: BLOCK_ID_LEAF,
  sand: BLOCK_ID_SAND,
  lamp: BLOCK_ID_LAMP,
  plank: BLOCK_ID_PLANK,
  crafting_table: BLOCK_ID_CRAFTING_TABLE
});

export type BlockType = keyof typeof BLOCK_IDS_BY_TYPE;

const BLOCK_TYPES_BY_ID: Array<BlockType | null> = [
  null,
  'grass',
  'dirt',
  'stone',
  'wood',
  'leaf',
  'sand',
  'lamp',
  'plank',
  'crafting_table'
];

const BLOCK_RENDER_LAYERS_BY_ID: Array<BlockRenderLayer | null> = [
  null,
  'solid',
  'solid',
  'solid',
  'solid',
  'cutout',
  'solid',
  'solid',
  'solid',
  'solid'
];

const BLOCK_OCCLUDES_NEIGHBOR_FACES_BY_ID = [
  false,
  true,
  true,
  true,
  true,
  false,
  true,
  true,
  true,
  true
];

export const BLOCK_TYPES = Object.freeze(Object.keys(BLOCK_IDS_BY_TYPE) as BlockType[]);

export function isValidBlockType(type: string): type is BlockType {
  if (!type) return false;
  return Object.prototype.hasOwnProperty.call(BLOCK_IDS_BY_TYPE, type);
}

export function blockTypeToId(type: string | null | undefined): number {
  if (!type) return BLOCK_ID_AIR;
  return BLOCK_IDS_BY_TYPE[type as BlockType] ?? BLOCK_ID_DIRT;
}

export function blockIdToType(id: number): BlockType | null {
  return BLOCK_TYPES_BY_ID[id] ?? null;
}

export function getBlockRenderLayer(blockId: number): BlockRenderLayer {
  return BLOCK_RENDER_LAYERS_BY_ID[blockId] ?? 'solid';
}

export function doesBlockOccludeNeighborFaces(blockId: number): boolean {
  return BLOCK_OCCLUDES_NEIGHBOR_FACES_BY_ID[blockId] ?? false;
}

export function isSolidBlockId(blockId: number): boolean {
  return blockId !== BLOCK_ID_AIR && getBlockRenderLayer(blockId) === 'solid';
}
