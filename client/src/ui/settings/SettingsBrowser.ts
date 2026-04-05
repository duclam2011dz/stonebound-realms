import type { GameSettings } from '../../config/constants';
import {
  getSettingCategoryDefinition,
  SETTING_CATEGORIES,
  SETTING_FIELDS,
  type SettingCategoryId,
  type SettingFieldDefinition,
  type ToggleSettingFieldDefinition
} from './settingDefinitions';

type SettingsBrowserOptions = {
  settings: GameSettings;
  categoryListElement: HTMLElement | null;
  fieldListElement: HTMLElement | null;
  searchInputElement: HTMLInputElement | null;
  categoryTitleElement?: HTMLElement | null;
  categoryDescriptionElement?: HTMLElement | null;
  resultMetaElement?: HTMLElement | null;
  emptyStateElement?: HTMLElement | null;
  onSettingsChange?: (settings: Partial<GameSettings>) => void;
};

export class SettingsBrowser {
  settings: GameSettings;
  categoryListElement: HTMLElement | null;
  fieldListElement: HTMLElement | null;
  searchInputElement: HTMLInputElement | null;
  categoryTitleElement: HTMLElement | null;
  categoryDescriptionElement: HTMLElement | null;
  resultMetaElement: HTMLElement | null;
  emptyStateElement: HTMLElement | null;
  onSettingsChange: ((settings: Partial<GameSettings>) => void) | undefined;
  selectedCategory: SettingCategoryId;
  searchQuery: string;

  constructor({
    settings,
    categoryListElement,
    fieldListElement,
    searchInputElement,
    categoryTitleElement,
    categoryDescriptionElement,
    resultMetaElement,
    emptyStateElement,
    onSettingsChange
  }: SettingsBrowserOptions) {
    this.settings = settings;
    this.categoryListElement = categoryListElement;
    this.fieldListElement = fieldListElement;
    this.searchInputElement = searchInputElement;
    this.categoryTitleElement = categoryTitleElement ?? null;
    this.categoryDescriptionElement = categoryDescriptionElement ?? null;
    this.resultMetaElement = resultMetaElement ?? null;
    this.emptyStateElement = emptyStateElement ?? null;
    this.onSettingsChange = onSettingsChange;
    this.selectedCategory = SETTING_CATEGORIES[0]?.id ?? 'world';
    this.searchQuery = '';

    this.bindEvents();
    this.render();
  }

  bindEvents(): void {
    this.searchInputElement?.addEventListener('input', () => {
      this.searchQuery = this.searchInputElement?.value.trim().toLowerCase() ?? '';
      this.renderFields();
    });
  }

  focusSearch(): void {
    this.searchInputElement?.focus();
  }

  setCategory(categoryId: SettingCategoryId): void {
    this.selectedCategory = categoryId;
    this.render();
  }

  updateSetting<TKey extends keyof GameSettings>(key: TKey, value: GameSettings[TKey]): void {
    Object.assign(this.settings, { [key]: value });
    this.onSettingsChange?.({ [key]: value } as Partial<GameSettings>);
  }

  getToggleValueLabel(field: ToggleSettingFieldDefinition, value: boolean): string {
    if (value) return field.enabledLabel ?? 'On';
    return field.disabledLabel ?? 'Off';
  }

  getVisibleFields(): SettingFieldDefinition[] {
    return SETTING_FIELDS.filter((field) => {
      if (field.category !== this.selectedCategory) return false;
      if (!this.searchQuery) return true;
      const haystacks = [field.label, field.key, field.description, ...(field.searchTerms ?? [])];
      return haystacks.some((candidate) => candidate.toLowerCase().includes(this.searchQuery));
    });
  }

  render(): void {
    this.renderCategories();
    this.renderHeader();
    this.renderFields();
  }

