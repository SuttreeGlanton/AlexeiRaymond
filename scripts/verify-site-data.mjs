import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const siteDataPath = path.join(repoRoot, 'site-data.json');

const rawSiteData = fs.readFileSync(siteDataPath, 'utf8').replace(/^\uFEFF/, '');
const data = JSON.parse(rawSiteData);

const errors = [];
const warnings = [];

const allowedTags = ['Online', 'In print', 'Upcoming', 'Defunct'];
const allowedGenres = ['Short fiction', 'Flash fiction', 'Poem', 'Non-fiction', 'Other'];

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function labelForPiece(piece, index) {
  return piece?.title ? `piece "${piece.title}"` : `pieces[${index}]`;
}

function requireObject(value, label) {
  if (!isPlainObject(value)) {
    addError(`${label}: must be an object.`);
    return false;
  }

  return true;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    addError(`${label}: must be an array.`);
    return false;
  }

  return true;
}

function requireString(value, label, { allowEmpty = false } = {}) {
  if (typeof value !== 'string') {
    addError(`${label}: must be a string.`);
    return false;
  }

  if (!allowEmpty && !value.trim()) {
    addError(`${label}: must not be empty.`);
    return false;
  }

  return true;
}

function collectStrings(value, currentPath = 'site-data') {
  const found = [];

  if (typeof value === 'string') {
    found.push([currentPath, value]);
    return found;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      found.push(...collectStrings(item, `${currentPath}[${index}]`));
    });
    return found;
  }

  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      found.push(...collectStrings(item, `${currentPath}.${key}`));
    }
  }

  return found;
}

function normalizePath(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^public\//, '')
    .replace(/^assets\//, '');
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function assetExists(assetPath, roots) {
  const clean = normalizePath(assetPath);
  return roots.some((root) => fileExists(`${root}/${clean}`.replace(/\/+/g, '/')));
}

function checkAsset(label, assetPath, roots) {
  if (!requireString(assetPath, `${label} cover/path`)) return;

  const clean = normalizePath(assetPath);
  if (!assetExists(clean, roots)) {
    addError(`${label}: missing asset "${clean}". Checked under: ${roots.join(', ')}.`);
  }
}

function accountMarkdownExists(slug) {
  return fileExists(`src/content/accounts/${slug}.md`) || fileExists(`src/content/accounts/${slug}.mdx`);
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function checkHttpUrl(value, label, { allowEmpty = false } = {}) {
  if (!requireString(value, label, { allowEmpty })) return;

  if (!value) return;

  if (!isHttpUrl(value)) {
    addError(`${label}: must be an http(s) URL.`);
  }
}

function parseSiteDate(value, label, { allowNull = false } = {}) {
  if (value === null) {
    if (!allowNull) addError(`${label}: date must not be null.`);
    return null;
  }

  if (typeof value !== 'string') {
    addError(`${label}: date must be a DD/MM/YYYY string${allowNull ? ' or null' : ''}.`);
    return null;
  }

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    addError(`${label}: date "${value}" must use DD/MM/YYYY.`);
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    addError(`${label}: date "${value}" is not a real calendar date.`);
    return null;
  }

  return parsed;
}

function isSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value || ''));
}

for (const [stringPath, value] of collectStrings(data)) {
  if (/\u00e2\u20ac|\u00c2/.test(value)) {
    addError(`${stringPath}: possible mojibake/encoding damage.`);
  }
}

if (rawSiteData.includes('gnarlyr=')) {
  addError('site-data.json: damaged URL found: gnarlyr=');
}

if (rawSiteData.includes('detail.aspcatalog')) {
  addError('site-data.json: damaged URL found: detail.aspcatalog');
}

if (!requireObject(data, 'site-data')) {
  process.exit(1);
}

requireObject(data.site, 'site');
requireArray(data.cycles, 'cycles');
requireArray(data.pieces, 'pieces');
requireObject(data.interview, 'interview');

if (isPlainObject(data.site)) {
  requireString(data.site.author, 'site.author');
  requireString(data.site.bio, 'site.bio');
  requireString(data.site.email, 'site.email', { allowEmpty: true });
  requireArray(data.site.socials, 'site.socials');

  if (data.site.headerCover) {
    checkAsset('site.headerCover', data.site.headerCover, ['src/assets']);
  }

  if (data.site.socialCard) {
    checkAsset('site.socialCard', data.site.socialCard, ['public']);
  }

  if (data.site.emailEncoded && typeof data.site.emailEncoded !== 'string') {
    addError('site.emailEncoded: must be a string when present.');
  }
}

const cycleNames = new Set();
const cycleIds = new Set();

if (Array.isArray(data.cycles)) {
  data.cycles.forEach((cycle, index) => {
    const label = cycle?.name ? `cycle "${cycle.name}"` : `cycles[${index}]`;

    if (!requireObject(cycle, label)) return;

    requireString(cycle.id, `${label}.id`);
    requireString(cycle.name, `${label}.name`);
    requireString(cycle.blurb, `${label}.blurb`);
    checkAsset(label, cycle.cover, ['src/assets']);

    if (cycle.id && !isSlug(cycle.id)) {
      addError(`${label}.id: "${cycle.id}" should be a lowercase slug.`);
    }

    if (cycleIds.has(cycle.id)) {
      addError(`${label}: duplicate cycle id "${cycle.id}".`);
    }

    if (cycleNames.has(cycle.name)) {
      addError(`${label}: duplicate cycle name "${cycle.name}".`);
    }

    cycleIds.add(cycle.id);
    cycleNames.add(cycle.name);
  });
}

const pieceTitles = new Set();
const totalByCycle = new Map([...cycleNames].map((cycleName) => [cycleName, 0]));

