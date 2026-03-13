const AUTO_HIDE_MS = 3200;
const FPS_UPDATE_INTERVAL_MS = 250;

export class ChatOverlay {
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
  }) {
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

  bindEvents() {
    window.addEventListener('keydown', (event) => {
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

    this.inputElement?.addEventListener('keydown', (event) => {
      if (event.code !== 'Enter') return;
      event.preventDefault();
      this.submitInput();
    });
  }

  setVisibleFor(ms) {
    this.showUntil = Date.now() + ms;
    this.syncVisibility();
  }

  appendLine(text, cssClass = '') {
    if (!this.logElement) return null;
    const line = document.createElement('div');
    line.className = cssClass ? `chat-line ${cssClass}` : 'chat-line';
    line.textContent = text;
    this.logElement.appendChild(line);
    this.logElement.scrollTop = this.logElement.scrollHeight;
    while (this.logElement.childElementCount > 40) {
      this.logElement.removeChild(this.logElement.firstElementChild);
    }
    return line;
  }

  postChatMessage(author, message) {
    this.appendLine(`[${author}] ${message}`, 'chat-user');
    this.setVisibleFor(AUTO_HIDE_MS);
  }

  postSystemMessage(message) {
    this.appendLine(`[system] ${message}`, 'chat-system');
    this.setVisibleFor(AUTO_HIDE_MS);
  }

  postErrorMessage(message) {
    this.appendLine(`[error] ${message}`, 'chat-error');
    this.setVisibleFor(AUTO_HIDE_MS);
  }

  toggleInput() {
    if (this.isInputOpen) {
      this.closeInput();
    } else {
      this.openInput();
    }
  }

  openInput() {
    this.isInputOpen = true;
    this.requestPointerUnlock?.();
    this.onInputFocusChanged?.(true);
    this.inputRowElement?.classList.remove('is-hidden');
    this.rootElement?.classList.remove('is-hidden');
    this.inputElement?.focus();
    this.syncVisibility();
  }

  closeInput() {
    this.isInputOpen = false;
    if (this.inputElement) this.inputElement.value = '';
    this.inputElement?.blur();
    this.inputRowElement?.classList.add('is-hidden');
    this.onInputFocusChanged?.(false);
    this.syncVisibility();
  }

  isTyping() {
    return this.isInputOpen;
  }

  submitInput() {
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

  runCommand(text) {
    const parts = text.slice(1).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
      this.postErrorMessage('Command not found.');
      return;
    }

    const command = parts[0].toLowerCase();
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

  ensureFpsLine() {
    if (this.fpsLine) return;
    this.fpsLine = this.appendLine('[debug] FPS: ...', 'chat-fps');
  }

  updateFrame(nowMs, dt) {
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

  syncVisibility() {
    const shouldShow = this.isInputOpen || this.fpsStreaming || Date.now() < this.showUntil;
    this.rootElement?.classList.toggle('is-hidden', !shouldShow);
  }
}
