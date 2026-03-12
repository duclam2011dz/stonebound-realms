export class Hud {
  constructor(helpElement, breakProgressRootElement = null, breakProgressFillElement = null) {
    this.helpElement = helpElement;
    this.breakProgressRootElement = breakProgressRootElement;
    this.breakProgressFillElement = breakProgressFillElement;
    this.helpEnabled = true;
    this.contextVisible = true;
    this.breakProgress = 0;
    this.refresh();
  }

  setContextVisible(isVisible) {
    this.contextVisible = isVisible;
    this.refresh();
  }

  setHelpEnabled(isEnabled) {
    this.helpEnabled = isEnabled;
    this.refresh();
  }

  setBreakProgress(progress) {
    const normalized = Math.min(1, Math.max(0, Number(progress) || 0));
    this.breakProgress = normalized;
    if (this.breakProgressFillElement) {
      this.breakProgressFillElement.style.width = `${(normalized * 100).toFixed(1)}%`;
    }
    if (this.breakProgressRootElement) {
      this.breakProgressRootElement.classList.toggle("is-hidden", normalized <= 0);
    }
  }

  refresh() {
    if (!this.helpElement) return;
    const isVisible = this.helpEnabled && this.contextVisible;
    this.helpElement.classList.toggle("is-hidden", !isVisible);
  }
}
