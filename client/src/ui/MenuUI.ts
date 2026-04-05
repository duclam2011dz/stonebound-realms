import type { GameSettings } from '../config/constants';
import { SettingsBrowser } from './settings/SettingsBrowser';

export class MenuUI {
  settings: GameSettings;
  playListeners: Array<() => void>;
  settingsListeners: Array<(settings: Partial<GameSettings>) => void>;
  overlay: HTMLElement | null;
  menuMain: HTMLElement | null;
  settingsPanel: HTMLElement | null;
  playButton: HTMLElement | null;
  settingsButton: HTMLElement | null;
  backButton: HTMLElement | null;
  settingsBrowser: SettingsBrowser;

  constructor(settings: GameSettings) {
    this.settings = settings;
    this.playListeners = [];
    this.settingsListeners = [];

    this.overlay = document.getElementById('menuOverlay');
    this.menuMain = document.getElementById('menuMain');
    this.settingsPanel = document.getElementById('settingsPanel');
    this.playButton = document.getElementById('playButton');
    this.settingsButton = document.getElementById('settingsButton');
    this.backButton = document.getElementById('backButton');

    this.settingsBrowser = new SettingsBrowser({
      settings: this.settings,
      categoryListElement: document.getElementById('settingsCategories'),
      fieldListElement: document.getElementById('settingsFields'),
      searchInputElement: document.getElementById('settingsSearch') as HTMLInputElement | null,
      categoryTitleElement: document.getElementById('settingsCategoryTitle'),
      categoryDescriptionElement: document.getElementById('settingsCategoryDescription'),
      resultMetaElement: document.getElementById('settingsResultMeta'),
      emptyStateElement: document.getElementById('settingsEmpty'),
      onSettingsChange: (patch) => {
        for (const callback of this.settingsListeners) callback(patch);
      }
    });

    this.bindEvents();
  }

  bindEvents(): void {
    this.playButton?.addEventListener('click', () => {
      this.hide();
      for (const callback of this.playListeners) callback();
    });

    this.settingsButton?.addEventListener('click', () => {
      this.openSettings();
    });

    this.backButton?.addEventListener('click', () => {
      this.openMain();
    });
  }

  onPlay(callback: () => void): void {
    this.playListeners.push(callback);
  }

  onSettingsChange(callback: (settings: Partial<GameSettings>) => void): void {
    this.settingsListeners.push(callback);
  }

  show(): void {
    this.overlay?.classList.add('is-visible');
  }

  hide(): void {
    this.overlay?.classList.remove('is-visible');
  }

  openSettings(): void {
    this.menuMain?.classList.add('is-hidden');
    this.settingsPanel?.classList.remove('is-hidden');
    this.settingsBrowser.focusSearch();
  }

  openMain(): void {
    this.settingsPanel?.classList.add('is-hidden');
    this.menuMain?.classList.remove('is-hidden');
  }
}
