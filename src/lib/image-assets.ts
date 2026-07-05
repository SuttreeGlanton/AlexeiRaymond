import type { ImageMetadata } from 'astro';

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
