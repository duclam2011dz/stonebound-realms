import type { BlockType } from '../world/services/BlockPalette';
import type { FoodType } from './foodDefinitions';
import type { ItemType } from './itemDefinitions';

export type InventoryItem =
  | { kind: 'block'; blockType: BlockType }
  | { kind: 'food'; foodType: FoodType }
  | { kind: 'item'; itemType: ItemType };

export type InventorySlot = InventoryItem & { quantity: number };

export function getItemKey(item: InventoryItem): string {
  if (item.kind === 'block') return `block:${item.blockType}`;
  if (item.kind === 'food') return `food:${item.foodType}`;
  return `item:${item.itemType}`;
}

export function isBlockSlot(
  slot: InventorySlot | null | undefined
): slot is { kind: 'block'; blockType: BlockType; quantity: number } {
  return Boolean(slot && slot.kind === 'block' && slot.blockType);
}

export function isFoodSlot(
  slot: InventorySlot | null | undefined
): slot is { kind: 'food'; foodType: FoodType; quantity: number } {
  return Boolean(slot && slot.kind === 'food' && slot.foodType);
}

export function isItemSlot(
  slot: InventorySlot | null | undefined
): slot is { kind: 'item'; itemType: ItemType; quantity: number } {
  return Boolean(slot && slot.kind === 'item' && slot.itemType);
}
