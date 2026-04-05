export type FoodType = 'pork' | 'beef' | 'mutton' | 'chicken';

export type FoodDefinition = {
  type: FoodType;
  displayName: string;
  hungerRestore: number;
  swatch: string;
};

const FOOD_DEFINITIONS: Record<FoodType, FoodDefinition> = {
  pork: {
    type: 'pork',
    displayName: 'Raw Pork',
    hungerRestore: 4,
    swatch: '#d47a86'
  },
  beef: {
    type: 'beef',
    displayName: 'Raw Beef',
    hungerRestore: 5,
    swatch: '#b5634c'
  },
  mutton: {
    type: 'mutton',
    displayName: 'Raw Mutton',
    hungerRestore: 4,
    swatch: '#c58c9c'
  },
  chicken: {
    type: 'chicken',
    displayName: 'Raw Chicken',
    hungerRestore: 3,
    swatch: '#f0c99a'
  }
};

export function getFoodDefinition(type: FoodType): FoodDefinition {
  return FOOD_DEFINITIONS[type];
}

export function isValidFoodType(value: string): value is FoodType {
  return value in FOOD_DEFINITIONS;
}

export const FOOD_TYPES: FoodType[] = Object.keys(FOOD_DEFINITIONS) as FoodType[];
