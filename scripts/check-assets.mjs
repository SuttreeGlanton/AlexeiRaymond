import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const assetsRoot = path.join(repoRoot, 'src', 'assets');
const coversRoot = path.join(assetsRoot, 'covers');
const siteDataPath = path.join(repoRoot, 'site-data.json');

const imageExtensions = new Set(['.avif', '.jpeg', '.jpg', '.png', '.webp']);
const formatsForExtension = new Map([
  ['.avif', new Set(['avif', 'heif'])],
  ['.jpeg', new Set(['jpeg'])],
  ['.jpg', new Set(['jpeg'])],
  ['.png', new Set(['png'])],
  ['.webp', new Set(['webp'])]
]);
const maxBytes = 12 * 1024 * 1024;
const maxPixels = 30_000_000;
const errors = [];

function normalizeSlash(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

const siteData = JSON.parse(fs.readFileSync(siteDataPath, 'utf8').replace(/^\uFEFF/, ''));
const referencedCovers = new Set([
  siteData.site?.headerCover,
  siteData.interview?.cover,
  ...(siteData.cycles || []).map((cycle) => cycle.cover),
  ...(siteData.pieces || []).map((piece) => piece.cover)
].filter(Boolean).map(normalizeSlash));

const imageFiles = walk(assetsRoot).filter((file) =>
  imageExtensions.has(path.extname(file).toLowerCase())
);

for (const file of imageFiles) {
  const relative = normalizeSlash(path.relative(repoRoot, file));
  const extension = path.extname(file).toLowerCase();
  const stat = fs.statSync(file);

  try {
    const metadata = await sharp(file).metadata();
    const expectedFormats = formatsForExtension.get(extension);

    if (!metadata.format || !expectedFormats?.has(metadata.format)) {
      errors.push(`${relative}: extension ${extension} does not match detected format ${metadata.format || 'unknown'}.`);
    }

    if (stat.size > maxBytes) {
      errors.push(`${relative}: ${(stat.size / 1024 / 1024).toFixed(1)} MiB exceeds the 12 MiB source-asset ceiling.`);
    }

    if (metadata.width && metadata.height && metadata.width * metadata.height > maxPixels) {
      errors.push(`${relative}: ${metadata.width}x${metadata.height} exceeds the 30-megapixel source-asset ceiling.`);
    }
  } catch (error) {
    errors.push(`${relative}: Sharp could not read this image (${error.message}).`);
  }
}

const coverFiles = walk(coversRoot)
  .filter((file) => imageExtensions.has(path.extname(file).toLowerCase()))
  .map((file) => normalizeSlash(path.relative(assetsRoot, file)));

for (const cover of coverFiles) {
  if (!referencedCovers.has(cover)) {
    errors.push(`src/assets/${cover}: cover is not referenced by site-data.json.`);
  }
}

if (errors.length) {
  console.error(`Asset audit failed with ${errors.length} error${errors.length === 1 ? '' : 's'}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Asset audit passed: ${imageFiles.length} images checked; ${coverFiles.length} referenced covers.`);
