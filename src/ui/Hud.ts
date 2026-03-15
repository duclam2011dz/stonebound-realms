export class Hud {
  helpElement: HTMLElement | null;
  breakProgressRootElement: HTMLElement | null;
  breakProgressFillElement: HTMLElement | null;
  healthRootElement: HTMLElement | null;
  hungerRootElement: HTMLElement | null;
  healthIcons: HTMLElement[];
  hungerIcons: HTMLElement[];
  helpEnabled: boolean;
  contextVisible: boolean;
  breakProgress: number;
  attackCooldown: number;
  health: number;
  hunger: number;

  constructor(
    helpElement: HTMLElement | null,
    breakProgressRootElement: HTMLElement | null = null,
    breakProgressFillElement: HTMLElement | null = null,
    healthRootElement: HTMLElement | null = null,
    hungerRootElement: HTMLElement | null = null
  ) {
    this.helpElement = helpElement;
    this.breakProgressRootElement = breakProgressRootElement;
    this.breakProgressFillElement = breakProgressFillElement;
    this.healthRootElement = healthRootElement;
    this.hungerRootElement = hungerRootElement;
    this.healthIcons = [];
    this.hungerIcons = [];
    this.helpEnabled = true;
    this.contextVisible = true;
    this.breakProgress = 0;
    this.attackCooldown = 1;
    this.health = 20;
    this.hunger = 20;
    this.buildStatusIcons();
    this.refresh();
  }

  setContextVisible(isVisible: boolean): void {
    this.contextVisible = isVisible;
    this.refresh();
  }

  setHelpEnabled(isEnabled: boolean): void {
    this.helpEnabled = isEnabled;
    this.refresh();
  }

  setBreakProgress(progress: number): void {
    const normalized = Math.min(1, Math.max(0, Number(progress) || 0));
    this.breakProgress = normalized;
    this.updateActionProgress();
  }

  setAttackCooldownProgress(progress: number): void {
    const normalized = Math.min(1, Math.max(0, Number(progress) || 0));
    this.attackCooldown = normalized;
    this.updateActionProgress();
  }

  setHealth(value: number): void {
    const normalized = Math.min(20, Math.max(0, Number(value) || 0));
    this.health = Math.round(normalized);
    this.updateHearts();
  }

  setHunger(value: number): void {
    const normalized = Math.min(20, Math.max(0, Number(value) || 0));
    this.hunger = Math.round(normalized);
    this.updateHunger();
  }

  buildStatusIcons(): void {
    if (this.healthRootElement) {
      this.healthRootElement.innerHTML = '';
      this.healthIcons = [];
      for (let i = 0; i < 10; i++) {
        const icon = document.createElement('span');
        icon.className = 'status-icon status-heart';
        this.healthRootElement.appendChild(icon);
        this.healthIcons.push(icon);
      }
    }

    if (this.hungerRootElement) {
      this.hungerRootElement.innerHTML = '';
      this.hungerIcons = [];
      for (let i = 0; i < 10; i++) {
        const icon = document.createElement('span');
        icon.className = 'status-icon status-food';
        this.hungerRootElement.appendChild(icon);
        this.hungerIcons.push(icon);
      }
    }
    this.updateHearts();
    this.updateHunger();
  }

  updateHearts(): void {
    if (!this.healthIcons.length) return;
    for (let i = 0; i < this.healthIcons.length; i++) {
      const icon = this.healthIcons[i];
      if (!icon) continue;
      const value = this.health - i * 2;
      icon.classList.toggle('is-full', value >= 2);
      icon.classList.toggle('is-half', value === 1);
      icon.classList.toggle('is-empty', value <= 0);
    }
  }

  updateHunger(): void {
    if (!this.hungerIcons.length) return;
    for (let i = 0; i < this.hungerIcons.length; i++) {
      const icon = this.hungerIcons[i];
      if (!icon) continue;
      const value = this.hunger - i * 2;
      icon.classList.toggle('is-full', value >= 2);
      icon.classList.toggle('is-half', value === 1);
      icon.classList.toggle('is-empty', value <= 0);
    }
  }

  updateActionProgress(): void {
    const breakActive = this.breakProgress > 0;
    const cooldownActive = !breakActive && this.attackCooldown < 1;
    const progress = breakActive ? this.breakProgress : cooldownActive ? this.attackCooldown : 0;
    if (this.breakProgressFillElement) {
      this.breakProgressFillElement.style.width = `${(progress * 100).toFixed(1)}%`;
    }
    if (this.breakProgressRootElement) {
      this.breakProgressRootElement.classList.toggle('is-hidden', progress <= 0);
    }
  }

  refresh(): void {
    if (!this.helpElement) return;
    const isVisible = this.helpEnabled && this.contextVisible;
    this.helpElement.classList.toggle('is-hidden', !isVisible);
  }
}