  renderCategories(): void {
    if (!this.categoryListElement) return;
    this.categoryListElement.innerHTML = '';

    for (const category of SETTING_CATEGORIES) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'settings-category-button';
      button.classList.toggle('is-selected', category.id === this.selectedCategory);
      button.addEventListener('click', () => {
        this.setCategory(category.id);
      });

      const label = document.createElement('span');
      label.className = 'settings-category-label';
      label.textContent = category.label;
      button.appendChild(label);

      const count = document.createElement('span');
      count.className = 'settings-category-count';
      count.textContent = String(
        SETTING_FIELDS.filter((field) => field.category === category.id).length
      );
      button.appendChild(count);

      this.categoryListElement.appendChild(button);
    }
  }

  renderHeader(): void {
    const category = getSettingCategoryDefinition(this.selectedCategory);
    if (this.categoryTitleElement) {
      this.categoryTitleElement.textContent = category.label;
    }
    if (this.categoryDescriptionElement) {
      this.categoryDescriptionElement.textContent = category.description;
    }
  }

  renderFields(): void {
    if (!this.fieldListElement) return;
    const visibleFields = this.getVisibleFields();
    this.fieldListElement.innerHTML = '';
    this.fieldListElement.scrollTop = 0;

    if (this.resultMetaElement) {
      const searchLabel = this.searchQuery ? ` for "${this.searchQuery}"` : '';
      this.resultMetaElement.textContent = `${visibleFields.length} setting${visibleFields.length === 1 ? '' : 's'} in ${getSettingCategoryDefinition(this.selectedCategory).label}${searchLabel}`;
    }

    this.emptyStateElement?.classList.toggle('is-hidden', visibleFields.length > 0);

    for (const field of visibleFields) {
      const card = document.createElement('div');
      card.className = 'setting-card';

      const header = document.createElement('div');
      header.className = 'setting-card-header';

      const titleWrap = document.createElement('div');
      titleWrap.className = 'setting-card-copy';

      const label = document.createElement('label');
      label.className = 'setting-card-label';
      label.textContent = field.label;
      titleWrap.appendChild(label);

      const description = document.createElement('p');
      description.className = 'setting-card-description';
      description.textContent = field.description;
      titleWrap.appendChild(description);

      const valueBadge = document.createElement('span');
      valueBadge.className = 'setting-value-badge';
      valueBadge.textContent =
        field.type === 'range'
          ? Number(this.settings[field.key]).toFixed(field.precision)
          : this.getToggleValueLabel(field, Boolean(this.settings[field.key]));

      header.appendChild(titleWrap);
      header.appendChild(valueBadge);
      card.appendChild(header);

      if (field.type === 'range') {
        const sliderRow = document.createElement('div');
        sliderRow.className = 'setting-slider-row';

        const input = document.createElement('input');
        input.className = 'setting-slider';
        input.type = 'range';
        input.min = String(field.min);
        input.max = String(field.max);
        input.step = String(field.step);
        input.value = String(this.settings[field.key]);
        input.addEventListener('input', () => {
          const nextValue = Number(input.value);
          valueBadge.textContent = nextValue.toFixed(field.precision);
          this.updateSetting(field.key, nextValue);
        });

        const limits = document.createElement('div');
        limits.className = 'setting-slider-limits';
        limits.textContent = `${field.min} - ${field.max}`;

        sliderRow.appendChild(input);
        sliderRow.appendChild(limits);
        card.appendChild(sliderRow);
      } else {
        const toggleRow = document.createElement('div');
        toggleRow.className = 'setting-toggle-row';

        const toggleControl = document.createElement('label');
        toggleControl.className = 'setting-toggle-control';

        const input = document.createElement('input');
        input.className = 'setting-toggle-input';
        input.type = 'checkbox';
        input.checked = Boolean(this.settings[field.key]);

        const switchTrack = document.createElement('span');
        switchTrack.className = 'setting-toggle-switch';
        switchTrack.setAttribute('aria-hidden', 'true');

        const toggleText = document.createElement('span');
        toggleText.className = 'setting-toggle-status';
        toggleText.textContent = this.getToggleValueLabel(field, input.checked);

        const syncToggleState = () => {
          toggleControl.classList.toggle('is-enabled', input.checked);
          const nextLabel = this.getToggleValueLabel(field, input.checked);
          toggleText.textContent = nextLabel;
          valueBadge.textContent = nextLabel;
        };

        input.addEventListener('change', () => {
          syncToggleState();
          this.updateSetting(field.key, input.checked);
        });

        toggleControl.appendChild(input);
        toggleControl.appendChild(switchTrack);
        toggleControl.appendChild(toggleText);
        syncToggleState();

        const helperCopy = document.createElement('p');
        helperCopy.className = 'setting-toggle-helper';
        helperCopy.textContent = 'Applies immediately and stays saved for the next world entry.';

        toggleRow.appendChild(toggleControl);
        card.appendChild(toggleRow);
        card.appendChild(helperCopy);
      }

      this.fieldListElement.appendChild(card);
    }
  }
}
