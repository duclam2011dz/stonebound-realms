import { bindInputEvents } from './input/InputBindings';
import { InputState, type InputActions } from './input/InputState';

type PointerLockListener = (isLocked: boolean) => void;
type HotbarSelectionListener = (slotIndex: number) => void;

export class InputController {
  pointerLockElement: HTMLElement;
  state: InputState;
  captureEnabled: boolean;
  pointerLockListeners: PointerLockListener[];
  hotbarSelectionListeners: HotbarSelectionListener[];
  bindingApi: { isPointerLocked: () => boolean };

  constructor(pointerLockElement: HTMLElement) {
    this.pointerLockElement = pointerLockElement;
    this.state = new InputState();
    this.captureEnabled = true;
    this.pointerLockListeners = [];
    this.hotbarSelectionListeners = [];

    this.bindingApi = bindInputEvents({
      pointerLockElement: this.pointerLockElement,
      state: this.state,
      isCaptureEnabled: () => this.captureEnabled,
      onPointerLockChange: (isLocked: boolean) => {
        for (const callback of this.pointerLockListeners) callback(isLocked);
      },
      onHotbarSelection: (slotIndex: number) => {
        for (const callback of this.hotbarSelectionListeners) callback(slotIndex);
      }
    });
  }

  addPointerLockListener(callback: PointerLockListener): void {
    this.pointerLockListeners.push(callback);
  }

  addHotbarSelectionListener(callback: HotbarSelectionListener): void {
    this.hotbarSelectionListeners.push(callback);
  }

  getSelectedHotbarSlot(): number {
    return this.state.selectedHotbarSlot;
  }

  isPointerLocked(): boolean {
    return this.bindingApi.isPointerLocked();
  }

  setCaptureEnabled(enabled: boolean): void {
    this.captureEnabled = enabled;
    if (!enabled) {
      this.state.reset();
    }
  }

  isKeyDown(code: string): boolean {
    return this.state.isKeyDown(code);
  }

  consumeLookDelta(): { dx: number; dy: number } {
    return this.state.consumeLookDelta();
  }

  consumeActions(): InputActions {
    return this.state.consumeActions();
  }
}
