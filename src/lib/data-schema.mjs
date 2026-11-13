// @ts-check
import { z } from 'astro/zod';
import { parseDate } from './data-rules.mjs';

const text = z.string().refine((value) => Boolean(value.trim()), 'Must not be empty.');
const slug = text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be a lowercase slug.');
const date = z.string().refine((value) => Boolean(parseDate(value)), 'Must be a real calendar date in DD/MM/YYYY format.');
const httpUrl = text.refine((value) => /^https?:\/\//i.test(value), 'Must be an http(s) URL.');

export const tagSchema = z.enum(/** @type {const} */ (['Online', 'In print', 'Upcoming', 'Defunct']));
export const genreSchema = z.enum(/** @type {const} */ (['Short fiction', 'Flash fiction', 'Poem', 'Non-fiction', 'Other']));

// Preserve optional editorial fields, including fields added before a schema update.
export const pieceAccountSchema = z.looseObject({
  slug, label: z.string().optional(), title: z.string().optional(),
});
export const socialObjectSchema = z.looseObject({
  label: z.string().optional(), name: z.string().optional(),
  url: z.string().optional(), href: z.string().optional(),
});
export const socialSchema = z.union([z.string(), socialObjectSchema]);
export const siteMetaSchema = z.looseObject({
  author: text, bio: text, email: z.string(), emailEncoded: z.string().optional(),
  socials: z.array(socialSchema), headerCover: z.string().optional(), socialCard: z.string().optional(),
  featured: z.array(text).optional(),
});
export const cycleSchema = z.looseObject({
  id: slug, name: text, blurb: text, description: text.optional(), cover: text, banner: text,
  storyOrder: z.array(text).optional(), disabled: z.boolean().optional(),
});

/** @param {string} value */
export const normalizeAssetPath = (value) => value.replace(/\\/g, '/').replace(/^\/+/, '')
  .replace(/^public\//, '').replace(/^assets\//, '');

/** @param {z.RefinementCtx} context @param {(string | number)[]} path @param {string} message */
function issue(context, path, message) {
  context.addIssue({ code: 'custom', path, message });
}

export const pieceSchema = z.looseObject({
  title: text, cycle: text, cycles: z.array(text).optional(), publication: text,
  date: date.nullable(), tags: z.array(tagSchema).min(1), link: z.union([z.literal(''), httpUrl]),
  cover: text, coverVariants: z.array(text).min(2).optional(),
  issue: z.string().optional(), awardNote: text.optional(), note: z.string().optional(),
  excerpt: z.string().optional(), genre: genreSchema, account: pieceAccountSchema.optional(),
  titleLines: z.array(z.string()).optional(),
}).superRefine((piece, context) => {
  const upcoming = piece.tags.includes('Upcoming');
  const defunct = piece.tags.includes('Defunct');
  if (new Set(piece.tags).size !== piece.tags.length) issue(context, ['tags'], 'Must not contain duplicate tags.');
  if (upcoming && piece.date !== null) issue(context, ['date'], 'Upcoming work must have date: null.');
  if (!upcoming && piece.date === null) issue(context, ['date'], 'Published work requires a date.');
  if ((upcoming || defunct) && piece.link !== '') issue(context, ['link'], 'Upcoming or Defunct work must have an empty external link.');
  if (piece.tags.includes('Online') && !upcoming && !defunct && !piece.link) {
    issue(context, ['link'], 'Online published work requires an external link unless Defunct.');
  }
  if (piece.cycles) {
    if (!piece.cycles.includes(piece.cycle)) issue(context, ['cycles'], 'Must include the primary cycle.');
    if (new Set(piece.cycles).size !== piece.cycles.length) issue(context, ['cycles'], 'Must not contain duplicate cycles.');
  }
  if (piece.coverVariants) {
    const variants = piece.coverVariants.map(normalizeAssetPath);
    if (new Set(variants).size !== variants.length) issue(context, ['coverVariants'], 'Must not contain duplicate images.');
    if (!variants.includes(normalizeAssetPath(piece.cover))) issue(context, ['coverVariants'], 'Must include the primary cover.');
  }
});

export const interviewSchema = z.looseObject({
  title: text, publication: text, date, link: httpUrl, cover: z.string().optional(), excerpt: z.string().optional(),
});

export const siteDataSchema = z.looseObject({
  site: siteMetaSchema, cycles: z.array(cycleSchema), pieces: z.array(pieceSchema), interview: interviewSchema,
}).superRefine((data, context) => {
  const names = new Set();
  const ids = new Set();
  data.cycles.forEach((cycle, index) => {
    if (ids.has(cycle.id)) issue(context, ['cycles', index, 'id'], 'Duplicate cycle id.');
    if (names.has(cycle.name)) issue(context, ['cycles', index, 'name'], 'Duplicate cycle name.');
    ids.add(cycle.id);
    names.add(cycle.name);
  });

  const titles = new Set();
  const accounts = new Set();
  data.pieces.forEach((piece, index) => {
    if (titles.has(piece.title)) issue(context, ['pieces', index, 'title'], 'Duplicate piece title.');
    titles.add(piece.title);
    if (piece.account) {
      if (accounts.has(piece.account.slug)) issue(context, ['pieces', index, 'account', 'slug'], 'Duplicate account slug.');
      accounts.add(piece.account.slug);
    }
    for (const name of piece.cycles ?? [piece.cycle]) {
      if (!names.has(name)) issue(context, ['pieces', index, 'cycles'], `Unknown cycle: ${name}.`);
    }
  });

  data.cycles.forEach((cycle, index) => {
    const field = ['cycles', index, 'storyOrder'];
    if (cycle.name === 'Dreams') {
      if (cycle.storyOrder !== undefined) issue(context, field, 'Dreams must not define a narrative sequence.');
      return;
    }
    if (!cycle.storyOrder) {
      issue(context, field, 'A narrative sequence is required for this cycle.');
      return;
    }
    const expected = new Set(data.pieces.filter((piece) => (piece.cycles ?? [piece.cycle]).includes(cycle.name)).map((piece) => piece.title));
    const seen = new Set();
    for (const title of cycle.storyOrder) {
      if (seen.has(title)) issue(context, field, `Duplicate title: ${title}.`);
      if (!expected.has(title)) issue(context, field, `Not a member of this cycle: ${title}.`);
      seen.add(title);
    }
    for (const title of expected) {
      if (!seen.has(title)) issue(context, field, `Missing cycle piece: ${title}.`);
    }
  });

  const featured = new Set();
  data.site.featured?.forEach((title, index) => {
    if (featured.has(title)) issue(context, ['site', 'featured', index], 'Duplicate featured title.');
    if (!titles.has(title)) issue(context, ['site', 'featured', index], `Unknown piece: ${title}.`);
    featured.add(title);
  });
});
