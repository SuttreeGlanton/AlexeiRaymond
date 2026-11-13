// @ts-check

/** Parse an actual calendar date in DD/MM/YYYY order. @param {string | null} value */
export function parseDate(value) {
  if (!value) return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText), month = Number(monthText), year = Number(yearText);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date : null;
}

/** @param {string | null} value */
export function formatIsoDate(value) {
  const date = parseDate(value);
  if (!date) return '';
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** @typedef {{date: string | null, tags: readonly string[]}} DatedPiece */

/** @template {DatedPiece} T @param {readonly T[]} pieces @returns {T[]} */
export function publishedNewestFirstFrom(pieces) {
  return pieces.filter((piece) => !piece.tags.includes('Upcoming'))
    .sort((a, b) => (parseDate(b.date)?.getTime() ?? 0) - (parseDate(a.date)?.getTime() ?? 0));
}

/** @template {DatedPiece} T @param {readonly T[]} pieces @returns {T | undefined} */
export function selectLatestPublished(pieces) {
  return publishedNewestFirstFrom(pieces).find((piece) => parseDate(piece.date));
}

/** @template {{tags: readonly string[]}} T @param {readonly T[]} pieces @param {() => number} [random] @returns {T | undefined} */
export function selectUpcoming(pieces, random = Math.random) {
  const upcoming = pieces.filter((piece) => piece.tags.includes('Upcoming'));
  return upcoming.length ? upcoming[Math.floor(random() * upcoming.length)] : undefined;
}

/** @param {string} name */
export function cycleLabel(name) {
  return `From ${/^the\s/i.test(name) ? '' : 'the '}${name} cycle`;
}
