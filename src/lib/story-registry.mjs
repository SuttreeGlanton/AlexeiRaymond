// @ts-check

export const HEADER_CODA_VARIANTS = /** @type {const} */ ([
  'moon', 'counter', 'pills', 'eyes', 'clock',
  'rabbit', 'paws', 'ring', 'leaf', 'cacodemon',
]);

/** @typedef {(typeof HEADER_CODA_VARIANTS)[number]} HeaderCodaVariant */
export const CODA_VARIANTS = /** @type {const} */ ({
  AlleyMoneyCoda: ['desktop'],
  LothariOnlineCoda: ['desktop', 'mobile'],
  SixThousandEightyCoda: ['desktop', 'mobile'],
  GuestsEyesCoda: ['desktop', 'mobile'],
  TheTrailCoda: ['desktop', 'mobile'],
  WitnessesCoda: ['moon', 'cat'],
  RabbitLampCoda: ['desktop'],
  MourningHoundsCoda: ['desktop', 'tablet'],
  MarryMeCoda: ['desktop'],
  LeavesCoda: ['desktop'],
});
export const PLAIN_CODAS = /** @type {const} */ ([
  'ClotheslineDivorceCoda',
  'DeathwishPresentation',
  'NoRabbitCoda',
  'FatherFrostCoda',
  'LifeToDragonsCoda',
  'NatureOfSleepCoda',
  'NutcrackerCoda',
  'RedCherrySlack',
  'NightGlowsCoda',
  'MothheadCoda',
  'AlphaSoundCoda',
  'StarCrossedCoda',
  'NowClockCoda',
  'SheLovesHerMotherPortrait',
]);

/** @typedef {keyof typeof CODA_VARIANTS | (typeof PLAIN_CODAS)[number]} StoryCodaName */
/** @typedef {{ [K in keyof typeof CODA_VARIANTS]: { component: K, props: { variant: (typeof CODA_VARIANTS)[K][number] }, relocated?: boolean } }[keyof typeof CODA_VARIANTS]} VariantCoda */
/** @typedef {VariantCoda | { component: (typeof PLAIN_CODAS)[number], props?: never, relocated?: boolean }} StoryCoda */
/**
 * @typedef {object} StoryPresentation
 * @property {HeaderCodaVariant} [headerCoda]
 * @property {string} [pageClass]
 * @property {string} [coverClass]
 * @property {'data-mh-story' | 'data-sc-story' | 'data-mm-story' | 'data-leaves-story'} [storyAttribute]
 * @property {'green' | 'red-cherry'} [titleStyle]
 * @property {'star-crossed'} [coverStyle]
 * @property {'leaves'} [replay]
 * @property {StoryCoda[]} [beforeBody]
 * @property {StoryCoda[]} [besideCover]
 * @property {StoryCoda[]} [beforeText]
 * @property {StoryCoda[]} [afterText]
 */

