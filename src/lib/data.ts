import rawData from '../../site-data.json';

export type Tag = 'Online' | 'In print' | 'Upcoming' | 'Defunct';

export type Genre = 'Short fiction' | 'Flash fiction' | 'Poem' | 'Non-fiction' | 'Other';

export interface PieceAccount {
  slug: string;
  label?: string;
  title?: string;
}

export interface SocialObject {
  label?: string;
  name?: string;
  url?: string;
  href?: string;
}

export type Social = string | SocialObject;

export interface SiteMeta {
  author: string;
  bio: string;
  email: string;
  /** Base64-encoded contact address; keeps the plain address out of public source. */
  emailEncoded?: string;
  socials: Social[];
  headerCover?: string;
  socialCard?: string;
  /** Ordered list of piece titles to feature on the Selected page. */
  featured?: string[];
}

export interface Cycle {
  id: string;
  name: string;
  blurb: string;
  cover: string;
  /** Cycle-specific narrative sequence. Omitted for cycles without a fixed order. */
  storyOrder?: string[];
  disabled?: boolean;
}

export interface Piece {
  title: string;
  cycle: string;
  /** Full cycle membership. When omitted, the primary cycle is the only cycle. */
  cycles?: string[];
  publication: string;
  date: string | null;
  tags: Tag[];
  link: string;
  cover: string;
  issue?: string;
  note?: string;
  excerpt?: string;
  genre?: Genre;
  account?: PieceAccount;
  /** Manual line breaks for card titles that need them. */
  titleLines?: string[];
}

export interface Interview {
  title: string;
  publication: string;
  date: string;
  link: string;
  cover?: string;
  excerpt?: string;
}

export interface SiteData {
  site: SiteMeta;
  cycles: Cycle[];
  pieces: Piece[];
  interview: Interview;
}

export const siteData = rawData as SiteData;
export const site = siteData.site;
export const cycles = siteData.cycles;
export const pieces = siteData.pieces;
export const interview = siteData.interview;

export const cycleByName = new Map(cycles.map((cycle) => [cycle.name, cycle]));
export const pieceByTitle = new Map(pieces.map((piece) => [piece.title, piece]));

export function cycleNamesForPiece(piece: Piece): string[] {
  return [...new Set([piece.cycle, ...(piece.cycles ?? [])].filter(Boolean))];
}

export function piecesForCycle(cycleName: string): Piece[] {
  return pieces.filter((piece) => cycleNamesForPiece(piece).includes(cycleName));
}

/** Featured pieces in the author's chosen order; unknown titles are skipped. */
export function featuredPieces(): Piece[] {
  return (site.featured ?? [])
    .map((title) => pieceByTitle.get(title))
    .filter((piece): piece is Piece => Boolean(piece));
}

export function isUpcoming(piece: Piece): boolean {
  return piece.tags.includes('Upcoming');
}

export function isDefunct(piece: Piece): boolean {
  return piece.tags.includes('Defunct');
}

export function canLinkToPiece(piece: Piece): boolean {
  return Boolean(piece.link) && !isUpcoming(piece) && !isDefunct(piece);
}

export function publishedPieces(): Piece[] {
  return pieces.filter((piece) => !isUpcoming(piece));
}

export function upcomingPieces(): Piece[] {
  return pieces.filter(isUpcoming);
}

/** Parse a DD/MM/YYYY date string (European order, never month/day/year). */
export function parseDate(date: string | null): Date | null {
  if (!date) return null;
  const [day, month, year] = date.split('/').map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/** "Month Year" display for bibliography lines, e.g. "September 2025". */
export function formatMonthYear(date: string | null): string {
  const parsed = parseDate(date);
  if (!parsed) return '';
  return `${MONTHS[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

export function formatLongDate(date: string | null): string {
  const parsed = parseDate(date);
  if (!parsed) return '';
  return `${parsed.getDate()} ${MONTHS[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

/** ISO date for metadata and structured data, e.g. "2025-09-20". */
export function formatIsoDate(date: string | null): string {
  if (!date) return '';
  const [day, month, year] = date.split('/').map(Number);
  if (!day || !month || !year) return '';
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * The blurb's visible teaser: everything before the appended SEO sentence
 * ("Stories from the cycle…", "Flash-fiction pieces from the cycle…").
 * The full blurb stays available for meta descriptions; the front of the
 * site shows only the teaser.
 */
export function cycleTeaser(cycle: Pick<Cycle, 'blurb'>): string {
  if (!cycle.blurb) return '';
  return cycle.blurb
    .replace(/\s*[^.!?]*\bfrom the cycle\b[\s\S]*$/, '')
    .trim();
}

export function publicationLabel(piece: Pick<Piece, 'publication' | 'issue'>): string {
  return [piece.publication, piece.issue].filter(Boolean).join(' ');
}

/** Compact date plate label, e.g. "APR 25" for a card corner. */
export function formatShortDate(date: string | null): string {
  const parsed = parseDate(date);
  if (!parsed) return '';
  const month = MONTHS[parsed.getMonth()].slice(0, 3).toUpperCase();
  const year = String(parsed.getFullYear()).slice(-2);
  return `${month} ${year}`;
}

/** Published pieces sorted newest first by full parsed date. */
export function publishedNewestFirst(): Piece[] {
  return publishedPieces()
    .slice()
    .sort((a, b) => (parseDate(b.date)?.getTime() ?? 0) - (parseDate(a.date)?.getTime() ?? 0));
}

export function socialLabel(social: Social): string {
  if (typeof social === 'string') return social;
  return social.label || social.name || social.url || social.href || '';
}

export function socialHref(social: Social): string {
  if (typeof social === 'string') return social.startsWith('http') || social.startsWith('mailto:') ? social : '';
  return social.url || social.href || '';
}
