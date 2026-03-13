import * as THREE from 'three';

const BREAK_STAGE_COUNT = 10;
const TILE_SIZE = 64;

function createStageTexture(stageIndex) {
  const canvas = document.createElement('canvas');
  canvas.width = TILE_SIZE;
  canvas.height = TILE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
  const density = 8 + stageIndex * 4;
  const alpha = Math.min(0.95, 0.35 + stageIndex * 0.055);
  ctx.strokeStyle = `rgba(12, 10, 10, ${alpha})`;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';

  let seed = (stageIndex + 1) * 1811;
  const random = () => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  };

  for (let i = 0; i < density; i++) {
    const x1 = random() * TILE_SIZE;
    const y1 = random() * TILE_SIZE;
    const x2 = x1 + (random() - 0.5) * TILE_SIZE * 0.9;
    const y2 = y1 + (random() - 0.5) * TILE_SIZE * 0.9;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(240, 240, 240, ${alpha * 0.4})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x1 + 0.35, y1 + 0.35);
    ctx.lineTo(x2 + 0.35, y2 + 0.35);
    ctx.stroke();
    ctx.strokeStyle = `rgba(12, 10, 10, ${alpha})`;
    ctx.lineWidth = 2.2;

    const branches = stageIndex >= 4 ? 1 + Math.floor(random() * 2) : 0;
    for (let b = 0; b < branches; b++) {
      const t = random();
      const bx = x1 + (x2 - x1) * t;
      const by = y1 + (y2 - y1) * t;
      const bdx = (random() - 0.5) * TILE_SIZE * 0.35;
      const bdy = (random() - 0.5) * TILE_SIZE * 0.35;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + bdx, by + bdy);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

export function createBreakStageTextures() {
  const textures = [];
  for (let stage = 0; stage < BREAK_STAGE_COUNT; stage++) {
    const texture = createStageTexture(stage);
    if (texture) textures.push(texture);
  }
  return textures;
}
