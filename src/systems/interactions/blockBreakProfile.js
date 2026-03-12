const BREAK_DURATION_MS = Object.freeze({
  grass: 320,
  dirt: 360,
  sand: 280,
  stone: 950,
  wood: 720,
  leaf: 180,
  lamp: 260
});

export function getBreakDurationMs(blockType) {
  return BREAK_DURATION_MS[blockType] ?? 450;
}

export function getBlockTargetKey(x, y, z) {
  return `${x}|${y}|${z}`;
}
