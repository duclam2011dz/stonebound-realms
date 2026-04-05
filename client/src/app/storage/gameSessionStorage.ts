import { DEFAULT_SETTINGS, type GameSettings } from '../../config/constants';

const STORAGE_KEY = 'voxel.game.session';

type GameSession = {
  worldName: string;
  seed: string;
  settings: GameSettings;
};

type RawGameSession = Partial<GameSession> & { settings?: Partial<GameSettings> };

function readRaw(): RawGameSession | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RawGameSession;
  } catch {
    return null;
  }
}

export function saveGameSession(payload: RawGameSession) {
  const current = readRaw() ?? {};
  const next = { ...current, ...payload };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getGameSession(): GameSession {
  const session = readRaw() ?? {};
  return {
    worldName: session.worldName ?? '',
    seed: session.seed ?? '',
    settings: { ...DEFAULT_SETTINGS, ...(session.settings ?? {}) }
  };
}

export function saveMenuSettings(settings: Partial<GameSettings>) {
  const current = getGameSession();
  saveGameSession({ ...current, settings: { ...DEFAULT_SETTINGS, ...settings } });
}

export type { GameSession };
