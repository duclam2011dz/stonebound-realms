import { BLOCK_ATLAS, BLOCK_FACE_TILES } from '../config/constants';
import { getProceduralAtlasAssets } from '../textures/proceduralBlockAtlas';
import type { InventoryState } from '../inventory/InventoryState';
import type { BlockType } from '../world/services/BlockPalette';

const FALLBACK_COLORS = {
  grass: '#62b34e',
  dirt: '#7b5438',
  stone: '#8e8f98',
  wood: '#7b5a39',
  leaf: '#4f9f4e',
  sand: '#d7c28a',
  lamp: '#f3d16c'
};

type BlockTile = { x: number; y: number };

function getIconTile(blockType: BlockType | null): BlockTile | null {
  if (!blockType) return null;
  if (blockType === 'grass') return BLOCK_FACE_TILES.grass.top;
  if (blockType === 'wood') return BLOCK_FACE_TILES.wood.all;
  if (blockType === 'leaf') return BLOCK_FACE_TILES.leaf.all;
  if (blockType === 'stone') return BLOCK_FACE_TILES.stone.all;
  if (blockType === 'dirt') return BLOCK_FACE_TILES.dirt.all;
  if (blockType === 'sand') return BLOCK_FACE_TILES.sand.all;
  if (blockType === 'lamp') return BLOCK_FACE_TILES.lamp.all;
  return null;
}

export class Hotbar {
  rootElement: HTMLElement | null;
  inventoryState: InventoryState;
  selectedIndex: number;
  slotElements: HTMLElement[];
  proceduralAtlasImageUrl: string;

  constructor(rootElement: HTMLElement | null, inventoryState: InventoryState) {
    this.rootElement = rootElement;
    this.inventoryState = inventoryState;
    this.selectedIndex = 0;
    this.slotElements = [];
    this.proceduralAtlasImageUrl = getProceduralAtlasAssets().imageUrl;

    this.render();
    this.setSelected(0);
    this.inventoryState.addListener(() => this.refreshSlots());
    this.refreshSlots();
  }

  render(): void {
    if (!this.rootElement) return;
    this.rootElement.innerHTML = '';
    this.slotElements = [];

    for (let index = 0; index < 9; index++) {
      const cell = document.createElement('div');
      cell.className = 'hotbar-slot';

      const key = document.createElement('span');
      key.className = 'hotbar-key';
      key.textContent = String(index + 1);

      const swatch = document.createElement('span');
      swatch.className = 'hotbar-swatch';
      const count = document.createElement('span');
      count.className = 'hotbar-count';

      cell.appendChild(key);
      cell.appendChild(swatch);
      cell.appendChild(count);
      this.rootElement.appendChild(cell);
      this.slotElements.push(cell);
    }
  }

  applyAtlasSwatch(swatchElement: HTMLElement, blockType: BlockType | null): void {
    const tile = getIconTile(blockType);
    if (!tile) {
      swatchElement.style.backgroundImage = '';
      swatchElement.style.backgroundColor = blockType
        ? FALLBACK_COLORS[blockType] || '#ffffff'
        : 'transparent';
      return;
    }

    swatchElement.style.backgroundImage = `url(${this.proceduralAtlasImageUrl})`;
    swatchElement.style.backgroundSize = `${BLOCK_ATLAS.columns * 100}% ${BLOCK_ATLAS.rows * 100}%`;
    swatchElement.style.backgroundPosition = `${(tile.x / (BLOCK_ATLAS.columns - 1)) * 100}% ${(tile.y / (BLOCK_ATLAS.rows - 1)) * 100}%`;
    swatchElement.style.backgroundColor = 'transparent';
  }

  refreshSlots(): void {
    for (let index = 0; index < 9; index++) {
      const slotElement = this.slotElements[index];
      if (!slotElement) continue;
      const slotData = this.inventoryState.getSlot(index);
      const swatch = slotElement.querySelector<HTMLElement>('.hotbar-swatch');
      const count = slotElement.querySelector<HTMLElement>('.hotbar-count');
      if (!swatch) continue;
      this.applyAtlasSwatch(swatch, slotData?.blockType ?? null);
      if (count) {
        const quantity = slotData?.quantity ?? 0;
        count.textContent = quantity > 0 ? String(quantity) : '';
      }
      slotElement.classList.toggle('is-empty', !slotData);
    }
  }

  setSelected(index: number): void {
    if (index < 0 || index >= 9) return;
    this.selectedIndex = index;
    this.slotElements.forEach((slotElement, slotIndex) => {
      slotElement.classList.toggle('is-selected', slotIndex === index);
    });
  }

  getSelectedBlockType(): BlockType | null {
    const selected = this.inventoryState.getSlot(this.selectedIndex);
    if (!selected || selected.quantity <= 0) return null;
    return selected.blockType;
  }

  getSelectedSlotIndex(): number {
    return this.selectedIndex;
  }

  consumeSelectedBlock(amount = 1): boolean {
    return this.inventoryState.removeFromSlot(this.selectedIndex, amount) > 0;
  }
}
