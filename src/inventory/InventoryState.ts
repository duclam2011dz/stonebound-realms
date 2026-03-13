export const MAX_STACK_SIZE = 64;

function normalizeSlot(slot) {
  if (!slot?.blockType) return null;
  const quantity = Math.max(1, Math.min(MAX_STACK_SIZE, Math.floor(Number(slot.quantity) || 1)));
  return { blockType: slot.blockType, quantity };
}

export class InventoryState {
  constructor(size, initialSlots = []) {
    this.size = size;
    this.slots = new Array(size).fill(null);
    this.listeners = [];

    for (let i = 0; i < Math.min(size, initialSlots.length); i++) {
      this.slots[i] = normalizeSlot(initialSlots[i]);
    }
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  emitChange() {
    for (const callback of this.listeners) callback();
  }

  getSlot(index) {
    if (index < 0 || index >= this.size) return null;
    return this.slots[index];
  }

  setSlot(index, value) {
    if (index < 0 || index >= this.size) return;
    this.slots[index] = normalizeSlot(value);
    this.emitChange();
  }

  swapSlots(a, b) {
    if (a < 0 || a >= this.size || b < 0 || b >= this.size) return;
    const tmp = this.slots[a];
    this.slots[a] = this.slots[b];
    this.slots[b] = tmp;
    this.emitChange();
  }

  removeFromSlot(index, amount = 1) {
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

  addBlock(blockType, amount = 1) {
    if (!blockType) return amount;
    let remaining = Math.max(1, Math.floor(Number(amount) || 1));
    let changed = false;
    const insertionAnchor = this.findLastOccupiedSlot();

    for (let i = 0; i < this.size && remaining > 0; i++) {
      const slot = this.slots[i];
      if (!slot || slot.blockType !== blockType || slot.quantity >= MAX_STACK_SIZE) continue;
      const free = MAX_STACK_SIZE - slot.quantity;
      const added = Math.min(free, remaining);
      slot.quantity += added;
      remaining -= added;
      changed = true;
    }

    let insertCursor = insertionAnchor >= 0 ? insertionAnchor + 1 : 0;
    while (remaining > 0) {
      const emptyIndex = this.findNextEmptySlot(insertCursor);
      if (emptyIndex < 0) break;
      const added = Math.min(MAX_STACK_SIZE, remaining);
      this.slots[emptyIndex] = { blockType, quantity: added };
      remaining -= added;
      changed = true;
      insertCursor = emptyIndex + 1;
    }

    if (changed) this.emitChange();
    return remaining;
  }

  findNextEmptySlot(startIndex) {
    if (this.size <= 0) return -1;
    const normalizedStart = ((startIndex % this.size) + this.size) % this.size;
    for (let offset = 0; offset < this.size; offset++) {
      const index = (normalizedStart + offset) % this.size;
      if (!this.slots[index]) return index;
    }
    return -1;
  }

  findLastOccupiedSlot() {
    for (let index = this.size - 1; index >= 0; index--) {
      if (this.slots[index]) return index;
    }
    return -1;
  }
}
