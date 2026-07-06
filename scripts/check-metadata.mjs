import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const distDir = path.join(repoRoot, 'dist');

const errors = [];
const warnings = [];

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function normalizeSlash(value) {
  return String(value || '').replace(/\\/g, '/');
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const results = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...walk(absolute));
    } else {
      results.push(absolute);
    }
  }

  return results;
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function parseAttrs(tag) {
  const attrs = new Map();

  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/g)) {
    attrs.set(match[1].toLowerCase(), decodeHtml(match[3]));
  }

  return attrs;
}

function getMeta(html, attrName, attrValue) {
  const wantedName = attrName.toLowerCase();
  const wantedValue = attrValue.toLowerCase();

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = parseAttrs(match[0]);
    if ((attrs.get(wantedName) || '').toLowerCase() === wantedValue) {
      return attrs.get('content') || '';
    }
  }

  return '';
}

function getTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtml(match[1].replace(/<[^>]*>/g, '')) : '';
}

function getCanonical(html) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = parseAttrs(match[0]);
    if ((attrs.get('rel') || '').toLowerCase() === 'canonical') {
      return attrs.get('href') || '';
    }
  }

  return '';
}

function routePathForHtmlFile(file) {
  const relative = normalizeSlash(path.relative(distDir, file));

  if (relative === 'index.html') return '/';

  if (relative.endsWith('/index.html')) {
    return `/${relative.replace(/\/index\.html$/, '/')}`;
  }

  return `/${relative.replace(/\.html$/, '')}`;
}

