import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const deep = args.has('--deep');
const repoRoot = process.cwd();
const selfPath = 'scripts/audit-privacy.mjs';
const maxFindings = 250;
const findings = [];

function runGit(gitArgs, options = {}) {
  const result = spawnSync('git', gitArgs, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024
  });

  if (result.status === 0) return result.stdout;
  if (options.allowNoMatch && result.status === 1) return '';

  const message = (result.stderr || result.stdout || `git ${gitArgs.join(' ')} failed`).trim();
  throw new Error(message);
}

function splitZ(value) {
  return value.split('\0').map((item) => item.trim()).filter(Boolean);
}

function normalizePath(file) {
  return file.replace(/\\/g, '/');
}

function addFinding(level, scope, file, detail, line = null) {
  if (findings.length >= maxFindings) return;
  findings.push({ level, scope, file, detail, line });
}

const riskyPathRules = [
  ['error', /(^|\/)\.env(\..*)?$/i, 'environment file is tracked or visible'],
  ['error', /(^|\/)(id_rsa|id_dsa|id_ecdsa|id_ed25519|known_hosts)$/i, 'SSH/key material filename'],
  ['error', /\.(pem|key|p12|pfx)$/i, 'certificate/key file'],
  ['warn', /(^|\/)(source-docx|raw-covers)(\/|$)/i, 'private/source folder'],
  ['warn', /\.(docx?|odt|rtf)$/i, 'manuscript/source document'],
  ['warn', /\.(zip|7z|rar|tar|gz)$/i, 'archive file'],
  ['warn', /(^|\/|[-_])(screenshot|screen shot|claude|deepseek|review|export)/i, 'review/export/screenshot-looking path']
];

const binaryExtensions = new Set([
  '.avif', '.gif', '.ico', '.jpeg', '.jpg', '.png', '.webp',
  '.mp3', '.mp4', '.mov', '.wav',
  '.pdf', '.doc', '.docx', '.odt', '.rtf',
  '.zip', '.7z', '.rar', '.tar', '.gz',
  '.woff', '.woff2', '.ttf', '.otf'
]);