if (Array.isArray(data.pieces)) {
  data.pieces.forEach((piece, index) => {
    const label = labelForPiece(piece, index);

    if (!requireObject(piece, label)) return;

    requireString(piece.title, `${label}.title`);
    requireString(piece.cycle, `${label}.cycle`);
    requireString(piece.publication, `${label}.publication`);
    requireString(piece.link, `${label}.link`, { allowEmpty: true });
    checkAsset(label, piece.cover, ['src/assets']);

    if (piece.title) {
      if (pieceTitles.has(piece.title)) {
        addError(`${label}: duplicate piece title.`);
      }
      pieceTitles.add(piece.title);
    }

    if (!cycleNames.has(piece.cycle)) {
      addError(`${label}: cycle "${piece.cycle}" does not match any cycle name.`);
    } else {
      totalByCycle.set(piece.cycle, (totalByCycle.get(piece.cycle) || 0) + 1);
    }

    if (!Array.isArray(piece.tags)) {
      addError(`${label}.tags: must be an array.`);
    } else {
      if (!piece.tags.length) {
        addError(`${label}.tags: must contain at least one tag.`);
      }

      const seenTags = new Set();
      for (const tag of piece.tags) {
        if (!allowedTags.includes(tag)) {
          addError(`${label}.tags: "${tag}" is not one of: ${allowedTags.join(', ')}.`);
        }

        if (seenTags.has(tag)) {
          addError(`${label}.tags: duplicate tag "${tag}".`);
        }

        seenTags.add(tag);
      }
    }

    const tags = Array.isArray(piece.tags) ? piece.tags : [];
    const isUpcoming = tags.includes('Upcoming');
    const isDefunct = tags.includes('Defunct');
    const isOnline = tags.includes('Online');

    if (isUpcoming && piece.date !== null) {
      addError(`${label}: Upcoming pieces must have date set to null.`);
    }

    if (isUpcoming && piece.link) {
      addError(`${label}: Upcoming pieces should not have an external link yet.`);
    }

    if (isDefunct && piece.link) {
      addError(`${label}: Defunct pieces must not have an external link.`);
    }

    if (!isUpcoming) {
      parseSiteDate(piece.date, `${label}.date`, { allowNull: false });
    } else {
      parseSiteDate(piece.date, `${label}.date`, { allowNull: true });
    }

    if (piece.link) {
      checkHttpUrl(piece.link, `${label}.link`, { allowEmpty: true });
    }

    if (isOnline && !isUpcoming && !isDefunct && !piece.link) {
      addError(`${label}: Online published pieces should have a link unless Upcoming or Defunct.`);
    }

    if (!piece.genre) {
      addError(`${label}: missing genre.`);
    } else if (!allowedGenres.includes(piece.genre)) {
      addError(`${label}: genre "${piece.genre}" is not one of: ${allowedGenres.join(', ')}.`);
    }

    if ('excerpt' in piece && typeof piece.excerpt !== 'string') {
      addError(`${label}.excerpt: must be a string when present.`);
    }

    if (!piece.excerpt || !piece.excerpt.trim()) {
      addWarning(`${label}: excerpt is empty.`);
    }

    if (piece.account !== undefined) {
      if (!requireObject(piece.account, `${label}.account`)) return;

      requireString(piece.account.slug, `${label}.account.slug`);

      if (piece.account.slug && !isSlug(piece.account.slug)) {
        addError(`${label}.account.slug: "${piece.account.slug}" should be a lowercase slug.`);
      }

      if (piece.account.slug && !accountMarkdownExists(piece.account.slug)) {
        addError(`${label}: missing archive markdown for account slug "${piece.account.slug}".`);
      }

      if ('label' in piece.account && typeof piece.account.label !== 'string') {
        addError(`${label}.account.label: must be a string when present.`);
      }

      if ('title' in piece.account && typeof piece.account.title !== 'string') {
        addError(`${label}.account.title: must be a string when present.`);
      }
    }
  });
}

if (isPlainObject(data.site) && Array.isArray(data.site.featured)) {
  const featuredSeen = new Set();

  data.site.featured.forEach((title, index) => {
    if (typeof title !== 'string' || !title.trim()) {
      addError(`site.featured[${index}]: must be a non-empty piece title.`);
      return;
    }

    if (featuredSeen.has(title)) {
      addError(`site.featured: duplicate featured title "${title}".`);
    }

    if (!pieceTitles.has(title)) {
      addError(`site.featured: "${title}" does not match any piece title.`);
    }

    featuredSeen.add(title);
  });
}

if (isPlainObject(data.interview)) {
  requireString(data.interview.title, 'interview.title');
  requireString(data.interview.publication, 'interview.publication');
  parseSiteDate(data.interview.date, 'interview.date');
  checkHttpUrl(data.interview.link, 'interview.link');

  if (data.interview.cover) {
    checkAsset('interview', data.interview.cover, ['src/assets']);
  }

  if ('excerpt' in data.interview && typeof data.interview.excerpt !== 'string') {
    addError('interview.excerpt: must be a string when present.');
  }
}

const assignedPieceCount = [...totalByCycle.values()].reduce((sum, count) => sum + count, 0);
if (assignedPieceCount !== (Array.isArray(data.pieces) ? data.pieces.length : 0)) {
  addError('Every piece must appear on exactly one valid cycle page.');
}

if (warnings.length) {
  console.warn('Site data verification warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
  console.warn('');
}

if (errors.length) {
  console.error('Site data verification failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Site data verification passed.');
for (const cycle of data.cycles) {
  console.log(`${cycle.name}: ${totalByCycle.get(cycle.name) || 0} piece(s)`);
}
