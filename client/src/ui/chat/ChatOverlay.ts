import type { ChatCommandDefinition, ChatCommandSuggestionDefinition } from './chatCommandMetadata';

const AUTO_HIDE_MS = 3200;
const FPS_UPDATE_INTERVAL_MS = 250;

const LOCAL_COMMAND_DEFINITIONS: ChatCommandDefinition[] = [
  {
    name: 'fps',
    description: 'Stream the current FPS into chat.',
    arguments: [
      {
        getSuggestions: () => [
          { value: 'on', description: 'Enable the FPS stream.' },
          { value: 'off', description: 'Disable the FPS stream.' }
        ]
      }
    ]
  },
  {
    name: 'help',
    description: 'Toggle the on-screen help text.',
    arguments: [
      {
        getSuggestions: () => [
          { value: 'on', description: 'Show the help overlay.' },
          { value: 'off', description: 'Hide the help overlay.' }
        ]
      }
    ]
  },
  {
    name: 'chunk',
    description: 'Stream chunk debug info into chat.',
    arguments: [
      {
        getSuggestions: () => [
          { value: 'on', description: 'Enable chunk debug stream.' },
          { value: 'off', description: 'Disable chunk debug stream.' }
        ]
      }
    ]
  },
  {
    name: 'seed',
    description: 'Print the current world seed.'
  }
];

type CommandResult = { handled: boolean; ok?: boolean; message?: string };

type ChatSuggestionItem = {
  label: string;
  description: string;
  nextValue: string;
};

type ChatOverlayOptions = {
  rootElement: HTMLElement | null;
  logElement: HTMLElement | null;
  suggestionsElement: HTMLElement | null;
  inputRowElement: HTMLElement | null;
  inputElement: HTMLInputElement | null;
  getSeed: () => string;
  canOpenInput?: () => boolean;
  onHelpToggle?: (enabled: boolean) => void;
  onCommand?: (text: string) => CommandResult;
  commandDefinitions?: ChatCommandDefinition[];
  onInputFocusChanged?: (isOpen: boolean) => void;
  requestPointerUnlock?: () => void;
  getChunkStats?: () => {
    loaded: number;
    pending: number;
    center: { x: number; z: number };
  } | null;
};

export class ChatOverlay {
  rootElement: HTMLElement | null;
  logElement: HTMLElement | null;
  suggestionsElement: HTMLElement | null;
  inputRowElement: HTMLElement | null;
  inputElement: HTMLInputElement | null;
  getSeed: () => string;
  canOpenInput: (() => boolean) | undefined;
  onHelpToggle: ((enabled: boolean) => void) | undefined;
  onCommand: ((text: string) => CommandResult) | undefined;
  commandDefinitions: ChatCommandDefinition[];
  onInputFocusChanged: ((isOpen: boolean) => void) | undefined;
  requestPointerUnlock: (() => void) | undefined;
  getChunkStats:
    | (() => { loaded: number; pending: number; center: { x: number; z: number } } | null)
    | undefined;
  isInputOpen: boolean;
  fpsStreaming: boolean;
  chunkStreaming: boolean;
  fpsLine: HTMLElement | null;
  chunkLine: HTMLElement | null;
  showUntil: number;
  lastFpsUpdate: number;
  lastChunkUpdate: number;
  suggestionItems: ChatSuggestionItem[];
  selectedSuggestionIndex: number;

  constructor({
    rootElement,
    logElement,
    suggestionsElement,
    inputRowElement,
    inputElement,
    getSeed,
    canOpenInput,
    onHelpToggle,
    onCommand,
    commandDefinitions,
    onInputFocusChanged,
    requestPointerUnlock,
    getChunkStats
  }: ChatOverlayOptions) {
    this.rootElement = rootElement;
    this.logElement = logElement;
    this.suggestionsElement = suggestionsElement;
    this.inputRowElement = inputRowElement;
    this.inputElement = inputElement;
    this.getSeed = getSeed;
    this.canOpenInput = canOpenInput;
    this.onHelpToggle = onHelpToggle;
    this.onCommand = onCommand;
    this.commandDefinitions = [...LOCAL_COMMAND_DEFINITIONS, ...(commandDefinitions ?? [])];
    this.onInputFocusChanged = onInputFocusChanged;
    this.requestPointerUnlock = requestPointerUnlock;
    this.getChunkStats = getChunkStats;

    this.isInputOpen = false;
    this.fpsStreaming = false;
    this.chunkStreaming = false;
    this.fpsLine = null;
    this.chunkLine = null;
    this.showUntil = 0;
    this.lastFpsUpdate = 0;
    this.lastChunkUpdate = 0;
    this.suggestionItems = [];
    this.selectedSuggestionIndex = 0;

    this.bindEvents();
    this.renderSuggestions();
    this.syncVisibility();
  }

