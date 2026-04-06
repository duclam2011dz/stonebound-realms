import { applySlotSwatch } from '../inventory/applySlotSwatch';
import type { InventoryState } from '../inventory/InventoryState';
import type { InventorySlot } from '../inventory/itemTypes';
import { isBlockSlot } from '../inventory/itemTypes';
import { getItemTooltipData } from '../inventory/itemTooltip';
import { getItemTooltipUI, type ItemTooltipUI } from './ItemTooltipUI';
import type { BlockType } from '../world/services/BlockPalette';

export class Hotbar {
  rootElement: HTMLElement | null;
  inventoryState: InventoryState;
  selectedIndex: number;
  slotElements: HTMLElement[];
  tooltip: ItemTooltipUI;

  constructor(rootElement: HTMLElement | null, inventoryState: InventoryState) {
    this.rootElement = rootElement;
    this.inventoryState = inventoryState;
    this.selectedIndex = 0;
    this.slotElements = [];
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

  refreshSlots(): void {
    for (let index = 0; index < 9; index++) {
      const slotElement = this.slotElements[index];
      if (!slotElement) continue;
      const slotData = this.inventoryState.getSlot(index);
      const swatch = slotElement.querySelector<HTMLElement>('.hotbar-swatch');
      const count = slotElement.querySelector<HTMLElement>('.hotbar-count');
      if (!swatch) continue;
      applySlotSwatch(swatch, slotData);
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
