import type { InventoryState } from '../InventoryState';
import type { InventoryItem, InventorySlot } from '../itemTypes';
import { findMatchingRecipe } from './recipes';

export type CraftingMode = 'player' | 'table';

export class CraftingManager {
  playerGrid: InventoryState;
  tableGrid: InventoryState;
  mode: CraftingMode;

  constructor(playerGrid: InventoryState, tableGrid: InventoryState) {
    this.playerGrid = playerGrid;
    this.tableGrid = tableGrid;
    this.mode = 'player';
  }

  setMode(mode: CraftingMode): void {
    this.mode = mode;
  }

  getActiveGrid(): InventoryState {
    return this.mode === 'table' ? this.tableGrid : this.playerGrid;
  }

  getGridSize(): number {
    return this.mode === 'table' ? 3 : 2;
  }

  getMatch(): ReturnType<typeof findMatchingRecipe> {
    const grid = this.getActiveGrid();
    const size = this.getGridSize();
    return findMatchingRecipe(grid.slots, size, this.mode === 'table');
  }

  getResultSlot(): InventorySlot | null {
    const match = this.getMatch();
    if (!match) return null;
    return { ...match.recipe.result, quantity: match.recipe.resultCount } as InventorySlot;
  }

  craftOnce(inventory: InventoryState): boolean {
    const match = this.getMatch();
    if (!match) return false;
    const result = match.recipe.result;
    const amount = match.recipe.resultCount;
    if (!inventory.canAddItem(result, amount)) return false;
    inventory.addItem(result, amount);

    const grid = this.getActiveGrid();
    const size = this.getGridSize();
    for (let y = 0; y < match.recipe.height; y++) {
      for (let x = 0; x < match.recipe.width; x++) {
        const patternIndex = y * match.recipe.width + x;
        const expected = match.recipe.pattern[patternIndex] ?? null;
        if (!expected) continue;
        const gridIndex = (y + match.offsetY) * size + (x + match.offsetX);
        grid.removeFromSlot(gridIndex, 1);
      }
    }
    return true;
  }

  flushActiveGridToInventory(inventory: InventoryState): void {
    const grid = this.getActiveGrid();
    for (let i = 0; i < grid.size; i++) {
      const slot = grid.getSlot(i);
      if (!slot) continue;
      const item = this.stripSlot(slot);
      const remaining = inventory.addItem(item, slot.quantity);
      const removed = slot.quantity - remaining;
      if (removed > 0) {
        grid.removeFromSlot(i, removed);
      }
    }
  }

  private stripSlot(slot: InventorySlot): InventoryItem {
    if (slot.kind === 'block') return { kind: 'block', blockType: slot.blockType };
    if (slot.kind === 'food') return { kind: 'food', foodType: slot.foodType };
    return { kind: 'item', itemType: slot.itemType };
  }
}
