import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const fixture = (html, scripts) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alexei-script-test-'));
  try {
    fs.mkdirSync(path.join(root, 'scripts'));
    fs.mkdirSync(path.join(root, 'dist'));
    fs.copyFileSync(new URL('../scripts/check-scripts.mjs', import.meta.url), path.join(root, 'scripts/check-scripts.mjs'));
    fs.writeFileSync(path.join(root, 'dist/index.html'), html);
    for (const [name, source] of Object.entries(scripts)) fs.writeFileSync(path.join(root, 'dist', name), source);
    return spawnSync(process.execPath, [path.join(root, 'scripts/check-scripts.mjs')], { encoding: 'utf8' });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
};

test('built script audit accepts JavaScript without executing browser code or JSON data', () => {
  const result = fixture('<script type="module" src="/story.js"></script><script type="application/json">{"data":true}</script>', {
    'story.js': 'document.querySelector("main"); export {};',
  });
  assert.equal(result.status, 0, result.stderr);
});

test('built script audit rejects uncompiled TypeScript asset URLs', () => {
  const result = fixture('<script type="module" src="/story.ts"></script>', { 'story.ts': 'const value: number = 1;' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /compiled JavaScript/);
});

test('built script audit rejects malformed inline JavaScript', () => {
  const result = fixture('<script>const broken = ;</script>', {});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /syntax check failed/);
});

test('built script audit rejects missing local scripts', () => {
  const result = fixture('<script src="/missing.js"></script>', {});
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing script/);
});
