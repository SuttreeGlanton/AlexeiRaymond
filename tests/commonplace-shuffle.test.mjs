import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shufflePassages } from '../src/lib/commonplace-shuffle.mjs';

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

function entriesFor(counts) {
  return counts.flatMap((count, index) => Array.from({ length: count }, () => ({ author: String(index) })));
}

function checkRounds(entries, gap, alternate, seed) {
  const random = seededRandom(seed);
  const lastSeen = new Map();
  let previousRound = [];
  let previous;
  let position = 0;
  for (let i = 0; i < 6; i++) {
    const round = shufflePassages(entries, previousRound, random);
    assert.equal(round.length, entries.length);
    assert.ok(entries.every(entry => round.includes(entry)));
    for (const entry of round) {
      if (alternate) assert.notEqual(entry.author, previous?.author);
      if (lastSeen.has(entry)) assert.ok(position - lastSeen.get(entry) - 1 >= gap);
      lastSeen.set(entry, position++);
      previous = entry;
    }
    previousRound = round;
  }
}

test('the published bank exhausts each round and spaces repeat passages across reshuffles', () => {
  const bank = JSON.parse(readFileSync(new URL('../src/data/commonplace.json', import.meta.url), 'utf8'));
  const counts = bank.map(({ works }) => works.reduce((total, work) => total + work.passages.length, 0));
  const entries = entriesFor(counts);
  const slack = entries.length - 2 * Math.max(...counts);
  const gap = Math.max(0, Math.min(Math.floor(entries.length / 4), slack));
  for (let seed = 0; seed < 32; seed++) checkRounds(entries, gap, slack >= 0, seed);
});

test('an author can own exactly half the bank, including across a round boundary', () => {
  for (const counts of [[1, 1], [2, 2], [4, 2, 1, 1], [4, 3, 2]]) {
    for (let seed = 0; seed < 16; seed++) checkRounds(entriesFor(counts), 1, true, seed);
  }
});

test('tiny and author-heavy banks still exhaust each round and prefer a different passage', () => {
  assert.deepEqual(shufflePassages([], []), []);
  for (const counts of [[1], [3], [6, 1, 1]]) {
    const entries = entriesFor(counts);
    const random = seededRandom(12);
    let round = [];
    for (let i = 0; i < 6; i++) {
      const last = round.at(-1);
      round = shufflePassages(entries, round, random);
      assert.ok(entries.every(entry => round.includes(entry)));
      if (last && entries.length > 1) assert.notEqual(last, round[0]);
      for (let j = 1; j < round.length; j++) {
        if (round[j - 1].author === round[j].author) {
          assert.ok(round.slice(j).every(entry => entry.author === round[j].author));
        }
      }
    }
  }
});
