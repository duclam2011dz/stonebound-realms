import type { ItemTooltipData } from '../inventory/itemTooltip';

const TOOLTIP_MARGIN = 10;
const TOOLTIP_OFFSET_X = 16;
const TOOLTIP_OFFSET_Y = 18;

export class ItemTooltipUI {
  root: HTMLDivElement;
  titleEl: HTMLDivElement;
  tagRow: HTMLDivElement;
  linesEl: HTMLDivElement;
  isVisible: boolean;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'item-tooltip';

    this.titleEl = document.createElement('div');
    this.titleEl.className = 'item-tooltip-title';

    this.tagRow = document.createElement('div');
    this.tagRow.className = 'item-tooltip-tags';

    this.linesEl = document.createElement('div');
    this.linesEl.className = 'item-tooltip-lines';

    this.root.appendChild(this.titleEl);
    this.root.appendChild(this.tagRow);
    this.root.appendChild(this.linesEl);
    parent.appendChild(this.root);
    this.isVisible = false;
  }

  show(data: ItemTooltipData, x: number, y: number): void {
    this.render(data);
    this.isVisible = true;
    this.root.classList.add('is-visible');
    this.position(x, y);
  }

  hide(): void {
    this.isVisible = false;
    this.root.classList.remove('is-visible');
  }

  move(x: number, y: number): void {
    if (!this.isVisible) return;
    this.position(x, y);
  }

  private render(data: ItemTooltipData): void {
    this.titleEl.textContent = data.title;

    this.tagRow.innerHTML = '';
    for (const tag of data.tags) {
      const tagEl = document.createElement('span');
      tagEl.className = tag.tone
        ? `item-tooltip-tag item-tooltip-tag--${tag.tone}`
        : 'item-tooltip-tag';
      tagEl.textContent = tag.label;
      this.tagRow.appendChild(tagEl);
    }
    this.tagRow.classList.toggle('is-hidden', data.tags.length === 0);

    this.linesEl.innerHTML = '';
    for (const line of data.lines) {
      const row = document.createElement('div');
      row.className = line.tone
        ? `item-tooltip-line item-tooltip-line--${line.tone}`
        : 'item-tooltip-line';

      const label = document.createElement('span');
      label.className = 'item-tooltip-label';
      label.textContent = line.label;

      const value = document.createElement('span');
      value.className = 'item-tooltip-value';
      value.textContent = line.value;

      row.appendChild(label);
      row.appendChild(value);
      this.linesEl.appendChild(row);
    }
    this.linesEl.classList.toggle('is-hidden', data.lines.length === 0);
  }

  private position(x: number, y: number): void {
    const rect = this.root.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - TOOLTIP_MARGIN;
    const maxY = window.innerHeight - rect.height - TOOLTIP_MARGIN;
    const left = Math.min(maxX, Math.max(TOOLTIP_MARGIN, x + TOOLTIP_OFFSET_X));
    const top = Math.min(maxY, Math.max(TOOLTIP_MARGIN, y + TOOLTIP_OFFSET_Y));
    this.root.style.left = `${left}px`;
    this.root.style.top = `${top}px`;
  }
}

let tooltipInstance: ItemTooltipUI | null = null;

export function getItemTooltipUI(): ItemTooltipUI {
  if (tooltipInstance) return tooltipInstance;
  const parent = document.getElementById('ui') ?? document.body;
  tooltipInstance = new ItemTooltipUI(parent);
  return tooltipInstance;
}
