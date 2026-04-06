export type MobType = 'pig' | 'cow' | 'chicken' | 'sheep';

import type { FoodType } from '../inventory/foodDefinitions';
import temperatePigUrl from '../../assets/mobs/pig/temperate_pig.png';
import temperateCowUrl from '../../assets/mobs/cow/temperate_cow.png';
import temperateChickenUrl from '../../assets/mobs/chicken/temperate_chicken.png';
import sheepUrl from '../../assets/mobs/sheep/sheep.png';

export type MobSkinBoxLayout = {
  textureOffsetX: number;
  textureOffsetY: number;
  boxWidth: number;
  boxHeight: number;
  boxDepth: number;
};

export type MobSkinDefinition = {
  textureUrl: string;
  textureWidth: number;
  textureHeight: number;
  head: MobSkinBoxLayout;
  body: MobSkinBoxLayout;
  leg: MobSkinBoxLayout;
};

export type MobDefinition = {
  type: MobType;
  displayName: string;
  speed: number;
  radius: number;
  height: number;
  maxHealth: number;
  groupSize: { min: number; max: number };
  drops: { food: FoodType; amount: number };
  skin: MobSkinDefinition;
  body: { width: number; height: number; length: number };
  head: { width: number; height: number; length: number };
  leg: { size: number; height: number };
};

const MOB_DEFINITIONS: Record<MobType, MobDefinition> = {
  pig: {
    type: 'pig',
    displayName: 'Pig',
    speed: 1.15,
    radius: 0.45,
    height: 1.2,
    maxHealth: 6,
    groupSize: { min: 1, max: 4 },
    drops: { food: 'pork', amount: 1 },
    skin: {
      textureUrl: temperatePigUrl,
      textureWidth: 64,
      textureHeight: 64,
      head: { textureOffsetX: 0, textureOffsetY: 0, boxWidth: 8, boxHeight: 8, boxDepth: 8 },
      body: {
        textureOffsetX: 28,
        textureOffsetY: 8,
        boxWidth: 10,
        boxHeight: 16,
        boxDepth: 8
      },
      leg: { textureOffsetX: 0, textureOffsetY: 16, boxWidth: 4, boxHeight: 6, boxDepth: 4 }
    },
    body: { width: 0.9, height: 0.6, length: 1.2 },
    head: { width: 0.55, height: 0.55, length: 0.55 },
    leg: { size: 0.22, height: 0.5 }
  },
  cow: {
    type: 'cow',
    displayName: 'Cow',
    speed: 1.05,
    radius: 0.5,
    height: 1.35,
    maxHealth: 10,
    groupSize: { min: 1, max: 4 },
    drops: { food: 'beef', amount: 1 },
    skin: {
      textureUrl: temperateCowUrl,
      textureWidth: 64,
      textureHeight: 64,
      head: { textureOffsetX: 0, textureOffsetY: 0, boxWidth: 8, boxHeight: 8, boxDepth: 6 },
      body: {
        textureOffsetX: 18,
        textureOffsetY: 4,
        boxWidth: 12,
        boxHeight: 18,
        boxDepth: 10
      },
      leg: { textureOffsetX: 0, textureOffsetY: 16, boxWidth: 4, boxHeight: 12, boxDepth: 4 }
    },
    body: { width: 1.0, height: 0.7, length: 1.4 },
    head: { width: 0.6, height: 0.6, length: 0.6 },
    leg: { size: 0.24, height: 0.55 }
  },
  sheep: {
    type: 'sheep',
    displayName: 'Sheep',
    speed: 1.1,
    radius: 0.48,
    height: 1.3,
    maxHealth: 8,
    groupSize: { min: 2, max: 4 },
    drops: { food: 'mutton', amount: 1 },
    skin: {
      textureUrl: sheepUrl,
      textureWidth: 64,
      textureHeight: 32,
      head: { textureOffsetX: 0, textureOffsetY: 0, boxWidth: 6, boxHeight: 6, boxDepth: 8 },
      body: {
        textureOffsetX: 28,
        textureOffsetY: 8,
        boxWidth: 8,
        boxHeight: 16,
        boxDepth: 6
      },
      leg: { textureOffsetX: 0, textureOffsetY: 16, boxWidth: 4, boxHeight: 6, boxDepth: 4 }
    },
    body: { width: 0.95, height: 0.7, length: 1.2 },
    head: { width: 0.55, height: 0.55, length: 0.55 },
    leg: { size: 0.22, height: 0.52 }
  },
  chicken: {
    type: 'chicken',
    displayName: 'Chicken',
    speed: 1.35,
    radius: 0.32,
    height: 0.9,
    maxHealth: 4,
    groupSize: { min: 4, max: 4 },
    drops: { food: 'chicken', amount: 1 },
    skin: {
      textureUrl: temperateChickenUrl,
      textureWidth: 64,
      textureHeight: 32,
      head: { textureOffsetX: 0, textureOffsetY: 0, boxWidth: 4, boxHeight: 6, boxDepth: 3 },
      body: { textureOffsetX: 0, textureOffsetY: 9, boxWidth: 6, boxHeight: 8, boxDepth: 6 },
      leg: { textureOffsetX: 26, textureOffsetY: 0, boxWidth: 3, boxHeight: 5, boxDepth: 3 }
    },
    body: { width: 0.6, height: 0.45, length: 0.7 },
    head: { width: 0.4, height: 0.4, length: 0.4 },
    leg: { size: 0.16, height: 0.38 }
  }
};

export const MOB_TYPES: MobType[] = ['pig', 'cow', 'chicken', 'sheep'];

export function getMobDefinition(type: MobType): MobDefinition {
  return MOB_DEFINITIONS[type];
}

export function isValidMobType(value: string): value is MobType {
  return MOB_TYPES.includes(value as MobType);
}
