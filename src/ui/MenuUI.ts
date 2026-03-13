import type { GameSettings } from '../config/constants';

type SettingField = {
  key: keyof GameSettings;
  label: string;
  min: number;
  max: number;
  step: number;
  precision: number;
};

const SETTING_FIELDS: SettingField[] = [
  { key: 'renderDistance', label: 'Render Distance', min: 1, max: 12, step: 1, precision: 0 },
  { key: 'lodStartDistance', label: 'LOD Start Ring', min: 1, max: 12, step: 1, precision: 0 },
  { key: 'moveSpeed', label: 'Move Speed', min: 1, max: 20, step: 0.5, precision: 1 },
  { key: 'jumpSpeed', label: 'Jump Speed', min: 2, max: 20, step: 0.5, precision: 1 },
  { key: 'gravity', label: 'Gravity', min: 5, max: 60, step: 1, precision: 0 },
  { key: 'groundAcceleration', label: 'Ground Accel', min: 10, max: 120, step: 1, precision: 0 },
  { key: 'airAcceleration', label: 'Air Accel', min: 2, max: 80, step: 1, precision: 0 },
  { key: 'groundFriction', label: 'Ground Friction', min: 2, max: 30, step: 0.5, precision: 1 },
  { key: 'airDrag', label: 'Air Drag', min: 0.1, max: 8, step: 0.1, precision: 1 },
  { key: 'airBrake', label: 'Air Brake', min: 0.5, max: 10, step: 0.1, precision: 1 },
  {
    key: 'lookSensitivity',
    label: 'Look Sensitivity',
    min: 0.0005,
    max: 0.01,
    step: 0.0001,
    precision: 4
  },
  { key: 'maxRayDistance', label: 'Reach Distance', min: 2, max: 12, step: 0.5, precision: 1 }
];

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
  settingsFieldsRoot: HTMLElement | null;

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
    this.settingsFieldsRoot = document.getElementById('settingsFields');

    this.renderFields();
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

  renderFields(): void {
    if (!this.settingsFieldsRoot) return;
    this.settingsFieldsRoot.innerHTML = '';

    for (const field of SETTING_FIELDS) {
      const row = document.createElement('div');
      row.className = 'setting-row';

      const label = document.createElement('label');
      label.className = 'setting-label';
      label.textContent = field.label;

      const inputRow = document.createElement('div');
      inputRow.className = 'setting-input-row';

      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(field.min);
      input.max = String(field.max);
      input.step = String(field.step);
      input.value = String(this.settings[field.key]);

      const value = document.createElement('span');
      value.className = 'setting-value';
      value.textContent = Number(this.settings[field.key]).toFixed(field.precision);

      input.addEventListener('input', () => {
        const parsed = Number(input.value);
        const nextSettings: Partial<GameSettings> = { [field.key]: parsed };
        value.textContent = parsed.toFixed(field.precision);
        for (const callback of this.settingsListeners) {
          callback(nextSettings);
        }
      });

      inputRow.appendChild(input);
      inputRow.appendChild(value);
      row.appendChild(label);
      row.appendChild(inputRow);
      this.settingsFieldsRoot.appendChild(row);
    }
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
  }

  openMain(): void {
    this.settingsPanel?.classList.add('is-hidden');
    this.menuMain?.classList.remove('is-hidden');
  }
}
