export const BIOME_PLAIN = 0;
export const BIOME_FOREST = 1;
export const BIOME_HILL = 2;
export const BIOME_DESERT = 3;

export const BIOME_NAME_BY_ID = Object.freeze({
  [BIOME_PLAIN]: 'plain',
  [BIOME_FOREST]: 'forest',
  [BIOME_HILL]: 'hill',
  [BIOME_DESERT]: 'desert'
});

export function biomeIdToName(biomeId) {
  return BIOME_NAME_BY_ID[biomeId] ?? 'plain';
}
