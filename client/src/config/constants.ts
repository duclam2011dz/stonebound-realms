export const CHUNK_SIZE = 16;
export const WORLD_MAX_HEIGHT = 128;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_RADIUS = 0.34;
export const EYE_HEIGHT = 1.62;
export const DAY_NIGHT_CYCLE_SECONDS = 19 * 60 + 30;
export const PLAYER_AIR_MOVE_SPEED_FACTOR = 2 / 3;

export const DEFAULT_SETTINGS = {
  renderDistance: 2,
  lodStartDistance: 2,
  gravity: 28,
  moveSpeed: 6,
  jumpSpeed: 10,
  groundAcceleration: 55,
  airAcceleration: 20,
  groundFriction: 14,
  airDrag: 1.2,
  airBrake: 2.5,
  maxRayDistance: 6,
  lookSensitivity: 0.0022,
  showHelpOverlay: false
};

export type GameSettings = typeof DEFAULT_SETTINGS;

export const BLOCK_ATLAS = {
  columns: 16,
  rows: 8
};

export const BLOCK_FACE_TILES = {
  grass: {
    top: { x: 0, y: 0 },
    side: { x: 0, y: 1 },
    bottom: { x: 0, y: 2 }
  },
  dirt: {
    all: { x: 0, y: 2 }
  },
  stone: {
    all: { x: 0, y: 4 }
  },
  wood: {
    side: { x: 1, y: 0 },
    top: { x: 1, y: 1 }
  },
  leaf: {
    all: { x: 1, y: 2 }
  },
  sand: {
    all: { x: 1, y: 3 }
  },
  lamp: {
    all: { x: 2, y: 0 }
  },
  plank: {
    all: { x: 2, y: 1 }
  },
  crafting_table: {
    top: { x: 3, y: 0 },
    side: { x: 3, y: 1 },
    front: { x: 3, y: 2 },
    bottom: { x: 2, y: 1 }
  }
};
