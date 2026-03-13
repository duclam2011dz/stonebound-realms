const AUTO_HIDE_MS = 3200;
const FPS_UPDATE_INTERVAL_MS = 250;

type CommandResult = { handled: boolean; ok?: boolean; message?: string };

type ChatOverlayOptions = {
  rootElement: HTMLElement | null;
  logElement: HTMLElement | null;
  inputRowElement: HTMLElement | null;
  inputElement: HTMLInputElement | null;
  getSeed: () => string;
  onHelpToggle?: (enabled: boolean) => void;
  onCommand?: (text: string) => CommandResult;
  onInputFocusChanged?: (isOpen: boolean) => void;
  requestPointerUnlock?: () => void;
};

export class ChatOverlay {
  rootElement: HTMLElement | null;
  logElement: HTMLElement | null;
  inputRowElement: HTMLElement | null;
  inputElement: HTMLInputElement | null;
  getSeed: () => string;
  onHelpToggle: ((enabled: boolean) => void) | undefined;
  onCommand: ((text: string) => CommandResult) | undefined;
  onInputFocusChanged: ((isOpen: boolean) => void) | undefined;
  requestPointerUnlock: (() => void) | undefined;
  isInputOpen: boolean;
  fpsStreaming: boolean;
  fpsLine: HTMLElement | null;
  showUntil: number;
  lastFpsUpdate: number;

  constructor({
    rootElement,
    logElement,
    inputRowElement,
    inputElement,
    getSeed,
    onHelpToggle,
    onCommand,
    onInputFocusChanged,
    requestPointerUnlock
  }: ChatOverlayOptions) {
    this.rootElement = rootElement;
    this.logElement = logElement;
    this.inputRowElement = inputRowElement;
    this.inputElement = inputElement;
    this.getSeed = getSeed;
    this.onHelpToggle = onHelpToggle;
    this.onCommand = onCommand;
    this.onInputFocusChanged = onInputFocusChanged;
    this.requestPointerUnlock = requestPointerUnlock;

    this.isInputOpen = false;
    this.fpsStreaming = false;
    this.fpsLine = null;
    this.showUntil = 0;
    this.lastFpsUpdate = 0;

    this.bindEvents();
    this.syncVisibility();
  }

  bindEvents(): void {
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      const isChatInputFocused = document.activeElement === this.inputElement;
      if (event.code === 'KeyT' && !event.repeat) {
        if (isChatInputFocused) return;
        event.preventDefault();
        this.toggleInput();
        return;
      }

      if (event.code === 'Escape' && this.isInputOpen) {
        event.preventDefault();
        this.closeInput();
      }
    });

    this.inputElement?.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.code !== 'Enter') return;
      event.preventDefault();
      this.submitInput();
    });
  }

  setVisibleFor(ms: number): void {
    this.showUntil = Date.now() + ms;
    this.syncVisibility();
  }

  appendLine(text: string, cssClass = ''): HTMLElement | null {
    if (!this.logElement) return null;
    const line = document.createElement('div');
    line.className = cssClass ? `chat-line ${cssClass}` : 'chat-line';
    line.textContent = text;
    this.logElement.appendChild(line);
    this.logElement.scrollTop = this.logElement.scrollHeight;
    while (this.logElement.childElementCount > 40) {
      const first = this.logElement.firstElementChild;
      if (!first) break;
      this.logElement.removeChild(first);
    }
    return line;
  }

  postChatMessage(author: string, message: string): void {
    this.appendLine(`[${author}] ${message}`, 'chat-user');
    this.setVisibleFor(AUTO_HIDE_MS);
  }

  postSystemMessage(message: string): void {
    this.appendLine(`[system] ${message}`, 'chat-system');
    this.setVisibleFor(AUTO_HIDE_MS);
  }

  postErrorMessage(message: string): void {
    this.appendLine(`[error] ${message}`, 'chat-error');
    this.setVisibleFor(AUTO_HIDE_MS);
  }

  toggleInput(): void {
    if (this.isInputOpen) {
      this.closeInput();
    } else {
      this.openInput();
    }
  }

  openInput(): void {
    this.isInputOpen = true;
    this.requestPointerUnlock?.();
    this.onInputFocusChanged?.(true);
    this.inputRowElement?.classList.remove('is-hidden');
    this.rootElement?.classList.remove('is-hidden');
    this.inputElement?.focus();
    this.syncVisibility();
  }

  closeInput(): void {
    this.isInputOpen = false;
    if (this.inputElement) this.inputElement.value = '';
    this.inputElement?.blur();
    this.inputRowElement?.classList.add('is-hidden');
    this.onInputFocusChanged?.(false);
    this.syncVisibility();
  }

  isTyping(): boolean {
    return this.isInputOpen;
  }

  submitInput(): void {
    const raw = this.inputElement?.value ?? '';
    const text = raw.trim();
    if (!text) {
      this.closeInput();
      return;
    }

    if (text.startsWith('/')) {
      this.runCommand(text);
    } else {
      this.postChatMessage('player', text);
    }

    this.closeInput();
  }

  runCommand(text: string): void {
    const parts = text.slice(1).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
      this.postErrorMessage('Command not found.');
      return;
    }

    const command = parts[0]?.toLowerCase();
    if (!command) {
      this.postErrorMessage('Command not found.');
      return;
    }
    if (command === 'fps') {
      const mode = (parts[1] ?? '').toLowerCase();
      if (mode === 'on') {
        this.fpsStreaming = true;
        this.postSystemMessage('FPS stream enabled.');
        this.ensureFpsLine();
        return;
      }
      if (mode === 'off') {
        this.fpsStreaming = false;
        if (this.fpsLine) {
          this.fpsLine.remove();
          this.fpsLine = null;
        }
        this.postSystemMessage('FPS stream disabled.');
        return;
      }
      this.postErrorMessage('Usage: /fps on|off');
      return;
    }

    if (command === 'help') {
      const mode = (parts[1] ?? '').toLowerCase();
      if (mode === 'on') {
        this.onHelpToggle?.(true);
        this.postSystemMessage('Help UI enabled.');
        return;
      }
      if (mode === 'off') {
        this.onHelpToggle?.(false);
        this.postSystemMessage('Help UI disabled.');
        return;
      }
      this.postErrorMessage('Usage: /help on|off');
      return;
    }

    if (command === 'seed') {
      this.postSystemMessage(`Seed: ${this.getSeed()}`);
      return;
    }

    const customResult = this.onCommand?.(text) ?? null;
    if (customResult?.handled) {
      if (customResult.ok) {
        this.postSystemMessage(customResult.message || 'Command executed.');
      } else {
        this.postErrorMessage(customResult.message || 'Command failed.');
      }
      return;
    }

    this.postErrorMessage('Command not found.');
  }

  ensureFpsLine(): void {
    if (this.fpsLine) return;
    this.fpsLine = this.appendLine('[debug] FPS: ...', 'chat-fps');
  }

  updateFrame(nowMs: number, dt: number): void {
    if (this.fpsStreaming) {
      if (nowMs - this.lastFpsUpdate >= FPS_UPDATE_INTERVAL_MS) {
        this.lastFpsUpdate = nowMs;
        const fps = dt > 0 ? 1 / dt : 0;
        this.ensureFpsLine();
        if (this.fpsLine) this.fpsLine.textContent = `[debug] FPS: ${fps.toFixed(1)}`;
      }
    }
    this.syncVisibility();
  }

  syncVisibility(): void {
    const shouldShow = this.isInputOpen || this.fpsStreaming || Date.now() < this.showUntil;
    this.rootElement?.classList.toggle('is-hidden', !shouldShow);
  }
}
