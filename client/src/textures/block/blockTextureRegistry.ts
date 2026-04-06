import grassSideUrl from '../../../assets/blocks/grass_block_side.png';
import grassTopUrl from '../../../assets/blocks/grass_block_top.png';
import dirtUrl from '../../../assets/blocks/dirt.png';
import stoneUrl from '../../../assets/blocks/stone.png';
import oakLogSideUrl from '../../../assets/blocks/oak_log.png';
import oakLogTopUrl from '../../../assets/blocks/oak_log_top.png';
import oakLeavesUrl from '../../../assets/blocks/oak_leaves.png';
import sandUrl from '../../../assets/blocks/sand.png';
import oakPlanksUrl from '../../../assets/blocks/oak_planks.png';
import craftingTableSideUrl from '../../../assets/blocks/crafting_table_side.png';
import craftingTableFrontUrl from '../../../assets/blocks/crafting_table_front.png';
import craftingTableTopUrl from '../../../assets/blocks/crafting_table_top.png';
import type { BlockType } from '../../world/services/BlockPalette';

const BLOCK_SLOT_ICON_URLS: Partial<Record<BlockType, string>> = {
  grass: grassTopUrl,
  dirt: dirtUrl,
  stone: stoneUrl,
  wood: oakLogSideUrl,
  leaf: oakLeavesUrl,
  sand: sandUrl,
  plank: oakPlanksUrl,
  crafting_table: craftingTableFrontUrl
};

const BLOCK_FALLBACK_SWATCHES: Record<BlockType, string> = {
  grass: '#62b34e',
  dirt: '#7b5438',
  stone: '#8e8f98',
  wood: '#7b5a39',
  leaf: '#4f9f4e',
  sand: '#d7c28a',
  lamp: '#f3d16c',
  plank: '#b8895f',
  crafting_table: '#b07a4f'
};

export const BLOCK_TEXTURE_ASSET_URLS = {
  grass: {
    top: grassTopUrl,
    side: grassSideUrl,
    bottom: dirtUrl
  },
  dirt: {
    all: dirtUrl
  },
  stone: {
    all: stoneUrl
  },
  wood: {
    side: oakLogSideUrl,
    top: oakLogTopUrl
  },
  leaf: {
    all: oakLeavesUrl
  },
  sand: {
    all: sandUrl
  },
  plank: {
    all: oakPlanksUrl
  },
  crafting_table: {
    top: craftingTableTopUrl,
    side: craftingTableSideUrl,
    front: craftingTableFrontUrl,
    bottom: oakPlanksUrl
  }
} as const;

export function getBlockSlotIconUrl(blockType: BlockType): string | null {
  return BLOCK_SLOT_ICON_URLS[blockType] ?? null;
}

export function getBlockFallbackSwatch(blockType: BlockType): string {
  return BLOCK_FALLBACK_SWATCHES[blockType] ?? '#ffffff';
}
