// @ts-check

/**
 * Build one complete reading order. Previous and Next replay it through the
 * reader's history. Only reaching the end starts a fresh round.
 * @template {{ author: string }} T
 * @param {T[]} entries
 * @param {T[]} previousRound
 * @param {() => number} [random]
 * @returns {T[]}
 */
export function shufflePassages(entries, previousRound, random = Math.random) {
  const remaining = entries.slice();
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const { author } of entries) counts.set(author, (counts.get(author) ?? 0) + 1);

  // Hold back the previous round's final quarter at the start of this round.
  // Shrink that window for uneven banks so a safe author choice stays possible:
  // after the hold expires, at least twice the largest author's count remains.
  const largest = Math.max(0, ...counts.values());
  const windowSize = Math.max(0, Math.min(Math.floor(entries.length / 4), entries.length - 2 * largest));
  const held = new Set(previousRound.slice(previousRound.length - windowSize));
  /** @type {T[]} */
  const round = [];
  let previous = previousRound.at(-1);

  while (remaining.length) {
    const eligible = round.length < windowSize ? remaining.filter(entry => !held.has(entry)) : remaining;
    const different = eligible.filter(entry => entry.author !== previous?.author);
    let choices = different;
    if (different.length) {
      // A majority must take this slot or it will run out of separators later.
      const majority = [...counts].find(([, count]) => 2 * count > remaining.length);
      if (majority && majority[0] !== previous?.author) {
        choices = different.filter(entry => entry.author === majority[0]);
      }
    } else {
      choices = eligible.filter(entry => entry !== previous);
      if (!choices.length) choices = eligible;
    }

    const entry = choices[Math.floor(random() * choices.length)];
    round.push(entry);
    remaining.splice(remaining.indexOf(entry), 1);
    counts.set(entry.author, (counts.get(entry.author) ?? 1) - 1);
    previous = entry;
  }
  return round;
}
