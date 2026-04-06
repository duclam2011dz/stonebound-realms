export type MobType = 'pig' | 'cow' | 'chicken' | 'sheep';

import type { FoodType } from '../inventory/foodDefinitions';
import temperatePigUrl from '../../assets/mobs/pig/temperate_pig.png';
import temperateCowUrl from '../../assets/mobs/cow/temperate_cow.png';
import temperateChickenUrl from '../../assets/mobs/chicken/temperate_chicken.png';
import sheepUrl from '../../assets/mobs/sheep/sheep.png';
import sheepWoolUrl from '../../assets/mobs/sheep/sheep_wool.png';

export type MobTextureLayerDefinition = {
  textureUrl: string;
  textureWidth: number;
  textureHeight: number;
};

export type MobAnimationRole =
  | 'head'
  | 'rightFrontLeg'
  | 'leftFrontLeg'
  | 'rightHindLeg'
  | 'leftHindLeg'
  | 'rightLeg'
  | 'leftLeg'
  | 'rightWing'
  | 'leftWing';

export type MobCubeDefinition = {
  textureLayer: string;
  textureOffsetX: number;
  textureOffsetY: number;
  boxWidth: number;
  boxHeight: number;
  boxDepth: number;
  originX: number;
  originY: number;
  originZ: number;
  inflate?: number;
};

export type MobPartDefinition = {
  name: string;
  pivotX: number;
  pivotY: number;
  pivotZ: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  animationRole?: MobAnimationRole;
  cubes: MobCubeDefinition[];
};

export type MobModelDefinition = {
  groundY: number;
  yawOffset: number;
  textureLayers: Record<string, MobTextureLayerDefinition>;
  parts: MobPartDefinition[];
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
  model: MobModelDefinition;
};

