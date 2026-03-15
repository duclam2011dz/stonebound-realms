import type { InputState } from './InputState';

type BindInputOptions = {
  pointerLockElement: HTMLElement;
  state: InputState;
  isCaptureEnabled: () => boolean;
  onPointerLockChange: (isLocked: boolean) => void;
  onHotbarSelection: (slotIndex: number) => void;
};

export function bindInputEvents({
  pointerLockElement,
  state,
  isCaptureEnabled,
  onPointerLockChange,
  onHotbarSelection
}: BindInputOptions): { isPointerLocked: () => boolean } {
  const isPointerLocked = () => document.pointerLockElement === pointerLockElement;
  const shouldCapture = () =>
    isCaptureEnabled() && !(document.activeElement instanceof HTMLInputElement);

  const handleHotbarSelection = (code: string) => {
    if (!code.startsWith('Digit')) return;
    const hotbarIndex = Number(code.slice(5)) - 1;
    if (Number.isNaN(hotbarIndex) || hotbarIndex < 0 || hotbarIndex > 8) return;
    state.selectedHotbarSlot = hotbarIndex;
    onHotbarSelection(hotbarIndex);
  };

  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (!shouldCapture()) return;
    state.keys.set(event.code, true);
    if (event.code === 'KeyR' && !event.repeat) {
      state.reloadRequested = true;
    }
    handleHotbarSelection(event.code);
  });

  window.addEventListener('keyup', (event: KeyboardEvent) => {
    if (!shouldCapture()) return;
    state.keys.set(event.code, false);
  });

  document.addEventListener('mousemove', (event: MouseEvent) => {
    if (!shouldCapture() || !isPointerLocked()) return;
    state.lookDeltaX += event.movementX;
    state.lookDeltaY += event.movementY;
  });

  document.addEventListener('mousedown', (event: MouseEvent) => {
    if (!shouldCapture()) return;
    if (!isPointerLocked()) {
      pointerLockElement.requestPointerLock();
      return;
    }

    if (event.button === 0) {
      state.breakHeld = true;
      state.attackRequested = true;
    }
    if (event.button === 2) state.placeRequested = true;
  });

  document.addEventListener('mouseup', (event: MouseEvent) => {
    if (event.button === 0) {
      state.breakHeld = false;
    }
  });

  document.addEventListener('contextmenu', (event: MouseEvent) => event.preventDefault());
  document.addEventListener('pointerlockchange', () => {
    if (!isPointerLocked()) {
      state.breakHeld = false;
      state.attackRequested = false;
    }
    onPointerLockChange(isPointerLocked());
  });

  return { isPointerLocked };
}
