import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real controller with controllable media promises/events.
// This is a DOM/media model, not a browser or audio codec test.
const source = ts.transpileModule(readFileSync(new URL('../src/scripts/reading-audio.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
class Element extends EventTarget {
  dataset = {}; attrs = new Map(); value = '0'; hidden = false; disabled = false; textContent = '';
  style = { setProperty: (name, value) => this.attrs.set(name, value) };
  setAttribute(name, value) { this.attrs.set(name, value); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  toggleAttribute(name, enabled) { if (enabled) this.attrs.set(name, ''); else this.attrs.delete(name); }
  fire(type, props = {}) { const event = new Event(type, { cancelable: true }); Object.assign(event, props); this.dispatchEvent(event); return event; }
}
class Media extends Element {
  duration = NaN; currentTime = 0; paused = true; ended = false; playCalls = 0; loadCalls = 0; pending = [];
  set src(value) { this.setAttribute('src', value); }
  play() { this.paused = false; this.playCalls++; return new Promise((resolve, reject) => this.pending.push({ resolve, reject })); }
  pause() { const changed = !this.paused; this.paused = true; if (changed) this.fire('pause'); }
  load() { this.loadCalls++; this.ended = false; this.currentTime = 0; this.duration = NaN; }
  metadata(duration = 120) { this.duration = duration; this.fire('loadedmetadata'); }
  playing() { this.paused = false; this.fire('playing'); this.pending.at(-1)?.resolve(); }
  finish() { this.currentTime = this.duration; this.ended = true; this.paused = true; this.fire('ended'); }
}
function player(kind = 'full') {
  const root = new Element(); root.dataset = { readingKind: kind, readingTitle: 'Example' };
  const nodes = Object.fromEntries(['toggle', 'controls', 'fallback', 'label', 'status', ...(kind === 'full' ? ['seek'] : [])].map(key => [key, new Element()]));
  nodes.media = new Media(); nodes.media.dataset.src = `/audio/${kind}.mp3`;
  root.querySelector = selector => nodes[selector.slice('[data-reading-'.length, -1)] ?? null;
  return { root, ...nodes };
}
function setup(kinds = ['full']) {
  const players = kinds.map(player); const document = new Element(); const window = new Element();
  document.querySelectorAll = () => players.map(p => p.root); document.hidden = false;
  let now = 0; const exports = {};
  vm.runInNewContext(source, { exports, document, window, performance: { now: () => now } });
  exports.initReadingAudio();
  const click = (p = players[0], delta = 500, detail = 1) => { now += delta; p.toggle.fire('click', { detail }); };
  return { players, click, document, window, init: exports.initReadingAudio };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test('idle players do not request audio; repeated initialization does not duplicate handlers', () => {
  const { players: [p], click, init } = setup();
  assert.equal(p.media.getAttribute('src'), null); assert.equal(p.media.playCalls, 0);
  assert.equal(p.seek.disabled, true); assert.equal(p.fallback.hidden, true); assert.equal(p.controls.hidden, false);
  init(); click(); assert.equal(p.media.playCalls, 1); assert.equal(p.root.dataset.state, 'loading');
  assert.equal(p.toggle.getAttribute('aria-pressed'), 'false');
});

test('rapid quote taps do not restart or layer playback; deliberate taps pause/resume', async () => {
  const { players: [p], click } = setup(['excerpt']);
  click(); p.media.metadata(); p.media.playing(); await flush(); p.media.currentTime = 8;
  click(p, 40); click(p, 40, 2); click(p, 40);
  assert.equal(p.media.playCalls, 1); assert.equal(p.media.currentTime, 8); assert.equal(p.media.paused, false);
  click(); assert.equal(p.media.paused, true); assert.equal(p.media.currentTime, 8);
  click(); p.media.playing(); assert.equal(p.media.playCalls, 2); assert.equal(p.media.currentTime, 8);
});

test('cancelled loading and stale promises cannot overwrite a newer playback attempt', async () => {
  const { players: [p], click } = setup(['excerpt']);
  click(); const old = p.media.pending[0]; click(); assert.equal(p.root.dataset.state, 'paused');
  click(); p.media.playing(); old.reject(new Error('Aborted')); await flush();
  assert.equal(p.root.dataset.state, 'playing'); assert.equal(p.status.hidden, true);
  click(); p.media.fire('playing'); assert.equal(p.media.paused, true);
});

test('failed play and media errors are recoverable without an unhandled rejection', async () => {
  const { players: [p], click } = setup();
  click(); p.media.pending[0].reject(new Error('Blocked')); await flush();
  assert.equal(p.root.dataset.state, 'error'); assert.equal(p.status.hidden, false);
  click(); assert.equal(p.media.loadCalls, 1); p.media.metadata(); p.media.playing();
  assert.equal(p.root.dataset.state, 'playing'); assert.equal(p.seek.disabled, false);
  p.media.fire('error'); assert.equal(p.root.dataset.state, 'error'); assert.equal(p.seek.disabled, true);
});

test('full readings seek while paused, support keyboard endpoints and resume from that position', () => {
  const { players: [p], click } = setup(); click(); p.media.metadata(272); p.media.playing(); click();
  p.seek.value = '91'; p.seek.fire('input'); assert.equal(p.media.currentTime, 91); assert.equal(p.media.paused, true);
  p.seek.fire('keydown', { key: 'ArrowRight' }); assert.equal(p.media.currentTime, 96);
  p.seek.fire('keydown', { key: 'Home' }); assert.equal(p.media.currentTime, 0);
  p.seek.fire('keydown', { key: 'End' }); assert.equal(p.media.currentTime, 272);
  p.seek.fire('keydown', { key: 'ArrowLeft' }); assert.equal(p.media.currentTime, 267);
  click(); assert.equal(p.media.currentTime, 267); assert.equal(p.media.playCalls, 2);
});

test('scrubbing is not pulled back by media time updates and cancellation restores live progress', () => {
  const { players: [p], click, window } = setup(); click(); p.media.metadata(); p.media.playing();
  p.seek.fire('pointerdown'); p.seek.value = '50'; p.media.currentTime = 1; p.media.fire('timeupdate');
  assert.equal(p.seek.value, '50'); window.fire('pointercancel'); assert.equal(p.seek.value, '1');
});

test('excerpt and full reading cannot overlap; completion permits replay and page exit stops audio', () => {
  const { players: [full, clip], click, window } = setup(['full', 'excerpt']);
  click(full); full.media.metadata(); full.media.playing(); full.media.currentTime = 12;
  click(clip); assert.equal(full.media.paused, true); assert.equal(full.media.currentTime, 12);
  clip.media.metadata(10); clip.media.playing(); clip.media.finish(); assert.equal(clip.root.dataset.state, 'ended');
  click(clip); assert.equal(clip.media.currentTime, 0); clip.media.ended = false; clip.media.playing();
  window.fire('pagehide'); assert.equal(clip.media.paused, true); assert.equal(full.media.paused, true);
});

test('unknown or non-finite duration does not enable seeking', () => {
  const { players: [p], click } = setup(); click();
  for (const length of [NaN, Infinity, 0]) { p.media.metadata(length); assert.equal(p.seek.disabled, true); }
  p.media.metadata(60); assert.equal(p.seek.disabled, false);
});
