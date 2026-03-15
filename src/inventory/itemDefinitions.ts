import type { BlockType } from '../world/services/BlockPalette';

export type ItemType = 'stick' | 'wooden_pickaxe' | 'wooden_sword';

export const WOODEN_SWORD_DAMAGE = 4;
export const WOODEN_PICKAXE_STONE_MULTIPLIER = 0.35;

export type ItemDefinition = {
  type: ItemType;
  displayName: string;
  swatch: string;
  maxStack: number;
  tool?: {
    attackDamage?: number;
    breakMultipliers?: Partial<Record<BlockType, number>>;
  };
};

const ITEM_DEFINITIONS: Record<ItemType, ItemDefinition> = {
  stick: {
    type: 'stick',
    displayName: 'Stick',
    swatch: '#d1a879',
    maxStack: 64
  },
  wooden_pickaxe: {
    type: 'wooden_pickaxe',
    displayName: 'Wooden Pickaxe',
    swatch: '#c7935f',
    maxStack: 1,
    tool: {
      breakMultipliers: { stone: WOODEN_PICKAXE_STONE_MULTIPLIER }
    }
  },
  wooden_sword: {
    type: 'wooden_sword',
    displayName: 'Wooden Sword',
    swatch: '#b9824e',
    maxStack: 1,
    tool: {
      attackDamage: WOODEN_SWORD_DAMAGE
    }
  }
};

export function getItemDefinition(type: ItemType): ItemDefinition {
  return ITEM_DEFINITIONS[type];
}

export function isValidItemType(value: string): value is ItemType {
  return value in ITEM_DEFINITIONS;
}

export function getItemMaxStack(type: ItemType): number {
  return ITEM_DEFINITIONS[type]?.maxStack ?? 64;
}
