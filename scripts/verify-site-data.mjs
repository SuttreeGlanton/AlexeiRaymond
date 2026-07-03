import fs from 'node:fs';

const rawSiteData = fs.readFileSync(new URL('../site-data.json', import.meta.url), 'utf8').replace(/^\uFEFF/, '');
const data = JSON.parse(rawSiteData);
const errors = [];

function collectStrings(value, path = 'site-data') {
  const found = [];

  if (typeof value === 'string') {
    found.push([path, value]);
    return found;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      found.push(...collectStrings(item, `${path}[${index}]`));
    });
    return found;
  }

  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      found.push(...collectStrings(item, `${path}.${key}`));
    }
  }

  return found;
}

for (const [path, value] of collectStrings(data)) {
  if (/\u00e2\u20ac|\u00c2/.test(value)) {
    errors.push(`${path}: possible mojibake/encoding damage.`);
  }
}

if (rawSiteData.includes('gnarlyr=')) {
  errors.push('site-data.json: damaged URL found: gnarlyr=');
}

if (rawSiteData.includes('detail.aspcatalog')) {
  errors.push('site-data.json: damaged URL found: detail.aspcatalog');
}

const cycleNames = new Set(data.cycles.map((cycle) => cycle.name));
const cycleIds = new Set(data.cycles.map((cycle) => cycle.id));

if (cycleIds.size !== data.cycles.length) {
  errors.push('Cycle ids must be unique.');
}

if (cycleNames.size !== data.cycles.length) {
  errors.push('Cycle names must be unique.');
}

for (const piece of data.pieces) {
  if (!cycleNames.has(piece.cycle)) {
    errors.push(`${piece.title}: cycle "${piece.cycle}" does not match any cycle name.`);
  }

  const isUpcoming = piece.tags.includes('Upcoming');
  const isDefunct = piece.tags.includes('Defunct');

  if (isUpcoming && piece.date !== null) {
    errors.push(`${piece.title}: Upcoming pieces must have date set to null.`);
  }

  if (isUpcoming && piece.link) {
    errors.push(`${piece.title}: Upcoming pieces should not have an external link yet.`);
  }

  if (isDefunct && piece.link) {
    errors.push(`${piece.title}: Defunct pieces must not have an external link.`);
  }

  const genres = ['Short fiction', 'Flash fiction', 'Poem', 'Non-fiction', 'Other'];
  if (!piece.genre) {
    errors.push(`${piece.title}: missing genre.`);
  } else if (!genres.includes(piece.genre)) {
    errors.push(`${piece.title}: genre "${piece.genre}" is not one of: ${genres.join(', ')}.`);
  }
}

const totalByCycle = new Map(data.cycles.map((cycle) => [cycle.name, 0]));
for (const piece of data.pieces) {
  totalByCycle.set(piece.cycle, (totalByCycle.get(piece.cycle) || 0) + 1);
}

const totalFromCycles = [...totalByCycle.values()].reduce((sum, count) => sum + count, 0);
if (totalFromCycles !== data.pieces.length) {
  errors.push('Every piece must appear on exactly one cycle page.');
}

if (errors.length) {
  console.error('Site data verification failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Site data verification passed.');
for (const cycle of data.cycles) {
  console.log(`${cycle.name}: ${totalByCycle.get(cycle.name)} piece(s)`);
}
