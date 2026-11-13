import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(repoRoot, 'site-data.json'), 'utf8').replace(/^\uFEFF/, ''));
const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
const cell = (value) => String(value).replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
const row = (label, value) => console.log(`| ${cell(label)} | ${cell(value)} |`);

function countHtml(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).reduce((count, entry) => {
    if (entry.isDirectory()) return count + countHtml(path.join(directory, entry.name));
    return count + Number(entry.isFile() && entry.name.endsWith('.html'));
  }, 0);
}

const accountDir = path.join(repoRoot, 'src/content/accounts');
const accounts = fs.readdirSync(accountDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.mdx?$/.test(entry.name));
const fullTexts = accounts.filter((entry) => {
  const source = fs.readFileSync(path.join(accountDir, entry.name), 'utf8').replace(/^\uFEFF/, '');
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return Boolean(frontmatter && /^fullText:\s*true\s*$/m.test(frontmatter[1]));
});
const upcoming = data.pieces.filter((piece) => piece.tags.includes('Upcoming'));
const outputDir = path.join(repoRoot, 'dist');
const dirty = Boolean(git('status', '--porcelain'));

console.log('| Item | Observed state |');
console.log('| --- | --- |');
row('Generated at (UTC)', new Date().toISOString());
row('HEAD', git('rev-parse', 'HEAD'));
row('Commit subject', git('show', '-s', '--format=%s', 'HEAD'));
row('Commit date', git('show', '-s', '--format=%cI', 'HEAD'));
row('Source state', dirty ? 'Working tree has uncommitted changes; counts use working files.' : 'Clean working tree.');
row('Works', `${data.pieces.length} total; ${data.pieces.length - upcoming.length} published; ${upcoming.length} Upcoming`);
row('Hosted reading content', `${accounts.length} Markdown entries; ${fullTexts.length} declare fullText: true`);
row('Cycles', data.cycles.length);
for (const cycle of data.cycles) {
  const members = data.pieces.filter((piece) =>
    new Set([piece.cycle, ...(piece.cycles ?? [])]).has(cycle.name));
  row(`Cycle: ${cycle.name}`, `${members.length} members, including Upcoming and cross-cycle work`);
}
for (const [index, title] of (data.site.featured ?? []).entries()) {
  row(`Selected Works ${index + 1}`, title);
}
row('Local HTML output', fs.existsSync(outputDir)
  ? `${countHtml(outputDir)} files in dist; this command does not verify build freshness or deployment.`
  : 'No dist directory; run npm run build for a current page count.');
