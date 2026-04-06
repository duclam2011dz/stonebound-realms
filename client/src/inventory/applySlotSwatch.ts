import {
  getBlockFallbackSwatch,
  getBlockSlotIconUrl
} from '../textures/block/blockTextureRegistry';
import { getFoodDefinition } from './foodDefinitions';
import { getItemDefinition } from './itemDefinitions';
import type { InventorySlot } from './itemTypes';
import { isBlockSlot, isFoodSlot, isItemSlot } from './itemTypes';

function resetSwatch(element: HTMLElement): void {
  element.style.backgroundImage = '';
  element.style.backgroundSize = '';
  element.style.backgroundPosition = '';
  element.style.backgroundRepeat = '';
  element.style.backgroundColor = 'transparent';
}

function applyImageSwatch(
  element: HTMLElement,
  imageUrl: string,
  backgroundColor = 'transparent'
): void {
  element.style.backgroundImage = `url("${imageUrl}")`;
  element.style.backgroundSize = 'contain';
  element.style.backgroundPosition = 'center';
  element.style.backgroundRepeat = 'no-repeat';
  element.style.backgroundColor = backgroundColor;
}

export function applySlotSwatch(element: HTMLElement, slot: InventorySlot | null): void {
  if (!slot) {
    resetSwatch(element);
    return;
  }

  if (isFoodSlot(slot)) {
    resetSwatch(element);
    element.style.backgroundColor = getFoodDefinition(slot.foodType).swatch;
    return;
  }

  if (isItemSlot(slot)) {
    const item = getItemDefinition(slot.itemType);
    if (item.icon) {
      applyImageSwatch(element, item.icon);
      return;
    }
    resetSwatch(element);
    element.style.backgroundColor = item.swatch;
    return;
  }

  if (isBlockSlot(slot)) {
    const imageUrl = getBlockSlotIconUrl(slot.blockType);
    if (imageUrl) {
      applyImageSwatch(element, imageUrl);
      return;
    }
    resetSwatch(element);
    element.style.backgroundColor = getBlockFallbackSwatch(slot.blockType);
  }
}
