import type { InventoryItem, InventorySlot } from '../itemTypes';
import { getItemKey } from '../itemTypes';
import type { BlockType } from '../../world/services/BlockPalette';
import type { ItemType } from '../itemDefinitions';

export type CraftingRecipe = {
  id: string;
  width: number;
  height: number;
  pattern: Array<InventoryItem | null>;
  result: InventoryItem;
  resultCount: number;
  requiresTable?: boolean;
};

export type CraftingMatch = {
  recipe: CraftingRecipe;
  offsetX: number;
  offsetY: number;
};

const makeBlock = (blockType: BlockType): InventoryItem => ({ kind: 'block', blockType });
const makeItem = (itemType: ItemType): InventoryItem => ({ kind: 'item', itemType });

const RECIPES: CraftingRecipe[] = [
  {
    id: 'plank_from_wood',
    width: 1,
    height: 1,
    pattern: [makeBlock('wood')],
    result: makeBlock('plank'),
    resultCount: 4
  },
  {
    id: 'crafting_table',
    width: 2,
    height: 2,
    pattern: [makeBlock('plank'), makeBlock('plank'), makeBlock('plank'), makeBlock('plank')],
    result: makeBlock('crafting_table'),
    resultCount: 1
  },
  {
    id: 'stick',
    width: 1,
    height: 2,
    pattern: [makeBlock('plank'), makeBlock('plank')],
    result: makeItem('stick'),
    resultCount: 4
  },
  {
    id: 'wooden_pickaxe',
    width: 3,
    height: 3,
    pattern: [
      makeBlock('plank'),
      makeBlock('plank'),
      makeBlock('plank'),
      null,
      makeItem('stick'),
      null,
      null,
      makeItem('stick'),
      null
    ],
    result: makeItem('wooden_pickaxe'),
    resultCount: 1,
    requiresTable: true
  },
  {
    id: 'wooden_sword',
    width: 1,
    height: 3,
    pattern: [makeBlock('plank'), makeBlock('plank'), makeItem('stick')],
    result: makeItem('wooden_sword'),
    resultCount: 1,
    requiresTable: true
  },
  {
    id: 'stone_pickaxe',
    width: 3,
    height: 3,
    pattern: [
      makeBlock('stone'),
      makeBlock('stone'),
      makeBlock('stone'),
      null,
      makeItem('stick'),
      null,
      null,
      makeItem('stick'),
      null
    ],
    result: makeItem('stone_pickaxe'),
    resultCount: 1,
    requiresTable: true
  },
  {
    id: 'stone_sword',
    width: 1,
    height: 3,
    pattern: [makeBlock('stone'), makeBlock('stone'), makeItem('stick')],
    result: makeItem('stone_sword'),
    resultCount: 1,
    requiresTable: true
  }
];

function slotMatchesItem(slot: InventorySlot | null, item: InventoryItem | null): boolean {
  if (!slot && !item) return true;
  if (!slot || !item) return false;
  return getItemKey(slot) === getItemKey(item);
}

export function findMatchingRecipe(
  grid: Array<InventorySlot | null>,
  gridSize: number,
  hasTable: boolean
): CraftingMatch | null {
  const size = Math.max(1, Math.floor(gridSize));
  for (const recipe of RECIPES) {
    if (recipe.requiresTable && !hasTable) continue;
    if (recipe.width > size || recipe.height > size) continue;
    for (let offsetY = 0; offsetY <= size - recipe.height; offsetY++) {
      for (let offsetX = 0; offsetX <= size - recipe.width; offsetX++) {
        let matches = true;
        for (let y = 0; y < size && matches; y++) {
          for (let x = 0; x < size; x++) {
            const gridIndex = y * size + x;
            const slot = grid[gridIndex] ?? null;
            const inside =
              x >= offsetX &&
              x < offsetX + recipe.width &&
              y >= offsetY &&
              y < offsetY + recipe.height;
            const patternIndex = inside ? (y - offsetY) * recipe.width + (x - offsetX) : -1;
            const expected = inside ? (recipe.pattern[patternIndex] ?? null) : null;
            if (!slotMatchesItem(slot, expected)) {
              matches = false;
              break;
            }
          }
        }
        if (matches) {
          return { recipe, offsetX, offsetY };
        }
      }
    }
  }
  return null;
}
