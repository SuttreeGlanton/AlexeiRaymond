import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync(new URL('../site-data.json', import.meta.url), 'utf8'));
const errors = [];

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

  if (isDefunct && !String(piece.note || '').toLowerCase().includes('originally published')) {
    errors.push(`${piece.title}: Defunct pieces should include an "originally published" note.`);
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
