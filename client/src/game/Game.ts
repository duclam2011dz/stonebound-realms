import type * as THREE from 'three';
import { saveMenuSettings } from '../app/storage/gameSessionStorage';
import { CHUNK_SIZE, DEFAULT_SETTINGS, type GameSettings } from '../config/constants';
import { InputController } from '../core/InputController';
import { RenderContext } from '../core/RenderContext';
import { COMPONENT_PHYSICS, COMPONENT_TRANSFORM } from '../ecs/components';
import { ECSWorld } from '../ecs/ECSWorld';
import { InventoryState } from '../inventory/InventoryState';
import { InventoryUI } from '../inventory/InventoryUI';
import { CraftingManager } from '../inventory/crafting/CraftingManager';
import { Hotbar } from '../ui/Hotbar';
import { Hud } from '../ui/Hud';
import { PauseOverlay } from '../ui/pause/PauseOverlay';
import { ChatOverlay } from '../ui/chat/ChatOverlay';
import { GameCommandService } from './commands/GameCommandService';
import { createInitialInventorySlots } from './factories/createInitialInventorySlots';
import { createPlayerEntity } from './factories/createPlayerEntity';
import { createSystems, type GameSystems } from './factories/createSystems';
import { SystemOrchestrator } from './SystemOrchestrator';
import { VoxelWorld } from '../world/VoxelWorld';

type GameConfig = {
  settings?: Partial<GameSettings>;
  worldName?: string;
  seed?: string;
};

export class Game {
  settings: GameSettings;
  worldConfig: { worldName: string; seed: string };
  lastTime: number;
  virtualNow: number;
  appliedRenderDistance: number;
  chatInputOpen: boolean;
  inventoryOpen: boolean;
  deathOverlayOpen: boolean;
  paused: boolean;
  renderContext: RenderContext;
  input: InputController;
  hud: Hud;
  inventoryState: InventoryState;
  hotbar: Hotbar;
  inventoryUI: InventoryUI;
  craftingManager: CraftingManager;
  deathOverlayRoot: HTMLElement | null;
  respawnButton: HTMLButtonElement | null;
  menuButton: HTMLButtonElement | null;
  ecs: ECSWorld;
  world: VoxelWorld;
  playerEntityId: number;
  systems: GameSystems;
  orchestrator: SystemOrchestrator;
  commandService: GameCommandService;
  chat: ChatOverlay;
  pauseOverlay: PauseOverlay;

