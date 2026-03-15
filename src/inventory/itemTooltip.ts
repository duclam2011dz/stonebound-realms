import type { InventoryItem, InventorySlot } from './itemTypes';
import { isBlockSlot, isFoodSlot, isItemSlot } from './itemTypes';
import { getFoodDefinition } from './foodDefinitions';
import { getItemDefinition } from './itemDefinitions';
import { getBlockDisplayName } from './blockDefinitions';

export function getItemDisplayName(item: InventoryItem): string {
  if (item.kind === 'block') return getBlockDisplayName(item.blockType);
  if (item.kind === 'food') return getFoodDefinition(item.foodType).displayName;
  return getItemDefinition(item.itemType).displayName;
}

export function getItemTooltip(slot: InventorySlot | null): string {
  if (!slot) return '';
  if (isBlockSlot(slot)) {
    return getBlockDisplayName(slot.blockType);
  }
  if (isFoodSlot(slot)) {
    const food = getFoodDefinition(slot.foodType);
    return `${food.displayName}\nHunger: +${food.hungerRestore}`;
  }
  if (isItemSlot(slot)) {
    const def = getItemDefinition(slot.itemType);
    const lines = [def.displayName];
    const attackDamage = def.tool?.attackDamage;
    if (attackDamage) {
      lines.push(`Damage: ${attackDamage}`);
    }
    const stoneMultiplier = def.tool?.breakMultipliers?.stone;
    if (stoneMultiplier) {
      const speed = Math.max(1, Math.round(1 / stoneMultiplier));
      lines.push(`Stone speed: x${speed}`);
    }
    return lines.join('\n');
  }
  return '';
}
