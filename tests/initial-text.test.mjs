import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Compile the real helper with the existing compiler, including on Node 22.12.
const source = readFileSync(new URL('../src/lib/initial-text.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { splitInitialText } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const initials = (text, capitals) => splitInitialText(text, capitals).map((part) => part.initial ?? '').join('');

test('initial accents preserve all original characters, punctuation and whitespace', () => {
  for (const title of ['Red, They Are Cherry Red', 'Marry Me?', '(6,080)', 'Star-Crossed', 'LothariOnline', '“Élan”  déjà vu', 'Смерть моя', '', '   ']) {
    for (const capitals of [false, true]) {
      const restored = splitInitialText(title, capitals).map(({ prefix = '', initial = '', rest }) => prefix + initial + rest).join('');
      assert.equal(restored, title);
    }
  }
});

test('capital accents handle hyphens, internal capitals and the numeric title exception', () => {
  assert.equal(initials('Star-Crossed', true), 'SC');
  assert.equal(initials('LothariOnline', true), 'LO');
  assert.equal(initials('(6,080)', true), '6');
  assert.equal(initials('how the Night Glows', true), 'NG');
  assert.equal(initials('“Élan” déjà vu', false), 'Édv');
});
