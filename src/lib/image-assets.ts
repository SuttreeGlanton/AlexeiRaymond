import type { ImageMetadata } from 'astro';

// Reuse one transform profile for card-sized art. Astro caches identical
// transforms, so keeping these values shared avoids regenerating the same
// cover at slightly different widths or quality levels on archive pages.
export const CARD_IMAGE_WIDTHS = [240, 400, 480, 560, 640, 760];
export const CARD_IMAGE_QUALITY = 72;

const imageModules = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/**/*.{jpg,jpeg,png,webp,avif}',
  { eager: true }
);

const imageMap = new Map<string, ImageMetadata>();

for (const [modulePath, moduleValue] of Object.entries(imageModules)) {
  const normalizedPath = modulePath
    .replace('../assets/', '')
    .replace(/\\/g, '/');

  imageMap.set(normalizedPath, moduleValue.default);
}

export function imageAsset(assetPath?: string): ImageMetadata | undefined {
  if (!assetPath) return undefined;

  const normalizedPath = assetPath
    .replace(/^\/+/, '')
    .replace(/^public\//, '')
    .replace(/^assets\//, '')
    .replace(/\\/g, '/');

  return imageMap.get(normalizedPath);
}
