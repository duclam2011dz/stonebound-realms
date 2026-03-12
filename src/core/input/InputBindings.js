export function bindInputEvents({
  pointerLockElement,
  state,
  isCaptureEnabled,
  onPointerLockChange,
  onHotbarSelection
}) {
  const isPointerLocked = () => document.pointerLockElement === pointerLockElement;
  const shouldCapture = () => isCaptureEnabled() && !(document.activeElement instanceof HTMLInputElement);

  const handleHotbarSelection = (code) => {
    if (!code.startsWith("Digit")) return;
    const hotbarIndex = Number(code.slice(5)) - 1;
    if (Number.isNaN(hotbarIndex) || hotbarIndex < 0 || hotbarIndex > 8) return;
    state.selectedHotbarSlot = hotbarIndex;
    onHotbarSelection(hotbarIndex);
  };

  window.addEventListener("keydown", (event) => {
    if (!shouldCapture()) return;
    state.keys.set(event.code, true);
    if (event.code === "KeyR" && !event.repeat) {
      state.reloadRequested = true;
    }
    handleHotbarSelection(event.code);
  });

  window.addEventListener("keyup", (event) => {
    if (!shouldCapture()) return;
    state.keys.set(event.code, false);
  });

  document.addEventListener("mousemove", (event) => {
    if (!shouldCapture() || !isPointerLocked()) return;
    state.lookDeltaX += event.movementX;
    state.lookDeltaY += event.movementY;
  });

  document.addEventListener("mousedown", (event) => {
    if (!shouldCapture()) return;
    if (!isPointerLocked()) {
      pointerLockElement.requestPointerLock();
      return;
    }

    if (event.button === 0) state.breakHeld = true;
    if (event.button === 2) state.placeRequested = true;
  });

  document.addEventListener("mouseup", (event) => {
    if (event.button === 0) {
      state.breakHeld = false;
    }
  });

  document.addEventListener("contextmenu", (event) => event.preventDefault());
  document.addEventListener("pointerlockchange", () => {
    if (!isPointerLocked()) {
      state.breakHeld = false;
    }
    onPointerLockChange(isPointerLocked());
  });

  return { isPointerLocked };
}
