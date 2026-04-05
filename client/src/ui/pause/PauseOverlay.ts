import type { GameSettings } from '../../config/constants';
import { SettingsBrowser } from '../settings/SettingsBrowser';

type PauseOverlayOptions = {
  settings: GameSettings;
  rootElement: HTMLElement | null;
  mainViewElement: HTMLElement | null;
  settingsViewElement: HTMLElement | null;
  statusElement: HTMLElement | null;
  continueButton: HTMLButtonElement | null;
  menuButton: HTMLButtonElement | null;
  saveButton: HTMLButtonElement | null;
  settingsButton: HTMLButtonElement | null;
  closeButton: HTMLButtonElement | null;
  backButton: HTMLButtonElement | null;
  settingsCategoryListElement: HTMLElement | null;
  settingsFieldListElement: HTMLElement | null;
  settingsSearchInputElement: HTMLInputElement | null;
  settingsCategoryTitleElement: HTMLElement | null;
  settingsCategoryDescriptionElement: HTMLElement | null;
  settingsResultMetaElement: HTMLElement | null;
  settingsEmptyStateElement: HTMLElement | null;
  onContinue: () => void;
  onMenu: () => void;
  onSave: () => void;
  onSettingsChange: (settings: Partial<GameSettings>) => void;
};

export class PauseOverlay {
  rootElement: HTMLElement | null;
  mainViewElement: HTMLElement | null;
  settingsViewElement: HTMLElement | null;
  statusElement: HTMLElement | null;
  continueButton: HTMLButtonElement | null;
  menuButton: HTMLButtonElement | null;
  saveButton: HTMLButtonElement | null;
  settingsButton: HTMLButtonElement | null;
  closeButton: HTMLButtonElement | null;
  backButton: HTMLButtonElement | null;
  settingsBrowser: SettingsBrowser;
  visible: boolean;

  constructor({
    settings,
    rootElement,
    mainViewElement,
    settingsViewElement,
    statusElement,
    continueButton,
    menuButton,
    saveButton,
    settingsButton,
    closeButton,
    backButton,
    settingsCategoryListElement,
    settingsFieldListElement,
    settingsSearchInputElement,
    settingsCategoryTitleElement,
    settingsCategoryDescriptionElement,
    settingsResultMetaElement,
    settingsEmptyStateElement,
    onContinue,
    onMenu,
    onSave,
    onSettingsChange
  }: PauseOverlayOptions) {
    this.rootElement = rootElement;
    this.mainViewElement = mainViewElement;
    this.settingsViewElement = settingsViewElement;
    this.statusElement = statusElement;
    this.continueButton = continueButton;
    this.menuButton = menuButton;
    this.saveButton = saveButton;
    this.settingsButton = settingsButton;
    this.closeButton = closeButton;
    this.backButton = backButton;
    this.visible = false;

    this.settingsBrowser = new SettingsBrowser({
      settings,
      categoryListElement: settingsCategoryListElement,
      fieldListElement: settingsFieldListElement,
      searchInputElement: settingsSearchInputElement,
      categoryTitleElement: settingsCategoryTitleElement,
      categoryDescriptionElement: settingsCategoryDescriptionElement,
      resultMetaElement: settingsResultMetaElement,
      emptyStateElement: settingsEmptyStateElement,
      onSettingsChange
    });

    this.continueButton?.addEventListener('click', () => onContinue());
    this.closeButton?.addEventListener('click', () => onContinue());
    this.menuButton?.addEventListener('click', () => onMenu());
    this.saveButton?.addEventListener('click', () => onSave());
    this.settingsButton?.addEventListener('click', () => this.openSettingsView());
    this.backButton?.addEventListener('click', () => this.openMainView());

    this.openMainView();
  }

  isVisible(): boolean {
    return this.visible;
  }

  open(): void {
    this.visible = true;
    this.rootElement?.classList.add('is-visible');
    this.rootElement?.setAttribute('aria-hidden', 'false');
    this.setStatus('');
    this.openMainView();
  }

  close(): void {
    this.visible = false;
    this.rootElement?.classList.remove('is-visible');
    this.rootElement?.setAttribute('aria-hidden', 'true');
    this.setStatus('');
    this.openMainView();
  }

  openMainView(): void {
    this.mainViewElement?.classList.remove('is-hidden');
    this.settingsViewElement?.classList.add('is-hidden');
  }

  openSettingsView(): void {
    this.mainViewElement?.classList.add('is-hidden');
    this.settingsViewElement?.classList.remove('is-hidden');
    this.settingsBrowser.focusSearch();
  }

  setStatus(message: string): void {
    if (!this.statusElement) return;
    this.statusElement.textContent = message;
    this.statusElement.classList.toggle('is-hidden', !message);
  }
}
