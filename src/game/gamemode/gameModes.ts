export const GAMEMODE_SURVIVAL = 'survival';
export const GAMEMODE_SPECTATOR = 'spectator';

export function isValidGamemode(mode) {
  return mode === GAMEMODE_SURVIVAL || mode === GAMEMODE_SPECTATOR;
}