const MOB_DEFINITIONS: Record<MobType, MobDefinition> = {
  pig: {
    type: 'pig',
    displayName: 'Pig',
    speed: 1.15,
    radius: 0.45,
    height: 0.9,
    maxHealth: 6,
    groupSize: { min: 1, max: 4 },
    drops: { food: 'pork', amount: 1 },
    model: {
      groundY: 24,
      yawOffset: Math.PI,
      textureLayers: {
        base: {
          textureUrl: temperatePigUrl,
          textureWidth: 64,
          textureHeight: 64
        }
      },
      parts: [
        {
          name: 'head',
          pivotX: 0,
          pivotY: 12,
          pivotZ: -6,
          animationRole: 'head',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 0,
              textureOffsetY: 0,
              boxWidth: 8,
              boxHeight: 8,
              boxDepth: 8,
              originX: -4,
              originY: -4,
              originZ: -8
            },
            {
              textureLayer: 'base',
              textureOffsetX: 16,
              textureOffsetY: 16,
              boxWidth: 4,
              boxHeight: 3,
              boxDepth: 1,
              originX: -2,
              originY: 0,
              originZ: -9
            }
          ]
        },
        {
          name: 'body',
          pivotX: 0,
          pivotY: 11,
          pivotZ: 2,
          rotationX: Math.PI / 2,
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 28,
              textureOffsetY: 8,
              boxWidth: 10,
              boxHeight: 16,
              boxDepth: 8,
              originX: -5,
              originY: -10,
              originZ: -7
            }
          ]
        },
        {
          name: 'right_hind_leg',
          pivotX: -3,
          pivotY: 18,
          pivotZ: 7,
          animationRole: 'rightHindLeg',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 0,
              textureOffsetY: 16,
              boxWidth: 4,
              boxHeight: 6,
              boxDepth: 4,
              originX: -2,
              originY: 0,
              originZ: -2
            }
          ]
        },
        {
          name: 'left_hind_leg',
          pivotX: 3,
          pivotY: 18,
          pivotZ: 7,
          animationRole: 'leftHindLeg',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 0,
              textureOffsetY: 16,
              boxWidth: 4,
              boxHeight: 6,
              boxDepth: 4,
              originX: -2,
              originY: 0,
              originZ: -2
            }
          ]
        },
        {
          name: 'right_front_leg',
          pivotX: -3,
          pivotY: 18,
          pivotZ: -5,
          animationRole: 'rightFrontLeg',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 0,
              textureOffsetY: 16,
              boxWidth: 4,
              boxHeight: 6,
              boxDepth: 4,
              originX: -2,
              originY: 0,
              originZ: -2
            }
          ]
        },
        {
          name: 'left_front_leg',
          pivotX: 3,
          pivotY: 18,
          pivotZ: -5,
          animationRole: 'leftFrontLeg',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 0,
              textureOffsetY: 16,
              boxWidth: 4,
              boxHeight: 6,
              boxDepth: 4,
              originX: -2,
              originY: 0,
              originZ: -2
            }
          ]
        }
      ]
    }
  },
  cow: {
    type: 'cow',
    displayName: 'Cow',
    speed: 1.05,
    radius: 0.45,
    height: 1.4,
    maxHealth: 10,
    groupSize: { min: 1, max: 4 },
    drops: { food: 'beef', amount: 1 },
    model: {
      groundY: 24,
      yawOffset: Math.PI,
      textureLayers: {
        base: {
          textureUrl: temperateCowUrl,
          textureWidth: 64,
          textureHeight: 64
        }
      },
      parts: [
        {
          name: 'head',
          pivotX: 0,
          pivotY: 4,
          pivotZ: -8,
          animationRole: 'head',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 0,
              textureOffsetY: 0,
              boxWidth: 8,
              boxHeight: 8,
              boxDepth: 6,
              originX: -4,
              originY: -4,
              originZ: -6
            },
            {
              textureLayer: 'base',
              textureOffsetX: 22,
              textureOffsetY: 0,
              boxWidth: 1,
              boxHeight: 3,
              boxDepth: 1,
              originX: -5,
              originY: -5,
              originZ: -4
            },
            {
              textureLayer: 'base',
              textureOffsetX: 22,
              textureOffsetY: 0,
              boxWidth: 1,
              boxHeight: 3,
              boxDepth: 1,
              originX: 4,
              originY: -5,
              originZ: -4
            }
          ]
        },
        {
          name: 'body',
          pivotX: 0,
          pivotY: 5,
          pivotZ: 2,
          rotationX: Math.PI / 2,
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 18,
              textureOffsetY: 4,
              boxWidth: 12,
              boxHeight: 18,
              boxDepth: 10,
              originX: -6,
              originY: -10,
              originZ: -7
            },
            {
              textureLayer: 'base',
              textureOffsetX: 52,
              textureOffsetY: 0,
              boxWidth: 4,
              boxHeight: 6,
              boxDepth: 1,
              originX: -2,
              originY: 2,
              originZ: -8
            }
          ]
        },
        {
          name: 'right_hind_leg',
          pivotX: -4,
          pivotY: 12,
          pivotZ: 7,
          animationRole: 'rightHindLeg',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 0,
              textureOffsetY: 16,
              boxWidth: 4,
              boxHeight: 12,
              boxDepth: 4,
              originX: -2,
              originY: 0,
              originZ: -2
            }
          ]
        },
        {
          name: 'left_hind_leg',
          pivotX: 4,
          pivotY: 12,
          pivotZ: 7,
          animationRole: 'leftHindLeg',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 0,
              textureOffsetY: 16,
              boxWidth: 4,
              boxHeight: 12,
              boxDepth: 4,
              originX: -2,
              originY: 0,
              originZ: -2
            }
          ]
        },
        {
          name: 'right_front_leg',
          pivotX: -4,
          pivotY: 12,
          pivotZ: -6,
          animationRole: 'rightFrontLeg',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 0,
              textureOffsetY: 16,
              boxWidth: 4,
              boxHeight: 12,
              boxDepth: 4,
              originX: -2,
              originY: 0,
              originZ: -2
            }
          ]
        },
        {
          name: 'left_front_leg',
          pivotX: 4,
          pivotY: 12,
          pivotZ: -6,
          animationRole: 'leftFrontLeg',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 0,
              textureOffsetY: 16,
              boxWidth: 4,
              boxHeight: 12,
              boxDepth: 4,
              originX: -2,
              originY: 0,
              originZ: -2
            }
          ]
        }
      ]
    }
  },
  sheep: {
    type: 'sheep',
    displayName: 'Sheep',
    speed: 1.1,
    radius: 0.45,
    height: 1.3,
    maxHealth: 8,
    groupSize: { min: 2, max: 4 },
    drops: { food: 'mutton', amount: 1 },
    model: {
      groundY: 24,
      yawOffset: Math.PI,
      textureLayers: {
        base: {
          textureUrl: sheepUrl,
          textureWidth: 64,
          textureHeight: 32
        },
        wool: {
          textureUrl: sheepWoolUrl,
          textureWidth: 64,
          textureHeight: 32
        }
      },
      parts: [
        {
          name: 'head',
          pivotX: 0,
          pivotY: 6,
          pivotZ: -8,
          animationRole: 'head',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 0,
              textureOffsetY: 0,
              boxWidth: 6,
              boxHeight: 6,
              boxDepth: 8,
              originX: -3,
              originY: -4,
              originZ: -6
            }
          ]
        },
        {
          name: 'head_wool',
          pivotX: 0,
          pivotY: 6,
          pivotZ: -8,
          animationRole: 'head',
          cubes: [
            {
              textureLayer: 'wool',
              textureOffsetX: 0,
              textureOffsetY: 0,
              boxWidth: 6,
              boxHeight: 6,
              boxDepth: 6,
              originX: -3,
              originY: -4,
              originZ: -4,
              inflate: 0.6
            }
          ]
        },
        {
          name: 'body',
          pivotX: 0,
          pivotY: 5,
          pivotZ: 2,
          rotationX: Math.PI / 2,
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 28,
              textureOffsetY: 8,
              boxWidth: 8,
              boxHeight: 16,
              boxDepth: 6,
              originX: -4,
              originY: -10,
              originZ: -7
            }
          ]
        },
        {
          name: 'body_wool',
          pivotX: 0,
          pivotY: 5,
          pivotZ: 2,
          rotationX: Math.PI / 2,
          cubes: [
            {
              textureLayer: 'wool',
              textureOffsetX: 28,
              textureOffsetY: 8,
              boxWidth: 8,
              boxHeight: 16,
              boxDepth: 6,
              originX: -4,
              originY: -10,
              originZ: -7,
              inflate: 1.75
            }
          ]
        },
        {
          name: 'right_hind_leg',
          pivotX: -3,
          pivotY: 12,
          pivotZ: 7,
          animationRole: 'rightHindLeg',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 0,
              textureOffsetY: 16,
              boxWidth: 4,
              boxHeight: 12,
              boxDepth: 4,
              originX: -2,
              originY: 0,
              originZ: -2
            }
          ]
        },
        {
          name: 'left_hind_leg',
          pivotX: 3,
          pivotY: 12,
          pivotZ: 7,
          animationRole: 'leftHindLeg',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 0,
              textureOffsetY: 16,
              boxWidth: 4,
              boxHeight: 12,
              boxDepth: 4,
              originX: -2,
              originY: 0,
              originZ: -2
            }
          ]
        },
        {
          name: 'right_front_leg',
          pivotX: -3,
          pivotY: 12,
          pivotZ: -5,
          animationRole: 'rightFrontLeg',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 0,
              textureOffsetY: 16,
              boxWidth: 4,
              boxHeight: 12,
              boxDepth: 4,
              originX: -2,
              originY: 0,
              originZ: -2
            }
          ]
        },
        {
          name: 'left_front_leg',
          pivotX: 3,
          pivotY: 12,
          pivotZ: -5,
          animationRole: 'leftFrontLeg',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 0,
              textureOffsetY: 16,
              boxWidth: 4,
              boxHeight: 12,
              boxDepth: 4,
              originX: -2,
              originY: 0,
              originZ: -2
            }
          ]
        },
        {
          name: 'right_hind_leg_wool',
          pivotX: -3,
          pivotY: 12,
          pivotZ: 7,
          animationRole: 'rightHindLeg',
          cubes: [
            {
              textureLayer: 'wool',
              textureOffsetX: 0,
              textureOffsetY: 16,
              boxWidth: 4,
              boxHeight: 6,
              boxDepth: 4,
              originX: -2,
              originY: 0,
              originZ: -2,
              inflate: 0.5
            }
          ]
        },
        {
          name: 'left_hind_leg_wool',
          pivotX: 3,
          pivotY: 12,
          pivotZ: 7,
          animationRole: 'leftHindLeg',
          cubes: [
            {
              textureLayer: 'wool',
              textureOffsetX: 0,
              textureOffsetY: 16,
              boxWidth: 4,
              boxHeight: 6,
              boxDepth: 4,
              originX: -2,
              originY: 0,
              originZ: -2,
              inflate: 0.5
            }
          ]
        },
        {
          name: 'right_front_leg_wool',
          pivotX: -3,
          pivotY: 12,
          pivotZ: -5,
          animationRole: 'rightFrontLeg',
          cubes: [
            {
              textureLayer: 'wool',
              textureOffsetX: 0,
              textureOffsetY: 16,
              boxWidth: 4,
              boxHeight: 6,
              boxDepth: 4,
              originX: -2,
              originY: 0,
              originZ: -2,
              inflate: 0.5
            }
          ]
        },
        {
          name: 'left_front_leg_wool',
          pivotX: 3,
          pivotY: 12,
          pivotZ: -5,
          animationRole: 'leftFrontLeg',
          cubes: [
            {
              textureLayer: 'wool',
              textureOffsetX: 0,
              textureOffsetY: 16,
              boxWidth: 4,
              boxHeight: 6,
              boxDepth: 4,
              originX: -2,
              originY: 0,
              originZ: -2,
              inflate: 0.5
            }
          ]
        }
      ]
    }
  },
  chicken: {
    type: 'chicken',
    displayName: 'Chicken',
    speed: 1.35,
    radius: 0.2,
    height: 0.7,
    maxHealth: 4,
    groupSize: { min: 4, max: 4 },
    drops: { food: 'chicken', amount: 1 },
    model: {
      groundY: 24,
      yawOffset: Math.PI,
      textureLayers: {
        base: {
          textureUrl: temperateChickenUrl,
          textureWidth: 64,
          textureHeight: 32
        }
      },
      parts: [
        {
          name: 'head',
          pivotX: 0,
          pivotY: 15,
          pivotZ: -4,
          animationRole: 'head',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 0,
              textureOffsetY: 0,
              boxWidth: 4,
              boxHeight: 6,
              boxDepth: 3,
              originX: -2,
              originY: -6,
              originZ: -2
            },
            {
              textureLayer: 'base',
              textureOffsetX: 14,
              textureOffsetY: 0,
              boxWidth: 4,
              boxHeight: 2,
              boxDepth: 2,
              originX: -2,
              originY: -4,
              originZ: -4
            },
            {
              textureLayer: 'base',
              textureOffsetX: 14,
              textureOffsetY: 4,
              boxWidth: 2,
              boxHeight: 2,
              boxDepth: 2,
              originX: -1,
              originY: -2,
              originZ: -3
            }
          ]
        },
        {
          name: 'body',
          pivotX: 0,
          pivotY: 16,
          pivotZ: 0,
          rotationX: Math.PI / 2,
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 0,
              textureOffsetY: 9,
              boxWidth: 6,
              boxHeight: 8,
              boxDepth: 6,
              originX: -3,
              originY: -4,
              originZ: -3
            }
          ]
        },
        {
          name: 'right_leg',
          pivotX: -2,
          pivotY: 19,
          pivotZ: 1,
          animationRole: 'rightLeg',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 26,
              textureOffsetY: 0,
              boxWidth: 3,
              boxHeight: 5,
              boxDepth: 3,
              originX: -1,
              originY: 0,
              originZ: -3
            }
          ]
        },
        {
          name: 'left_leg',
          pivotX: 1,
          pivotY: 19,
          pivotZ: 1,
          animationRole: 'leftLeg',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 26,
              textureOffsetY: 0,
              boxWidth: 3,
              boxHeight: 5,
              boxDepth: 3,
              originX: -1,
              originY: 0,
              originZ: -3
            }
          ]
        },
        {
          name: 'right_wing',
          pivotX: -3,
          pivotY: 15.5,
          pivotZ: 0,
          animationRole: 'rightWing',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 24,
              textureOffsetY: 13,
              boxWidth: 1,
              boxHeight: 4,
              boxDepth: 6,
              originX: -0.5,
              originY: -0.5,
              originZ: -1.5
            }
          ]
        },
        {
          name: 'left_wing',
          pivotX: 3,
          pivotY: 15.5,
          pivotZ: 0,
          animationRole: 'leftWing',
          cubes: [
            {
              textureLayer: 'base',
              textureOffsetX: 24,
              textureOffsetY: 13,
              boxWidth: 1,
              boxHeight: 4,
              boxDepth: 6,
              originX: -0.5,
              originY: -0.5,
              originZ: -1.5
            }
          ]
        }
      ]
    }
  }
};

export const MOB_TYPES: MobType[] = ['pig', 'cow', 'chicken', 'sheep'];

export function getMobDefinition(type: MobType): MobDefinition {
  return MOB_DEFINITIONS[type];
}

export function isValidMobType(value: string): value is MobType {
  return MOB_TYPES.includes(value as MobType);
}
