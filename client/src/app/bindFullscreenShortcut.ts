export function bindFullscreenShortcut(target: HTMLElement = document.documentElement): void {
  window.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.code !== 'F11' || event.repeat) return;
    event.preventDefault();
    void toggleFullscreen(target);
  });
}

async function toggleFullscreen(target: HTMLElement): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await target.requestFullscreen();
  } catch {
    // Browsers may reject fullscreen requests without a trusted gesture or for policy reasons.
  }
}
