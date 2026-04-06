import type { BlockType } from '../world/services/BlockPalette';
import stickIconUrl from '../../assets/items/stick.png';
import woodenPickaxeIconUrl from '../../assets/items/wooden_pickaxe.png';
import woodenSwordIconUrl from '../../assets/items/wooden_sword.png';
import stonePickaxeIconUrl from '../../assets/items/stone_pickaxe.png';
import stoneSwordIconUrl from '../../assets/items/stone_sword.png';

export type ItemType =
  | 'stick'
  | 'wooden_pickaxe'
  | 'wooden_sword'
  | 'stone_pickaxe'
  | 'stone_sword';

export const WOODEN_SWORD_DAMAGE = 4;
export const STONE_SWORD_DAMAGE = 5;
export const WOODEN_PICKAXE_STONE_MULTIPLIER = 0.35;
export const STONE_PICKAXE_STONE_MULTIPLIER = 0.2;

export type ItemDefinition = {
  type: ItemType;
  displayName: string;
  swatch: string;
  icon?: string;
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
    icon: stickIconUrl,
    maxStack: 64
  },
  wooden_pickaxe: {
    type: 'wooden_pickaxe',
    displayName: 'Wooden Pickaxe',
    swatch: '#c7935f',
    icon: woodenPickaxeIconUrl,
    maxStack: 1,
    tool: {
      breakMultipliers: { stone: WOODEN_PICKAXE_STONE_MULTIPLIER }
    }
  },
  wooden_sword: {
    type: 'wooden_sword',
    displayName: 'Wooden Sword',
    swatch: '#b9824e',
    icon: woodenSwordIconUrl,
    maxStack: 1,
    tool: {
      attackDamage: WOODEN_SWORD_DAMAGE
    }
  },
  stone_pickaxe: {
    type: 'stone_pickaxe',
    displayName: 'Stone Pickaxe',
    swatch: '#9aa1ac',
    icon: stonePickaxeIconUrl,
    maxStack: 1,
    tool: {
      breakMultipliers: { stone: STONE_PICKAXE_STONE_MULTIPLIER }
    }
  },
  stone_sword: {
    type: 'stone_sword',
    displayName: 'Stone Sword',
    swatch: '#9097a3',
    icon: stoneSwordIconUrl,
    maxStack: 1,
    tool: {
      attackDamage: STONE_SWORD_DAMAGE
    }
  }
};

export const ITEM_TYPES: ItemType[] = Object.keys(ITEM_DEFINITIONS) as ItemType[];

export function getItemDefinition(type: ItemType): ItemDefinition {
  return ITEM_DEFINITIONS[type];
}

export function isValidItemType(value: string): value is ItemType {
  return value in ITEM_DEFINITIONS;
}

export function getItemMaxStack(type: ItemType): number {
  return ITEM_DEFINITIONS[type]?.maxStack ?? 64;
}
