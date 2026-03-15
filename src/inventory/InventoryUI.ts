import { BLOCK_ATLAS, BLOCK_FACE_TILES } from '../config/constants';
import { getProceduralAtlasAssets } from '../textures/proceduralBlockAtlas';
import type { InventoryState } from './InventoryState';
import { getFoodDefinition } from './foodDefinitions';
import { getItemDefinition } from './itemDefinitions';
import type { InventorySlot } from './itemTypes';
import { isBlockSlot, isFoodSlot, isItemSlot } from './itemTypes';
import { getItemTooltip } from './itemTooltip';
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

function getIconTile(blockType: BlockType): BlockTile | null {
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

function applyAtlasSwatch(
  element: HTMLElement,
  slot: InventorySlot | null,
  atlasUrl: string
): void {
  if (!slot) {
    element.style.backgroundImage = '';
    element.style.backgroundColor = 'transparent';
    return;
  }

  if (isFoodSlot(slot)) {
    const food = getFoodDefinition(slot.foodType);
    element.style.backgroundImage = '';
    element.style.backgroundColor = food.swatch;
    return;
  }

  if (isItemSlot(slot)) {
    const item = getItemDefinition(slot.itemType);
    element.style.backgroundImage = '';
    element.style.backgroundColor = item.swatch;
    return;
  }

  if (isBlockSlot(slot)) {
    const tile = getIconTile(slot.blockType);
    if (!tile) {
      element.style.backgroundImage = '';
      element.style.backgroundColor = FALLBACK_COLORS[slot.blockType] || '#ffffff';
      return;
    }

    element.style.backgroundImage = `url(${atlasUrl})`;
    element.style.backgroundSize = `${BLOCK_ATLAS.columns * 100}% ${BLOCK_ATLAS.rows * 100}%`;
    element.style.backgroundPosition = `${(tile.x / (BLOCK_ATLAS.columns - 1)) * 100}% ${(tile.y / (BLOCK_ATLAS.rows - 1)) * 100}%`;
    element.style.backgroundColor = 'transparent';
  }
}

type InventoryUIOptions = {
  overlayElement: HTMLElement | null;
  gridElement: HTMLElement | null;
  craftingGridElement?: HTMLElement | null;
  craftingResultElement?: HTMLElement | null;
  inventoryState: InventoryState;
  getCraftingResult?: () => InventorySlot | null;
  onCraft?: () => void;
};

type SlotGroup = 'inventory' | 'crafting';

export class InventoryUI {
  overlayElement: HTMLElement | null;
  gridElement: HTMLElement | null;
  craftingGridElement: HTMLElement | null;
  craftingResultElement: HTMLElement | null;
  inventoryState: InventoryState;
  craftingState: InventoryState | null;
  getCraftingResult: (() => InventorySlot | null) | null;
  onCraft: (() => void) | null;
  isOpen: boolean;
  slotElements: HTMLElement[];
  craftingSlotElements: HTMLElement[];
  craftingResultSwatch: HTMLElement | null;
  craftingResultCount: HTMLElement | null;
  craftingColumns: number;
  proceduralAtlasImageUrl: string;
  boundCraftingStates: Set<InventoryState>;
  craftingResultBound: boolean;

  constructor({
    overlayElement,
    gridElement,
    craftingGridElement,
    craftingResultElement,
    inventoryState,
    getCraftingResult,
    onCraft
  }: InventoryUIOptions) {
    this.overlayElement = overlayElement;
    this.gridElement = gridElement;
    this.craftingGridElement = craftingGridElement ?? null;
    this.craftingResultElement = craftingResultElement ?? null;
    this.inventoryState = inventoryState;
    this.craftingState = null;
    this.getCraftingResult = getCraftingResult ?? null;
    this.onCraft = onCraft ?? null;
    this.isOpen = false;
    this.slotElements = [];
    this.craftingSlotElements = [];
    this.craftingResultSwatch = null;
    this.craftingResultCount = null;
    this.craftingColumns = 2;
    this.proceduralAtlasImageUrl = getProceduralAtlasAssets().imageUrl;
    this.boundCraftingStates = new Set();
    this.craftingResultBound = false;

    this.renderGrid();
    this.renderCraftingGrid();
    this.inventoryState.addListener(() => this.refreshSlots());
    this.refreshSlots();
  }

  renderGrid(): void {
    if (!this.gridElement) return;
    this.gridElement.innerHTML = '';
    this.slotElements = [];

    for (let index = 0; index < this.inventoryState.size; index++) {
      const slot = this.createSlotElement('inventory', index);
      this.gridElement.appendChild(slot);
      this.slotElements.push(slot);
    }
  }

  renderCraftingGrid(): void {
    if (!this.craftingGridElement) return;
    this.craftingGridElement.innerHTML = '';
    this.craftingSlotElements = [];
    this.craftingGridElement.style.setProperty(
      '--craft-grid-columns',
      String(this.craftingColumns)
    );

    const craftSize = this.craftingState?.size ?? 0;
    for (let index = 0; index < craftSize; index++) {
      const slot = this.createSlotElement('crafting', index);
      this.craftingGridElement.appendChild(slot);
      this.craftingSlotElements.push(slot);
    }

    this.ensureCraftingResultSlot();
    this.refreshCraftingSlots();
  }

  ensureCraftingResultSlot(): void {
    if (!this.craftingResultElement) return;
    this.craftingResultElement.innerHTML = '';
    this.craftingResultElement.classList.add('inventory-slot', 'crafting-result');

    const swatch = document.createElement('span');
    swatch.className = 'inventory-swatch';
    const count = document.createElement('span');
    count.className = 'inventory-count';
    this.craftingResultElement.appendChild(swatch);
    this.craftingResultElement.appendChild(count);
    this.craftingResultSwatch = swatch;
    this.craftingResultCount = count;

    if (!this.craftingResultBound) {
      this.craftingResultElement.addEventListener('click', (event: MouseEvent) => {
        if (!this.onCraft) return;
        event.preventDefault();
        this.onCraft();
        this.refreshCraftingSlots();
      });
      this.craftingResultBound = true;
    }
  }

  createSlotElement(group: SlotGroup, index: number): HTMLElement {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    slot.dataset.slotIndex = String(index);
    slot.dataset.slotGroup = group;

    const swatch = document.createElement('span');
    swatch.className = 'inventory-swatch';
    const count = document.createElement('span');
    count.className = 'inventory-count';
    slot.appendChild(swatch);
    slot.appendChild(count);

    slot.addEventListener('dragover', (event: DragEvent) => {
      event.preventDefault();
    });

    slot.addEventListener('drop', (event: DragEvent) => {
      event.preventDefault();
      const payload = event.dataTransfer?.getData('text/plain') ?? '';
      const parsed = this.parseDragPayload(payload);
      const targetIndex = Number(slot.dataset.slotIndex);
      const targetGroup = slot.dataset.slotGroup as SlotGroup;
      if (!parsed || Number.isNaN(targetIndex) || !targetGroup) return;

      const sourceState = this.getStateForGroup(parsed.group);
      const targetState = this.getStateForGroup(targetGroup);
      if (!sourceState || !targetState) return;

      if (parsed.group === targetGroup) {
        sourceState.swapSlots(parsed.index, targetIndex);
        return;
      }

      const sourceSlot = sourceState.getSlot(parsed.index);
      const targetSlot = targetState.getSlot(targetIndex);
      sourceState.setSlot(parsed.index, targetSlot);
      targetState.setSlot(targetIndex, sourceSlot);
    });

    slot.addEventListener('dragstart', (event: DragEvent) => {
      const fromIndex = Number(slot.dataset.slotIndex);
      const slotGroup = slot.dataset.slotGroup as SlotGroup;
      const state = this.getStateForGroup(slotGroup);
      const slotItem = state?.getSlot(fromIndex) ?? null;
      if (!slotItem) {
        event.preventDefault();
        return;
      }
      event.dataTransfer?.setData('text/plain', this.buildDragPayload(slotGroup, fromIndex));
    });

    return slot;
  }

  buildDragPayload(group: SlotGroup, index: number): string {
    return `${group}:${index}`;
  }

  parseDragPayload(payload: string): { group: SlotGroup; index: number } | null {
    const [groupRaw, indexRaw] = payload.split(':');
    if (groupRaw !== 'inventory' && groupRaw !== 'crafting') return null;
    const index = Number(indexRaw);
    if (Number.isNaN(index)) return null;
    return { group: groupRaw, index };
  }

  getStateForGroup(group: SlotGroup): InventoryState | null {
    if (group === 'inventory') return this.inventoryState;
    return this.craftingState;
  }

  refreshSlots(): void {
    this.slotElements.forEach((slotElement, index) => {
      const slotItem = this.inventoryState.getSlot(index);
      const swatch = slotElement.querySelector<HTMLElement>('.inventory-swatch');
      const count = slotElement.querySelector<HTMLElement>('.inventory-count');
      if (!swatch) return;
      applyAtlasSwatch(swatch, slotItem, this.proceduralAtlasImageUrl);
      if (count) {
        const quantity = slotItem?.quantity ?? 0;
        count.textContent = quantity > 1 ? String(quantity) : '';
      }
      slotElement.classList.toggle('is-empty', !slotItem);
      slotElement.setAttribute('draggable', slotItem ? 'true' : 'false');
      slotElement.title = slotItem ? getItemTooltip(slotItem) : '';
    });
  }

  refreshCraftingSlots(): void {
    if (!this.craftingState) {
      this.clearCraftingResult();
      return;
    }
    this.craftingSlotElements.forEach((slotElement, index) => {
      const slotItem = this.craftingState?.getSlot(index) ?? null;
      const swatch = slotElement.querySelector<HTMLElement>('.inventory-swatch');
      const count = slotElement.querySelector<HTMLElement>('.inventory-count');
      if (!swatch) return;
      applyAtlasSwatch(swatch, slotItem, this.proceduralAtlasImageUrl);
      if (count) {
        const quantity = slotItem?.quantity ?? 0;
        count.textContent = quantity > 1 ? String(quantity) : '';
      }
      slotElement.classList.toggle('is-empty', !slotItem);
      slotElement.setAttribute('draggable', slotItem ? 'true' : 'false');
      slotElement.title = slotItem ? getItemTooltip(slotItem) : '';
    });

    const result = this.getCraftingResult?.() ?? null;
    this.updateCraftingResult(result);
  }

  updateCraftingResult(result: InventorySlot | null): void {
    if (!this.craftingResultSwatch || !this.craftingResultCount) return;
    applyAtlasSwatch(this.craftingResultSwatch, result, this.proceduralAtlasImageUrl);
    const quantity = result?.quantity ?? 0;
    this.craftingResultCount.textContent = quantity > 1 ? String(quantity) : '';
    this.craftingResultElement?.classList.toggle('is-empty', !result);
    this.craftingResultElement?.setAttribute('draggable', 'false');
    this.craftingResultElement &&
      (this.craftingResultElement.title = result ? getItemTooltip(result) : '');
  }

  clearCraftingResult(): void {
    if (!this.craftingResultSwatch || !this.craftingResultCount) return;
    this.craftingResultSwatch.style.backgroundImage = '';
    this.craftingResultSwatch.style.backgroundColor = 'transparent';
    this.craftingResultCount.textContent = '';
    this.craftingResultElement?.classList.add('is-empty');
  }

  setCraftingState(state: InventoryState | null, columns: number): void {
    this.craftingState = state;
    this.craftingColumns = Math.max(2, Math.min(3, Math.round(Number(columns) || 2)));
    if (state && !this.boundCraftingStates.has(state)) {
      state.addListener(() => this.refreshCraftingSlots());
      this.boundCraftingStates.add(state);
    }
    this.renderCraftingGrid();
  }

  setCraftingCallbacks(
    getResult: (() => InventorySlot | null) | null,
    onCraft: (() => void) | null
  ): void {
    this.getCraftingResult = getResult;
    this.onCraft = onCraft;
    this.refreshCraftingSlots();
  }

  setOpen(nextOpen: boolean): void {
    this.isOpen = nextOpen;
    this.overlayElement?.classList.toggle('is-hidden', !nextOpen);
  }
}