const contentRules = [
  ['error', 'private key block', /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/],
  ['error', 'GitHub token', /\b(gh[pousr]_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{20,})\b/],
  ['error', 'OpenAI-like API key', /\bsk-[A-Za-z0-9]{20,}\b/],
  ['error', 'AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['warn', 'secret-looking assignment', /\b(password|passwd|secret|token|api[_-]?key)\b\s*[:=]\s*["']?[^"'\s]+/i],
  ['warn', 'plain email address', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i]
];

// These exact public strings resemble assignments but cannot contain secrets.
// Keep the path and full trimmed line coupled so nearby or edited matches are
// still surfaced for human review.
const knownBenignContentFindings = new Map([
  ['.github/workflows/deploy.yml', new Set([
    'id-token: write'
  ])],
  ['src/content/accounts/remediation.md', new Set([
    '<p class="lg-ok">✓ self_heal complete | token=refreshed, cache=cleared, assumed permissions=reloaded</p>'
  ])]
]);

function isKnownBenignContentFinding(file, label, line) {
  if (label !== 'secret-looking assignment') return false;
  return knownBenignContentFindings.get(file)?.has(line.trim()) ?? false;
}

function checkPath(scope, file, checkSize = false) {
  const clean = normalizePath(file);

  for (const [level, pattern, detail] of riskyPathRules) {
    if (pattern.test(clean)) {
      addFinding(level, scope, clean, detail);
    }
  }

  if (!checkSize) return;

  try {
    const stat = fs.statSync(path.join(repoRoot, clean));
    const isAllowedAsset = clean.startsWith('src/assets/covers/') || clean.startsWith('public/');
    if (stat.isFile() && stat.size > 10 * 1024 * 1024 && !isAllowedAsset) {
      addFinding('warn', scope, clean, `large tracked file: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
    }
  } catch {
    // Historical files may no longer exist locally.
  }
}

function isTextCandidate(file) {
  if (normalizePath(file) === selfPath) return false;
  const ext = path.extname(file).toLowerCase();
  return !binaryExtensions.has(ext);
}

function scanContent(scope, file) {
  const clean = normalizePath(file);
  if (!isTextCandidate(clean)) return;

  const absolute = path.join(repoRoot, clean);

  let stat;
  try {
    stat = fs.statSync(absolute);
  } catch {
    return;
  }

  if (!stat.isFile() || stat.size > 1024 * 1024) return;

  let text;
  try {
    text = fs.readFileSync(absolute, 'utf8');
  } catch {
    return;
  }

  if (text.includes('\0')) return;

  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (clean === 'site-data.json' && /\b(TODO|FIXME|Claude|DeepSeek|internal note|private note)\b/i.test(line)) {
      addFinding('warn', scope, clean, 'possible internal note in site-data.json', index + 1);
    }

    for (const [level, label, pattern] of contentRules) {
      if (!pattern.test(line)) continue;

      if (label === 'plain email address' && /example\.com|noreply\.github\.com/i.test(line)) {
        continue;
      }

      if (isKnownBenignContentFinding(clean, label, line)) {
        continue;
      }

      addFinding(level, scope, clean, label, index + 1);
    }
  });
}

console.log('Privacy audit for public author site');
console.log('');

const status = runGit(['status', '--short']).trim();
if (status) {
  console.log('Working tree is not clean:');
  console.log(status);
  console.log('');
} else {
  console.log('Working tree is clean.');
  console.log('');
}

const trackedFiles = splitZ(runGit(['ls-files', '-z']));
const untrackedFiles = splitZ(runGit(['ls-files', '--others', '--exclude-standard', '-z']));

for (const file of trackedFiles) {
  checkPath('current tracked path', file, true);
  scanContent('current tracked content', file);
}

for (const file of untrackedFiles) {
  checkPath('untracked path', file, true);
  scanContent('untracked content', file);
}

const historicalFileNames = new Set(
  runGit(['log', '--all', '--name-only', '--pretty=format:'])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
);

for (const file of historicalFileNames) {
  checkPath('history filename', file, false);
}

if (deep) {
  const commits = runGit(['rev-list', '--all']).trim().split(/\s+/).filter(Boolean);
  const deepPattern = [
    'gh[pousr]_[A-Za-z0-9_]{30,}',
    'github_pat_[A-Za-z0-9_]{20,}',
    'sk-[A-Za-z0-9]{20,}',
    'AKIA[0-9A-Z]{16}',
    '-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----'
  ].join('|');

  console.log(`Deep scanning ${commits.length} commit(s) for high-risk secret patterns...`);
  console.log('');

  for (const commit of commits) {
    const result = spawnSync('git', ['grep', '-I', '-n', '-E', deepPattern, commit, '--'], {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 25 * 1024 * 1024
    });

    if (result.status === 1) continue;

    if (result.status !== 0) {
      const message = (result.stderr || result.stdout || `git grep failed at ${commit}`).trim();
      throw new Error(message);
    }

    for (const line of result.stdout.split(/\r?\n/).filter(Boolean)) {
      if (line.includes(`:${selfPath}:`)) continue;
      addFinding('error', 'history content', commit.slice(0, 12), line);
    }
  }
} else {
  console.log('Deep history content scan skipped. Run npm run audit:privacy:deep before major public cleanup.');
  console.log('');
}

if (!findings.length) {
  console.log('No obvious privacy findings found.');
  console.log('This is a helper audit, not a guarantee.');
  process.exit(0);
}

const grouped = {
  error: findings.filter((finding) => finding.level === 'error'),
  warn: findings.filter((finding) => finding.level === 'warn')
};

for (const level of ['error', 'warn']) {
  if (!grouped[level].length) continue;

  console.log(`${level.toUpperCase()} findings:`);
  for (const finding of grouped[level]) {
    const location = finding.line ? `${finding.file}:${finding.line}` : finding.file;
    console.log(`- [${finding.scope}] ${location} -- ${finding.detail}`);
  }
  console.log('');
}

if (findings.length >= maxFindings) {
  console.log(`Stopped after ${maxFindings} findings. Narrow the repo before trusting the output.`);
  console.log('');
}

if (grouped.error.length) {
  console.error('High-risk privacy findings found. Review before committing or pushing.');
  process.exit(1);
}

console.log('Warnings need human review, but no high-risk secret pattern was found.');
