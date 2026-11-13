import rawData from '../../site-data.json';

import type { z } from 'astro/zod';
import {
  siteDataSchema, tagSchema, genreSchema, pieceAccountSchema, socialObjectSchema,
  socialSchema, siteMetaSchema, cycleSchema, pieceSchema, interviewSchema,
} from './data-schema.mjs';
import { parseDate, publishedNewestFirstFrom } from './data-rules.mjs';
export { parseDate, formatIsoDate } from './data-rules.mjs';

export type Tag = z.infer<typeof tagSchema>;
export type Genre = z.infer<typeof genreSchema>;
export type PieceAccount = z.infer<typeof pieceAccountSchema>;
export type SocialObject = z.infer<typeof socialObjectSchema>;
export type Social = z.infer<typeof socialSchema>;
export type SiteMeta = z.infer<typeof siteMetaSchema>;
export type Cycle = z.infer<typeof cycleSchema>;
export type Piece = z.infer<typeof pieceSchema>;
export type Interview = z.infer<typeof interviewSchema>;
export type SiteData = z.infer<typeof siteDataSchema>;

export const siteData = siteDataSchema.parse(rawData);
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
  return publishedNewestFirstFrom(pieces);
}

export function socialLabel(social: Social): string {
  if (typeof social === 'string') return social;
  return social.label || social.name || social.url || social.href || '';
}

export function socialHref(social: Social): string {
  if (typeof social === 'string') return social.startsWith('http') || social.startsWith('mailto:') ? social : '';
  return social.url || social.href || '';
}
