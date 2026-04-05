export const GAMEMODE_SURVIVAL = 'survival';
export const GAMEMODE_SPECTATOR = 'spectator';

export type Gamemode = typeof GAMEMODE_SURVIVAL | typeof GAMEMODE_SPECTATOR;

export function isValidGamemode(mode: string): mode is Gamemode {
  return mode === GAMEMODE_SURVIVAL || mode === GAMEMODE_SPECTATOR;
}
