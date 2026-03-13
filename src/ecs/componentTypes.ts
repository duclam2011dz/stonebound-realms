export const COMPONENT_TRANSFORM = 'transform';
export const COMPONENT_PHYSICS = 'physics';
export const COMPONENT_CONTROLLER = 'controller';
export const COMPONENT_GAMEMODE = 'gamemode';

export type ComponentType =
  | typeof COMPONENT_TRANSFORM
  | typeof COMPONENT_PHYSICS
  | typeof COMPONENT_CONTROLLER
  | typeof COMPONENT_GAMEMODE;
