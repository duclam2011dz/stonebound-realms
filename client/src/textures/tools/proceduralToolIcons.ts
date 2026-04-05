type ToolIconType = 'wooden_sword' | 'wooden_pickaxe' | 'stone_sword' | 'stone_pickaxe';

type ToolPalette = {
  material: { base: string; shadow: string; highlight: string };
  handle: { base: string; shadow: string; highlight: string };
  guard: string;
};

const WOOD_PALETTE: ToolPalette = {
  material: { base: '#c89b66', shadow: '#9a6b3f', highlight: '#e2be85' },
  handle: { base: '#8c5a32', shadow: '#6b4123', highlight: '#b0794b' },
  guard: '#7a532d'
};

const STONE_PALETTE: ToolPalette = {
  material: { base: '#9da3ad', shadow: '#6f7580', highlight: '#c6ccd6' },
  handle: { base: '#8c5a32', shadow: '#6b4123', highlight: '#b0794b' },
  guard: '#6f6b66'
};

const ICON_SIZE = 64;

const ICON_CACHE: Partial<Record<ToolIconType, string>> = {};

function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function createCanvas(size: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function drawSpeckles(
  ctx: CanvasRenderingContext2D,
  size: number,
  rng: () => number,
  colors: string[],
  count: number
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rng() * size);
    const y = Math.floor(rng() * size);
    const w = 1 + Math.floor(rng() * 2);
    const h = 1 + Math.floor(rng() * 2);
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)] ?? colors[0] ?? '#ffffff';
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

function drawSword(
  ctx: CanvasRenderingContext2D,
  size: number,
  palette: ToolPalette,
  seed: number
): void {
  const rng = seededRng(seed);
  ctx.save();
  ctx.translate(size * 0.5, size * 0.52);
  ctx.rotate(-Math.PI / 7);

  const bladeWidth = size * 0.12;
  const bladeLength = size * 0.62;
  ctx.fillStyle = palette.material.base;
  ctx.fillRect(-bladeWidth / 2, -bladeLength * 0.55, bladeWidth, bladeLength);
  ctx.fillStyle = palette.material.highlight;
  ctx.fillRect(-bladeWidth / 2, -bladeLength * 0.55, bladeWidth * 0.35, bladeLength);

  ctx.beginPath();
  ctx.moveTo(0, -bladeLength * 0.68);
  ctx.lineTo(-bladeWidth / 2, -bladeLength * 0.5);
  ctx.lineTo(bladeWidth / 2, -bladeLength * 0.5);
  ctx.closePath();
  ctx.fillStyle = palette.material.highlight;
  ctx.fill();

  const guardWidth = size * 0.34;
  const guardHeight = size * 0.06;
  ctx.fillStyle = palette.guard;
  ctx.fillRect(-guardWidth / 2, bladeLength * 0.05, guardWidth, guardHeight);

  const gripWidth = bladeWidth * 0.9;
  const gripLength = size * 0.2;
  ctx.fillStyle = palette.handle.base;
  ctx.fillRect(-gripWidth / 2, bladeLength * 0.1, gripWidth, gripLength);
  ctx.fillStyle = palette.handle.highlight;
  ctx.fillRect(-gripWidth / 2, bladeLength * 0.1, gripWidth * 0.3, gripLength);

  ctx.fillStyle = palette.handle.shadow;
  ctx.fillRect(-gripWidth * 0.8, bladeLength * 0.32, gripWidth * 1.6, guardHeight * 0.9);
  ctx.restore();

  drawSpeckles(
    ctx,
    size,
    rng,
    [palette.material.shadow, palette.material.highlight, palette.material.base],
    48
  );
  drawSpeckles(
    ctx,
    size,
    rng,
    [palette.handle.shadow, palette.handle.highlight, palette.handle.base],
    32
  );
}

function drawPickaxe(
  ctx: CanvasRenderingContext2D,
  size: number,
  palette: ToolPalette,
  seed: number
): void {
  const rng = seededRng(seed);
  ctx.save();
  ctx.translate(size * 0.5, size * 0.58);
  ctx.rotate(-Math.PI / 4.2);

  const handleWidth = size * 0.07;
  const handleLength = size * 0.7;
  ctx.fillStyle = palette.handle.shadow;
  ctx.fillRect(-handleWidth / 2, -handleLength * 0.45, handleWidth, handleLength);
  ctx.fillStyle = palette.handle.base;
  ctx.fillRect(
    -handleWidth / 2 + handleWidth * 0.15,
    -handleLength * 0.45,
    handleWidth * 0.7,
    handleLength
  );
  ctx.fillStyle = palette.handle.highlight;
  ctx.fillRect(
    -handleWidth / 2 + handleWidth * 0.2,
    -handleLength * 0.45,
    handleWidth * 0.2,
    handleLength
  );

  const headWidth = size * 0.6;
  const headHeight = size * 0.12;
  const headY = -handleLength * 0.45 - headHeight * 0.4;
  ctx.fillStyle = palette.material.shadow;
  ctx.fillRect(-headWidth / 2, headY, headWidth, headHeight);
  ctx.fillStyle = palette.material.base;
  ctx.fillRect(
    -headWidth / 2 + headWidth * 0.08,
    headY + headHeight * 0.15,
    headWidth * 0.84,
    headHeight * 0.7
  );

  ctx.fillStyle = palette.material.highlight;
  ctx.beginPath();
  ctx.moveTo(-headWidth / 2, headY + headHeight * 0.2);
  ctx.lineTo(-headWidth / 2 - headWidth * 0.18, headY + headHeight * 0.6);
  ctx.lineTo(-headWidth / 2, headY + headHeight * 0.6);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(headWidth / 2, headY + headHeight * 0.2);
  ctx.lineTo(headWidth / 2 + headWidth * 0.18, headY + headHeight * 0.6);
  ctx.lineTo(headWidth / 2, headY + headHeight * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  drawSpeckles(
    ctx,
    size,
    rng,
    [palette.material.shadow, palette.material.highlight, palette.material.base],
    56
  );
  drawSpeckles(
    ctx,
    size,
    rng,
    [palette.handle.shadow, palette.handle.highlight, palette.handle.base],
    36
  );
}

function createToolIcon(kind: 'sword' | 'pickaxe', palette: ToolPalette, seed: number): string {
  const canvas = createCanvas(ICON_SIZE);
  if (!canvas) return '';
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
  ctx.imageSmoothingEnabled = true;

  if (kind === 'sword') {
    drawSword(ctx, ICON_SIZE, palette, seed);
  } else {
    drawPickaxe(ctx, ICON_SIZE, palette, seed);
  }

  return canvas.toDataURL('image/png');
}

export function getToolIcon(type: ToolIconType): string {
  const cached = ICON_CACHE[type];
  if (cached) return cached;

  const isStone = type.startsWith('stone_');
  const kind = type.includes('sword') ? 'sword' : 'pickaxe';
  const palette = isStone ? STONE_PALETTE : WOOD_PALETTE;
  const seed = (isStone ? 8207 : 4207) + (kind === 'pickaxe' ? 31 : 17);
  const icon = createToolIcon(kind, palette, seed);
  ICON_CACHE[type] = icon;
  return icon;
}
