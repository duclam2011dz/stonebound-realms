import { BLOCK_ATLAS, BLOCK_FACE_TILES } from '../config/constants';
import { getProceduralAtlasAssets } from '../textures/proceduralBlockAtlas';

const FALLBACK_COLORS = {
  grass: '#62b34e',
  dirt: '#7b5438',
  stone: '#8e8f98',
  wood: '#7b5a39',
  leaf: '#4f9f4e',
  sand: '#d7c28a',
  lamp: '#f3d16c'
};

function getIconTile(blockType) {
  if (blockType === 'grass') return BLOCK_FACE_TILES.grass.top;
  if (blockType === 'wood') return BLOCK_FACE_TILES.wood.all;
  if (blockType === 'leaf') return BLOCK_FACE_TILES.leaf.all;
  if (blockType === 'stone') return BLOCK_FACE_TILES.stone.all;
  if (blockType === 'dirt') return BLOCK_FACE_TILES.dirt.all;
  if (blockType === 'sand') return BLOCK_FACE_TILES.sand.all;
  if (blockType === 'lamp') return BLOCK_FACE_TILES.lamp.all;
  return null;
}

function applyAtlasSwatch(element, blockType, atlasUrl) {
  if (!blockType) {
    element.style.backgroundImage = '';
    element.style.backgroundColor = 'transparent';
    return;
  }

  const tile = getIconTile(blockType);
  if (!tile) {
    element.style.backgroundImage = '';
    element.style.backgroundColor = FALLBACK_COLORS[blockType] || '#ffffff';
    return;
  }

  element.style.backgroundImage = `url(${atlasUrl})`;
  element.style.backgroundSize = `${BLOCK_ATLAS.columns * 100}% ${BLOCK_ATLAS.rows * 100}%`;
  element.style.backgroundPosition = `${(tile.x / (BLOCK_ATLAS.columns - 1)) * 100}% ${(tile.y / (BLOCK_ATLAS.rows - 1)) * 100}%`;
  element.style.backgroundColor = 'transparent';
}

export class InventoryUI {
  constructor({ overlayElement, gridElement, inventoryState }) {
    this.overlayElement = overlayElement;
    this.gridElement = gridElement;
    this.inventoryState = inventoryState;
    this.isOpen = false;
    this.slotElements = [];
    this.proceduralAtlasImageUrl = getProceduralAtlasAssets().imageUrl;

    this.renderGrid();
    this.inventoryState.addListener(() => this.refreshSlots());
    this.refreshSlots();
  }

  renderGrid() {
    if (!this.gridElement) return;
    this.gridElement.innerHTML = '';
    this.slotElements = [];

    for (let index = 0; index < this.inventoryState.size; index++) {
      const slot = document.createElement('div');
      slot.className = 'inventory-slot';
      slot.dataset.slotIndex = String(index);

      const swatch = document.createElement('span');
      swatch.className = 'inventory-swatch';
      const count = document.createElement('span');
      count.className = 'inventory-count';
      slot.appendChild(swatch);
      slot.appendChild(count);

      slot.addEventListener('dragover', (event) => {
        event.preventDefault();
      });

      slot.addEventListener('drop', (event) => {
        event.preventDefault();
        const sourceIndex = Number(event.dataTransfer?.getData('text/plain'));
        const targetIndex = Number(slot.dataset.slotIndex);
        if (Number.isNaN(sourceIndex) || Number.isNaN(targetIndex)) return;
        this.inventoryState.swapSlots(sourceIndex, targetIndex);
      });

      slot.addEventListener('dragstart', (event) => {
        const fromIndex = Number(slot.dataset.slotIndex);
        const slotItem = this.inventoryState.getSlot(fromIndex);
        if (!slotItem) {
          event.preventDefault();
          return;
        }
        event.dataTransfer?.setData('text/plain', String(fromIndex));
      });

      this.gridElement.appendChild(slot);
      this.slotElements.push(slot);
    }
  }

  refreshSlots() {
    this.slotElements.forEach((slotElement, index) => {
      const slotItem = this.inventoryState.getSlot(index);
      const swatch = slotElement.querySelector('.inventory-swatch');
      const count = slotElement.querySelector('.inventory-count');
      if (!swatch) return;
      applyAtlasSwatch(swatch, slotItem?.blockType ?? null, this.proceduralAtlasImageUrl);
      if (count) {
        const quantity = slotItem?.quantity ?? 0;
        count.textContent = quantity > 0 ? String(quantity) : '';
      }
      slotElement.classList.toggle('is-empty', !slotItem);
      slotElement.setAttribute('draggable', slotItem ? 'true' : 'false');
    });
  }

  setOpen(nextOpen) {
    this.isOpen = nextOpen;
    this.overlayElement?.classList.toggle('is-hidden', !nextOpen);
  }
}