function readAstroConfig() {
  const config = readText('astro.config.mjs');
  const site = config.match(/\bsite\s*:\s*['"`]([^'"`]+)['"`]/)?.[1] || '';
  const base = config.match(/\bbase\s*:\s*['"`]([^'"`]+)['"`]/)?.[1] || '';

  return {
    site: site.replace(/\/+$/, ''),
    base: base.replace(/^\/+|\/+$/g, '')
  };
}

function expectedCanonicalForRoute(routePath, site, base) {
  const cleanRoute = routePath.replace(/^\/+/, '');
  const parts = [base, cleanRoute].filter(Boolean);
  let pathname = `/${parts.join('/')}`;

  if (routePath.endsWith('/') && !pathname.endsWith('/')) {
    pathname += '/';
  }

  return new URL(pathname, `${site}/`).toString();
}

function extractJsonLdBlocks(html) {
  const blocks = [];

  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    blocks.push(decodeHtml(match[1]));
  }

  return blocks;
}

if (!fs.existsSync(distDir)) {
  addError('dist/ does not exist. Run npm run build before npm run check:metadata.');
}

const { site, base } = readAstroConfig();

if (!site) {
  addError('astro.config.mjs: missing site value.');
}

if (!base) {
  addWarning('astro.config.mjs: missing base value. This may be fine outside GitHub Pages.');
}

const htmlFiles = fs.existsSync(distDir)
  ? walk(distDir).filter((file) => {
      const name = path.basename(file).toLowerCase();
      if (!file.endsWith('.html')) return false;
      if (/^google[a-z0-9]+\.html$/i.test(name)) return false;
      return true;
    })
  : [];

if (!htmlFiles.length) {
  addError('No built HTML files found in dist/.');
}

const seenTitles = new Map();
const seenCanonicals = new Map();

for (const file of htmlFiles) {
  const relative = normalizeSlash(path.relative(repoRoot, file));
  const html = fs.readFileSync(file, 'utf8');

  const robots = getMeta(html, 'name', 'robots').toLowerCase();
  const isMetaRefreshRedirect = /<meta\b[^>]*http-equiv=["']refresh["'][^>]*>/i.test(html);

  // Redirect/alias stubs are intentionally not full metadata-bearing pages.
  if (robots.includes('noindex') && isMetaRefreshRedirect) {
    continue;
  }

  const title = getTitle(html);
  const description = getMeta(html, 'name', 'description');
  const canonical = getCanonical(html);
  const ogType = getMeta(html, 'property', 'og:type');
  const ogSiteName = getMeta(html, 'property', 'og:site_name');
  const ogTitle = getMeta(html, 'property', 'og:title');
  const ogDescription = getMeta(html, 'property', 'og:description');
  const ogUrl = getMeta(html, 'property', 'og:url');
  const ogImage = getMeta(html, 'property', 'og:image');
  const twitterCard = getMeta(html, 'name', 'twitter:card');
  const twitterTitle = getMeta(html, 'name', 'twitter:title');
  const twitterDescription = getMeta(html, 'name', 'twitter:description');
  const twitterImage = getMeta(html, 'name', 'twitter:image');

  if (!title) addError(`${relative}: missing <title>.`);
  if (!description) addError(`${relative}: missing meta description.`);
  if (!canonical) addError(`${relative}: missing canonical link.`);
  if (!ogType) addError(`${relative}: missing og:type.`);
  if (!ogSiteName) addError(`${relative}: missing og:site_name.`);
  if (!ogTitle) addError(`${relative}: missing og:title.`);
  if (!ogDescription) addError(`${relative}: missing og:description.`);
  if (!ogUrl) addError(`${relative}: missing og:url.`);
  if (!twitterCard) addError(`${relative}: missing twitter:card.`);
  if (!twitterTitle) addError(`${relative}: missing twitter:title.`);
  if (!twitterDescription) addError(`${relative}: missing twitter:description.`);

  if (title && title.length > 70) {
    addWarning(`${relative}: title is long (${title.length} characters).`);
  }

  if (description && description.length < 50) {
    addWarning(`${relative}: description is short (${description.length} characters).`);
  }

  if (description && description.length > 220) {
    addWarning(`${relative}: description is long (${description.length} characters).`);
  }

  if (title && ogTitle && title !== ogTitle) {
    addWarning(`${relative}: og:title differs from <title>.`);
  }

  if (title && twitterTitle && title !== twitterTitle) {
    addWarning(`${relative}: twitter:title differs from <title>.`);
  }

  if (description && ogDescription && description !== ogDescription) {
    addWarning(`${relative}: og:description differs from meta description.`);
  }

  if (description && twitterDescription && description !== twitterDescription) {
    addWarning(`${relative}: twitter:description differs from meta description.`);
  }

  if (canonical && /localhost|undefined|null/i.test(canonical)) {
    addError(`${relative}: canonical looks broken: ${canonical}`);
  }

  if (canonical && site && !canonical.startsWith(`${site}/`)) {
    addError(`${relative}: canonical does not start with configured site "${site}": ${canonical}`);
  }

  if (canonical && base && !new URL(canonical).pathname.startsWith(`/${base}`)) {
    addError(`${relative}: canonical is missing GitHub Pages base "/${base}": ${canonical}`);
  }

  if (canonical && ogUrl && canonical !== ogUrl) {
    addError(`${relative}: og:url does not match canonical.`);
  }

  const routePath = routePathForHtmlFile(file);
  const expectedCanonical = site ? expectedCanonicalForRoute(routePath, site, base) : '';

  if (canonical && expectedCanonical && canonical !== expectedCanonical) {
    addWarning(`${relative}: canonical differs from expected route URL. Expected ${expectedCanonical}, found ${canonical}.`);
  }

  if (ogImage && !/^https?:\/\//i.test(ogImage)) {
    addError(`${relative}: og:image must be absolute.`);
  }

  if (twitterImage && !/^https?:\/\//i.test(twitterImage)) {
    addError(`${relative}: twitter:image must be absolute.`);
  }

  if (ogImage && !twitterImage) {
    addError(`${relative}: has og:image but missing twitter:image.`);
  }

  if (twitterImage && !ogImage) {
    addError(`${relative}: has twitter:image but missing og:image.`);
  }

  if (ogImage && site && !ogImage.startsWith(`${site}/`)) {
    addWarning(`${relative}: og:image does not start with configured site "${site}".`);
  }

  const jsonLdBlocks = extractJsonLdBlocks(html);
  if (!jsonLdBlocks.length) {
    addError(`${relative}: missing application/ld+json structured data.`);
  }

  jsonLdBlocks.forEach((block, index) => {
    try {
      const parsed = JSON.parse(block);
      if (!parsed['@context']) {
        addError(`${relative}: JSON-LD block ${index + 1} missing @context.`);
      }
      if (!parsed['@type']) {
        addError(`${relative}: JSON-LD block ${index + 1} missing @type.`);
      }
    } catch (error) {
      addError(`${relative}: JSON-LD block ${index + 1} is not valid JSON (${error.message}).`);
    }
  });

  if (title) {
    const previous = seenTitles.get(title);
    if (previous) {
      addWarning(`${relative}: duplicate title also used by ${previous}.`);
    } else {
      seenTitles.set(title, relative);
    }
  }

  if (canonical) {
    const previous = seenCanonicals.get(canonical);
    if (previous) {
      addError(`${relative}: duplicate canonical also used by ${previous}.`);
    } else {
      seenCanonicals.set(canonical, relative);
    }
  }
}

console.log('Metadata check');
console.log(`HTML pages checked: ${htmlFiles.length}`);
console.log(`Site: ${site || '(missing)'}`);
console.log(`Base: /${base}`);
console.log('');

if (warnings.length) {
  console.warn('Metadata warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
  console.warn('');
}

if (errors.length) {
  console.error('Metadata errors:');
  for (const error of errors) console.error(`- ${error}`);
  console.error('');
  console.error('Metadata check failed.');
  process.exit(1);
}

console.log('Metadata check passed.');
