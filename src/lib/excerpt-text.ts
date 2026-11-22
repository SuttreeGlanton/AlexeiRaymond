/** Split editorial italics into literal text nodes; excerpts never contain HTML. */
export function splitExcerpt(text: string, italics: string[] = []) {
  const phrases = italics.filter(Boolean).map((phrase) => phrase.replace(/\s/g, ' '));
  const normalized = text.replace(/\s/g, ' ');
  const parts: { text: string; italic: boolean }[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const matches = phrases.map((phrase) => ({ phrase, index: normalized.indexOf(phrase, cursor) }))
      .filter(({ index }) => index >= 0).sort((a, b) => a.index - b.index || b.phrase.length - a.phrase.length);
    const match = matches[0];
    if (!match) { parts.push({ text: text.slice(cursor), italic: false }); break; }
    if (match.index > cursor) parts.push({ text: text.slice(cursor, match.index), italic: false });
    const end = match.index + match.phrase.length;
    parts.push({ text: text.slice(match.index, end), italic: true });
    cursor = end;
  }
  return parts;
}