  constructor(config: GameConfig = {}) {
    this.settings = { ...DEFAULT_SETTINGS, ...(config.settings ?? {}) };
    this.worldConfig = {
      worldName: config.worldName ?? '',
      seed: config.seed ?? ''
    };
    this.lastTime = performance.now();
    this.virtualNow = this.lastTime;
    this.appliedRenderDistance = -1;
    this.chatInputOpen = false;
    this.inventoryOpen = false;
    this.deathOverlayOpen = false;
    this.paused = false;

    this.renderContext = new RenderContext(document.body);
    this.input = new InputController(this.renderContext.renderer.domElement);
    this.hud = new Hud(
      document.getElementById('help'),
      document.getElementById('breakProgress'),
      document.getElementById('breakProgressFill'),
      document.getElementById('healthBar'),
      document.getElementById('hungerBar')
    );
    this.hud.setHelpEnabled(this.settings.showHelpOverlay);
    this.inventoryState = new InventoryState(45, createInitialInventorySlots());
    this.craftingManager = new CraftingManager(new InventoryState(4), new InventoryState(9));
    this.hotbar = new Hotbar(document.getElementById('hotbar'), this.inventoryState);
    this.inventoryUI = new InventoryUI({
      overlayElement: document.getElementById('inventoryOverlay'),
      gridElement: document.getElementById('inventoryGrid'),
      craftingGridElement: document.getElementById('craftingGrid'),
      craftingResultElement: document.getElementById('craftingResult'),
      inventoryState: this.inventoryState,
      getCraftingResult: () => this.craftingManager.getResultSlot(),
      onCraft: () => {
        this.craftingManager.craftOnce(this.inventoryState);
      }
    });
    this.inventoryUI.setCraftingState(
      this.craftingManager.getActiveGrid(),
      this.craftingManager.getGridSize()
    );
    this.deathOverlayRoot = document.getElementById('deathOverlay');
    this.respawnButton = document.getElementById('respawnButton') as HTMLButtonElement | null;
    this.menuButton = document.getElementById('menuButton') as HTMLButtonElement | null;
    this.ecs = new ECSWorld();
    this.world = new VoxelWorld(this.renderContext.scene, this.settings, this.worldConfig);
    this.playerEntityId = createPlayerEntity(this.ecs, this.settings);

    this.systems = createSystems({
      scene: this.renderContext.scene,
      world: this.world,
      camera: this.renderContext.camera,
      input: this.input,
      settings: this.settings,
      lighting: this.renderContext.lighting,
      ecs: this.ecs,
      playerEntityId: this.playerEntityId,
      inventoryState: this.inventoryState,
      onPlayerDeath: () => this.showDeathOverlay()
    });
    this.orchestrator = new SystemOrchestrator({
      ecs: this.ecs,
      playerEntityId: this.playerEntityId,
      systems: this.systems,
      camera: this.renderContext.camera,
      input: this.input,
      hotbar: this.hotbar,
      inventoryState: this.inventoryState,
      hud: this.hud,
      onOpenCraftingTable: () => this.openInventoryWithMode('table')
    });
    this.commandService = new GameCommandService({
      ecs: this.ecs,
      playerEntityId: this.playerEntityId,
      systems: this.systems,
      world: this.world,
      camera: this.renderContext.camera,
      inventoryState: this.inventoryState
    });
    this.chat = new ChatOverlay({
      rootElement: document.getElementById('chatRoot'),
      logElement: document.getElementById('chatLog'),
      suggestionsElement: document.getElementById('chatSuggestions'),
      inputRowElement: document.getElementById('chatInputRow'),
      inputElement: document.getElementById('chatInput') as HTMLInputElement | null,
      getSeed: () => this.world.getSeedString(),
      canOpenInput: () => !this.paused && !this.inventoryOpen && !this.deathOverlayOpen,
      onHelpToggle: (isEnabled) => {
        this.hud.setHelpEnabled(isEnabled);
        this.settings.showHelpOverlay = isEnabled;
        saveMenuSettings(this.settings);
      },
      onCommand: (rawText) => this.commandService.execute(rawText),
      commandDefinitions: this.commandService.getCommandDefinitions(),
      onInputFocusChanged: (isOpen) => {
        this.chatInputOpen = isOpen;
        this.syncInputCapture();
      },
      requestPointerUnlock: () => document.exitPointerLock?.(),
      getChunkStats: () => ({
        loaded: this.world.storage.loadedChunks.size,
        pending: this.world.getPendingChunkCount(),
        center: { x: this.world.currentChunkX, z: this.world.currentChunkZ }
      })
    });
    this.pauseOverlay = new PauseOverlay({
      settings: this.settings,
      rootElement: document.getElementById('pauseOverlay'),
      mainViewElement: document.getElementById('pauseMainView'),
      settingsViewElement: document.getElementById('pauseSettingsView'),
      statusElement: document.getElementById('pauseStatus'),
      continueButton: document.getElementById('pauseContinueButton') as HTMLButtonElement | null,
      menuButton: document.getElementById('pauseMenuButton') as HTMLButtonElement | null,
      saveButton: document.getElementById('pauseSaveButton') as HTMLButtonElement | null,
      settingsButton: document.getElementById('pauseSettingsButton') as HTMLButtonElement | null,
      closeButton: document.getElementById('pauseCloseButton') as HTMLButtonElement | null,
      backButton: document.getElementById('pauseSettingsBackButton') as HTMLButtonElement | null,
      settingsCategoryListElement: document.getElementById('pauseSettingsCategories'),
      settingsFieldListElement: document.getElementById('pauseSettingsFields'),
      settingsSearchInputElement: document.getElementById(
        'pauseSettingsSearch'
      ) as HTMLInputElement | null,
      settingsCategoryTitleElement: document.getElementById('pauseSettingsCategoryTitle'),
      settingsCategoryDescriptionElement: document.getElementById(
        'pauseSettingsCategoryDescription'
      ),
      settingsResultMetaElement: document.getElementById('pauseSettingsResultMeta'),
      settingsEmptyStateElement: document.getElementById('pauseSettingsEmpty'),
      onContinue: () => this.closePauseMenu(),
      onMenu: () => {
        saveMenuSettings(this.settings);
        window.location.href = './menu.html';
      },
      onSave: () => {
        this.pauseOverlay.setStatus('Save world is wired as a placeholder for now.');
      },
      onSettingsChange: (patch) => {
        Object.assign(this.settings, patch);
        saveMenuSettings(this.settings);
        this.syncRenderDistanceView();
        this.renderContext.render();
      }
    });

    this.bindEvents();
    this.bindDebugHooks();
    this.syncInputCapture();
  }

