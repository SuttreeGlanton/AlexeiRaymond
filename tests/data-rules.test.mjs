import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDate, formatIsoDate, publishedNewestFirstFrom, selectLatestPublished, selectUpcoming, cycleLabel } from '../src/lib/data-rules.mjs';

test('dates use day/month order and reject impossible calendar dates', () => {
  assert.equal(formatIsoDate('09/11/2026'), '2026-11-09');
  assert.equal(formatIsoDate('29/02/2024'), '2024-02-29');
  for (const value of [null, '', '2026-11-09', '9/11/2026', '31/04/2026', '29/02/2025', '00/11/2026', '01/13/2026']) {
    assert.equal(parseDate(value), null, String(value));
    assert.equal(formatIsoDate(value), '', String(value));
  }
});

test('published order and Latest exclude Upcoming without mutating editorial order', () => {
  const older = { date: '31/12/2025', tags: ['In print'] };
  const upcoming = { date: null, tags: ['Upcoming', 'In print'] };
  const newer = { date: '02/01/2026', tags: ['Online'] };
  const input = Object.freeze([older, upcoming, newer]);
  assert.deepEqual(publishedNewestFirstFrom(input), [newer, older]);
  assert.equal(selectLatestPublished(input), newer);
  assert.deepEqual(input, [older, upcoming, newer]);
  assert.equal(selectLatestPublished([upcoming]), undefined);
  assert.equal(selectLatestPublished([]), undefined);
});

test('Soon selects only Upcoming and handles empty or multiple choices', () => {
  const published = { tags: ['Online'] };
  const first = { tags: ['Upcoming'] };
  const last = { tags: ['Upcoming', 'In print'] };
  assert.equal(selectUpcoming([published]), undefined);
  assert.equal(selectUpcoming([published, first], () => 0.9), first);
  assert.equal(selectUpcoming([first, published, last], () => 0), first);
  assert.equal(selectUpcoming([first, published, last], () => 0.999), last);
});

test('cycle labels do not duplicate an existing article', () => {
  assert.equal(cycleLabel('The Real'), 'From The Real cycle');
  assert.equal(cycleLabel('Mythmaking'), 'From the Mythmaking cycle');
});
