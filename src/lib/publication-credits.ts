/** Curated published venues, also used in this order when nothing is upcoming. */
const PUBLISHED_SHORTLIST = ['BULL', 'Expat Press', 'The MacGuffin', 'Bending Genres'];

export interface PublicationCredits {
  published: string[];
  upcoming: string[];
}

const venueKey = (name: string) => name.toLocaleLowerCase('en');

export function uniqueVenues(names: readonly string[]): string[] {
  const venues = new Map<string, string>();
  for (const value of names) {
    const name = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
    if (name && !venues.has(venueKey(name))) venues.set(venueKey(name), name);
  }
  return [...venues.values()];
}

/** Runs during the static build: two upcoming venues, or one/none as available. */
export function selectPublicationCredits(
  publishedNames: readonly string[],
  upcomingNames: readonly string[],
  random: () => number = Math.random,
): PublicationCredits {
  const publishedPool = uniqueVenues(publishedNames);
  const upcomingPool = uniqueVenues(upcomingNames);
  const upcoming: string[] = [];
  const upcomingCount = Math.min(2, upcomingPool.length);

  while (upcoming.length < upcomingCount) {
    const index = Math.floor(random() * upcomingPool.length);
    upcoming.push(upcomingPool.splice(index, 1)[0]!);
  }

  const publishedKeys = new Set(publishedPool.map(venueKey));
  const upcomingKeys = new Set(upcoming.map(venueKey));
  const preferredPublished = uniqueVenues([
    ...PUBLISHED_SHORTLIST.filter((name) => publishedKeys.has(venueKey(name))),
    ...publishedPool,
  ]);

  return {
    published: preferredPublished
      .filter((name) => !upcomingKeys.has(venueKey(name)))
      .slice(0, 4 - upcoming.length),
    upcoming,
  };
}

const venueList = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });

export function publicationCreditLines({ published, upcoming }: PublicationCredits): string[] {
  const lines: string[] = [];
  if (published.length) {
    lines.push(upcoming.length
      ? `Work published in ${venueList.format(published)}, among others.`
      : `Work published in ${published.join(', ')}, and elsewhere.`);
  }
  if (upcoming.length) lines.push(`Forthcoming in ${venueList.format(upcoming)}.`);
  return lines;
}
