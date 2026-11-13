import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
if (!fs.existsSync(root)) {
  console.error('Build the site before running check:scripts.');
  process.exit(1);
}
const files = fs.readdirSync(root, { recursive: true }).map(String);
const sources = new Map();
const errors = [];
const addSource = (source, label) => {
  const key = createHash('sha256').update(source).digest('hex');
  if (!sources.has(key)) sources.set(key, { source, label });
};

for (const file of files) {
  if (/\.m?js$/.test(file)) addSource(fs.readFileSync(path.join(root, file), 'utf8'), file);
  if (!file.endsWith('.html')) continue;
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attrs = match[1];
    const type = attrs.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1];
    if (type && !['module', 'text/javascript', 'application/javascript'].includes(type)) continue;
    const src = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!src) {
      if (match[2].trim()) addSource(match[2], `${file}: inline script`);
      continue;
    }
    if (/^(?:https?:)?\/\//i.test(src)) continue;
    const pathname = decodeURIComponent(src.split(/[?#]/)[0]);
    if (!/\.m?js$/i.test(pathname)) {
      errors.push(`${file}: script must be compiled JavaScript: ${src}`);
      continue;
    }
    const target = pathname.startsWith('/')
      ? path.join(root, pathname)
      : path.resolve(root, path.dirname(file), pathname);
    if (!fs.existsSync(target)) errors.push(`${file}: missing script: ${src}`);
  }
}

// Parse without executing DOM code. A .mjs extension also checks module imports.
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'alexei-script-check-'));
try {
  const checkPath = path.join(temporary, 'check.mjs');
  for (const { source, label } of sources.values()) {
    fs.writeFileSync(checkPath, source);
    const check = spawnSync(process.execPath, ['--check', checkPath], { encoding: 'utf8' });
    if (check.status !== 0) errors.push(`${label}: JavaScript syntax check failed.`);
  }
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Script audit passed: ${sources.size} distinct JavaScript sources checked.`);
