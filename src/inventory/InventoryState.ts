export const MAX_STACK_SIZE = 64;

import type { BlockType } from '../world/services/BlockPalette';
import { isValidFoodType, type FoodType } from './foodDefinitions';
import { getItemMaxStack, isValidItemType } from './itemDefinitions';
import type { InventoryItem, InventorySlot } from './itemTypes';
import { getItemKey } from './itemTypes';

function normalizeSlot(slot: InventorySlot | null | undefined): InventorySlot | null {
  if (!slot) return null;
  if (!('kind' in slot)) {
    const legacy = slot as { blockType?: BlockType; quantity?: number };
    if (!legacy.blockType) return null;
    const quantity = Math.max(
      1,
      Math.min(MAX_STACK_SIZE, Math.floor(Number(legacy.quantity) || 1))
    );
    return { kind: 'block', blockType: legacy.blockType, quantity };
  }
  if (slot.kind !== 'block' && slot.kind !== 'food' && slot.kind !== 'item') return null;
  if (slot.kind === 'block' && !slot.blockType) return null;
  if (slot.kind === 'food' && !isValidFoodType(slot.foodType)) return null;
  if (slot.kind === 'item' && !isValidItemType(slot.itemType)) return null;
  const maxStack = getStackLimit(slot);
  const quantity = Math.max(1, Math.min(maxStack, Math.floor(Number(slot.quantity) || 1)));
  return { ...slot, quantity } as InventorySlot;
}

function getStackLimit(item: InventoryItem): number {
  if (item.kind === 'item') return getItemMaxStack(item.itemType);
  return MAX_STACK_SIZE;
}

export class InventoryState {
  size: number;
  slots: Array<InventorySlot | null>;
  listeners: Array<() => void>;

  constructor(size: number, initialSlots: Array<InventorySlot | null> = []) {
    this.size = size;
    this.slots = new Array(size).fill(null);
    this.listeners = [];

    for (let i = 0; i < Math.min(size, initialSlots.length); i++) {
      this.slots[i] = normalizeSlot(initialSlots[i] ?? null);
    }
  }

  addListener(callback: () => void): void {
    this.listeners.push(callback);
  }

  emitChange(): void {
    for (const callback of this.listeners) callback();
  }

  getSlot(index: number): InventorySlot | null {
    if (index < 0 || index >= this.size) return null;
    return this.slots[index] ?? null;
  }

  setSlot(index: number, value: InventorySlot | null): void {
    if (index < 0 || index >= this.size) return;
    this.slots[index] = normalizeSlot(value);
    this.emitChange();
  }

  swapSlots(a: number, b: number): void {
    if (a < 0 || a >= this.size || b < 0 || b >= this.size) return;
    const slotA = this.slots[a] ?? null;
    const slotB = this.slots[b] ?? null;
    this.slots[a] = slotB;
    this.slots[b] = slotA;
    this.emitChange();
  }

  removeFromSlot(index: number, amount = 1): number {
    if (index < 0 || index >= this.size) return 0;
    const slot = this.slots[index];
    if (!slot) return 0;
    const requested = Math.max(1, Math.floor(Number(amount) || 1));
    const removed = Math.min(slot.quantity, requested);
    slot.quantity -= removed;
    if (slot.quantity <= 0) {
      this.slots[index] = null;
    }
    this.emitChange();
    return removed;
  }

  addItem(item: InventoryItem, amount = 1): number {
    let remaining = Math.max(1, Math.floor(Number(amount) || 1));
    let changed = false;
    const insertionAnchor = this.findLastOccupiedSlot();
    const itemKey = getItemKey(item);
    const maxStack = getStackLimit(item);

    for (let i = 0; i < this.size && remaining > 0; i++) {
      const slot = this.slots[i];
      if (!slot || getItemKey(slot) !== itemKey || slot.quantity >= maxStack) continue;
      const free = maxStack - slot.quantity;
      const added = Math.min(free, remaining);
      slot.quantity += added;
      remaining -= added;
      changed = true;
    }

    let insertCursor = insertionAnchor >= 0 ? insertionAnchor + 1 : 0;
    while (remaining > 0) {
      const emptyIndex = this.findNextEmptySlot(insertCursor);
      if (emptyIndex < 0) break;
      const added = Math.min(maxStack, remaining);
      this.slots[emptyIndex] = { ...item, quantity: added } as InventorySlot;
      remaining -= added;
      changed = true;
      insertCursor = emptyIndex + 1;
    }

    if (changed) this.emitChange();
    return remaining;
  }

  canAddItem(item: InventoryItem, amount = 1): boolean {
    let remaining = Math.max(1, Math.floor(Number(amount) || 1));
    const itemKey = getItemKey(item);
    const maxStack = getStackLimit(item);
    for (let i = 0; i < this.size && remaining > 0; i++) {
      const slot = this.slots[i];
      if (!slot) continue;
      if (getItemKey(slot) !== itemKey) continue;
      remaining -= Math.max(0, maxStack - slot.quantity);
    }
    if (remaining <= 0) return true;

    for (let i = 0; i < this.size && remaining > 0; i++) {
      if (this.slots[i]) continue;
      remaining -= maxStack;
    }
    return remaining <= 0;
  }

  addBlock(blockType: BlockType, amount = 1): number {
    if (!blockType) return amount;
    return this.addItem({ kind: 'block', blockType }, amount);
  }

  addFood(foodType: FoodType, amount = 1): number {
    if (!foodType) return amount;
    return this.addItem({ kind: 'food', foodType }, amount);
  }

  findNextEmptySlot(startIndex: number): number {
    if (this.size <= 0) return -1;
    const normalizedStart = ((startIndex % this.size) + this.size) % this.size;
    for (let offset = 0; offset < this.size; offset++) {
      const index = (normalizedStart + offset) % this.size;
      if (!this.slots[index]) return index;
    }
    return -1;
  }

  findLastOccupiedSlot(): number {
    for (let index = this.size - 1; index >= 0; index--) {
      if (this.slots[index]) return index;
    }
    return -1;
  }
}
