import { DEFAULT_SETTINGS } from '../../config/constants';

const STORAGE_KEY = 'voxel.game.session';

function readRaw() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveGameSession(payload) {
  const current = readRaw() ?? {};
  const next = { ...current, ...payload };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getGameSession() {
  const session = readRaw() ?? {};
  return {
    worldName: session.worldName ?? '',
    seed: session.seed ?? '',
    settings: { ...DEFAULT_SETTINGS, ...(session.settings ?? {}) }
  };
}

export function saveMenuSettings(settings) {
  const current = getGameSession();
  saveGameSession({ ...current, settings: { ...DEFAULT_SETTINGS, ...settings } });
}
