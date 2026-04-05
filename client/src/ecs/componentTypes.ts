export const COMPONENT_TRANSFORM = 'transform';
export const COMPONENT_PHYSICS = 'physics';
export const COMPONENT_CONTROLLER = 'controller';
export const COMPONENT_GAMEMODE = 'gamemode';
export const COMPONENT_MOB = 'mob';
export const COMPONENT_MOB_AI = 'mob_ai';
export const COMPONENT_MOB_RENDER = 'mob_render';

export type ComponentType =
  | typeof COMPONENT_TRANSFORM
  | typeof COMPONENT_PHYSICS
  | typeof COMPONENT_CONTROLLER
  | typeof COMPONENT_GAMEMODE
  | typeof COMPONENT_MOB
  | typeof COMPONENT_MOB_AI
  | typeof COMPONENT_MOB_RENDER;
