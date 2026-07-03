import rawData from '../../site-data.json';

export type Tag = 'Online' | 'In print' | 'Upcoming' | 'Defunct';

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
  socials: Social[];
}

export interface Cycle {
  id: string;
  name: string;
  blurb: string;
  cover: string;
}

export interface Piece {
  title: string;
  cycle: string;
  publication: string;
  date: string | null;
  tags: Tag[];
  link: string;
  cover: string;
  note?: string;
  excerpt?: string;
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

export const cycleById = new Map(cycles.map((cycle) => [cycle.id, cycle]));
export const cycleByName = new Map(cycles.map((cycle) => [cycle.name, cycle]));

export function piecesForCycle(cycleName: string): Piece[] {
  return pieces.filter((piece) => piece.cycle === cycleName);
}

export function pieceCountForCycle(cycleName: string): number {
  return piecesForCycle(cycleName).length;
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

export function socialLabel(social: Social): string {
  if (typeof social === 'string') return social;
  return social.label || social.name || social.url || social.href || '';
}

export function socialHref(social: Social): string {
  if (typeof social === 'string') return social.startsWith('http') || social.startsWith('mailto:') ? social : '';
  return social.url || social.href || '';
}
