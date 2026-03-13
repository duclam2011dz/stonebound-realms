export const BLOCK_ID_AIR = 0;
export const BLOCK_ID_GRASS = 1;
export const BLOCK_ID_DIRT = 2;
export const BLOCK_ID_STONE = 3;
export const BLOCK_ID_WOOD = 4;
export const BLOCK_ID_LEAF = 5;
export const BLOCK_ID_SAND = 6;
export const BLOCK_ID_LAMP = 7;

const BLOCK_TYPES_BY_ID = [null, 'grass', 'dirt', 'stone', 'wood', 'leaf', 'sand', 'lamp'];

const BLOCK_IDS_BY_TYPE = Object.freeze({
  grass: BLOCK_ID_GRASS,
  dirt: BLOCK_ID_DIRT,
  stone: BLOCK_ID_STONE,
  wood: BLOCK_ID_WOOD,
  leaf: BLOCK_ID_LEAF,
  sand: BLOCK_ID_SAND,
  lamp: BLOCK_ID_LAMP
});

export const BLOCK_TYPES = Object.freeze(Object.keys(BLOCK_IDS_BY_TYPE));

export function isValidBlockType(type) {
  if (!type) return false;
  return Object.hasOwn(BLOCK_IDS_BY_TYPE, type);
}

export function blockTypeToId(type) {
  if (!type) return BLOCK_ID_AIR;
  return BLOCK_IDS_BY_TYPE[type] ?? BLOCK_ID_DIRT;
}

export function blockIdToType(id) {
  return BLOCK_TYPES_BY_ID[id] ?? null;
}
