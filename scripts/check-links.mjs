import fs from 'node:fs';
import path from 'node:path';

const args = new Set(process.argv.slice(2));
const strictExternal = args.has('--strict-external');
const skipExternal = args.has('--skip-external');
const repoRoot = process.cwd();

const errors = [];
const warnings = [];

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8').replace(/^\uFEFF/, ''));
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function normalizeSlash(value) {
  return String(value || '').replace(/\\/g, '/');
}

function cleanInternalPath(value) {
  return normalizeSlash(value)
    .replace(/^\/+/, '')
    .replace(/^\.\//, '')
    .replace(/[?#].*$/, '');
}

function isExternalUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function isSpecialUrl(value) {
  return /^(mailto:|tel:|#)/i.test(String(value || ''));
}

function isLikelyAsset(value) {
  return /\.(avif|gif|ico|jpe?g|png|svg|webp|pdf|txt|xml|json|webmanifest)$/i.test(value);
}

function ensureAsset(label, assetPath, roots) {
  if (!assetPath) return;

  const clean = cleanInternalPath(assetPath);
  const candidates = roots.map((root) => `${root}/${clean}`.replace(/\/+/g, '/'));

  if (!candidates.some(exists)) {
    addError(`${label}: missing asset "${clean}". Checked: ${candidates.join(', ')}`);
  }
}

function ensureRoute(label, route, knownRoutes) {
  const clean = cleanInternalPath(route).replace(/\/?$/, '/');

  if (clean === '/') return;
  if (knownRoutes.has(clean)) return;

  addError(`${label}: missing internal route "${route}"`);
}

function walk(dir) {
  const absolute = path.join(repoRoot, dir);
  if (!fs.existsSync(absolute)) return [];

  const results = [];

  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const relative = path.join(dir, entry.name);
    const clean = normalizeSlash(relative);

    if (entry.isDirectory()) {
      results.push(...walk(clean));
    } else {
      results.push(clean);
    }
  }

  return results;
}

function sourceTextFiles() {
  const allowed = /\.(astro|css|html|js|jsx|mjs|ts|tsx|md|mdx|json)$/i;
  return [
    ...walk('src'),
    ...walk('public')
  ].filter((file) => allowed.test(file));
}

function collectSourceLinks() {
  const external = new Map();
  const withBase = [];

  for (const file of sourceTextFiles()) {
    let text = '';
    try {
      text = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    } catch {
      continue;
    }

    const urlMatches = text.matchAll(/https?:\/\/[^\s"'`<>)]+/g);
    for (const match of urlMatches) {
      external.set(match[0], `source file ${file}`);
    }

    const withBaseMatches = text.matchAll(/withBase\(\s*['"`]([^'"`]*)['"`]\s*\)/g);
    for (const match of withBaseMatches) {
      withBase.push({ value: match[1], file });
    }

    const hrefMatches = text.matchAll(/\bhref\s*=\s*['"`]([^'"`]*)['"`]/g);
    for (const match of hrefMatches) {
      const href = match[1];
      if (isExternalUrl(href)) external.set(href, `source file ${file}`);
      if (!isExternalUrl(href) && !isSpecialUrl(href) && href.startsWith('/')) {
        withBase.push({ value: href, file });
      }
    }
  }

  return { external, withBase };
}

function accountMarkdownExists(slug) {
  return exists(`src/content/accounts/${slug}.md`) || exists(`src/content/accounts/${slug}.mdx`);
}

function buildKnownRoutes(data) {
  const routes = new Set(['/']);

  const pageFiles = walk('src/pages').filter((file) => /\.(astro|md|mdx)$/i.test(file));

  for (const file of pageFiles) {
    if (file.includes('[')) continue;

    let route = file
      .replace(/^src\/pages\//, '')
      .replace(/\.(astro|md|mdx)$/i, '')
      .replace(/\/index$/, '')
      .replace(/^index$/, '');

    route = route ? `${route}/` : '/';
    routes.add(route);
  }

  if (exists('src/pages/cycles/[id].astro')) {
    for (const cycle of data.cycles || []) {
      if (cycle.id) routes.add(`cycles/${cycle.id}/`);
    }
  }

  if (exists('src/pages/accounts/[slug].astro')) {
    for (const piece of data.pieces || []) {
      if (piece.account?.slug) routes.add(`accounts/${piece.account.slug}/`);
    }
  }

  return routes;
}

function collectDataLinks(data) {
  const external = new Map();

  for (const social of data.site?.socials || []) {
    const url = typeof social === 'string' ? social : social.url || social.href || '';
    if (isExternalUrl(url)) external.set(url, 'site.socials');
  }

  for (const piece of data.pieces || []) {
    if (isExternalUrl(piece.link)) {
      external.set(piece.link, `${piece.title} publication link`);
    }
  }

  if (isExternalUrl(data.interview?.link)) {
    external.set(data.interview.link, 'interview link');
  }

  return external;
}

async function fetchWithTimeout(url, method, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'AlexeiRaymondSiteLinkCheck/1.0'
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

async function checkExternalUrl(url, source) {
  try {
    let response = await fetchWithTimeout(url, 'HEAD', 12000);

    if ([403, 405, 406, 429].includes(response.status)) {
      response = await fetchWithTimeout(url, 'GET', 12000);
    }

    if (response.status >= 400) {
      const message = `${source}: ${url} returned HTTP ${response.status}`;
      if (strictExternal) addError(message);
      else addWarning(message);
    }
  } catch (error) {
    const message = `${source}: ${url} could not be checked (${error.name || 'Error'}: ${error.message || 'network failure'})`;
    if (strictExternal) addError(message);
    else addWarning(message);
  }
}

async function checkExternalLinks(externalLinks) {
  const entries = [...externalLinks.entries()];
  const concurrency = 6;
  let index = 0;

  async function worker() {
    while (index < entries.length) {
      const current = entries[index++];
      const [url, source] = current;
      await checkExternalUrl(url, source);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, entries.length) }, worker));
}

const data = readJson('site-data.json');
const knownRoutes = buildKnownRoutes(data);
const sourceLinks = collectSourceLinks();
const externalLinks = collectDataLinks(data);

for (const [url, source] of sourceLinks.external.entries()) {
  externalLinks.set(url, source);
}

ensureAsset('site.headerCover', data.site?.headerCover, ['src/assets']);
ensureAsset('site.socialCard', data.site?.socialCard, ['public']);

for (const cycle of data.cycles || []) {
  ensureAsset(`cycle "${cycle.name}" cover`, cycle.cover, ['src/assets']);
  if (cycle.id) ensureRoute(`cycle "${cycle.name}"`, `cycles/${cycle.id}/`, knownRoutes);
}

for (const piece of data.pieces || []) {
  ensureAsset(`piece "${piece.title}" cover`, piece.cover, ['src/assets']);

  if (piece.account?.slug && !accountMarkdownExists(piece.account.slug)) {
    addError(`piece "${piece.title}": missing archive markdown for account slug "${piece.account.slug}"`);
  }

  if (piece.account?.slug) {
    ensureRoute(`piece "${piece.title}" account route`, `accounts/${piece.account.slug}/`, knownRoutes);
  }
}

ensureAsset('interview cover', data.interview?.cover, ['src/assets']);

for (const item of sourceLinks.withBase) {
  const value = item.value;
  if (!value || isSpecialUrl(value) || isExternalUrl(value)) continue;

  const clean = cleanInternalPath(value);

  if (!clean) continue;

  if (isLikelyAsset(clean)) {
    const assetRoots = clean.startsWith('covers/') ? ['src/assets', 'public'] : ['public', 'src/assets'];
    ensureAsset(`withBase asset in ${item.file}`, clean, assetRoots);
  } else {
    ensureRoute(`withBase route in ${item.file}`, clean, knownRoutes);
  }
}

console.log('Link integrity check');
console.log(`Internal routes known: ${knownRoutes.size}`);
console.log(`External URLs found: ${externalLinks.size}`);
console.log('');

if (!skipExternal) {
  await checkExternalLinks(externalLinks);
} else {
  console.log('External URL checks skipped.');
  console.log('');
}

if (warnings.length) {
  console.log('Warnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
  console.log('');
}

if (errors.length) {
  console.error('Errors:');
  for (const error of errors) console.error(`- ${error}`);
  console.error('');
  console.error('Link integrity check failed.');
  process.exit(1);
}

console.log('Link integrity check passed.');
if (warnings.length) {
  console.log('External warnings are non-fatal unless you run npm run check:links:strict.');
}