  bindEvents(): void {
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      const isChatInputFocused = document.activeElement === this.inputElement;
      if (event.code === 'KeyT' && !event.repeat) {
        if (isChatInputFocused) return;
        if (this.canOpenInput && !this.canOpenInput()) return;
        event.preventDefault();
        this.toggleInput();
        return;
      }
      if ((event.code === 'Slash' || event.key === '/') && !event.repeat) {
        if (isChatInputFocused) return;
        if (this.canOpenInput && !this.canOpenInput()) return;
        event.preventDefault();
        this.openInputWithText('/');
        return;
      }

      if (event.code === 'Escape' && this.isInputOpen) {
        event.preventDefault();
        this.closeInput();
      }
    });

    this.inputElement?.addEventListener('input', () => {
      this.refreshSuggestions();
    });

    this.inputElement?.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.code === 'Enter' || event.code === 'NumpadEnter') {
        event.preventDefault();
        this.submitInput();
        return;
      }

      if (event.code === 'Tab') {
        if (!this.suggestionItems.length) return;
        event.preventDefault();
        this.applySelectedSuggestion();
        return;
      }

      if (event.code === 'ArrowDown') {
        if (!this.suggestionItems.length) return;
        event.preventDefault();
        this.moveSuggestionSelection(1);
        return;
      }

      if (event.code === 'ArrowUp') {
        if (!this.suggestionItems.length) return;
        event.preventDefault();
        this.moveSuggestionSelection(-1);
      }
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
    this.openInputWithText('');
  }

  openInputWithText(text: string): void {
    if (!this.isInputOpen && this.canOpenInput && !this.canOpenInput()) return;
    this.isInputOpen = true;
    this.requestPointerUnlock?.();
    this.onInputFocusChanged?.(true);
    this.inputRowElement?.classList.remove('is-hidden');
    this.rootElement?.classList.remove('is-hidden');
    if (this.inputElement) {
      this.inputElement.value = text;
      this.inputElement.focus();
      this.inputElement.setSelectionRange(text.length, text.length);
    }
    this.refreshSuggestions();
    this.syncVisibility();
  }

  closeInput(): void {
    this.isInputOpen = false;
    if (this.inputElement) this.inputElement.value = '';
    this.suggestionItems = [];
    this.selectedSuggestionIndex = 0;
    this.renderSuggestions();
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

    if (command === 'chunk') {
      const mode = (parts[1] ?? '').toLowerCase();
      if (mode === 'on') {
        this.chunkStreaming = true;
        this.postSystemMessage('Chunk stream enabled.');
        this.ensureChunkLine();
        return;
      }
      if (mode === 'off') {
        this.chunkStreaming = false;
        if (this.chunkLine) {
          this.chunkLine.remove();
          this.chunkLine = null;
        }
        this.postSystemMessage('Chunk stream disabled.');
        return;
      }
      this.postErrorMessage('Usage: /chunk on|off');
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

  ensureChunkLine(): void {
    if (this.chunkLine) return;
    this.chunkLine = this.appendLine('[debug] Chunks: ...', 'chat-fps');
  }

  refreshSuggestions(): void {
    const previousSelection = this.suggestionItems[this.selectedSuggestionIndex]?.nextValue ?? '';
    this.suggestionItems = this.buildSuggestions(this.inputElement?.value ?? '');
    if (!this.suggestionItems.length) {
      this.selectedSuggestionIndex = 0;
      this.renderSuggestions();
      return;
    }

    const previousIndex = this.suggestionItems.findIndex(
      (item) => item.nextValue === previousSelection
    );
    this.selectedSuggestionIndex = previousIndex >= 0 ? previousIndex : 0;
    this.renderSuggestions();
  }

  buildSuggestions(rawValue: string): ChatSuggestionItem[] {
    if (!this.isInputOpen || !rawValue.startsWith('/')) return [];

    const commandText = rawValue.slice(1);
    const hasTrailingWhitespace = /\s$/.test(commandText);
    const trimmedCommandText = commandText.trim();
    if (!trimmedCommandText) {
      return this.buildCommandNameSuggestions('');
    }

    const tokens = trimmedCommandText.split(/\s+/);
    const commandToken = tokens[0] ?? '';
    if (!commandToken) return this.buildCommandNameSuggestions('');

    if (tokens.length === 1 && !hasTrailingWhitespace) {
      return this.buildCommandNameSuggestions(commandToken);
    }

    const definition = this.findCommandDefinition(commandToken);
    if (!definition) return [];

    const args = tokens.slice(1);
    const currentArgIndex = hasTrailingWhitespace ? args.length : Math.max(0, args.length - 1);
    const resolvedArgs = hasTrailingWhitespace ? args : args.slice(0, -1);
    const currentPrefix = hasTrailingWhitespace ? '' : (args[currentArgIndex] ?? '');
    const argumentDefinition = definition.arguments?.[currentArgIndex];
    if (!argumentDefinition) return [];

    const candidates = this.getArgumentSuggestions(argumentDefinition, resolvedArgs);
    const filteredCandidates = this.filterSuggestionsByPrefix(candidates, currentPrefix);
    return filteredCandidates.map((candidate) =>
      this.createArgumentSuggestionItem(
        commandToken,
        resolvedArgs,
        currentArgIndex,
        definition,
        candidate
      )
    );
  }

  buildCommandNameSuggestions(prefix: string): ChatSuggestionItem[] {
    const normalizedPrefix = prefix.toLowerCase();
    const suggestions: ChatSuggestionItem[] = [];
    const seen = new Set<string>();

    for (const definition of this.commandDefinitions) {
      const variants = [definition.name, ...(definition.aliases ?? [])];
      for (const variant of variants) {
        const normalizedVariant = variant.toLowerCase();
        if (seen.has(normalizedVariant)) continue;
        if (normalizedPrefix && !normalizedVariant.startsWith(normalizedPrefix)) continue;
        seen.add(normalizedVariant);
        suggestions.push({
          label: `/${variant}`,
          description: definition.description,
          nextValue: `/${variant}${definition.arguments?.length ? ' ' : ''}`
        });
      }
    }

    return suggestions;
  }

  findCommandDefinition(commandToken: string): ChatCommandDefinition | null {
    const normalizedToken = commandToken.toLowerCase();
    for (const definition of this.commandDefinitions) {
      if (definition.name.toLowerCase() === normalizedToken) return definition;
      if (definition.aliases?.some((alias) => alias.toLowerCase() === normalizedToken)) {
        return definition;
      }
    }
    return null;
  }

  getArgumentSuggestions(
    definition: NonNullable<ChatCommandDefinition['arguments']>[number],
    resolvedArgs: string[]
  ): ChatCommandSuggestionDefinition[] {
    const candidates = definition.getSuggestions?.(resolvedArgs) ?? [];
    if (candidates.length) return candidates;
    if (!definition.placeholder) return [];
    const placeholderSuggestion: ChatCommandSuggestionDefinition = {
      value: definition.placeholder,
      isPlaceholder: true
    };
    if (definition.description) {
      placeholderSuggestion.description = definition.description;
    }
    return [placeholderSuggestion];
  }

  filterSuggestionsByPrefix(
    suggestions: ChatCommandSuggestionDefinition[],
    prefix: string
  ): ChatCommandSuggestionDefinition[] {
    const normalizedPrefix = prefix.toLowerCase();
    if (!normalizedPrefix) return suggestions;

    return suggestions.filter((suggestion) =>
      suggestion.value.toLowerCase().startsWith(normalizedPrefix)
    );
  }

  createArgumentSuggestionItem(
    commandToken: string,
    resolvedArgs: string[],
    argumentIndex: number,
    definition: ChatCommandDefinition,
    suggestion: ChatCommandSuggestionDefinition
  ): ChatSuggestionItem {
    const args = [...resolvedArgs, suggestion.value];
    let nextValue = `/${commandToken}`;
    if (args.length) {
      nextValue += ` ${args.join(' ')}`;
    }
    if (argumentIndex < (definition.arguments?.length ?? 0) - 1) {
      nextValue += ' ';
    }

    return {
      label: suggestion.value,
      description: suggestion.description ?? '',
      nextValue
    };
  }

  renderSuggestions(): void {
    if (!this.suggestionsElement) return;

    const shouldShow = this.isInputOpen && this.suggestionItems.length > 0;
    this.suggestionsElement.classList.toggle('is-hidden', !shouldShow);
    this.suggestionsElement.innerHTML = '';
    if (!shouldShow) return;

    for (const [index, suggestion] of this.suggestionItems.entries()) {
      const row = document.createElement('div');
      row.className = 'chat-suggestion';

      const label = document.createElement('div');
      label.className = 'chat-suggestion-label';
      label.textContent = suggestion.label;
      row.appendChild(label);

      if (suggestion.description) {
        const description = document.createElement('div');
        description.className = 'chat-suggestion-description';
        description.textContent = suggestion.description;
        row.appendChild(description);
      }

      row.addEventListener('mouseenter', () => {
        this.setSelectedSuggestion(index);
      });
      row.addEventListener('mousedown', (event) => {
        event.preventDefault();
        this.setSelectedSuggestion(index);
        this.applySelectedSuggestion();
      });

      this.suggestionsElement.appendChild(row);
    }

    this.updateSuggestionSelection();
  }

  setSelectedSuggestion(index: number): void {
    if (!this.suggestionItems.length) {
      this.selectedSuggestionIndex = 0;
      this.updateSuggestionSelection();
      return;
    }

    this.selectedSuggestionIndex = Math.max(0, Math.min(index, this.suggestionItems.length - 1));
    this.updateSuggestionSelection();
  }

  moveSuggestionSelection(offset: number): void {
    this.setSelectedSuggestion(this.selectedSuggestionIndex + offset);
  }

  updateSuggestionSelection(): void {
    if (!this.suggestionsElement) return;
    const rows = Array.from(this.suggestionsElement.children) as HTMLElement[];
    for (const [index, row] of rows.entries()) {
      row.classList.toggle('is-selected', index === this.selectedSuggestionIndex);
    }

    rows[this.selectedSuggestionIndex]?.scrollIntoView({ block: 'nearest' });
  }

  applySelectedSuggestion(): void {
    const suggestion = this.suggestionItems[this.selectedSuggestionIndex];
    if (!suggestion || !this.inputElement) return;

    this.inputElement.value = suggestion.nextValue;
    this.inputElement.focus();
    this.inputElement.setSelectionRange(suggestion.nextValue.length, suggestion.nextValue.length);
    this.refreshSuggestions();
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
    if (this.chunkStreaming) {
      if (nowMs - this.lastChunkUpdate >= FPS_UPDATE_INTERVAL_MS) {
        this.lastChunkUpdate = nowMs;
        const stats = this.getChunkStats?.();
        this.ensureChunkLine();
        if (this.chunkLine) {
          if (stats) {
            this.chunkLine.textContent = `[debug] Chunks: ${stats.loaded} loaded | pending: ${stats.pending} | center: ${stats.center.x}, ${stats.center.z}`;
          } else {
            this.chunkLine.textContent = '[debug] Chunks: ...';
          }
        }
      }
    }
    this.syncVisibility();
  }

  syncVisibility(): void {
    const shouldShow =
      this.isInputOpen || this.fpsStreaming || this.chunkStreaming || Date.now() < this.showUntil;
    this.rootElement?.classList.toggle('is-hidden', !shouldShow);
  }
}
