import type { BlockType } from '../world/services/BlockPalette';

export type ItemType = 'stick' | 'wooden_pickaxe' | 'wooden_sword';

export const WOODEN_SWORD_DAMAGE = 4;
export const WOODEN_PICKAXE_STONE_MULTIPLIER = 0.35;

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

const encodeSvg = (svg: string): string => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const WOODEN_SWORD_ICON = encodeSvg(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
     <rect x='11' y='4' width='2' height='10' fill='#caa16a'/>
     <polygon points='12,2 9,5 15,5' fill='#d5b07a'/>
     <rect x='9' y='13' width='6' height='2' fill='#a26a3a'/>
     <rect x='11' y='15' width='2' height='5' fill='#7b4d2a'/>
     <rect x='10' y='20' width='4' height='2' rx='1' fill='#5b371f'/>
   </svg>`
);

const WOODEN_PICKAXE_ICON = encodeSvg(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>
     <rect x='10.5' y='5' width='3' height='14' fill='#7b4d2a' transform='rotate(-45 12 12)'/>
     <rect x='4' y='6' width='16' height='3' rx='1' fill='#caa16a'/>
     <rect x='3' y='4' width='6' height='3' rx='1' fill='#b18455'/>
     <rect x='15' y='4' width='6' height='3' rx='1' fill='#b18455'/>
   </svg>`
);

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
    icon: WOODEN_PICKAXE_ICON,
    maxStack: 1,
    tool: {
      breakMultipliers: { stone: WOODEN_PICKAXE_STONE_MULTIPLIER }
    }
  },
  wooden_sword: {
    type: 'wooden_sword',
    displayName: 'Wooden Sword',
    swatch: '#b9824e',
    icon: WOODEN_SWORD_ICON,
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
