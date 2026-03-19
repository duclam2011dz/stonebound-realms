import { BLOCK_ATLAS, BLOCK_FACE_TILES } from '../config/constants';
import { getProceduralAtlasAssets } from '../textures/proceduralBlockAtlas';
import { MAX_STACK_SIZE, type InventoryState } from './InventoryState';
import { getFoodDefinition } from './foodDefinitions';
import { getItemDefinition, getItemMaxStack } from './itemDefinitions';
import type { InventoryItem, InventorySlot } from './itemTypes';
import { getItemKey, isBlockSlot, isFoodSlot, isItemSlot } from './itemTypes';
import { getItemTooltipData } from './itemTooltip';
import { getItemTooltipUI, type ItemTooltipUI } from '../ui/ItemTooltipUI';
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
    if (item.icon) {
      element.style.backgroundImage = `url("${item.icon}")`;
      element.style.backgroundSize = 'contain';
      element.style.backgroundRepeat = 'no-repeat';
      element.style.backgroundPosition = 'center';
      element.style.backgroundColor = item.swatch;
    } else {
      element.style.backgroundImage = '';
      element.style.backgroundColor = item.swatch;
    }
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

type DragOrigin = { group: SlotGroup; index: number };

type CursorDragState = {
  origin: DragOrigin | null;
  item: InventorySlot;
};

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
  cursorDrag: CursorDragState | null;
  dragGhost: HTMLElement | null;
  dragGhostSwatch: HTMLElement | null;
  dragGhostCount: HTMLElement | null;
  tooltip: ItemTooltipUI;

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
    this.cursorDrag = null;
    this.dragGhost = null;
    this.dragGhostSwatch = null;
    this.dragGhostCount = null;
    this.tooltip = getItemTooltipUI();

    this.renderGrid();
    this.renderCraftingGrid();
    this.inventoryState.addListener(() => this.refreshSlots());
    this.refreshSlots();

    this.createDragGhost();
    this.overlayElement?.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('mousemove', (event) => {
      this.updateDragGhostPosition(event.clientX, event.clientY);
    });
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
      this.bindTooltipHandlers(
        this.craftingResultElement,
        () => this.getCraftingResult?.() ?? null
      );
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

    slot.addEventListener('contextmenu', (event: MouseEvent) => {
      event.preventDefault();
    });

    slot.addEventListener('mousedown', (event: MouseEvent) => {
      const targetIndex = Number(slot.dataset.slotIndex);
      const targetGroup = slot.dataset.slotGroup as SlotGroup;
      if (Number.isNaN(targetIndex) || !targetGroup) return;

      if (event.button === 2) {
        event.preventDefault();
        this.tooltip.hide();
        this.handleRightClick(targetGroup, targetIndex, event.clientX, event.clientY);
        return;
      }

      if (event.button === 0) {
        event.preventDefault();
        this.tooltip.hide();
        this.handleLeftClick(targetGroup, targetIndex, event.clientX, event.clientY);
      }
    });

    this.bindTooltipHandlers(slot, () => {
      const state = this.getStateForGroup(group);
      return state?.getSlot(index) ?? null;
    });

    return slot;
  }

  bindTooltipHandlers(element: HTMLElement, getSlot: () => InventorySlot | null): void {
    element.addEventListener('mouseenter', (event: MouseEvent) => {
      if (this.cursorDrag) return;
      const data = getItemTooltipData(getSlot());
      if (!data) {
        this.tooltip.hide();
        return;
      }
      this.tooltip.show(data, event.clientX, event.clientY);
    });
    element.addEventListener('mousemove', (event: MouseEvent) => {
      if (this.cursorDrag) return;
      this.tooltip.move(event.clientX, event.clientY);
    });
    element.addEventListener('mouseleave', () => {
      this.tooltip.hide();
    });
  }

  getStateForGroup(group: SlotGroup): InventoryState | null {
    if (group === 'inventory') return this.inventoryState;
    return this.craftingState;
  }

  getStackLimit(slot: InventorySlot): number {
    if (slot.kind === 'item') return getItemMaxStack(slot.itemType);
    return MAX_STACK_SIZE;
  }

  stripSlot(slot: InventorySlot): InventoryItem {
    if (slot.kind === 'block') return { kind: 'block', blockType: slot.blockType };
    if (slot.kind === 'food') return { kind: 'food', foodType: slot.foodType };
    return { kind: 'item', itemType: slot.itemType };
  }

  createDragGhost(): void {
    if (!this.overlayElement || this.dragGhost) return;
    const ghost = document.createElement('div');
    ghost.className = 'inventory-drag is-hidden';
    const swatch = document.createElement('span');
    swatch.className = 'inventory-swatch';
    const count = document.createElement('span');
    count.className = 'inventory-count';
    ghost.appendChild(swatch);
    ghost.appendChild(count);
    this.overlayElement.appendChild(ghost);
    this.dragGhost = ghost;
    this.dragGhostSwatch = swatch;
    this.dragGhostCount = count;
  }

  showDragGhost(item: InventorySlot, x: number, y: number): void {
    if (!this.dragGhost || !this.dragGhostSwatch || !this.dragGhostCount) return;
    applyAtlasSwatch(this.dragGhostSwatch, item, this.proceduralAtlasImageUrl);
    this.dragGhostCount.textContent = item.quantity > 1 ? String(item.quantity) : '';
    this.dragGhost.classList.remove('is-hidden');
    this.updateDragGhostPosition(x, y);
  }

  updateDragGhostPosition(x: number, y: number): void {
    if (!this.cursorDrag || !this.dragGhost) return;
    this.dragGhost.style.left = `${x}px`;
    this.dragGhost.style.top = `${y}px`;
  }

  hideDragGhost(): void {
    this.dragGhost?.classList.add('is-hidden');
  }

  updateCursorGhost(): void {
    if (!this.cursorDrag || !this.dragGhostSwatch || !this.dragGhostCount) return;
    applyAtlasSwatch(this.dragGhostSwatch, this.cursorDrag.item, this.proceduralAtlasImageUrl);
    this.dragGhostCount.textContent =
      this.cursorDrag.item.quantity > 1 ? String(this.cursorDrag.item.quantity) : '';
  }

  beginCursorDrag(item: InventorySlot, origin: DragOrigin | null, x: number, y: number): void {
    this.cursorDrag = { item: { ...item }, origin };
    this.showDragGhost(this.cursorDrag.item, x, y);
  }

  clearCursorDrag(): void {
    this.cursorDrag = null;
    this.hideDragGhost();
  }

  markCursorPlaced(): void {
    if (this.cursorDrag) {
      this.cursorDrag.origin = null;
    }
  }

  handleLeftClick(group: SlotGroup, index: number, x: number, y: number): void {
    const state = this.getStateForGroup(group);
    if (!state) return;
    const targetSlot = state.getSlot(index);

    if (!this.cursorDrag) {
      if (!targetSlot) return;
      state.setSlot(index, null);
      this.beginCursorDrag(targetSlot, { group, index }, x, y);
      return;
    }

    const cursorItem = this.cursorDrag.item;
    if (!targetSlot) {
      state.setSlot(index, cursorItem);
      this.clearCursorDrag();
      return;
    }

    if (getItemKey(targetSlot) === getItemKey(cursorItem)) {
      const maxStack = this.getStackLimit(targetSlot);
      if (targetSlot.quantity >= maxStack) return;
      const transfer = Math.min(maxStack - targetSlot.quantity, cursorItem.quantity);
      state.setSlot(index, { ...targetSlot, quantity: targetSlot.quantity + transfer });
      cursorItem.quantity -= transfer;
      this.markCursorPlaced();
      if (cursorItem.quantity <= 0) {
        this.clearCursorDrag();
      } else {
        this.updateCursorGhost();
      }
      return;
    }

    state.setSlot(index, cursorItem);
    this.cursorDrag = { item: { ...targetSlot }, origin: null };
    this.showDragGhost(this.cursorDrag.item, x, y);
  }

  handleRightClick(group: SlotGroup, index: number, x: number, y: number): void {
    const state = this.getStateForGroup(group);
    if (!state) return;
    const targetSlot = state.getSlot(index);

    if (this.cursorDrag) {
      const cursorItem = this.cursorDrag.item;
      if (!targetSlot) {
        state.setSlot(index, { ...cursorItem, quantity: 1 });
        cursorItem.quantity -= 1;
        this.markCursorPlaced();
        if (cursorItem.quantity <= 0) {
          this.clearCursorDrag();
        } else {
          this.updateCursorGhost();
        }
        return;
      }

      if (getItemKey(targetSlot) !== getItemKey(cursorItem)) return;
      const maxStack = this.getStackLimit(targetSlot);
      if (targetSlot.quantity >= maxStack) return;
      state.setSlot(index, { ...targetSlot, quantity: targetSlot.quantity + 1 });
      cursorItem.quantity -= 1;
      this.markCursorPlaced();
      if (cursorItem.quantity <= 0) {
        this.clearCursorDrag();
      } else {
        this.updateCursorGhost();
      }
      return;
    }

    if (!targetSlot) return;
    const splitAmount = Math.ceil(targetSlot.quantity / 2);
    const remaining = targetSlot.quantity - splitAmount;
    if (splitAmount <= 0) return;
    if (remaining > 0) {
      state.setSlot(index, { ...targetSlot, quantity: remaining });
    } else {
      state.setSlot(index, null);
    }
    this.beginCursorDrag({ ...targetSlot, quantity: splitAmount }, { group, index }, x, y);
  }

  cancelCursorDrag(): void {
    if (!this.cursorDrag) return;
    const drag = this.cursorDrag;
    let remaining = drag.item.quantity;

    if (drag.origin) {
      const originState = this.getStateForGroup(drag.origin.group);
      if (originState) {
        const originSlot = originState.getSlot(drag.origin.index);
        if (!originSlot) {
          originState.setSlot(drag.origin.index, { ...drag.item, quantity: remaining });
          this.clearCursorDrag();
          return;
        }
        if (getItemKey(originSlot) === getItemKey(drag.item)) {
          const maxStack = this.getStackLimit(originSlot);
          const transfer = Math.min(maxStack - originSlot.quantity, remaining);
          if (transfer > 0) {
            originState.setSlot(drag.origin.index, {
              ...originSlot,
              quantity: originSlot.quantity + transfer
            });
            remaining -= transfer;
          }
        }
      }
    }

    if (remaining > 0) {
      this.inventoryState.addItem(this.stripSlot(drag.item), remaining);
    }
    this.clearCursorDrag();
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
      slotElement.setAttribute('draggable', 'false');
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
      slotElement.setAttribute('draggable', 'false');
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
    if (!nextOpen) {
      this.cancelCursorDrag();
      this.tooltip.hide();
    }
    this.overlayElement?.classList.toggle('is-hidden', !nextOpen);
  }
}