  bindEvents(): void {
    window.addEventListener('resize', () => this.renderContext.resize());
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (event.code === 'Escape' && !event.repeat) {
        if (this.deathOverlayOpen) return;
        event.preventDefault();
        if (this.paused) {
          this.closePauseMenu();
        } else {
          this.openPauseMenu();
        }
        return;
      }

      if (event.code !== 'KeyE' || event.repeat) return;
      if (this.paused || this.deathOverlayOpen) return;
      const isTyping = document.activeElement instanceof HTMLInputElement;
      if (isTyping) return;
      event.preventDefault();
      this.toggleInventory();
    });

    this.input.addPointerLockListener((isLocked) => this.hud.setContextVisible(!isLocked));
    this.input.addHotbarSelectionListener((selectedSlot) => this.hotbar.setSelected(selectedSlot));

    this.respawnButton?.addEventListener('click', () => this.respawnPlayer());
    this.menuButton?.addEventListener('click', () => {
      saveMenuSettings(this.settings);
      window.location.href = './menu.html';
    });
  }

  syncInputCapture(): void {
    const canCapture =
      !this.chatInputOpen && !this.inventoryOpen && !this.deathOverlayOpen && !this.paused;
    this.input.setCaptureEnabled(canCapture);
  }

  openPauseMenu(): void {
    if (this.paused || this.deathOverlayOpen) return;
    if (this.inventoryOpen) this.closeInventory();
    if (this.chat.isTyping()) this.chat.closeInput();
    this.paused = true;
    this.pauseOverlay.open();
    document.exitPointerLock?.();
    this.syncInputCapture();
  }

  closePauseMenu(): void {
    if (!this.paused) return;
    this.paused = false;
    this.pauseOverlay.close();
    this.lastTime = performance.now();
    this.virtualNow = this.lastTime;
    this.syncInputCapture();
  }

  toggleInventory(): void {
    if (this.inventoryOpen) {
      this.closeInventory();
      return;
    }
    this.openInventoryWithMode('player');
  }

  openInventoryWithMode(mode: 'player' | 'table'): void {
    if (this.paused || this.deathOverlayOpen) return;
    if (this.inventoryOpen && this.craftingManager.mode !== mode) {
      this.craftingManager.flushActiveGridToInventory(this.inventoryState);
    }
    this.craftingManager.setMode(mode);
    this.inventoryUI.setCraftingState(
      this.craftingManager.getActiveGrid(),
      this.craftingManager.getGridSize()
    );
    if (!this.inventoryOpen) {
      this.inventoryOpen = true;
      this.inventoryUI.setOpen(true);
      document.exitPointerLock?.();
    }
    this.syncInputCapture();
  }

  closeInventory(): void {
    this.craftingManager.flushActiveGridToInventory(this.inventoryState);
    this.inventoryOpen = false;
    this.inventoryUI.setOpen(false);
    this.syncInputCapture();
  }

  syncRenderDistanceView(): void {
    if (this.appliedRenderDistance === this.settings.renderDistance) return;
    this.appliedRenderDistance = this.settings.renderDistance;
    this.renderContext.applyRenderDistance(this.settings.renderDistance, CHUNK_SIZE);
  }

  initializePlayerSpawn(): void {
    const spawn = this.world.getSpawnPoint();
    const transform = this.ecs.getComponent<{ position: THREE.Vector3 }>(
      this.playerEntityId,
      COMPONENT_TRANSFORM
    );
    if (!transform) return;
    transform.position.set(spawn.x + 0.5, spawn.y, spawn.z + 0.5);
    this.systems.survival.setSpawnPoint(transform.position.clone());
    this.systems.survival.lastPosition.copy(transform.position);
    this.hud.setHealth(this.systems.survival.getHealth());
    this.hud.setHunger(this.systems.survival.getHunger());
  }

  showDeathOverlay(): void {
    this.paused = false;
    this.pauseOverlay.close();
    if (this.inventoryOpen) this.closeInventory();
    if (this.chat.isTyping()) this.chat.closeInput();
    this.deathOverlayOpen = true;
    this.deathOverlayRoot?.classList.remove('is-hidden');
    document.exitPointerLock?.();
    this.syncInputCapture();
  }

  hideDeathOverlay(): void {
    this.deathOverlayOpen = false;
    this.deathOverlayRoot?.classList.add('is-hidden');
    this.syncInputCapture();
  }

  respawnPlayer(): void {
    this.systems.survival.respawn();
    const transform = this.ecs.getComponent<{ position: THREE.Vector3 }>(
      this.playerEntityId,
      COMPONENT_TRANSFORM
    );
    if (transform) {
      this.systems.chunks.force(transform.position);
      this.systems.camera.update(this.ecs, this.playerEntityId, this.renderContext.camera);
    }
    this.hud.setHealth(this.systems.survival.getHealth());
    this.hud.setHunger(this.systems.survival.getHunger());
    this.hideDeathOverlay();
  }

  bindDebugHooks(): void {
    window.__game = this;
    window.render_game_to_text = () => this.renderGameToText();
    window.advanceTime = (ms = 16.67) => this.advanceTime(ms);
    window.execute_game_command = (text) => this.commandService.execute(String(text ?? ''));
  }

  runFrame(dt: number, nowMs: number): void {
    this.syncRenderDistanceView();
    if (this.paused) {
      this.renderContext.render();
      return;
    }

    this.orchestrator.runPlayingFrame(dt);
    this.chat.updateFrame(nowMs, dt);
    this.renderContext.render();
  }

  advanceTime(ms: number): void {
    if (this.paused) {
      this.renderContext.render();
      return;
    }
    const clampedMs = Math.max(1, Number(ms) || 16.67);
    const stepCount = Math.max(1, Math.round(clampedMs / (1000 / 60)));
    const dt = clampedMs / 1000 / stepCount;
    for (let i = 0; i < stepCount; i++) {
      this.virtualNow += dt * 1000;
      this.runFrame(dt, this.virtualNow);
    }
  }

  renderGameToText(): string {
    const transform = this.ecs.getComponent<{
      position: THREE.Vector3;
      yaw: number;
      pitch: number;
    }>(this.playerEntityId, COMPONENT_TRANSFORM);
    const physics = this.ecs.getComponent<{ velocity: THREE.Vector3; onGround: boolean }>(
      this.playerEntityId,
      COMPONENT_PHYSICS
    );
    const target = this.systems.targeting.getCurrentHit()?.block ?? null;
    const payload = {
      mode: this.paused ? 'paused' : 'playing',
      coordinateSystem: 'Origin at world grid. +X east, +Y up, +Z south.',
      player: transform
        ? {
            x: Number(transform.position.x.toFixed(3)),
            y: Number(transform.position.y.toFixed(3)),
            z: Number(transform.position.z.toFixed(3)),
            yaw: Number(transform.yaw.toFixed(3)),
            pitch: Number(transform.pitch.toFixed(3)),
            velocity: physics
              ? {
                  x: Number(physics.velocity.x.toFixed(3)),
                  y: Number(physics.velocity.y.toFixed(3)),
                  z: Number(physics.velocity.z.toFixed(3))
                }
              : null,
            onGround: Boolean(physics?.onGround)
          }
        : null,
      world: {
        seed: this.world.getSeedString(),
        gamemode: this.systems.gamemode.getMode(),
        biome: transform ? this.world.getBiomeAt(transform.position.x, transform.position.z) : null,
        centerChunk: { x: this.world.currentChunkX, z: this.world.currentChunkZ },
        loadedChunks: this.world.storage.loadedChunks.size,
        pendingChunkTasks: this.world.hasPendingChunkWork(),
        dayNight: this.systems.dayNight.getTimeState(),
        nightVision: this.systems.dayNight.isNightVisionEnabled(),
        paused: this.paused
      },
      vitals: {
        health: this.systems.survival.getHealth(),
        hunger: this.systems.survival.getHunger(),
        isDead: this.systems.survival.isDead
      },
      mobs: this.systems.mobs.getMobPositions(),
      hotbar: Array.from({ length: 9 }, (_, index) => {
        const slot = this.inventoryState.getSlot(index);
        if (!slot) return null;
        if (slot.kind === 'block') {
          return { kind: slot.kind, blockType: slot.blockType, quantity: slot.quantity };
        }
        if (slot.kind === 'food') {
          return { kind: slot.kind, foodType: slot.foodType, quantity: slot.quantity };
        }
        return { kind: slot.kind, itemType: slot.itemType, quantity: slot.quantity };
      }),
      targeting: target
    };
    return JSON.stringify(payload);
  }

  start(): void {
    this.syncRenderDistanceView();
    this.initializePlayerSpawn();
    const transform = this.ecs.getComponent<{ position: THREE.Vector3 }>(
      this.playerEntityId,
      COMPONENT_TRANSFORM
    );
    if (!transform) return;
    this.systems.chunks.force(transform.position);
    this.systems.camera.update(this.ecs, this.playerEntityId, this.renderContext.camera);
    this.virtualNow = this.lastTime;
    requestAnimationFrame((now) => this.tick(now));
  }

  tick(now: number): void {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.virtualNow = now;
    this.runFrame(dt, now);
    requestAnimationFrame((nextNow) => this.tick(nextNow));
  }
}
