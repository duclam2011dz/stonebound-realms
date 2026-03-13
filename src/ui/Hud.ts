export class Hud {
  helpElement: HTMLElement | null;
  breakProgressRootElement: HTMLElement | null;
  breakProgressFillElement: HTMLElement | null;
  helpEnabled: boolean;
  contextVisible: boolean;
  breakProgress: number;

  constructor(
    helpElement: HTMLElement | null,
    breakProgressRootElement: HTMLElement | null = null,
    breakProgressFillElement: HTMLElement | null = null
  ) {
    this.helpElement = helpElement;
    this.breakProgressRootElement = breakProgressRootElement;
    this.breakProgressFillElement = breakProgressFillElement;
    this.helpEnabled = true;
    this.contextVisible = true;
    this.breakProgress = 0;
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
    if (this.breakProgressFillElement) {
      this.breakProgressFillElement.style.width = `${(normalized * 100).toFixed(1)}%`;
    }
    if (this.breakProgressRootElement) {
      this.breakProgressRootElement.classList.toggle('is-hidden', normalized <= 0);
    }
  }

  refresh(): void {
    if (!this.helpElement) return;
    const isVisible = this.helpEnabled && this.contextVisible;
    this.helpElement.classList.toggle('is-hidden', !isVisible);
  }
}
