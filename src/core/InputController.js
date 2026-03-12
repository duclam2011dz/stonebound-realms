import { bindInputEvents } from "./input/InputBindings.js";
import { InputState } from "./input/InputState.js";

export class InputController {
  constructor(pointerLockElement) {
    this.pointerLockElement = pointerLockElement;
    this.state = new InputState();
    this.captureEnabled = true;
    this.pointerLockListeners = [];
    this.hotbarSelectionListeners = [];

    this.bindingApi = bindInputEvents({
      pointerLockElement: this.pointerLockElement,
      state: this.state,
      isCaptureEnabled: () => this.captureEnabled,
      onPointerLockChange: (isLocked) => {
        for (const callback of this.pointerLockListeners) callback(isLocked);
      },
      onHotbarSelection: (slotIndex) => {
        for (const callback of this.hotbarSelectionListeners) callback(slotIndex);
      }
    });
  }

  addPointerLockListener(callback) {
    this.pointerLockListeners.push(callback);
  }

  addHotbarSelectionListener(callback) {
    this.hotbarSelectionListeners.push(callback);
  }

  getSelectedHotbarSlot() {
    return this.state.selectedHotbarSlot;
  }

  isPointerLocked() {
    return this.bindingApi.isPointerLocked();
  }

  setCaptureEnabled(enabled) {
    this.captureEnabled = enabled;
    if (!enabled) {
      this.state.reset();
    }
  }

  isKeyDown(code) {
    return this.state.isKeyDown(code);
  }

  consumeLookDelta() {
    return this.state.consumeLookDelta();
  }

  consumeActions() {
    return this.state.consumeActions();
  }
}