// Presentation only. Manuscripts and publication records remain authoritative.
/** @type {Readonly<Record<string, StoryPresentation>>} */
export const STORY_PRESENTATIONS = {
  genesis: { pageClass: 'archived-piece-page--genesis' },
  'his-green-delight': { titleStyle: 'green' },
  'alley-money': {
    headerCoda: 'cacodemon', pageClass: 'archived-piece-page--alley-money', coverClass: 'alley-money-cover-slot',
    besideCover: [{ component: 'AlleyMoneyCoda', props: { variant: 'desktop' } }],
  },
  'clothesline-divorce': { afterText: [{ component: 'ClotheslineDivorceCoda' }] },
  deathwish: { beforeText: [{ component: 'DeathwishPresentation' }] },
  lotharionline: {
    coverClass: 'lothario-cover-slot',
    besideCover: [{ component: 'LothariOnlineCoda', props: { variant: 'desktop' } }],
    afterText: [{ component: 'LothariOnlineCoda', props: { variant: 'mobile' } }],
  },
  'no-rabbit': { afterText: [{ component: 'NoRabbitCoda' }] },
  '6080': {
    headerCoda: 'counter', coverClass: 'sixty-eighty-cover-slot',
    besideCover: [{ component: 'SixThousandEightyCoda', props: { variant: 'desktop' } }],
    afterText: [{ component: 'SixThousandEightyCoda', props: { variant: 'mobile' }, relocated: true }],
  },
  'father-frost': { afterText: [{ component: 'FatherFrostCoda' }] },
  'life-to-dragons': { afterText: [{ component: 'LifeToDragonsCoda' }] },
  'on-the-nature-of-sleep': { afterText: [{ component: 'NatureOfSleepCoda' }] },
  'the-nutcrackers-charge': { afterText: [{ component: 'NutcrackerCoda' }] },
  'the-guests-are-here': {
    headerCoda: 'eyes', pageClass: 'archived-piece-page--guests', coverClass: 'guests-cover-slot',
    besideCover: [{ component: 'GuestsEyesCoda', props: { variant: 'desktop' } }],
    afterText: [{ component: 'GuestsEyesCoda', props: { variant: 'mobile' }, relocated: true }],
  },
  'the-trail': {
    headerCoda: 'pills', pageClass: 'archived-piece-page--trail', coverClass: 'trail-cover-slot',
    besideCover: [{ component: 'TheTrailCoda', props: { variant: 'desktop' } }],
    afterText: [{ component: 'TheTrailCoda', props: { variant: 'mobile' } }],
  },
  'red-they-are-cherry-red': {
    pageClass: 'archived-piece-page--red-cherry', coverClass: 'red-cherry-cover-slot', titleStyle: 'red-cherry',
    besideCover: [{ component: 'RedCherrySlack' }],
  },
  witnesses: {
    headerCoda: 'moon', coverClass: 'witnesses-cover-slot',
    besideCover: [{ component: 'WitnessesCoda', props: { variant: 'moon' } }],
    afterText: [{ component: 'WitnessesCoda', props: { variant: 'cat' } }],
  },
  'how-the-night-glows': { afterText: [{ component: 'NightGlowsCoda' }] },
  mothhead: { afterText: [{ component: 'MothheadCoda' }] },
  alpha: { afterText: [{ component: 'AlphaSoundCoda' }] },
  'the-mourning-hounds': {
    headerCoda: 'paws', coverClass: 'mourning-hounds-cover-slot', storyAttribute: 'data-mh-story',
    besideCover: [{ component: 'MourningHoundsCoda', props: { variant: 'desktop' } }],
    afterText: [{ component: 'MourningHoundsCoda', props: { variant: 'tablet' } }],
  },
  'star-crossed': {
    storyAttribute: 'data-sc-story', coverStyle: 'star-crossed',
    beforeBody: [{ component: 'StarCrossedCoda' }],
  },
  now: { headerCoda: 'clock', coverClass: 'now-cover-slot', besideCover: [{ component: 'NowClockCoda' }] },
  'truth-or-its-evidence': {
    headerCoda: 'rabbit', coverClass: 'truth-cover-slot',
    besideCover: [{ component: 'RabbitLampCoda', props: { variant: 'desktop' } }],
  },
  'she-loves-her-mother': { afterText: [{ component: 'SheLovesHerMotherPortrait' }] },
  'marry-me': {
    headerCoda: 'ring', coverClass: 'marry-me-cover-slot', storyAttribute: 'data-mm-story',
    besideCover: [{ component: 'MarryMeCoda', props: { variant: 'desktop' } }],
  },
  leaves: {
    headerCoda: 'leaf', coverClass: 'leaves-cover-slot', storyAttribute: 'data-leaves-story', replay: 'leaves',
    besideCover: [{ component: 'LeavesCoda', props: { variant: 'desktop' } }],
  },
};

/** @param {string} slug @returns {StoryPresentation} */
export function storyPresentation(slug) {
  return Object.hasOwn(STORY_PRESENTATIONS, slug) ? STORY_PRESENTATIONS[slug] : {};
}
