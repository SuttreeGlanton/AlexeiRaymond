// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteDataSchema, normalizeAssetPath } from '../src/lib/data-schema.mjs';
import { STORY_PRESENTATIONS } from '../src/lib/story-registry.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawSiteData = fs.readFileSync(path.join(repoRoot, 'site-data.json'), 'utf8').replace(/^\uFEFF/, '');
let input;
try {
  input = JSON.parse(rawSiteData);
} catch (error) {
  console.error('site-data.json: invalid JSON.', error instanceof Error ? error.message : error);
  process.exit(1);
}
const result = siteDataSchema.safeParse(input);
if (!result.success) {
  console.error('Site data verification failed:');
  for (const issue of result.error.issues) console.error(`- ${issue.path.join('.')}: ${issue.message}`);
  process.exit(1);
}
const data = result.data;
/** @type {string[]} */
const errors = [];
/** @type {string[]} */
const warnings = [];

/** @param {unknown} value @param {string} [field] */
function checkEncoding(value, field = 'site-data') {
  if (typeof value === 'string' && /\u00e2\u20ac|\u00c2/.test(value)) {
    errors.push(`${field}: possible mojibake/encoding damage.`);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => checkEncoding(item, `${field}[${index}]`));
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) checkEncoding(item, `${field}.${key}`);
  }
}
checkEncoding(data);
for (const damagedUrl of ['gnarlyr=', 'detail.aspcatalog']) {
  if (rawSiteData.includes(damagedUrl)) errors.push(`site-data.json: damaged URL found: ${damagedUrl}`);
}

/** @param {string} label @param {string} assetPath @param {string[]} [roots] */
function checkAsset(label, assetPath, roots = ['src/assets']) {
  const clean = normalizeAssetPath(assetPath);
  if (!roots.some((root) => fs.existsSync(path.join(repoRoot, root, clean)))) {
    errors.push(`${label}: missing asset "${clean}". Checked under: ${roots.join(', ')}.`);
  }
}
const accountsDir = path.join(repoRoot, 'src/content/accounts');
/** @param {string} slug */
const accountPath = (slug) => ['md', 'mdx'].map((extension) => path.join(accountsDir, `${slug}.${extension}`)).find(fs.existsSync);
const accountSlugs = new Set(data.pieces.flatMap((piece) => piece.account ? [piece.account.slug] : []));

if (data.site.headerCover) checkAsset('site.headerCover', data.site.headerCover);
if (data.site.socialCard) checkAsset('site.socialCard', data.site.socialCard, ['public']);
for (const cycle of data.cycles) {
  checkAsset(`cycle "${cycle.name}"`, cycle.cover);
  checkAsset(`cycle "${cycle.name}" banner`, cycle.banner);
}
for (const piece of data.pieces) {
  const label = `piece "${piece.title}"`;
  checkAsset(label, piece.cover);
  piece.coverVariants?.forEach((cover, index) => checkAsset(`${label}.coverVariants[${index}]`, cover));
  if (!piece.excerpt?.trim()) warnings.push(`${label}: excerpt is empty.`);
  if (!piece.account) continue;
  const sourcePath = accountPath(piece.account.slug);
  if (!sourcePath) {
    errors.push(`${label}: missing archive markdown for account slug "${piece.account.slug}".`);
  } else if (piece.account.label === 'Read story') {
    const source = fs.readFileSync(sourcePath, 'utf8').replace(/^\uFEFF/, '');
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!frontmatter || !/^fullText:\s*true\s*$/m.test(frontmatter[1])) {
      errors.push(`${label}: "Read story" account markdown must declare fullText: true in frontmatter.`);
    }
  }
}
if (data.interview.cover) checkAsset('interview', data.interview.cover);
if (fs.existsSync(accountsDir)) {
  for (const file of fs.readdirSync(accountsDir)) {
    if (/\.mdx?$/i.test(file) && !accountSlugs.has(file.replace(/\.mdx?$/i, ''))) {
      errors.push(`src/content/accounts/${file}: no piece references this account slug.`);
    }
  }
}
for (const slug of Object.keys(STORY_PRESENTATIONS)) {
  if (!accountSlugs.has(slug) || !accountPath(slug)) {
    errors.push(`story-registry: "${slug}" must reference a piece and its account markdown.`);
  }
}
if (warnings.length) {
  console.warn('Site data verification warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}
if (errors.length) {
  console.error('Site data verification failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Site data verification passed.');
for (const cycle of data.cycles) {
  const count = data.pieces.filter((piece) => (piece.cycles ?? [piece.cycle]).includes(cycle.name)).length;
  console.log(`${cycle.name}: ${count} piece(s)`);
}
