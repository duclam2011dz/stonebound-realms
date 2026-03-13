import type { BlockType } from '../../world/services/BlockPalette';

const BREAK_DURATION_MS: Readonly<Record<BlockType, number>> = Object.freeze({
  grass: 320,
  dirt: 360,
  sand: 280,
  stone: 950,
  wood: 720,
  leaf: 180,
  lamp: 260
});

export function getBreakDurationMs(blockType: BlockType): number {
  return BREAK_DURATION_MS[blockType] ?? 450;
}

export function getBlockTargetKey(x: number, y: number, z: number): string {
  return `${x}|${y}|${z}`;
}
