import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { siteDataSchema } from '../src/lib/data-schema.mjs';

const fixture = () => ({
  site: { author: 'Author', bio: 'Biography', email: '', socials: [], featured: ['Published'] },
  cycles: [
    { id: 'example', name: 'Example', blurb: 'Cycle', cover: 'cover.jpg', banner: 'banner.jpg', storyOrder: ['Published', 'Forthcoming'] },
    { id: 'dreams', name: 'Dreams', blurb: 'Dreams', cover: 'cover.jpg', banner: 'banner.jpg' },
  ],
  pieces: [
    { title: 'Published', cycle: 'Example', publication: 'Journal', date: '29/02/2024', tags: ['Online'], link: 'https://example.com/story', cover: 'cover.jpg', genre: 'Short fiction', account: { slug: 'published' } },
    { title: 'Forthcoming', cycle: 'Example', publication: 'Journal', date: null, tags: ['Upcoming', 'In print'], link: '', cover: 'cover.jpg', genre: 'Flash fiction' },
  ],
  interview: { title: 'Interview', publication: 'Journal', date: '01/01/2024', link: 'https://example.com/interview' },
});

test('validation preserves the complete current data without rewriting editorial fields', () => {
  const current = JSON.parse(readFileSync(new URL('../site-data.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
  assert.deepEqual(siteDataSchema.parse(current), current);
  const data = fixture();
  data.pieces[0].editorialContext = '  Keep this exactly.  ';
  assert.deepEqual(siteDataSchema.parse(data), data);
});

test('published, Upcoming and Defunct availability rules', async (t) => {
  const changes = {
    'impossible date': (d) => { d.pieces[0].date = '31/02/2024'; },
    'published without date': (d) => { d.pieces[0].date = null; },
    'Upcoming with date': (d) => { d.pieces[1].date = '01/01/2027'; },
    'Upcoming with link': (d) => { d.pieces[1].link = 'https://example.com'; },
    'online without link': (d) => { d.pieces[0].link = ''; },
    'Defunct with link': (d) => { d.pieces[0].tags.push('Defunct'); },
    'unknown tag': (d) => { d.pieces[0].tags = ['Published']; },
    'duplicate tags': (d) => { d.pieces[0].tags.push('Online'); },
    'no tags': (d) => { d.pieces[0].tags = []; },
    'missing genre': (d) => { delete d.pieces[0].genre; },
    'invalid URL protocol': (d) => { d.pieces[0].link = 'javascript:alert(1)'; },
  };
  for (const [name, change] of Object.entries(changes)) await t.test(name, () => {
    const data = fixture();
    change(data);
    assert.equal(siteDataSchema.safeParse(data).success, false);
  });
  const defunct = fixture();
  defunct.pieces[0].tags.push('Defunct');
  defunct.pieces[0].link = '';
  assert.equal(siteDataSchema.safeParse(defunct).success, true);
});

test('cross-references and narrative sequences cannot silently drift', async (t) => {
  const changes = {
    'duplicate cycle id': (d) => { d.cycles[1].id = 'example'; },
    'duplicate title': (d) => { d.pieces[1].title = 'Published'; },
    'duplicate account': (d) => { d.pieces[1].account = { slug: 'published' }; },
    'invalid account slug': (d) => { d.pieces[0].account.slug = 'Bad Slug'; },
    'unknown cycle': (d) => { d.pieces[0].cycles = ['Example', 'Unknown']; },
    'primary cycle omitted': (d) => { d.pieces[0].cycles = ['Dreams']; },
    'duplicate membership': (d) => { d.pieces[0].cycles = ['Example', 'Example']; },
    'missing sequence': (d) => { delete d.cycles[0].storyOrder; },
    'incomplete sequence': (d) => { d.cycles[0].storyOrder.pop(); },
    'duplicate sequence entry': (d) => { d.cycles[0].storyOrder.push('Published'); },
    'unknown sequence entry': (d) => { d.cycles[0].storyOrder.push('Unknown'); },
    'Dreams sequence': (d) => { d.cycles[1].storyOrder = []; },
    'unknown featured title': (d) => { d.site.featured.push('Unknown'); },
    'duplicate featured title': (d) => { d.site.featured.push('Published'); },
    'cover variants omit primary': (d) => { d.pieces[0].coverVariants = ['a.jpg', 'b.jpg']; },
    'equivalent variant paths': (d) => { d.pieces[0].coverVariants = ['cover.jpg', '/assets/cover.jpg']; },
  };
  for (const [name, change] of Object.entries(changes)) await t.test(name, () => {
    const data = fixture();
    change(data);
    assert.equal(siteDataSchema.safeParse(data).success, false);
  });
  const multiCycle = fixture();
  Object.assign(multiCycle.pieces[0], { cycles: ['Example', 'Dreams'], coverVariants: ['cover.jpg', 'second.jpg'] });
  assert.equal(siteDataSchema.safeParse(multiCycle).success, true);
});
