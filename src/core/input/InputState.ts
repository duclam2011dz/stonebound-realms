export type InputActions = {
  breakHeld: boolean;
  placeBlock: boolean;
  reloadChunks: boolean;
  attackRequested: boolean;
};

export class InputState {
  keys: Map<string, boolean>;
  lookDeltaX: number;
  lookDeltaY: number;
  breakHeld: boolean;
  placeRequested: boolean;
  reloadRequested: boolean;
  attackRequested: boolean;
  selectedHotbarSlot: number;

  constructor() {
    this.keys = new Map();
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.breakHeld = false;
    this.placeRequested = false;
    this.reloadRequested = false;
    this.attackRequested = false;
    this.selectedHotbarSlot = 0;
  }

  isKeyDown(code: string): boolean {
    return this.keys.get(code) === true;
  }

  consumeLookDelta(): { dx: number; dy: number } {
    const dx = this.lookDeltaX;
    const dy = this.lookDeltaY;
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    return { dx, dy };
  }

  consumeActions(): InputActions {
    const actions = {
      breakHeld: this.breakHeld,
      placeBlock: this.placeRequested,
      reloadChunks: this.reloadRequested,
      attackRequested: this.attackRequested
    };
    this.placeRequested = false;
    this.reloadRequested = false;
    this.attackRequested = false;
    return actions;
  }

  reset(): void {
    this.keys.clear();
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    this.breakHeld = false;
    this.placeRequested = false;
    this.reloadRequested = false;
    this.attackRequested = false;
  }
}
