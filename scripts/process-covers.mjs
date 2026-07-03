#!/usr/bin/env node
// Resize/crop/rename raw cover photos and wire them into site-data.json.
//
// Usage:
//   1. Drop cycle photos into raw-covers/cycles/  (name each after the cycle,
//      e.g. "Portici.jpg" or "Fool's Gold.png" — matched by id or name, loosely)
//   2. Drop piece photos into raw-covers/pieces/  (name each after the exact
//      piece title, e.g. "The Boxer.jpg")
//   3. npm run covers
//   4. Review the console report and the site-data.json diff, then npm run build
import { readdir, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, 'site-data.json');
const RAW_CYCLES_DIR = path.join(ROOT, 'raw-covers', 'cycles');
const RAW_PIECES_DIR = path.join(ROOT, 'raw-covers', 'pieces');
const OUT_CYCLES_DIR = path.join(ROOT, 'public', 'covers', 'cycles');
const OUT_PIECES_DIR = path.join(ROOT, 'public', 'covers', 'pieces');

const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff']);

function slugify(input) {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’‘"]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function listImages(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && IMG_EXT.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name);
}

async function processOne(srcPath, destPath, { width, height }) {
  await sharp(srcPath)
    .rotate()
    .resize(width, height, { fit: 'cover', position: 'attention' })
    .grayscale()
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(destPath);
}

async function run() {
  const data = JSON.parse(await readFile(DATA_PATH, 'utf8'));
  await mkdir(OUT_CYCLES_DIR, { recursive: true });
  await mkdir(OUT_PIECES_DIR, { recursive: true });

  const report = { cycles: [], pieces: [], unmatchedFiles: [] };

  const cycleFiles = await listImages(RAW_CYCLES_DIR);
  const cycleTargets = data.cycles.map((c) => ({ ref: c, slugs: [slugify(c.id), slugify(c.name)] }));

  for (const file of cycleFiles) {
    const fileSlug = slugify(path.basename(file, path.extname(file)));
    const target = cycleTargets.find((t) => t.slugs.includes(fileSlug));
    if (!target) {
      report.unmatchedFiles.push(`raw-covers/cycles/${file}`);
      continue;
    }
    const outName = `${target.ref.id}.jpg`;
    await processOne(path.join(RAW_CYCLES_DIR, file), path.join(OUT_CYCLES_DIR, outName), {
      width: 1600,
      height: 2000
    });
    target.ref.cover = `covers/cycles/${outName}`;
    report.cycles.push(`${file}  ->  covers/cycles/${outName}`);
  }

  const pieceFiles = await listImages(RAW_PIECES_DIR);
  const pieceTargets = data.pieces.map((p) => ({ ref: p, slug: slugify(p.title) }));

  for (const file of pieceFiles) {
    const fileSlug = slugify(path.basename(file, path.extname(file)));
    const target = pieceTargets.find((t) => t.slug === fileSlug);
    if (!target) {
      report.unmatchedFiles.push(`raw-covers/pieces/${file}`);
      continue;
    }
    const outName = `${fileSlug}.jpg`;
    await processOne(path.join(RAW_PIECES_DIR, file), path.join(OUT_PIECES_DIR, outName), {
      width: 1500,
      height: 1800
    });
    target.ref.cover = `covers/pieces/${outName}`;
    report.pieces.push(`${file}  ->  covers/pieces/${outName}`);
  }

  await writeFile(DATA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

  const stillMissing = [
    ...data.cycles.filter((c) => !c.cover).map((c) => `cycle: ${c.name}`),
    ...data.pieces.filter((p) => !p.cover).map((p) => `piece: ${p.title}`)
  ];

  console.log('\n=== Cover processing report ===\n');
  console.log(`Matched cycle covers (${report.cycles.length}):`);
  report.cycles.forEach((l) => console.log('  ' + l));
  console.log(`\nMatched piece covers (${report.pieces.length}):`);
  report.pieces.forEach((l) => console.log('  ' + l));

  if (report.unmatchedFiles.length > 0) {
    console.log(`\nCould not match these files to anything in site-data.json (${report.unmatchedFiles.length}):`);
    report.unmatchedFiles.forEach((l) => console.log('  ' + l));
    console.log('Rename to match a cycle id/name or an exact piece title, then re-run.');
  }

  if (stillMissing.length > 0) {
    console.log(`\nStill without a cover (${stillMissing.length}) — these keep their typographic placeholder:`);
    stillMissing.forEach((l) => console.log('  ' + l));
  }

  console.log('\nsite-data.json has been updated in place. Review the diff, then run: npm run build');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
