import type { BlockType } from '../../world/services/BlockPalette';
import {
  STONE_PICKAXE_STONE_MULTIPLIER,
  WOODEN_PICKAXE_STONE_MULTIPLIER
} from '../../inventory/itemDefinitions';
import type { InventorySlot } from '../../inventory/itemTypes';
import { isItemSlot } from '../../inventory/itemTypes';

const BREAK_DURATION_MS: Readonly<Record<BlockType, number>> = Object.freeze({
  grass: 320,
  dirt: 360,
  sand: 280,
  stone: 950,
  wood: 720,
  leaf: 180,
  lamp: 260,
  plank: 420,
  crafting_table: 520
});

export function getBreakDurationMs(
  blockType: BlockType,
  tool: InventorySlot | null = null
): number {
  const base = BREAK_DURATION_MS[blockType] ?? 450;
  if (blockType === 'stone' && isItemSlot(tool)) {
    if (tool.itemType === 'stone_pickaxe') {
      return Math.max(1, Math.round(base * STONE_PICKAXE_STONE_MULTIPLIER));
    }
    if (tool.itemType === 'wooden_pickaxe') {
      return Math.max(1, Math.round(base * WOODEN_PICKAXE_STONE_MULTIPLIER));
    }
  }
  return base;
}

export function getBlockTargetKey(x: number, y: number, z: number): string {
  return `${x}|${y}|${z}`;
}
