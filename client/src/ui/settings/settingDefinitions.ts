import type { GameSettings } from '../../config/constants';

type SettingKeyByType<TValue> = {
  [TKey in keyof GameSettings]: GameSettings[TKey] extends TValue ? TKey : never;
}[keyof GameSettings];

export type SettingCategoryId = 'world' | 'movement' | 'camera' | 'interface';

export type SettingCategoryDefinition = {
  id: SettingCategoryId;
  label: string;
  description: string;
};

type BaseSettingFieldDefinition<TKey extends keyof GameSettings> = {
  key: TKey;
  category: SettingCategoryId;
  label: string;
  description: string;
  searchTerms?: string[];
};

export type RangeSettingFieldDefinition = BaseSettingFieldDefinition<SettingKeyByType<number>> & {
  type: 'range';
  min: number;
  max: number;
  step: number;
  precision: number;
};

export type ToggleSettingFieldDefinition = BaseSettingFieldDefinition<
  SettingKeyByType<boolean>
> & {
  type: 'toggle';
  enabledLabel?: string;
  disabledLabel?: string;
};

export type SettingFieldDefinition = RangeSettingFieldDefinition | ToggleSettingFieldDefinition;

export const SETTING_CATEGORIES: SettingCategoryDefinition[] = [
  {
    id: 'world',
    label: 'World',
    description: 'View distance, chunk detail, and interaction reach.'
  },
  {
    id: 'movement',
    label: 'Movement',
    description: 'Traversal speed, jump feel, gravity, and acceleration tuning.'
  },
  {
    id: 'camera',
    label: 'Camera',
    description: 'Mouse look responsiveness and camera comfort.'
  },
  {
    id: 'interface',
    label: 'Interface',
    description: 'Heads-up display, overlays, and other presentation helpers.'
  }
];

export const SETTING_FIELDS: SettingFieldDefinition[] = [
  {
    key: 'renderDistance',
    type: 'range',
    category: 'world',
    label: 'Render Distance',
    description: 'How many chunk rings stay visible around the player.',
    min: 1,
    max: 12,
    step: 1,
    precision: 0,
    searchTerms: ['chunks', 'view distance']
  },
  {
    key: 'lodStartDistance',
    type: 'range',
    category: 'world',
    label: 'LOD Start Ring',
    description: 'How early distant chunks switch to lighter meshes.',
    min: 1,
    max: 12,
    step: 1,
    precision: 0,
    searchTerms: ['level of detail', 'lod']
  },
  {
    key: 'maxRayDistance',
    type: 'range',
    category: 'world',
    label: 'Reach Distance',
    description: 'How far you can target, break, and place blocks.',
    min: 2,
    max: 12,
    step: 0.5,
    precision: 1,
    searchTerms: ['raycast', 'interaction', 'block reach']
  },
  {
    key: 'moveSpeed',
    type: 'range',
    category: 'movement',
    label: 'Move Speed',
    description: 'Base horizontal movement speed while on the ground.',
    min: 1,
    max: 20,
    step: 0.5,
    precision: 1,
    searchTerms: ['walk speed', 'run']
  },
  {
    key: 'jumpSpeed',
    type: 'range',
    category: 'movement',
    label: 'Jump Speed',
    description: 'Initial vertical launch speed when you jump.',
    min: 2,
    max: 20,
    step: 0.5,
    precision: 1,
    searchTerms: ['jump height']
  },
  {
    key: 'gravity',
    type: 'range',
    category: 'movement',
    label: 'Gravity',
    description: 'How strongly the player is pulled back down.',
    min: 5,
    max: 60,
    step: 1,
    precision: 0,
    searchTerms: ['fall speed']
  },
  {
    key: 'groundAcceleration',
    type: 'range',
    category: 'movement',
    label: 'Ground Accel',
    description: 'How quickly you reach top speed on the ground.',
    min: 10,
    max: 120,
    step: 1,
    precision: 0,
    searchTerms: ['ground acceleration']
  },
  {
    key: 'airAcceleration',
    type: 'range',
    category: 'movement',
    label: 'Air Accel',
    description: 'How strongly movement input steers you mid-air.',
    min: 2,
    max: 80,
    step: 1,
    precision: 0,
    searchTerms: ['air control']
  },
  {
    key: 'groundFriction',
    type: 'range',
    category: 'movement',
    label: 'Ground Friction',
    description: 'How fast ground movement slows when you release input.',
    min: 2,
    max: 30,
    step: 0.5,
    precision: 1,
    searchTerms: ['brake', 'stop speed']
  },
  {
    key: 'airDrag',
    type: 'range',
    category: 'movement',
    label: 'Air Drag',
    description: 'Passive horizontal damping while airborne.',
    min: 0.1,
    max: 8,
    step: 0.1,
    precision: 1,
    searchTerms: ['air resistance']
  },
  {
    key: 'airBrake',
    type: 'range',
    category: 'movement',
    label: 'Air Brake',
    description: 'Extra slowdown when airborne with no movement input.',
    min: 0.5,
    max: 10,
    step: 0.1,
    precision: 1,
    searchTerms: ['air stop', 'release']
  },
  {
    key: 'lookSensitivity',
    type: 'range',
    category: 'camera',
    label: 'Look Sensitivity',
    description: 'How fast mouse movement turns the camera.',
    min: 0.0005,
    max: 0.01,
    step: 0.0001,
    precision: 4,
    searchTerms: ['mouse', 'camera sensitivity']
  },
  {
    key: 'showHelpOverlay',
    type: 'toggle',
    category: 'interface',
    label: 'Show Help UI',
    description: 'Display the controls guide automatically whenever you enter a world.',
    enabledLabel: 'On',
    disabledLabel: 'Off',
    searchTerms: ['help overlay', 'hud help', 'tutorial']
  }
];

export function getSettingCategoryDefinition(
  categoryId: SettingCategoryId
): SettingCategoryDefinition {
  const fallbackCategory: SettingCategoryDefinition = {
    id: 'world',
    label: 'World',
    description: 'View distance, chunk detail, and interaction reach.'
  };
  return SETTING_CATEGORIES.find((category) => category.id === categoryId) ?? fallbackCategory;
}
