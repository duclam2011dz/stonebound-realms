import { BLOCK_ATLAS, BLOCK_FACE_TILES } from '../config/constants';
import { getProceduralAtlasAssets } from '../textures/proceduralBlockAtlas';
import type { InventoryState } from '../inventory/InventoryState';
import { getFoodDefinition } from '../inventory/foodDefinitions';
import { getItemDefinition } from '../inventory/itemDefinitions';
import type { InventorySlot } from '../inventory/itemTypes';
import { isBlockSlot, isFoodSlot, isItemSlot } from '../inventory/itemTypes';
import { getItemTooltipData } from '../inventory/itemTooltip';
import { getItemTooltipUI, type ItemTooltipUI } from './ItemTooltipUI';
import type { BlockType } from '../world/services/BlockPalette';

const FALLBACK_COLORS = {
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
  if (blockType === 'plank') return BLOCK_FACE_TILES.plank.all;
  if (blockType === 'crafting_table') return BLOCK_FACE_TILES.crafting_table.all;
  return null;
}

export class Hotbar {
  rootElement: HTMLElement | null;
  inventoryState: InventoryState;
  selectedIndex: number;
  slotElements: HTMLElement[];
  proceduralAtlasImageUrl: string;
  tooltip: ItemTooltipUI;

  constructor(rootElement: HTMLElement | null, inventoryState: InventoryState) {
    this.rootElement = rootElement;
    this.inventoryState = inventoryState;
    this.selectedIndex = 0;
    this.slotElements = [];
    this.proceduralAtlasImageUrl = getProceduralAtlasAssets().imageUrl;
    this.tooltip = getItemTooltipUI();

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
      cell.dataset.slotIndex = String(index);

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

      this.bindTooltipHandlers(cell, index);
    }
  }

  bindTooltipHandlers(element: HTMLElement, index: number): void {
    element.addEventListener('mouseenter', (event: MouseEvent) => {
      const data = getItemTooltipData(this.inventoryState.getSlot(index));
      if (!data) {
        this.tooltip.hide();
        return;
      }
      this.tooltip.show(data, event.clientX, event.clientY);
    });
    element.addEventListener('mousemove', (event: MouseEvent) => {
      this.tooltip.move(event.clientX, event.clientY);
    });
    element.addEventListener('mouseleave', () => {
      this.tooltip.hide();
    });
  }

  applyAtlasSwatch(swatchElement: HTMLElement, slot: InventorySlot | null): void {
    if (!slot) {
      swatchElement.style.backgroundImage = '';
      swatchElement.style.backgroundColor = 'transparent';
      return;
    }

    if (isFoodSlot(slot)) {
      const food = getFoodDefinition(slot.foodType);
      swatchElement.style.backgroundImage = '';
      swatchElement.style.backgroundColor = food.swatch;
      return;
    }

    if (isItemSlot(slot)) {
      const item = getItemDefinition(slot.itemType);
      if (item.icon) {
        swatchElement.style.backgroundImage = `url("${item.icon}")`;
        swatchElement.style.backgroundSize = 'contain';
        swatchElement.style.backgroundRepeat = 'no-repeat';
        swatchElement.style.backgroundPosition = 'center';
        swatchElement.style.backgroundColor = item.swatch;
      } else {
        swatchElement.style.backgroundImage = '';
        swatchElement.style.backgroundColor = item.swatch;
      }
      return;
    }

    if (isBlockSlot(slot)) {
      const tile = getIconTile(slot.blockType);
      if (!tile) {
        swatchElement.style.backgroundImage = '';
        swatchElement.style.backgroundColor = FALLBACK_COLORS[slot.blockType] || '#ffffff';
        return;
      }

      swatchElement.style.backgroundImage = `url(${this.proceduralAtlasImageUrl})`;
      swatchElement.style.backgroundSize = `${BLOCK_ATLAS.columns * 100}% ${BLOCK_ATLAS.rows * 100}%`;
      swatchElement.style.backgroundPosition = `${(tile.x / (BLOCK_ATLAS.columns - 1)) * 100}% ${(tile.y / (BLOCK_ATLAS.rows - 1)) * 100}%`;
      swatchElement.style.backgroundColor = 'transparent';
    }
  }

  refreshSlots(): void {
    for (let index = 0; index < 9; index++) {
      const slotElement = this.slotElements[index];
      if (!slotElement) continue;
      const slotData = this.inventoryState.getSlot(index);
      const swatch = slotElement.querySelector<HTMLElement>('.hotbar-swatch');
      const count = slotElement.querySelector<HTMLElement>('.hotbar-count');
      if (!swatch) continue;
      this.applyAtlasSwatch(swatch, slotData);
      if (count) {
        const quantity = slotData?.quantity ?? 0;
        count.textContent = quantity > 1 ? String(quantity) : '';
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
    if (!isBlockSlot(selected)) return null;
    return selected.blockType;
  }

  getSelectedSlotIndex(): number {
    return this.selectedIndex;
  }

  consumeSelectedBlock(amount = 1): boolean {
    const selected = this.inventoryState.getSlot(this.selectedIndex);
    if (!isBlockSlot(selected)) return false;
    return this.inventoryState.removeFromSlot(this.selectedIndex, amount) > 0;
  }

  getSelectedItem(): InventorySlot | null {
    const selected = this.inventoryState.getSlot(this.selectedIndex);
    if (!selected || selected.quantity <= 0) return null;
    return selected;
  }
}
