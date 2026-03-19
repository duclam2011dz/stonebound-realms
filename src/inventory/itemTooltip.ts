import type { InventoryItem, InventorySlot } from './itemTypes';
import { isBlockSlot, isFoodSlot, isItemSlot } from './itemTypes';
import { getFoodDefinition } from './foodDefinitions';
import { getItemDefinition } from './itemDefinitions';
import { getBlockDisplayName } from './blockDefinitions';

export type ItemTooltipLineTone = 'damage' | 'speed' | 'hunger' | 'muted';
export type ItemTooltipTagTone = 'block' | 'food' | 'tool' | 'weapon' | 'material' | 'utility';

export type ItemTooltipLine = {
  label: string;
  value: string;
  tone?: ItemTooltipLineTone;
};

export type ItemTooltipTag = {
  label: string;
  tone?: ItemTooltipTagTone;
};

export type ItemTooltipData = {
  title: string;
  tags: ItemTooltipTag[];
  lines: ItemTooltipLine[];
};

export function getItemDisplayName(item: InventoryItem): string {
  if (item.kind === 'block') return getBlockDisplayName(item.blockType);
  if (item.kind === 'food') return getFoodDefinition(item.foodType).displayName;
  return getItemDefinition(item.itemType).displayName;
}

function uniqueTags(tags: ItemTooltipTag[]): ItemTooltipTag[] {
  const seen = new Set<string>();
  const result: ItemTooltipTag[] = [];
  for (const tag of tags) {
    if (!tag.label || seen.has(tag.label)) continue;
    seen.add(tag.label);
    result.push(tag);
  }
  return result;
}

function getMaterialTag(itemType: string): ItemTooltipTag | null {
  if (itemType.startsWith('wooden_') || itemType === 'stick') {
    return { label: 'Wood', tone: 'material' };
  }
  if (itemType.startsWith('stone_')) {
    return { label: 'Stone', tone: 'material' };
  }
  return null;
}

export function getItemTooltipData(slot: InventorySlot | null): ItemTooltipData | null {
  if (!slot) return null;
  if (isBlockSlot(slot)) {
    return {
      title: getBlockDisplayName(slot.blockType),
      tags: [{ label: 'Block', tone: 'block' }],
      lines: []
    };
  }
  if (isFoodSlot(slot)) {
    const food = getFoodDefinition(slot.foodType);
    return {
      title: food.displayName,
      tags: [{ label: 'Food', tone: 'food' }],
      lines: [{ label: 'Hunger', value: `+${food.hungerRestore}`, tone: 'hunger' }]
    };
  }
  if (isItemSlot(slot)) {
    const def = getItemDefinition(slot.itemType);
    const tags: ItemTooltipTag[] = [];
    const materialTag = getMaterialTag(slot.itemType);
    if (materialTag) tags.push(materialTag);
    if (def.tool) tags.push({ label: 'Tool', tone: 'tool' });

    const lines: ItemTooltipLine[] = [];
    const attackDamage = def.tool?.attackDamage;
    if (attackDamage) {
      tags.push({ label: 'Weapon', tone: 'weapon' });
      lines.push({ label: 'Damage', value: String(attackDamage), tone: 'damage' });
    }
    const stoneMultiplier = def.tool?.breakMultipliers?.stone;
    if (stoneMultiplier) {
      tags.push({ label: 'Mining', tone: 'tool' });
      const speed = Math.max(1, Math.round(1 / stoneMultiplier));
      lines.push({ label: 'Stone Speed', value: `x${speed}`, tone: 'speed' });
    }

    if (!tags.length) tags.push({ label: 'Item', tone: 'utility' });
    return {
      title: def.displayName,
      tags: uniqueTags(tags),
      lines
    };
  }
  return null;
}
