import type * as THREE from 'three';
import { CHUNK_SIZE, DEFAULT_SETTINGS, type GameSettings } from '../config/constants';
import { InputController } from '../core/InputController';
import { RenderContext } from '../core/RenderContext';
import { COMPONENT_PHYSICS, COMPONENT_TRANSFORM } from '../ecs/components';
import { ECSWorld } from '../ecs/ECSWorld';
import { InventoryState } from '../inventory/InventoryState';
import { InventoryUI } from '../inventory/InventoryUI';
import { createInitialInventorySlots } from './factories/createInitialInventorySlots';
import { createPlayerEntity } from './factories/createPlayerEntity';
import { createSystems, type GameSystems } from './factories/createSystems';
import { SystemOrchestrator } from './SystemOrchestrator';
import { Hotbar } from '../ui/Hotbar';
import { Hud } from '../ui/Hud';
import { ChatOverlay } from '../ui/chat/ChatOverlay';
import { GameCommandService } from './commands/GameCommandService';
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
  renderContext: RenderContext;
  input: InputController;
  hud: Hud;
  inventoryState: InventoryState;
  hotbar: Hotbar;
  inventoryUI: InventoryUI;
  ecs: ECSWorld;
  world: VoxelWorld;
  playerEntityId: number;
  systems: GameSystems;
  orchestrator: SystemOrchestrator;
  commandService: GameCommandService;
  chat: ChatOverlay;

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

    this.renderContext = new RenderContext(document.body);
    this.input = new InputController(this.renderContext.renderer.domElement);
    this.hud = new Hud(
      document.getElementById('help'),
      document.getElementById('breakProgress'),
      document.getElementById('breakProgressFill')
    );
    this.inventoryState = new InventoryState(45, createInitialInventorySlots());
    this.hotbar = new Hotbar(document.getElementById('hotbar'), this.inventoryState);
    this.inventoryUI = new InventoryUI({
      overlayElement: document.getElementById('inventoryOverlay'),
      gridElement: document.getElementById('inventoryGrid'),
      inventoryState: this.inventoryState
    });
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
      playerEntityId: this.playerEntityId
    });
    this.orchestrator = new SystemOrchestrator({
      ecs: this.ecs,
      playerEntityId: this.playerEntityId,
      systems: this.systems,
      camera: this.renderContext.camera,
      input: this.input,
      hotbar: this.hotbar,
      inventoryState: this.inventoryState,
      hud: this.hud
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
      inputRowElement: document.getElementById('chatInputRow'),
      inputElement: document.getElementById('chatInput') as HTMLInputElement | null,
      getSeed: () => this.world.getSeedString(),
      onHelpToggle: (isEnabled) => this.hud.setHelpEnabled(isEnabled),
      onCommand: (rawText) => this.commandService.execute(rawText),
      onInputFocusChanged: (isOpen) => {
        this.chatInputOpen = isOpen;
        this.syncInputCapture();
      },
      requestPointerUnlock: () => document.exitPointerLock?.()
    });

    this.bindEvents();
    this.bindDebugHooks();
    this.syncInputCapture();
  }

  bindEvents(): void {
    window.addEventListener('resize', () => this.renderContext.resize());
    window.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.code !== 'KeyE' || event.repeat) return;
      const isTyping = document.activeElement instanceof HTMLInputElement;
      if (isTyping) return;
      event.preventDefault();
      this.toggleInventory();
    });

    this.input.addPointerLockListener((isLocked) => this.hud.setContextVisible(!isLocked));
    this.input.addHotbarSelectionListener((selectedSlot) => this.hotbar.setSelected(selectedSlot));
  }

  syncInputCapture(): void {
    const canCapture = !this.chatInputOpen && !this.inventoryOpen;
    this.input.setCaptureEnabled(canCapture);
  }

  toggleInventory(): void {
    this.inventoryOpen = !this.inventoryOpen;
    this.inventoryUI.setOpen(this.inventoryOpen);
    if (this.inventoryOpen) {
      document.exitPointerLock?.();
    }
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
  }

  bindDebugHooks(): void {
    window.__game = this;
    window.render_game_to_text = () => this.renderGameToText();
    window.advanceTime = (ms = 16.67) => this.advanceTime(ms);
    window.execute_game_command = (text) => this.commandService.execute(String(text ?? ''));
  }

  runFrame(dt: number, nowMs: number): void {
    this.syncRenderDistanceView();
    this.orchestrator.runPlayingFrame(dt);
    this.chat.updateFrame(nowMs, dt);
    this.renderContext.render();
  }

  advanceTime(ms: number): void {
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
      mode: 'playing',
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
        nightVision: this.systems.dayNight.isNightVisionEnabled()
      },
      hotbar: Array.from({ length: 9 }, (_, index) => {
        const slot = this.inventoryState.getSlot(index);
        return slot ? { blockType: slot.blockType, quantity: slot.quantity } : null;
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
