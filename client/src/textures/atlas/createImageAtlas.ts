import * as THREE from 'three';
import type { AtlasResult } from './createProceduralAtlas';

export type AtlasSourceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AtlasImagePlacement = {
  tileX: number;
  tileY: number;
  imageUrl: string;
  sourceRect?: AtlasSourceRect;
  flipX?: boolean;
  flipY?: boolean;
};

type ImageAtlasOptions = {
  columns: number;
  rows: number;
  tileSize: number;
  placements: AtlasImagePlacement[];
  drawFallbackTiles?: (ctx: CanvasRenderingContext2D, tileSize: number) => void;
};

const IMAGE_CACHE = new Map<string, Promise<HTMLImageElement>>();

function loadImage(imageUrl: string): Promise<HTMLImageElement> {
  const cached = IMAGE_CACHE.get(imageUrl);
  if (cached) return cached;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load atlas source: ${imageUrl}`));
    image.src = imageUrl;
  });

  IMAGE_CACHE.set(imageUrl, promise);
  return promise;
}

export async function createImageAtlas({
  columns,
  rows,
  tileSize,
  placements,
  drawFallbackTiles
}: ImageAtlasOptions): Promise<AtlasResult> {
  const canvas = document.createElement('canvas');
  canvas.width = columns * tileSize;
  canvas.height = rows * tileSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const uniqueUrls = [...new Set(placements.map((placement) => placement.imageUrl))];
  const loadedImages = new Map<string, HTMLImageElement>();
  const images = await Promise.all(uniqueUrls.map((url) => loadImage(url)));
  for (let index = 0; index < uniqueUrls.length; index++) {
    const imageUrl = uniqueUrls[index];
    const image = images[index];
    if (!imageUrl || !image) continue;
    loadedImages.set(imageUrl, image);
  }

  for (const placement of placements) {
    const image = loadedImages.get(placement.imageUrl);
    if (!image) continue;

    const dx = placement.tileX * tileSize;
    const dy = placement.tileY * tileSize;
    const source = placement.sourceRect ?? {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height
    };

    ctx.save();
    if (placement.flipX || placement.flipY) {
      ctx.translate(dx + (placement.flipX ? tileSize : 0), dy + (placement.flipY ? tileSize : 0));
      ctx.scale(placement.flipX ? -1 : 1, placement.flipY ? -1 : 1);
      ctx.drawImage(
        image,
        source.x,
        source.y,
        source.width,
        source.height,
        0,
        0,
        tileSize,
        tileSize
      );
    } else {
      ctx.drawImage(
        image,
        source.x,
        source.y,
        source.width,
        source.height,
        dx,
        dy,
        tileSize,
        tileSize
      );
    }
    ctx.restore();
  }

  drawFallbackTiles?.(ctx, tileSize);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return {
    texture,
    imageUrl: canvas.toDataURL('image/png'),
    tileSize
  };
}
