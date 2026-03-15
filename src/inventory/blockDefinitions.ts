import type { BlockType } from '../world/services/BlockPalette';

const BLOCK_DISPLAY_NAMES: Record<BlockType, string> = {
  grass: 'Grass Block',
  dirt: 'Dirt',
  stone: 'Stone',
  wood: 'Wood Log',
  leaf: 'Leaves',
  sand: 'Sand',
  lamp: 'Lamp',
  plank: 'Planks',
  crafting_table: 'Crafting Table'
};

export function getBlockDisplayName(type: BlockType): string {
  return BLOCK_DISPLAY_NAMES[type] ?? type;
}
