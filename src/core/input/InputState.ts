export class InputState {
  constructor() {
    this.keys = new Map();
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.breakHeld = false;
    this.placeRequested = false;
    this.reloadRequested = false;
    this.selectedHotbarSlot = 0;
  }

  isKeyDown(code) {
    return this.keys.get(code) === true;
  }

  consumeLookDelta() {
    const dx = this.lookDeltaX;
    const dy = this.lookDeltaY;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    return { dx, dy };
  }

  consumeActions() {
    const actions = {
      breakHeld: this.breakHeld,
      placeBlock: this.placeRequested,
      reloadChunks: this.reloadRequested
    };
    this.placeRequested = false;
    this.reloadRequested = false;
    return actions;
  }

  reset() {
    this.keys.clear();
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.breakHeld = false;
    this.placeRequested = false;
    this.reloadRequested = false;
  }
}
