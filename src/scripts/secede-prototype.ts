import {
  secedeFinalChat,
  secedeSections,
  secedeTranslationOccurrences,
  type SecedeChoice,
  type SecedeMessage,
  type SecedeOption,
  type SecedeTranslationOccurrence,
  type SecedeTranslationVariant
} from '../lib/secede-prototype-data';
import patchTextureSeedUrl from '../assets/prototype/secede-patch-seed.bmp?url';

/*
 * Authored corruption constants. These are the values fixed in the design
 * specification rather than free calibration knobs, so they live in one place.
 */
/* Heat 1: exactly five blinking words in every unlocked narrative paragraph. */
const BLINK_WORDS_PER_PARAGRAPH = 5;
/*
 * Heat 2: five randomly chosen words per paragraph go badly out of focus for a
 * beat and come back — a different five each time. The memory will not hold
 * still long enough to be read. This replaces the earlier wrong-character
 * substitution at this level; the page already leans hard on things blinking
 * in and out, and a blur is both more distinctive and closer to the subject.
 */
const BLUR_WORDS_PER_PARAGRAPH = 5;
/* A fresh batch on this cadence, each word starting somewhere inside the
   stagger window so the five never go soft together. */
const BLUR_BATCH_MS = 2600;
/* The spread is wide against the hold on purpose: with the two close together
   all five overlapped and the paragraph pulsed as one. At 1500 against 480 they
   go soft in ones and twos, which is what reads as the text refusing to settle
   rather than as the page flickering. */
const BLUR_STAGGER_MS = 1500;
const BLUR_HOLD_MS = 480;
/* Heat 5 — not 4 — replaces every sixth word with a name. */
const NAME_HEAT = 5;
const NAME_WORD_STRIDE = 6;
/*
 * Heat 3: every fifth word flashes briefly to "Ray" or "Eveline" and then
 * returns. The names begin intruding here, transiently, before they take root
 * permanently at heat 5 — the alias creeping into the record before it takes
 * it over. This replaces the earlier sentence-reordering effect at this level.
 */
const NAME_FLASH_HEAT = 3;
const NAME_FLASH_STRIDE = 5;
const NAME_FLASH_HOLD_MS = 620;
/* Kept low so the flashes stay ambient and staggered rather than all at once. */
const NAME_FLASH_CONCURRENCY = 4;
/* Heat 4: a visible paragraph can carry several authored translations at once.
   They remain whole long enough to be read before the exact English returns. */
const TRANSLATION_HEAT = 4;
const TRANSLATION_FLASH_POLL_MS = 900;
const TRANSLATION_FLASH_HOLD_MS = 2400;
const TRANSLATION_FLASHES_PER_TARGET = 3;
const TRANSLATION_FLASH_CONCURRENCY = 9;
const TRANSLATION_VIEWPORT_MARGIN = 0.35;
/* Expensive heat-8 word motion wakes before a target reaches the viewport,
   but distant, invisible paragraphs remain compositor-idle. */
const CORRUPTION_VIEWPORT_MARGIN = 0.6;
const MOTION_WORD_VIEWPORT_MARGIN = 0.05;
/*
 * Heat 5 also destabilises the fixed dates. The month and four-digit year
 * intermittently give way together: each draws from the six neighbouring
 * values within ±3, then both return to the historical date.
 */
const DATE_YEAR_HEAT = 5;
const DATE_YEAR_RANGE = 3;
const DATE_MONTH_RANGE = 3;
const DATE_YEAR_POLL_MS = 160;
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

/* The incoming-message cue sits under the prose rather than over it. */
const MESSAGE_SOUND_VOLUME = 0.34;

/*
 * Heat 6: the failed-data-retrieval patches are rebuilt from the author's
 * reference image rather than guessed at. Two things about that image drive
 * the implementation. Its palette is cyan-dominant, carried by blues and dark
 * greens with magenta and purple as rare accents — the beige of the intact
 * paper above the tear is deliberately excluded. And its structure is
 * horizontal: coherent scanline bands of varying height, each filled with
 * dense per-pixel noise. Measured on the reference, adjacent columns differ
 * about twice as much as adjacent rows, which is why the previous
 * gradient-based patches read as too uniform — a gradient is smooth exactly
 * where the real artifact is noisiest.
 */
const PATCH_PALETTE = [
  '#4cffff', '#27ffe3', '#95ffdc', '#4cffba',
  '#0030e1', '#0011bc', '#003b7c', '#003cf2',
  '#006f00', '#006200', '#1e8422', '#4cff45',
  '#00522a', '#006b85', '#c61c99', '#5c0879'
];
/* Sampled frequencies from the reference, rounded to integer weights. */
const PATCH_WEIGHTS = [22, 4, 3, 5, 13, 4, 4, 2, 11, 9, 3, 7, 6, 2, 5, 4];
/* Band heights on the reference run 1–14px against a median of 7, so roughly
   a quarter of them are the thin single-row stripes. */
const PATCH_THIN_BAND_CHANCE = 0.26;
/* The reference also carries clean, uncorrupted scan lines through the noise. */
const PATCH_SOLID_BAND_CHANCE = 0.14;
/* Textures are generated once into a pool and shared. Repainting eighty-odd
   patches per relocation would otherwise mean eighty canvas exports a tick. */
const PATCH_TEXTURE_POOL = 28;
/*
 * Texture resolution against display size sets how coarse the noise looks.
 * Doubling both dimensions while leaving the on-screen scale alone halves the
 * size of every block, which is what takes the fragments from chunky to the
 * fine-grained speckle of the reference.
 */
const PATCH_TEXTURE_W = 144;
const PATCH_TEXTURE_H = 96;
const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const PATCH_PALETTE_RGB = PATCH_PALETTE.map((colour) => {
  const value = Number.parseInt(colour.slice(1), 16);
  return [
    (value >> 16) & 0xff,
    (value >> 8) & 0xff,
    value & 0xff
  ] as const;
});

interface ChatState {
  started: boolean;
  completed: boolean;
  completedOnce: boolean;
  correctAttempt: boolean;
  heatWrong: boolean;
  busy: boolean;
  currentChoice: string;
  runToken: number;
  /* Mobile follows new arrivals until the reader deliberately scrolls away
     from the bottom of the transcript. */
  followingLog: boolean;
  /*
   * Whether the reader has given this chat a go-ahead. A conversation used to
   * begin the moment it unlocked, which meant it played itself out — sounds
   * included — while the reader was still somewhere up the page. A chat now
   * waits, dimmed, until it is clicked, and stands down again when it leaves
   * the viewport so it is never talking to an empty room.
   */
  armed: boolean;
}

interface ChatElements {
  wrap: HTMLElement;
  log: HTMLElement;
  typing: HTMLElement;
  options: HTMLElement;
  input: HTMLElement;
  evelineFrame: HTMLElement;
  rayFrame: HTMLElement;
  finishActions: HTMLElement;
  restart: HTMLButtonElement;
  continueAction: HTMLButtonElement;
  close: HTMLButtonElement | null;
}

interface DateYearState {
  originalDate: string;
  originalMonth: string;
  originalYear: string;
  wrongMonths: string[];
  wrongYears: string[];
  wrongMonthIndex: number;
  wrongIndex: number;
  displayedMonth: string;
  displayedYear: string;
  showingWrong: boolean;
  nextChangeAt: number;
}

interface ActiveTranslationFlash {
  occurrence: SecedeTranslationOccurrence;
  variant: SecedeTranslationVariant;
  element: HTMLElement;
  timer: number;
}

interface StoryWordRange {
  start: number;
  end: number;
  index: number;
}

interface AdriftWord {
  x: number;
  y: number;
  spin: number;
  since: number;
}

const rootElement = document.querySelector<HTMLElement>('[data-secede-root]');

if (rootElement && rootElement.dataset.enhanced !== 'true') {
  const root = rootElement;
  root.dataset.enhanced = 'true';

  const specs = [...secedeSections.map((section) => section.chat), secedeFinalChat];
  const ordinaryChatCount = secedeSections.length;
  const states: ChatState[] = specs.map((spec) => ({
    started: false,
    completed: false,
    completedOnce: false,
    correctAttempt: true,
    heatWrong: false,
    busy: false,
    currentChoice: spec.start,
    runToken: 0,
    followingLog: true,
    armed: false
  }));
  const elements = specs.map((_, index) => getChatElements(index));
  let furthestUnlocked = 0;
  let authoredHeat = 0;
  let previewHeat: number | null = null;
  let activeHeat = 0;
  const finalLock = root.querySelector<HTMLElement>('[data-lock-screen]');
  const finalLockCard = root.querySelector<HTMLElement>('[data-lock-card]');
  const finalLockFront = root.querySelector<HTMLElement>('[data-lock-front]');
  const finalLockBack = root.querySelector<HTMLElement>('[data-lock-back]');
  const finalLockFlip = root.querySelector<HTMLButtonElement>('[data-lock-flip]');
  const finalLockReturn = root.querySelector<HTMLButtonElement>('[data-lock-return]');
  const finalLockPin = root.querySelector<HTMLButtonElement>('[data-lock-pin]');
  const pinnedMap = root.querySelector<HTMLElement>('[data-pinned-map]');
  const pinnedMapUnpin = root.querySelector<HTMLButtonElement>('[data-map-unpin]');
  const finalLockNotches = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-lock-notch-index]')
  );
  const finalChatWrap = elements[ordinaryChatCount]?.wrap ?? null;
  const finalChatWindow =
    finalChatWrap?.querySelector<HTMLElement>('.msn-window') ?? null;
  const siteHeader = document.querySelector<HTMLElement>('[data-site-header]');
  const mobileLayout = window.matchMedia(
    '(max-width: 700px), (pointer: coarse) and (max-width: 960px) and (max-height: 520px)'
  );
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  /* Completion makes the final mobile action available immediately, but the
     window must remain at full strength until its last changing name settles. */
  let finalNameRevealFinished = false;
  let mobileOpenIndex: number | null = null;
  let mobileViewportFrame = 0;
  let repairMapPinned = false;
  let repairMapCompletionTimer: number | null = null;
  /*
   * The cue runs through Web Audio rather than an <audio> element. Two things
   * were pulling it out of sync with Eveline's line. HTMLAudioElement.play()
   * resolves asynchronously and starts with variable latency, so the sound
   * arrived some way after the message it belonged to; and the file's own
   * leading silence added the rest of the lag. A decoded buffer starts on the
   * audio clock, and the silence is measured once and skipped.
   */
  let audioContext: AudioContext | null = null;
  let soundBuffer: AudioBuffer | null = null;
  let soundOffset = 0;
  let soundPending = false;

  const blinkSelections = new WeakMap<Element, Set<number>>();
  const dateYearStates = new WeakMap<HTMLElement, DateYearState>();
  const driftReturnTimers = new WeakMap<Element, number>();
  const activeTranslationFlashes = new Map<string, ActiveTranslationFlash>();
  /*
   * The manuscript nodes never change identity, so keep the collections once
   * instead of rediscovering the same two thousand descendants in every
   * corruption tick. `activeCorruptionTargets` is deliberately wider than the
   * viewport so target-level effects are ready before the reader reaches them;
   * heat-8 compositor work is narrowed again to the words nearest the screen.
   */
  const corruptionTargets = Array.from(
    root.querySelectorAll<HTMLElement>(
      '[data-prose], [data-corrupt-meta], [data-corrupt-date]'
    )
  );
  const proseTargets = corruptionTargets.filter((element) =>
    element.matches('[data-prose]')
  );
  const dateTargets = corruptionTargets.filter((element) =>
    element.matches('[data-corrupt-date]')
  );
  const activeCorruptionTargets = new Set<HTMLElement>();
  const motionWords = new Set<HTMLElement>();
  const pendingMotionTargets = new Set<HTMLElement>();
  let motionSyncFrame = 0;
  let heatViewportSettleTimer = 0;
  const adriftSelections = new WeakMap<Element, Map<number, AdriftWord>>();
  const wordDisplaySources = new WeakMap<HTMLElement, string>();
  const wordsEndingOriginal = new WeakSet<HTMLElement>();
  const wordRangeCache = new WeakMap<
    HTMLElement,
    { original: string; ranges: StoryWordRange[] }
  >();
  const translationElements = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>('[data-translation-key]').forEach((element) => {
    const key = element.dataset.translationKey;
    if (key) translationElements.set(key, element);
  });
  const translationOccurrencesByKey = new Map<string, SecedeTranslationOccurrence[]>();
  secedeTranslationOccurrences.forEach((occurrence) => {
    const element = translationElements.get(occurrence.key);
    if (!element) {
      throw new Error(`Missing Secede translation target: ${occurrence.key}`);
    }
    const original = element.dataset.original ?? '';
    occurrence.variants.forEach((variant) => {
      if (original.slice(variant.start, variant.end) !== variant.source) {
        throw new Error(
          `Invalid Secede translation source ${occurrence.id}/${variant.language}`
        );
      }
    });
    const keyed = translationOccurrencesByKey.get(occurrence.key) ?? [];
    keyed.push(occurrence);
    translationOccurrencesByKey.set(occurrence.key, keyed);
  });
  const wrongCharacters = ['�', '▒', '҂', 'Ⱥ', 'Ƶ', '⍰', '╳', '⸮', 'Ж', 'Ø'];
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const brokenUppercase = 'Ā͘͡ B͙̙͊ C͎̚͝ Ḓ̔͠ E͏̧̬ F́̋̋ G̬̠̰ H͚͇̊ I̪ͮ̔ J̀̇̃ Ǩ̷ͤ L̖̘̇ M̰͎̗ N͎ͧ̕ O͓͂͋ P͒͊̈́ Q̷̿ͦ R̯̞̃ S̢̀̔ T̫ͮ́ U͈̜͔ Vͫͨ̎ W̩̆̕ X̶͎̄ Y̶̮͖ Z̸̿̌'.split(' ');
  const brokenLowercase = 'a̲͟ͅ b̦͉͗ c̛͑ͩ d̮͚ͥ ẻ̞ͥ f͌ͣͣ g̜͗ͤ ḫ̩͜ i̥ͪͦ j̈͛͞ k̥͐̈ l̢̙̬ m̡̔͟ nͨ̾̈́ o̶͙͒ p̩̅ͤ q͍̮̦ r̝̊͒ s̄ͤͩ t͖̗̜ uͥ̎ͩ v̦̔́ w̭͙͢ x̥͇͞ y̵̼ͪ z̲̹ͭ'.split(' ');

  /* Where the waveform actually begins, so playback can skip the dead air. */
  function leadingSilence(buffer: AudioBuffer) {
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
      if (Math.abs(samples[index]) > 0.008) {
        /* Back off a couple of milliseconds so the attack is not clipped. */
        return Math.max(0, index / buffer.sampleRate - 0.004);
      }
    }
    return 0;
  }

  /* Decoding is deferred until the reader first engages a chat, which is also
     the gesture that lets an AudioContext start unsuspended. */
  async function prepareSound() {
    const source = root.dataset.msnSound;
    if (!source || audioContext || soundPending) return;
    soundPending = true;
    try {
      audioContext = new AudioContext();
      const response = await fetch(source);
      soundBuffer = await audioContext.decodeAudioData(await response.arrayBuffer());
      soundOffset = leadingSilence(soundBuffer);
    } catch {
      audioContext = null;
      soundBuffer = null;
    }
  }

  function playIncomingSound() {
    if (document.hidden || !audioContext || !soundBuffer) return;
    if (audioContext.state === 'suspended') void audioContext.resume();
    const source = audioContext.createBufferSource();
    source.buffer = soundBuffer;
    const gain = audioContext.createGain();
    gain.gain.value = MESSAGE_SOUND_VOLUME;
    source.connect(gain).connect(audioContext.destination);
    source.start(0, soundOffset);
  }

  function getChatElements(index: number): ChatElements {
    const wrap = root.querySelector<HTMLElement>(`[data-chat-index="${index}"]`);
    if (!wrap) throw new Error(`Missing Secede chat window ${index}.`);

    const log = wrap.querySelector<HTMLElement>('[data-chat-log]');
    const typing = wrap.querySelector<HTMLElement>('[data-typing]');
    const options = wrap.querySelector<HTMLElement>('[data-options]');
    const input = wrap.querySelector<HTMLElement>('[data-input]');
    const evelineFrame = wrap.querySelector<HTMLElement>('.msn-avatar-frame--eveline');
    const rayFrame = wrap.querySelector<HTMLElement>('.msn-avatar-frame--ray');
    const finishActions = wrap.querySelector<HTMLElement>('[data-finish-actions]');
    const restart = wrap.querySelector<HTMLButtonElement>('[data-restart]');
    const continueAction = wrap.querySelector<HTMLButtonElement>('[data-continue]');
    const close = wrap.querySelector<HTMLButtonElement>('[data-chat-close]');

    if (
      !log ||
      !typing ||
      !options ||
      !input ||
      !evelineFrame ||
      !rayFrame ||
      !finishActions ||
      !restart ||
      !continueAction
    ) {
      throw new Error(`Incomplete Secede chat window ${index}.`);
    }

    return {
      wrap,
      log,
      typing,
      options,
      input,
      evelineFrame,
      rayFrame,
      finishActions,
      restart,
      continueAction,
      close
    };
  }

  function syncFinishActions(index: number) {
    const state = states[index];
    const chatElements = elements[index];
    const showRestart = state.completed && state.heatWrong;
    const showContinue = mobileLayout.matches && state.completed;
    const visuallyCompleted =
      state.completed &&
      (index !== ordinaryChatCount || finalNameRevealFinished);

    chatElements.wrap.classList.toggle('is-completed', visuallyCompleted);
    chatElements.restart.hidden = !showRestart;
    chatElements.continueAction.hidden = !showContinue;
    chatElements.continueAction.classList.toggle(
      'is-only-action',
      showContinue && !showRestart
    );
    chatElements.finishActions.hidden = !showRestart && !showContinue;
  }

  const visibilityWaiters: Array<() => void> = [];

  function waitUntilDocumentVisible() {
    if (!document.hidden) return Promise.resolve();
    return new Promise<void>((resolve) => visibilityWaiters.push(resolve));
  }

  /*
   * Delivery time advances only while the page is visible. A normal timeout
   * expires in the background and would dump missed messages into the log as
   * soon as a phone unlocked; this keeps the exact remaining delay instead.
   */
  async function delay(milliseconds: number) {
    let remaining = milliseconds;
    while (remaining > 0) {
      await waitUntilDocumentVisible();
      const startedAt = performance.now();
      let paused = false;

      await new Promise<void>((resolve) => {
        const timer = window.setTimeout(() => {
          cleanup();
          resolve();
        }, remaining);
        const onVisibilityChange = () => {
          if (!document.hidden) return;
          paused = true;
          window.clearTimeout(timer);
          cleanup();
          resolve();
        };
        const cleanup = () => {
          document.removeEventListener('visibilitychange', onVisibilityChange);
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
      });

      if (!paused) return;
      remaining = Math.max(0, remaining - (performance.now() - startedAt));
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTranslationFlashes(false);
      if (audioContext?.state === 'running') void audioContext.suspend();
      return;
    }

    const waiting = visibilityWaiters.splice(0);
    waiting.forEach((resolve) => resolve());
    renderAllTargets();
    if (mobileOpenIndex !== null && audioContext?.state === 'suspended') {
      void audioContext.resume();
    }
  });

  function shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[target]] = [copy[target], copy[index]];
    }
    return copy;
  }

  /* One label giving up the alias: it stutters between the two names across
     six steps of lengthening dwell before it settles. */
  function turnLabelToTal(label: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      const verb = label.textContent?.includes('sends') ? 'sends' : 'says';
      const flicker = ['Tal', 'Ray', 'Tal', 'Ray', 'Tal', 'Tal'];
      let elapsed = 0;
      label.classList.add('is-name-turning');
      flicker.forEach((name, step) => {
        elapsed += 90 + step * 105;
        window.setTimeout(() => {
          label.textContent = `${name} ${verb}:`;
        }, elapsed);
      });
      window.setTimeout(() => {
        label.classList.remove('is-name-turning');
        resolve();
      }, elapsed + 700);
    });
  }

  /*
   * After the final line has turned, the correction works its way back through
   * the rest of the account — but only where the reader can watch it happen.
   * A window's labels wait until that window is actually on screen, so
   * scrolling up finds each conversation still under the old name and turns it
   * in front of you, rather than arriving to find the work already done.
   *
   * Within a window the order is shuffled and the delays scattered, so it
   * reads as something spreading through the transcript rather than a cursor
   * running down it.
   */
  let nameTurnArmed = false;
  const scheduledNameTurns = new WeakSet<HTMLElement>();

  async function turnLabelsIn(scope: ParentNode): Promise<void> {
    const pending = Array.from(scope.querySelectorAll<HTMLElement>('.msn-message-label'))
      .filter(
        (label) =>
          label.textContent?.startsWith('Ray ') &&
          !scheduledNameTurns.has(label)
      );
    if (!pending.length) return;

    const turns = shuffle(pending).map((label, order) => {
      scheduledNameTurns.add(label);
      return new Promise<void>((resolve) => {
        window.setTimeout(() => {
          void turnLabelToTal(label).then(resolve);
        }, 220 + Math.random() * 2400 + order * 70);
      });
    });

    await Promise.all(turns);
  }

  async function turnEveryRayLabel(primaryScope?: HTMLElement): Promise<void> {
    nameTurnArmed = true;
    /* The originating final window finishes its first wave even if a fast
       mobile reader has already pressed Continue. Whatever else is currently
       on screen joins that wave; all remaining windows are left to the
       observer, which fires as the reader reaches them. */
    const visibleTurns: Promise<void>[] = [];
    const included = new Set<HTMLElement>();
    if (primaryScope) {
      included.add(primaryScope);
      visibleTurns.push(turnLabelsIn(primaryScope));
    }
    elements.forEach((chatElements) => {
      if (included.has(chatElements.wrap)) return;
      const rect = chatElements.wrap.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        visibleTurns.push(turnLabelsIn(chatElements.wrap));
      }
    });
    await Promise.all(visibleTurns);
  }

  /*
   * The connection status begins with the name correction rather than waiting
   * behind it. Its quicker two-cycle cadence gives way to the permanent status
   * and ending choices while names are still changing in the transcript.
   */
  let endingStatusStarted = false;

  async function playEndingStatusSequence() {
    if (endingStatusStarted) return;
    endingStatusStarted = true;

    const offline = root.querySelector<HTMLElement>('[data-offline]');
    const pulse = root.querySelector<HTMLElement>('[data-offline-pulse]');
    const label = root.querySelector<HTMLElement>('[data-offline-label]');
    const resetWrap = root.querySelector<HTMLElement>('[data-reset-wrap]');
    if (!offline || !pulse || !label || !resetWrap) return;

    offline.hidden = false;
    label.hidden = true;
    pulse.hidden = false;
    pulse.classList.remove('is-running');
    void pulse.offsetWidth;
    pulse.classList.add('is-running');

    const animations = pulse.getAnimations({ subtree: true });
    if (animations.length) {
      await Promise.allSettled(animations.map((animation) => animation.finished));
    }

    pulse.hidden = true;
    pulse.classList.remove('is-running');
    label.hidden = false;
    resetWrap.hidden = false;
  }

  function followLatestMessage(index: number) {
    if (!mobileLayout.matches || states[index].followingLog) {
      elements[index].log.scrollTop = elements[index].log.scrollHeight;
    }
  }

  function appendMessage(index: number, message: SecedeMessage) {
    const row = document.createElement('div');
    row.className = `msn-message msn-message--${message.speaker.toLowerCase()}`;

    const label = document.createElement('div');
    label.className = 'msn-message-label';
    const verb = message.kind === 'file' ? 'sends' : 'says';
    label.textContent = `${message.speaker} ${verb}:`;

    /*
     * The story's revelation. The final line goes out under the name he has
     * been using all along, and then the name itself refuses to hold: it
     * flickers between the two and settles on the real one. Authored, not
     * chosen — the reader only watches it happen.
     *
     * Once it has settled, the correction spreads backwards through every
     * conversation on the page. The ending status starts with the first flicker
     * so its choices arrive before that visible correction wave has finished.
     */
    if (message.speaker === 'Tal') {
      label.textContent = `Ray ${verb}:`;
      window.setTimeout(() => {
        const finalLabelTurn = turnLabelToTal(label);
        void playEndingStatusSequence();
        window.setTimeout(() => {
          const firstVisibleWave = turnEveryRayLabel(elements[index].wrap);
          void Promise.all([finalLabelTurn, firstVisibleWave]).then(() => {
            finalNameRevealFinished = true;
            syncFinishActions(index);
          });
        }, 1900);
      }, 1500);
    }

    const copy = document.createElement('div');
    copy.className = 'msn-message-copy';

    if (message.kind === 'file') {
      copy.classList.add('msn-message-copy--file');
      copy.textContent = message.text;
    } else if (message.kind === 'link') {
      /* A real, followable link — the song is the one thing in the
         reconstruction the reader can still go and hear. */
      copy.classList.add('msn-message-copy--link');
      const anchor = document.createElement('a');
      anchor.href = message.text;
      anchor.textContent = message.text;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      /* The window is one big click target for arming the chat; following the
         link must not also count as that gesture. */
      anchor.addEventListener('click', (event) => event.stopPropagation());
      copy.append(anchor);
    } else {
      copy.textContent = message.text;
    }

    row.append(label, copy);
    elements[index].log.append(row);
    followLatestMessage(index);

    /* Fired here, in the same frame the line lands in the log. */
    if (message.speaker === 'Eveline') playIncomingSound();
  }

  /*
   * Ray's line is typed into the input box and sent, rather than simply
   * appearing in the log. This already happened for the line the reader picks;
   * it now also happens for his scripted follow-ups, so a message never
   * materialises in the transcript without being seen to be written.
   */
  async function typeAndSend(index: number, message: SecedeMessage, runToken: number) {
    if (message.kind === 'file') {
      await delay(Math.min(1800, 560 + message.text.length * 10));
      if (states[index].runToken !== runToken) return false;
      appendMessage(index, message);
      return true;
    }

    elements[index].input.textContent = message.text;
    elements[index].input.classList.add('is-sending');
    await delay(Math.min(1900, 540 + message.text.length * 12));
    if (states[index].runToken !== runToken) return false;
    elements[index].input.textContent = '';
    elements[index].input.classList.remove('is-sending');
    appendMessage(index, message);
    return true;
  }

  async function playMessages(index: number, messages: SecedeMessage[], runToken: number) {
    for (const message of messages) {
      if (states[index].runToken !== runToken) return false;
      /* Hold here whenever the reader is not with this chat. */
      await waitUntilArmed(index);
      if (states[index].runToken !== runToken) return false;

      if (message.speaker === 'Eveline') {
        elements[index].typing.hidden = false;
        const typingDelay = Math.min(4200, Math.max(900, 520 + message.text.length * 28));
        await delay(typingDelay);
        if (states[index].runToken !== runToken) return false;
        elements[index].typing.hidden = true;
        appendMessage(index, message);
      } else if (!(await typeAndSend(index, message, runToken))) {
        return false;
      }

      await delay(640 + Math.round(Math.random() * 260));
    }

    return states[index].runToken === runToken;
  }

  async function playTypingHesitation(index: number, runToken: number) {
    const typing = elements[index].typing;
    const beats = [
      { visible: true, duration: 1000 },
      { visible: false, duration: 1000 },
      { visible: true, duration: 1000 }
    ];

    for (const beat of beats) {
      if (states[index].runToken !== runToken) return false;
      typing.hidden = !beat.visible;
      await delay(beat.duration);
    }

    if (states[index].runToken !== runToken) return false;
    typing.hidden = true;
    return true;
  }

  /*
   * `corruptions` is how many characters go wrong. Ordinary false options get
   * two — one alone was too easy to miss before choosing, which defeated the
   * point of the cue. The silence option gets more: it
   * used to read '…', which has no letters at all, so the cue generator bailed
   * out and the reader was choosing it completely blind. It is now '[nothing]',
   * which gives the corruption a surface to work on.
   */
  function makeAlteredText(text: string, cue: SecedeOption['cue'], corruptions = 1) {
    if (cue === 'order') {
      const words = text.split(/\s+/);
      const candidates = words
        .map((word, index) => ({ word, index }))
        .filter(({ word }) => word.replace(/[^\p{L}\p{N}]/gu, '').length > 3)
        .map(({ index }) => index);
      /* Swap `corruptions` separate pairs, not a single one. A lone swap on a
         long line was too easy to miss before choosing — the reader could pick
         it blind, which is the one thing the cue exists to prevent. */
      const pairs = Math.min(corruptions, Math.floor(candidates.length / 2));
      for (let step = 0; step < pairs; step += 1) {
        const a = candidates[step * 2];
        const b = candidates[step * 2 + 1];
        [words[a], words[b]] = [words[b], words[a]];
      }
      return words.join(' ');
    }

    const characters = [...text];
    const candidateIndexes = characters
      .map((character, index) => ({ character, index }))
      .filter(({ character }) => /\p{L}/u.test(character));
    if (!candidateIndexes.length) return text;

    const wrongFor = (index: number) =>
      cue === 'unicode' ? '�' : wrongCharacters[(index + text.length) % wrongCharacters.length];

    if (corruptions <= 1) {
      const first = candidateIndexes[Math.min(2, candidateIndexes.length - 1)].index;
      characters[first] = wrongFor(first);
    } else {
      /* Spread the wrong characters evenly through the word rather than
         letting them cluster, so the whole of it reads as unstable. */
      const wanted = Math.min(corruptions, candidateIndexes.length);
      for (let step = 0; step < wanted; step += 1) {
        const slot = Math.min(
          Math.floor(((step + 0.5) / wanted) * candidateIndexes.length),
          candidateIndexes.length - 1
        );
        const index = candidateIndexes[slot].index;
        characters[index] = wrongFor(index);
      }
    }

    if (cue === 'unicode' && candidateIndexes.length > 8) {
      const second = candidateIndexes[candidateIndexes.length - 3].index;
      characters[second] = '҂';
    }

    return characters.join('');
  }

  function createOptionButton(
    index: number,
    choice: SecedeChoice,
    option: SecedeOption,
    displayOrder: number,
    showNumber: boolean
  ) {
    const row = document.createElement('div');
    row.className = option.canonical ? 'msn-option is-canonical' : 'msn-option is-noncanonical';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'msn-option-select';
    button.setAttribute('aria-pressed', 'false');

    const copy = document.createElement('span');
    copy.className = 'msn-option-copy';

    if (showNumber) {
      const number = document.createElement('span');
      number.className = 'msn-option-number';
      number.textContent = `${displayOrder + 1}.`;
      button.append(number);
    }

    if (!option.canonical && option.cue) {
      copy.classList.add(`has-${option.cue}-cue`);
      copy.dataset.altered = makeAlteredText(option.text, option.cue, option.silent ? 3 : 2);
    }
    if (option.singleLine) copy.classList.add('is-single-line');

    copy.textContent = option.text;
    button.append(copy);

    const enter = document.createElement('button');
    enter.type = 'button';
    enter.className = 'msn-option-enter';
    enter.textContent = 'Enter';
    enter.hidden = true;

    button.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!mobileLayout.matches) {
        void chooseOption(index, choice, option);
        return;
      }

      if (!row.classList.contains('is-selected')) {
        elements[index].options.querySelectorAll<HTMLElement>('.msn-option').forEach((candidate) => {
          candidate.classList.remove('is-selected');
          candidate.querySelector<HTMLButtonElement>('.msn-option-select')
            ?.setAttribute('aria-pressed', 'false');
          const candidateEnter = candidate.querySelector<HTMLButtonElement>('.msn-option-enter');
          if (candidateEnter) candidateEnter.hidden = true;
        });
        row.classList.add('is-selected');
        button.setAttribute('aria-pressed', 'true');
        enter.hidden = false;
        return;
      }
    });

    enter.addEventListener('click', (event) => {
      event.stopPropagation();
      void chooseOption(index, choice, option);
    });
    row.append(button, enter);
    return row;
  }

  function setChoiceVisible(index: number, visible: boolean) {
    elements[index].options.hidden = !visible;
    elements[index].wrap.classList.toggle('is-choosing', visible);
  }

  function showChoice(index: number) {
    const state = states[index];
    const spec = specs[index];
    const choice = spec.choices[state.currentChoice];
    const optionHost = elements[index].options;

    optionHost.replaceChildren();
    const randomized = choice.options.length > 1 ? shuffle(choice.options) : [...choice.options];
    const showNumbers = randomized.length > 1;
    randomized.forEach((option, displayOrder) => {
      optionHost.append(createOptionButton(index, choice, option, displayOrder, showNumbers));
    });
    setChoiceVisible(index, true);
    state.busy = false;

    /*
     * The bubble floats over the input box and reaches up across the log. On a
     * short conversation the window had collapsed to its content, so the
     * bubble covered the very messages the choice responds to. Measuring it and
     * reserving that much room under the log pushes the transcript clear; the
     * window grows to take it, up to the authored square ceiling, after which
     * the log scrolls instead.
     */
    window.requestAnimationFrame(() => {
      const bubble = Math.round(optionHost.getBoundingClientRect().height);
      elements[index].wrap.style.setProperty('--options-space', `${bubble}px`);
      followLatestMessage(index);
    });
  }

  async function chooseOption(index: number, choice: SecedeChoice, option: SecedeOption) {
    const state = states[index];
    if (state.busy || state.completed) return;

    state.busy = true;
    setChoiceVisible(index, false);
    elements[index].wrap.style.removeProperty('--options-space');
    state.correctAttempt = option.redeems
      ? true
      : state.correctAttempt && option.canonical;
    const runToken = state.runToken;

    if (option.silent) {
      /* Silence is a diegetic departure: Ray's real Messenger frame switches
         to the supplied offline sprite and stays there for this failed run. */
      elements[index].rayFrame.classList.add('is-offline');
    }

    if (!option.silent) {
      elements[index].input.textContent = option.text;
      elements[index].input.classList.add('is-sending');
      await delay(Math.min(1900, 540 + option.text.length * 12));
      if (state.runToken !== runToken) return;
      elements[index].input.textContent = '';
      elements[index].input.classList.remove('is-sending');

      const selectedSpeaker = specs[index].id === 'july-return' && choice.id === 'tal' ? 'Tal' : 'Ray';
      appendMessage(index, {
        speaker: selectedSpeaker,
        text: option.text
      });
      await delay(520);
    } else {
      elements[index].input.textContent = '…';
      await delay(420);
      if (state.runToken !== runToken) return;
      elements[index].input.textContent = '';
    }

    const continued = await playMessages(index, option.continuation ?? [], runToken);
    if (!continued) return;

    if (
      option.hesitatesBeforeOffline &&
      !(await playTypingHesitation(index, runToken))
    ) {
      return;
    }

    if (option.offlineAfter) {
      const frame = option.offlineAfter === 'Eveline'
        ? elements[index].evelineFrame
        : elements[index].rayFrame;
      frame.classList.add('is-offline');
    }

    if (option.next) {
      state.currentChoice = option.next;
      await delay(680);
      showChoice(index);
      return;
    }

    if (option.end) {
      completeChat(index);
    }
  }

  async function startChat(index: number, restart = false) {
    const state = states[index];
    const spec = specs[index];

    state.started = true;
    state.completed = false;
    state.correctAttempt = true;
    state.busy = true;
    state.currentChoice = spec.start;
    state.runToken += 1;
    state.followingLog = true;
    const runToken = state.runToken;

    elements[index].log.replaceChildren();
    elements[index].input.textContent = '';
    elements[index].typing.hidden = true;
    setChoiceVisible(index, false);
    elements[index].wrap.style.removeProperty('--options-space');
    elements[index].evelineFrame.classList.remove('is-offline');
    elements[index].rayFrame.classList.remove('is-offline');
    syncFinishActions(index);

    await delay(restart ? 520 : 780);
    if (state.runToken !== runToken) return;
    const continued = await playMessages(index, spec.intro, runToken);
    if (!continued) return;
    await delay(spec.intro.length ? 620 : 180);
    if (state.runToken !== runToken) return;
    showChoice(index);
  }

  const armWaiters: Array<Array<() => void>> = specs.map(() => []);

  function waitUntilArmed(index: number) {
    if (states[index].armed) return Promise.resolve();
    return new Promise<void>((resolve) => {
      armWaiters[index].push(resolve);
    });
  }

  function setDormant(index: number, dormant: boolean) {
    const wrap = elements[index].wrap;
    wrap.classList.toggle('is-dormant', dormant);
    if (dormant) {
      /* The last window opens on the first three words of the Bible — the
         story's own Eden reference, and the only chat that earns it. */
      const opening = index === ordinaryChatCount ? 'In the beginning' : 'Begin';
      wrap.dataset.dormantLabel = states[index].started ? 'Resume' : opening;
    } else {
      delete wrap.dataset.dormantLabel;
    }
  }

  function unlockMobilePage() {
    document.documentElement.classList.remove('secede-mobile-chat-open');
    document.body.classList.remove('secede-mobile-chat-open');
    document.documentElement.style.removeProperty('--secede-mobile-viewport-height');
    document.documentElement.style.removeProperty('--secede-mobile-header-height');
  }

  function syncMobileViewportHeight() {
    if (!mobileLayout.matches || mobileOpenIndex === null) return;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const headerHeight = siteHeader?.getBoundingClientRect().height ?? 0;
    document.documentElement.style.setProperty(
      '--secede-mobile-viewport-height',
      `${Math.max(1, Math.round(viewportHeight))}px`
    );
    document.documentElement.style.setProperty(
      '--secede-mobile-header-height',
      `${Math.max(0, Math.round(headerHeight))}px`
    );
  }

  function queueMobileViewportSync() {
    if (mobileViewportFrame) window.cancelAnimationFrame(mobileViewportFrame);
    mobileViewportFrame = window.requestAnimationFrame(() => {
      mobileViewportFrame = 0;
      syncMobileViewportHeight();
    });
  }

  function leaveMobilePresentation(index: number) {
    const chatElements = elements[index];
    const section = root.querySelector<HTMLElement>(`[data-section-index="${index}"]`);
    chatElements.wrap.classList.remove('is-mobile-open');
    chatElements.wrap.removeAttribute('role');
    chatElements.wrap.removeAttribute('aria-modal');
    section?.classList.remove('is-mobile-chat-open');
    if (chatElements.close) chatElements.close.tabIndex = -1;
    if (
      document.activeElement instanceof HTMLElement &&
      chatElements.wrap.contains(document.activeElement)
    ) {
      document.activeElement.blur();
    }
    mobileOpenIndex = null;
    unlockMobilePage();
  }

  function cancelChat(index: number) {
    const state = states[index];
    if (state.completed) return;

    state.started = false;
    state.completed = false;
    state.correctAttempt = true;
    state.busy = false;
    state.currentChoice = specs[index].start;
    state.runToken += 1;
    state.followingLog = true;
    state.armed = false;

    const waiting = armWaiters[index];
    armWaiters[index] = [];
    waiting.forEach((resolve) => resolve());

    elements[index].log.replaceChildren();
    elements[index].input.textContent = '';
    elements[index].input.classList.remove('is-sending');
    elements[index].typing.hidden = true;
    setChoiceVisible(index, false);
    elements[index].wrap.style.removeProperty('--options-space');
    elements[index].evelineFrame.classList.remove('is-offline');
    elements[index].rayFrame.classList.remove('is-offline');
    syncFinishActions(index);
    setDormant(index, true);
  }

  function closeMobileChat(index: number) {
    if (!mobileLayout.matches || mobileOpenIndex !== index) return;
    if (!states[index].completed) cancelChat(index);
    leaveMobilePresentation(index);
  }

  function openMobileChat(index: number) {
    if (!mobileLayout.matches || mobileOpenIndex === index) return;
    const section = root.querySelector<HTMLElement>(`[data-section-index="${index}"]`);
    if (section?.classList.contains('is-chat-locked')) return;

    mobileOpenIndex = index;
    syncMobileViewportHeight();
    document.documentElement.classList.add('secede-mobile-chat-open');
    document.body.classList.add('secede-mobile-chat-open');

    elements[index].wrap.classList.add('is-mobile-open');
    elements[index].wrap.setAttribute('role', 'dialog');
    section?.classList.add('is-mobile-chat-open');
    if (elements[index].close) {
      elements[index].close.tabIndex = 0;
      elements[index].close.focus({ preventScroll: true });
    }
    syncFinishActions(index);

    if (!states[index].completed) armChat(index);
  }

  function armChat(index: number) {
    const state = states[index];
    if (state.armed || state.completed) return;
    const section = root.querySelector<HTMLElement>(`[data-section-index="${index}"]`);
    if (section?.classList.contains('is-chat-locked')) return;

    state.armed = true;
    setDormant(index, false);
    void prepareSound();

    if (!state.started) {
      void startChat(index);
      return;
    }

    const waiting = armWaiters[index];
    armWaiters[index] = [];
    waiting.forEach((resolve) => resolve());
  }

  function disarmChat(index: number) {
    const state = states[index];
    if (mobileLayout.matches && mobileOpenIndex === index) return;
    if (!state.armed || state.completed) return;
    state.armed = false;
    setDormant(index, true);
  }

  function unlockChat(index: number) {
    const section = root.querySelector<HTMLElement>(`[data-section-index="${index}"]`);
    const wrap = elements[index]?.wrap;
    if (!section || !wrap) return;

    section.classList.remove('is-chat-locked');
    wrap.removeAttribute('inert');
    wrap.tabIndex = 0;
    updateFinalLock();

    /* Unlocking only offers the chat. The reader starts it. */
    if (!states[index].started && !states[index].completed) {
      setDormant(index, true);
    }
  }

  function setFinalLockFace(flipped: boolean, moveFocus = false) {
    if (!finalLockCard || !finalLockFront || !finalLockBack) return;

    finalLockCard.dataset.flipped = flipped ? 'true' : 'false';
    finalLockFlip?.setAttribute('aria-expanded', flipped ? 'true' : 'false');

    if (flipped) {
      finalLockFront.setAttribute('inert', '');
      finalLockBack.removeAttribute('inert');
      finalLockBack.setAttribute('aria-hidden', 'false');
      if (moveFocus) finalLockReturn?.focus({ preventScroll: true });
      finalLockFront.setAttribute('aria-hidden', 'true');
      return;
    }

    finalLockBack.setAttribute('inert', '');
    finalLockFront.removeAttribute('inert');
    finalLockFront.setAttribute('aria-hidden', 'false');
    if (moveFocus) finalLockFlip?.focus({ preventScroll: true });
    finalLockBack.setAttribute('aria-hidden', 'true');
  }

  /*
   * Pinning detaches the status map from the verdict instead of making the
   * verdict itself sticky. The detached map is one responsive object: a slim
   * right-edge rail on desktop and the brand-slot replacement on mobile.
   */
  function setRepairMapPinned(pinned: boolean, moveFocus = false) {
    if (!pinnedMap) return;

    if (!pinned && repairMapCompletionTimer !== null) {
      window.clearTimeout(repairMapCompletionTimer);
      repairMapCompletionTimer = null;
    }

    repairMapPinned = pinned;
    pinnedMap.hidden = !pinned;
    pinnedMap.toggleAttribute('inert', !pinned);
    pinnedMap.setAttribute('aria-hidden', pinned ? 'false' : 'true');
    if (!pinned) {
      pinnedMap.classList.remove('is-completing');
      pinnedMap.removeAttribute('aria-busy');
    }
    finalLockPin?.setAttribute('aria-pressed', pinned ? 'true' : 'false');

    if (siteHeader) {
      if (pinned) siteHeader.dataset.secedeMapPinned = 'true';
      else delete siteHeader.dataset.secedeMapPinned;
    }

    if (pinned) {
      setFinalLockFace(false);
      if (moveFocus) pinnedMapUnpin?.focus({ preventScroll: true });
      return;
    }

    if (moveFocus) finalLockFlip?.focus({ preventScroll: true });
  }

  /* When the last failed reconstruction turns canonical, let the detached map
     acknowledge every repaired chat in story order before putting itself
     away. The same DOM order reads top-to-bottom on desktop and left-to-right
     in the mobile header. */
  function completePinnedRepairMap() {
    if (!pinnedMap || !repairMapPinned || pinnedMap.classList.contains('is-completing')) {
      return;
    }

    pinnedMap.classList.add('is-completing');
    pinnedMap.setAttribute('aria-busy', 'true');
    pinnedMap.setAttribute('inert', '');

    const completionDuration = reducedMotion.matches ? 240 : 1320;
    repairMapCompletionTimer = window.setTimeout(() => {
      repairMapCompletionTimer = null;
      setRepairMapPinned(false);
    }, completionDuration);
  }

  function updateRepairIndicator() {
    finalLockNotches.forEach((notch) => {
      const index = Number(notch.dataset.lockNotchIndex);
      const state = states[index];
      if (!Number.isInteger(index) || index < 0 || index >= ordinaryChatCount || !state) return;

      const canonical = state.completed && !state.heatWrong;
      const noncanonical = state.heatWrong;
      notch.classList.toggle('is-canonical', canonical);
      notch.classList.toggle('is-noncanonical', noncanonical);
      notch.disabled = !noncanonical;

      const status = canonical
        ? 'reconstructed canonically'
        : noncanonical
          ? 'reconstructed noncanonically'
          : 'unresolved';
      const label = notch.querySelector<HTMLElement>('[data-lock-notch-label]');
      if (label) {
        label.textContent = `Chat ${index + 1}, ${specs[index].date}: ${status}`;
      }
      notch.removeAttribute('title');
    });
  }

  finalLockFlip?.addEventListener('click', (event) => {
    event.stopPropagation();
    setFinalLockFace(true, true);
  });
  finalLockReturn?.addEventListener('click', (event) => {
    event.stopPropagation();
    setFinalLockFace(false, true);
  });
  finalLockPin?.addEventListener('click', (event) => {
    event.stopPropagation();
    setRepairMapPinned(true, true);
  });
  pinnedMapUnpin?.addEventListener('click', (event) => {
    event.stopPropagation();
    setRepairMapPinned(false, true);
  });
  finalLockNotches.forEach((notch) => {
    notch.addEventListener('click', (event) => {
      event.stopPropagation();
      const index = Number(notch.dataset.lockNotchIndex);
      if (!Number.isInteger(index) || index < 0 || index >= ordinaryChatCount) return;
      const state = states[index];
      if (!state?.completed || !state.heatWrong) return;

      /* The original card returns to its ambient face after a jump. A pinned
         map stays with the reader, preserving the route to every other failed
         reconstruction. Mobile returns to the document-level entrance rather
         than opening the selected Messenger window on the reader's behalf. */
      setFinalLockFace(false);
      if (mobileLayout.matches) {
        if (mobileOpenIndex !== null) closeMobileChat(mobileOpenIndex);
        window.requestAnimationFrame(() => {
          elements[index].wrap.scrollIntoView({
            behavior: reducedMotion.matches ? 'auto' : 'smooth',
            block: 'center'
          });
        });
        return;
      }

      elements[index].wrap.scrollIntoView({
        behavior: reducedMotion.matches ? 'auto' : 'smooth',
        block: 'center'
      });
      elements[index].restart.focus({ preventScroll: true });
    });
  });

  /*
   * The lock card is a sibling of the Messenger window, but both live inside
   * the same chat wrapper. Locked wrappers are normally inert. While the
   * verdict is visible, move that inert boundary down to the blurred Messenger
   * window so the status control can receive pointer and keyboard input without
   * exposing any of the conversation underneath it.
   */
  function setFinalLockInteractive(interactive: boolean) {
    if (!finalChatWrap || !finalChatWindow) return;

    if (interactive) {
      finalChatWrap.removeAttribute('inert');
      finalChatWrap.tabIndex = -1;
      finalChatWindow.setAttribute('inert', '');
      return;
    }

    finalChatWindow.removeAttribute('inert');
    if (finalChatWrap.closest('.is-chat-locked')) {
      finalChatWrap.setAttribute('inert', '');
      finalChatWrap.tabIndex = -1;
    }
  }

  /*
   * The final chat is blurred from the outset like any locked chat, but its
   * verdict is a judgment on the reader's run, not a default state. Once all
   * eight chats are reconstructed and heat remains, its front says that the
   * reader cannot proceed; the reverse maps each chat's canonical state in
   * story order so the remaining repairs are visible without explanatory copy.
   */
  function updateFinalLock() {
    const culmination = root.querySelector<HTMLElement>('[data-culmination]');
    const allCompleted = states
      .slice(0, ordinaryChatCount)
      .every((chatState) => chatState.completed);
    const allCanonical = states
      .slice(0, ordinaryChatCount)
      .every((chatState) => chatState.completed && !chatState.heatWrong);

    if (culmination) {
      const unlocked = culmination.dataset.unlocked === 'true';
      if (unlocked !== allCanonical) {
        culmination.dataset.unlocked = allCanonical ? 'true' : 'false';
        renderTarget(culmination);
      }
    }

    updateRepairIndicator();
    if (!finalLock) return;
    if (allCanonical && repairMapPinned) completePinnedRepairMap();
    const showLock = allCompleted && authoredHeat > 0 && !states[ordinaryChatCount].completed;
    if (!showLock && !finalLock.hidden) setFinalLockFace(false);
    setFinalLockInteractive(showLock);
    finalLock.hidden = !showLock;
  }

  function updateAuthoredHeat() {
    authoredHeat = states
      .slice(0, ordinaryChatCount)
      .reduce((total, state) => total + (state.heatWrong ? 1 : 0), 0);
    setHeat(previewHeat ?? authoredHeat);
    updateFinalLock();
  }

  function unlockProse(index: number) {
    root.querySelectorAll<HTMLElement>(`[data-prose-group="${index}"] [data-prose]`).forEach((paragraph) => {
      /* The last paragraph belongs to the culmination, not to the ordinary
         post-chat release. A corrupted run must repair every reconstruction
         before this paragraph and the final conversation can land together. */
      if (paragraph.dataset.culmination === 'true') return;
      paragraph.dataset.unlocked = 'true';
    });
  }

  function completeChat(index: number) {
    const state = states[index];
    state.completed = true;
    state.completedOnce = true;
    state.busy = false;
    setChoiceVisible(index, false);
    /* A finished conversation remains available as a transcript. Its chrome
       and transcript dim on both desktop and mobile to hand visual priority to
       the available action; syncFinishActions removes that state immediately
       when a failed reconstruction is restarted. */
    setDormant(index, false);
    elements[index].wrap.style.removeProperty('--options-space');

    if (index === ordinaryChatCount) {
      syncFinishActions(index);
      /* The reader has reached the authored ending. The title takes on the
         colours of the window the whole account was conducted through — found
         only by scrolling back to the top, which is the point of it. */
      root.dataset.ending = 'true';
      return;
    }

    state.heatWrong = !state.correctAttempt;
    unlockProse(index);
    syncFinishActions(index);

    if (index === furthestUnlocked && index < ordinaryChatCount - 1) {
      furthestUnlocked = index + 1;
      unlockChat(furthestUnlocked);
    }

    updateAuthoredHeat();

    const allCanonical = states
      .slice(0, ordinaryChatCount)
      .every((chatState) => chatState.completed && !chatState.heatWrong);

    if (allCanonical) {
      furthestUnlocked = ordinaryChatCount;
      armFinalReveal();
    }
  }

  function restartChat(index: number) {
    const state = states[index];
    if (!state.completed || !state.heatWrong) return;
    state.completed = false;
    syncFinishActions(index);
    state.armed = true;
    setDormant(index, false);
    void startChat(index, true);
  }

  elements.forEach((chatElements, index) => {
    chatElements.wrap.setAttribute('inert', '');
    chatElements.wrap.tabIndex = -1;
    if (chatElements.close) chatElements.close.tabIndex = -1;
    chatElements.restart?.addEventListener('click', (event) => {
      event.stopPropagation();
      restartChat(index);
    });
    chatElements.continueAction.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!states[index].completed) return;
      closeMobileChat(index);
    });
    chatElements.close?.addEventListener('click', (event) => {
      event.stopPropagation();
      closeMobileChat(index);
    });
    chatElements.log.addEventListener('scroll', () => {
      if (!mobileLayout.matches) return;
      const distanceFromBottom =
        chatElements.log.scrollHeight - chatElements.log.scrollTop - chatElements.log.clientHeight;
      states[index].followingLog = distanceFromBottom <= 20;
    }, { passive: true });
    /* A click anywhere in the window is the go-ahead. While the chat is
       dormant an overlay sits above the options, so this is the only thing a
       click can reach. */
    chatElements.wrap.addEventListener('click', () => {
      if (mobileLayout.matches) {
        openMobileChat(index);
        return;
      }
      armChat(index);
    });
    chatElements.wrap.addEventListener('keydown', (event) => {
      if (event.target !== chatElements.wrap || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      if (mobileLayout.matches) openMobileChat(index);
      else armChat(index);
    });
  });

  mobileLayout.addEventListener('change', () => {
    if (!mobileLayout.matches && mobileOpenIndex !== null) {
      leaveMobilePresentation(mobileOpenIndex);
    }
    elements.forEach((_, index) => syncFinishActions(index));
    queueMobileViewportSync();
  });
  window.addEventListener('resize', queueMobileViewportSync, { passive: true });
  window.visualViewport?.addEventListener('resize', queueMobileViewportSync, { passive: true });
  window.addEventListener('scroll', () => {
    if (activeHeat >= 8) queueMotionSync();
  }, { passive: true });
  window.addEventListener('resize', () => {
    if (activeHeat >= 8) queueMotionSync();
  }, { passive: true });
  window.visualViewport?.addEventListener('resize', () => {
    if (activeHeat >= 8) queueMotionSync();
  }, { passive: true });

  /* Leaving the viewport stands a chat down mid-conversation; returning to it
     and clicking picks up exactly where it paused. */
  const chatVisibility = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          const index = Number((entry.target as HTMLElement).dataset.chatIndex);
          if (Number.isFinite(index)) disarmChat(index);
          return;
        }
        /* Reaching a conversation after the revelation is what sets its own
           names turning. Already-turned labels are filtered out, so a window
           scrolled past twice does not run it again. */
        if (nameTurnArmed) turnLabelsIn(entry.target);
      });
    },
    { threshold: 0.35 }
  );
  elements.forEach((chatElements) => chatVisibility.observe(chatElements.wrap));

  /*
   * A new run begins at the beginning. Browsers restore the previous scroll
   * position across a reload by default, which landed the reader back at the
   * foot of the page with the whole account blurred out above them and nothing
   * to do but scroll up through it. Turning restoration off means both the
   * reset control and an ordinary refresh open at the title.
   */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  root.querySelector<HTMLButtonElement>('[data-reset]')?.addEventListener('click', () => {
    window.scrollTo(0, 0);
    window.location.reload();
  });

  /*
   * The second ending does not navigate away or reset the reconstruction. It
   * files it: the account is removed in reverse reading order while the page
   * carries the reader back towards its beginning. Invisible, height-matched
   * stand-ins keep every remaining line in place during the journey; the
   * manuscript only collapses after its title has gone.
   */
  type FilingKind = 'text' | 'chat';

  interface FilingTarget {
    element: HTMLElement;
    centre: number;
    kind: FilingKind;
  }

  let filingStarted = false;

  function filingViewportHeight() {
    return window.visualViewport?.height ?? window.innerHeight;
  }

  function isVisibleFilingTarget(element: HTMLElement) {
    if (element.hidden) return false;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.height > 0;
  }

  function makeFilingPlaceholder(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const placeholder = document.createElement('div');
    placeholder.className = 'secede-filing-placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.style.width = `${rect.width}px`;
    placeholder.style.height = `${rect.height}px`;
    placeholder.style.marginTop = style.marginTop;
    placeholder.style.marginRight = style.marginRight;
    placeholder.style.marginBottom = style.marginBottom;
    placeholder.style.marginLeft = style.marginLeft;
    return placeholder;
  }

  function fileTarget(element: HTMLElement, kind: FilingKind) {
    const duration = kind === 'chat' ? 720 : 360;
    element.style.setProperty('--secede-file-duration', `${duration}ms`);
    element.classList.add(
      kind === 'chat' ? 'secede-file-target--chat' : 'secede-file-target--text'
    );

    return new Promise<void>((resolve) => {
      window.setTimeout(() => {
        if (element.isConnected) element.replaceWith(makeFilingPlaceholder(element));
        resolve();
      }, duration);
    });
  }

  function runFilingScroll(
    targets: FilingTarget[],
    endScrollY: number,
    duration: number
  ) {
    const startScrollY = window.scrollY;
    const animations: Promise<void>[] = [];
    let nextTarget = 0;
    let elapsed = 0;
    let previousFrame = performance.now();

    return new Promise<{ remaining: FilingTarget[]; animations: Promise<void>[] }>((resolve) => {
      const frame = (now: number) => {
        if (document.hidden) {
          previousFrame = now;
          window.requestAnimationFrame(frame);
          return;
        }

        elapsed += Math.min(64, Math.max(0, now - previousFrame));
        previousFrame = now;
        const progress = Math.min(1, elapsed / duration);
        const nextScrollY = startScrollY + (endScrollY - startScrollY) * progress;
        window.scrollTo(0, nextScrollY);

        /* Elements disappear as they pass a little below the middle of the
           viewport, keeping the deletion visible without making the reader
           watch empty space travel past. */
        const deletionLine = nextScrollY + filingViewportHeight() * 0.62;
        while (
          nextTarget < targets.length &&
          targets[nextTarget].centre >= deletionLine
        ) {
          const target = targets[nextTarget];
          animations.push(fileTarget(target.element, target.kind));
          nextTarget += 1;
        }

        if (progress < 1) {
          window.requestAnimationFrame(frame);
          return;
        }

        resolve({ remaining: targets.slice(nextTarget), animations });
      };

      window.requestAnimationFrame(frame);
    });
  }

  function finishFiling() {
    const status = document.createElement('div');
    status.className = 'secede-filed-caret';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-label', 'Filed and forgotten.');

    const caret = document.createElement('span');
    caret.className = 'secede-filed-caret-mark';
    caret.setAttribute('aria-hidden', 'true');
    status.append(caret);

    root.replaceChildren(status);
    delete root.dataset.filing;
    root.dataset.filed = 'true';
    root.removeAttribute('aria-busy');
    root.removeAttribute('inert');
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);
    window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      window.requestAnimationFrame(() => window.scrollTo(0, 0));
    });
  }

  async function fileAndForget() {
    if (filingStarted) return;
    filingStarted = true;

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (mobileOpenIndex !== null) leaveMobilePresentation(mobileOpenIndex);
    setRepairMapPinned(false);
    clearTranslationFlashes(false);
    previewHeat = null;
    setHeat(0);

    /* Once the clicked control disappears, browser scroll anchoring otherwise
       tries to preserve its old screen position and fights the authored trip
       to the top — most visibly on mobile, where it can strand the caret under
       the sticky header. */
    document.documentElement.classList.add('secede-filing-page');
    root.dataset.filing = 'true';
    root.setAttribute('aria-busy', 'true');
    root.setAttribute('inert', '');

    if (reducedMotion.matches) {
      root.classList.add('secede-filing-reduced');
      await delay(420);
      root.classList.remove('secede-filing-reduced');
      finishFiling();
      return;
    }

    const filingTargets = Array.from(
      root.querySelectorAll<HTMLElement>(
        '[data-reset-wrap], [data-offline], [data-prose], [data-chat-wrap], .secede-date, .secede-epigraph'
      )
    )
      .filter(isVisibleFilingTarget)
      .map((element): FilingTarget => {
        const rect = element.getBoundingClientRect();
        return {
          element,
          centre: window.scrollY + rect.top + rect.height / 2,
          kind: element.matches('[data-chat-wrap]') ? 'chat' : 'text'
        };
      })
      .sort((first, second) => second.centre - first.centre);

    const sequence = await runFilingScroll(filingTargets, 0, 17200);

    /* The topmost epigraph can remain above the travelling deletion line once
       the browser reaches its scroll limit. Finish any such nodes one at a
       time in place, then erase the title itself. */
    for (const target of sequence.remaining) {
      await fileTarget(target.element, target.kind);
    }
    await Promise.all(sequence.animations);

    const title = root.querySelector<HTMLElement>('.secede-title');
    if (title) {
      title.style.setProperty('--secede-file-duration', '820ms');
      title.classList.add('secede-file-target--text');
      await delay(820);
    }

    finishFiling();
  }

  root
    .querySelector<HTMLButtonElement>('[data-file-and-forget]')
    ?.addEventListener('click', () => void fileAndForget());

  function chooseRandomIndexes(count: number, maximum: number) {
    const indexes = Array.from({ length: maximum }, (_, index) => index);
    return new Set(shuffle(indexes).slice(0, Math.min(count, maximum)));
  }

  function replaceWordAtNameHeat(word: string, replacement: string) {
    const match = word.match(/^([“‘"'([{]*)([\p{L}\p{N}][\p{L}\p{N}’'’-]*)(.*)$/u);
    if (!match) return replacement;
    return `${match[1]}${replacement}${match[3]}`;
  }

  function brokenCharacter(character: string) {
    if (Math.random() > 0.62) return character;
    const uppercaseIndex = uppercase.indexOf(character);
    if (uppercaseIndex >= 0) return brokenUppercase[uppercaseIndex] ?? character;
    const lowercaseIndex = lowercase.indexOf(character);
    if (lowercaseIndex >= 0) return brokenLowercase[lowercaseIndex] ?? character;
    return character;
  }

  function randomBetween(minimum: number, maximum: number) {
    return minimum + Math.random() * (maximum - minimum);
  }

  function paletteColourIndex() {
    let total = 0;
    for (const weight of PATCH_WEIGHTS) total += weight;
    let roll = Math.random() * total;
    for (let index = 0; index < PATCH_PALETTE.length; index += 1) {
      roll -= PATCH_WEIGHTS[index];
      if (roll <= 0) return index;
    }
    return 0;
  }

  function encodeBase64(bytes: Uint8Array) {
    let encoded = '';
    for (let index = 0; index < bytes.length; index += 3) {
      const first = bytes[index] ?? 0;
      const hasSecond = index + 1 < bytes.length;
      const hasThird = index + 2 < bytes.length;
      const second = hasSecond ? (bytes[index + 1] ?? 0) : 0;
      const third = hasThird ? (bytes[index + 2] ?? 0) : 0;
      encoded += BASE64_ALPHABET.charAt(first >> 2);
      encoded += BASE64_ALPHABET.charAt(((first & 0x03) << 4) | (second >> 4));
      encoded += hasSecond
        ? BASE64_ALPHABET.charAt(((second & 0x0f) << 2) | (third >> 6))
        : '=';
      encoded += hasThird ? BASE64_ALPHABET.charAt(third & 0x3f) : '=';
    }
    return encoded;
  }

  /*
   * One fragment of corrupted scan data, drawn a band at a time. The texture
   * has an authored sixteen-colour palette, so an indexed lossless bitmap is
   * its natural representation. Serialising that pixel grid directly avoids
   * thousands of canvas calls and the browser's expensive first PNG-encoder
   * startup without changing a single displayed colour or pixel.
   */
  function buildPatchTexture() {
    const pixels = new Uint8Array(PATCH_TEXTURE_W * PATCH_TEXTURE_H);

    let y = 0;
    while (y < PATCH_TEXTURE_H) {
      const band =
        Math.random() < PATCH_THIN_BAND_CHANCE ? 1 : 1 + Math.floor(Math.random() * 7);
      const height = Math.min(band, PATCH_TEXTURE_H - y);
      const base = paletteColourIndex();

      for (let row = y; row < y + height; row += 1) {
        const start = row * PATCH_TEXTURE_W;
        pixels.fill(base, start, start + PATCH_TEXTURE_W);
      }

      if (Math.random() >= PATCH_SOLID_BAND_CHANCE) {
        const second = paletteColourIndex();
        const accent = paletteColourIndex();
        const density = 0.3 + Math.random() * 0.45;
        /* The run restarts at an offset and steps by a differing stride, so a
           band's noise never lines up with the band above it. That misalignment
           is the stride artifact the reference shows throughout. */
        const stride = 1 + Math.floor(Math.random() * 3);
        const offset = Math.floor(Math.random() * PATCH_TEXTURE_W);
        for (let x = 0; x < PATCH_TEXTURE_W; x += stride) {
          const roll = Math.random();
          if (roll > density + 0.28) continue;
          const colour = roll > density ? accent : second;
          const left = (x + offset) % PATCH_TEXTURE_W;
          const right = Math.min(PATCH_TEXTURE_W, left + stride);
          for (let row = y; row < y + height; row += 1) {
            const start = row * PATCH_TEXTURE_W + left;
            pixels.fill(colour, start, start + (right - left));
          }
        }
      }

      y += height;
    }

    const rowStride = (PATCH_TEXTURE_W + 3) & ~3;
    const pixelBytes = rowStride * PATCH_TEXTURE_H;
    const pixelOffset = 14 + 40 + PATCH_PALETTE_RGB.length * 4;
    const bitmap = new Uint8Array(pixelOffset + pixelBytes);
    const header = new DataView(bitmap.buffer);
    bitmap[0] = 0x42;
    bitmap[1] = 0x4d;
    header.setUint32(2, bitmap.length, true);
    header.setUint32(10, pixelOffset, true);
    header.setUint32(14, 40, true);
    header.setInt32(18, PATCH_TEXTURE_W, true);
    header.setInt32(22, PATCH_TEXTURE_H, true);
    header.setUint16(26, 1, true);
    header.setUint16(28, 8, true);
    header.setUint32(34, pixelBytes, true);
    header.setInt32(38, 2835, true);
    header.setInt32(42, 2835, true);
    header.setUint32(46, PATCH_PALETTE_RGB.length, true);

    PATCH_PALETTE_RGB.forEach((colour, index) => {
      const offset = 54 + index * 4;
      bitmap[offset] = colour[2];
      bitmap[offset + 1] = colour[1];
      bitmap[offset + 2] = colour[0];
    });
    for (let row = 0; row < PATCH_TEXTURE_H; row += 1) {
      const source = (PATCH_TEXTURE_H - row - 1) * PATCH_TEXTURE_W;
      bitmap.set(
        pixels.subarray(source, source + PATCH_TEXTURE_W),
        pixelOffset + row * rowStride
      );
    }

    return `data:image/bmp;base64,${encodeBase64(bitmap)}`;
  }

  const patchTextures: string[] = [patchTextureSeedUrl];
  let patchTextureWarmupStarted = false;
  let patchTextureWarmupPending = false;
  let patchTextureWarmupTimer = 0;

  /*
   * Fill the pool one lossless bitmap at a time during idle gaps beginning at
   * heat 4. Normal play therefore reaches heat 6 with all 28 textures ready.
   * One prebuilt texture handles a direct developer jump immediately; in that
   * exceptional path, the rest are deferred until after the transition.
   */
  function schedulePatchTextureWarmup() {
    if (
      patchTextureWarmupPending ||
      patchTextures.length >= PATCH_TEXTURE_POOL
    ) {
      return;
    }
    patchTextureWarmupPending = true;
    window.setTimeout(() => {
      const addOne = () => {
        patchTextureWarmupPending = false;
        if (patchTextures.length < PATCH_TEXTURE_POOL) {
          patchTextures.push(buildPatchTexture());
        }
        if (patchTextures.length < PATCH_TEXTURE_POOL) {
          schedulePatchTextureWarmup();
        }
      };
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(addOne, { timeout: 1200 });
      } else {
        addOne();
      }
    }, 250);
  }

  function startPatchTextureWarmup() {
    if (patchTextureWarmupStarted) return;
    if (patchTextureWarmupTimer) {
      window.clearTimeout(patchTextureWarmupTimer);
      patchTextureWarmupTimer = 0;
    }
    patchTextureWarmupStarted = true;
    schedulePatchTextureWarmup();
  }

  function patchTexture() {
    if (!patchTextureWarmupStarted && !patchTextureWarmupTimer) {
      patchTextureWarmupTimer = window.setTimeout(() => {
        patchTextureWarmupTimer = 0;
        startPatchTextureWarmup();
      }, 10000);
    }
    if (!patchTextures.length) return '';
    return patchTextures[Math.floor(Math.random() * patchTextures.length)];
  }

  function paintPatch(patch: HTMLElement) {
    const texture = patchTexture();
    if (texture) patch.style.setProperty('--patch-image', `url("${texture}")`);
    /* Scaling the shared texture differently per patch varies the apparent
       block size, so a pool of 28 never reads as 28 repeats. */
    patch.style.setProperty('--patch-scale-x', `${Math.round(randomBetween(95, 175))}%`);
    patch.style.setProperty('--patch-scale-y', `${Math.round(randomBetween(95, 155))}%`);
    patch.style.setProperty('--patch-shift', `${Math.round(randomBetween(-14, 14))}px`);
    patch.style.setProperty('--patch-opacity', randomBetween(0.88, 1).toFixed(2));
    patch.style.setProperty('--patch-contrast', randomBetween(1, 1.3).toFixed(2));
    patch.style.setProperty('--patch-saturation', randomBetween(1, 1.35).toFixed(2));
    /* Torn block edges rather than a torn polygon: corrupted scan data stops
       mid-row, so the fragment steps in and out on horizontal lines and keeps
       its vertical sides square. */
    const stepA = Math.round(randomBetween(58, 100));
    const stepB = Math.round(randomBetween(26, 58));
    const stepC = Math.round(randomBetween(34, 92));
    const stepD = Math.round(randomBetween(64, 94));
    patch.style.setProperty(
      '--patch-clip',
      `polygon(0 0, ${stepA}% 0, ${stepA}% ${stepB}%, 100% ${stepB}%, 100% ${stepD}%, ${stepC}% ${stepD}%, ${stepC}% 100%, 0 100%)`
    );
  }

  function paragraphPatchCount() {
    return mobileLayout.matches
      ? 2 + Math.floor(Math.random() * 2)
      : 3 + Math.floor(Math.random() * 3);
  }

  function refreshParagraphPatches(paragraph: HTMLElement) {
    if (activeHeat < 6 || paragraph.dataset.unlocked !== 'true') return;
    let patchLayer = paragraph.querySelector<HTMLElement>(
      ':scope > .secede-data-patches'
    );
    if (!patchLayer) {
      patchLayer = document.createElement('span');
      patchLayer.className = 'secede-data-patches';
      patchLayer.setAttribute('aria-hidden', 'true');
      paragraph.append(patchLayer);
    }

    const patchCount = paragraphPatchCount();
    while (patchLayer.childElementCount < patchCount) {
      const patch = document.createElement('span');
      patch.className = 'secede-data-patch';
      patchLayer.append(patch);
    }
    while (patchLayer.childElementCount > patchCount) {
      patchLayer.lastElementChild?.remove();
    }
    patchLayer.querySelectorAll<HTMLElement>('.secede-data-patch').forEach((patch) => {
      patch.style.setProperty('--patch-phase', String(Math.random()));
      paintPatch(patch);
    });
    relocatePatches(patchLayer);
  }

  function addPatches(paragraph: HTMLElement) {
    refreshParagraphPatches(paragraph);
  }

  function pageField(): HTMLElement | null {
    if (activeHeat < 6) {
      root.querySelector('.secede-page-patches')?.remove();
      return null;
    }
    let field = root.querySelector<HTMLElement>('.secede-page-patches');
    if (!field) {
      field = document.createElement('div');
      field.className = 'secede-page-patches';
      field.setAttribute('aria-hidden', 'true');
      /* Scale the field with the page so the corruption reaches the margins
         and the space between chats, not just the paragraphs. */
      const count = mobileLayout.matches
        ? 8 + Math.floor(Math.random() * 5)
        : 14 + Math.floor(Math.random() * 8);
      for (let index = 0; index < count; index += 1) {
        const patch = document.createElement('span');
        patch.className = 'secede-data-patch';
        patch.style.setProperty('--patch-phase', String(Math.random()));
        paintPatch(patch);
        field.append(patch);
      }
      root.append(field);
    }
    return field;
  }

  /* Rectangles the corruption must never cover: the playable interface. */
  function protectedBoxes() {
    return Array.from(
      root.querySelectorAll<HTMLElement>('.msn-window-wrap, [data-restart], .secede-reset')
    ).map((node) => node.getBoundingClientRect());
  }

  function relocatePageField() {
    const field = pageField();
    if (!field) return;
    /* Measured from the field, which spans the viewport, rather than from the
       reading column — the patches are meant to land out in the margins to
       either side of the text as well as across it. */
    const bounds = field.getBoundingClientRect();
    const guarded = protectedBoxes();

    field.querySelectorAll<HTMLElement>('.secede-data-patch').forEach((patch) => {
      const width = mobileLayout.matches ? randomBetween(2.6, 9.5) : randomBetween(3.8, 15.5);
      const height = mobileLayout.matches ? randomBetween(1.2, 4.8) : randomBetween(1.8, 7.2);
      const pixelWidth = width * 9;
      const pixelHeight = height * 19;

      for (let attempt = 0; attempt < 14; attempt += 1) {
        const left = Math.random() * Math.max(1, bounds.width - pixelWidth);
        const top = Math.random() * Math.max(1, bounds.height - pixelHeight);
        const box = {
          left: bounds.left + left,
          top: bounds.top + top,
          right: bounds.left + left + pixelWidth,
          bottom: bounds.top + top + pixelHeight
        };
        const clashes = guarded.some(
          (guard) =>
            box.left < guard.right + 14 &&
            box.right > guard.left - 14 &&
            box.top < guard.bottom + 14 &&
            box.bottom > guard.top - 14
        );
        if (clashes && attempt < 13) continue;
        if (clashes) {
          patch.style.display = 'none';
          return;
        }
        patch.style.display = '';
        patch.style.left = `${Math.round(left)}px`;
        patch.style.top = `${Math.round(top)}px`;
        patch.style.width = `${width.toFixed(1)}ch`;
        patch.style.height = `${height.toFixed(1)}em`;
        if (Math.random() > 0.46) paintPatch(patch);
        return;
      }
    });
  }

  function relocatePatches(scope: ParentNode = root) {
    scope.querySelectorAll<HTMLElement>('.secede-data-patch').forEach((patch) => {
      patch.style.left = `${Math.round(Math.random() * 84)}%`;
      patch.style.top = `${Math.round(Math.random() * 78)}%`;
      patch.style.width = `${randomBetween(
        mobileLayout.matches ? 2.6 : 3.8,
        mobileLayout.matches ? 9.2 : 14.5
      ).toFixed(1)}ch`;
      patch.style.height = `${randomBetween(
        mobileLayout.matches ? 1.2 : 1.8,
        mobileLayout.matches ? 4.6 : 6.8
      ).toFixed(1)}em`;
      if (Math.random() > 0.46) paintPatch(patch);
    });
  }

  /*
   * The reader has to find the last conversation rather than be handed it.
   * When every chat is reconstructed, the closing word of the account — his
   * real name, the last word of the last paragraph — begins to pulse. Clicking
   * it uncovers the July 2010 window, which then still waits on its own
   * "In the beginning".
   */
  let finalRevealArmed = false;

  function armFinalReveal() {
    if (finalRevealArmed) return;
    finalRevealArmed = true;
    root
      .querySelectorAll<HTMLElement>('[data-reveal]')
      .forEach((button) => button.classList.add('is-armed'));
  }

  function revealFinalChat() {
    if (!finalRevealArmed) return;
    finalRevealArmed = false;
    root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((button) => {
      button.classList.remove('is-armed');
      button.classList.add('is-spent');
    });
    unlockChat(ordinaryChatCount);
    elements[ordinaryChatCount].wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /*
   * The clean rendering. Two decorations live in the prose that a plain
   * textContent assignment would wipe, and this node is rebuilt constantly by
   * the corruption engine, so both are reconstructed on every pass: the
   * blinking full stop that closes each run of prose before a conversation,
   * and the name that uncovers the final chat.
   */
  function renderPlain(element: HTMLElement, original: string) {
    const wantsStop = element.dataset.finalStop === 'true';
    const revealWord = element.dataset.revealWord;

    if (!wantsStop && !revealWord) {
      element.textContent = original;
      return;
    }

    element.replaceChildren();
    let rest = original;
    let stop = '';

    if (wantsStop && /[.!?]$/.test(rest)) {
      stop = rest.slice(-1);
      rest = rest.slice(0, -1);
    }

    if (revealWord) {
      const at = rest.lastIndexOf(revealWord);
      if (at >= 0) {
        element.append(document.createTextNode(rest.slice(0, at)));
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'secede-reveal';
        button.dataset.reveal = 'true';
        button.textContent = revealWord;
        if (finalRevealArmed) button.classList.add('is-armed');
        button.addEventListener('click', revealFinalChat);
        element.append(button);
        rest = rest.slice(at + revealWord.length);
      }
    }

    element.append(document.createTextNode(rest));

    if (stop) {
      const caret = document.createElement('span');
      caret.className = 'secede-final-stop';
      caret.textContent = stop;
      element.append(caret);
    }
  }

  function wordRanges(element: HTMLElement, original: string): StoryWordRange[] {
    const cached = wordRangeCache.get(element);
    if (cached?.original === original) return cached.ranges;

    const ranges = Array.from(original.matchAll(/\S+/gu), (match, index) => ({
      start: match.index ?? 0,
      end: (match.index ?? 0) + match[0].length,
      index
    }));
    wordRangeCache.set(element, { original, ranges });
    return ranges;
  }

  function indexesInRange(ranges: StoryWordRange[], start: number, end: number) {
    /*
     * Ranges are ordered. Find the first possible overlap, then walk only the
     * handful covered by this source fragment. The old full-array filter ran
     * once per rendered word, turning long paragraphs into quadratic work.
     */
    let low = 0;
    let high = ranges.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (ranges[middle].end <= start) low = middle + 1;
      else high = middle;
    }

    const indexes: number[] = [];
    for (let index = low; index < ranges.length; index += 1) {
      const range = ranges[index];
      if (range.start >= end) break;
      if (range.end > start) indexes.push(range.index);
    }
    return indexes;
  }

  function activeTranslationsFor(element: HTMLElement) {
    return Array.from(activeTranslationFlashes.values())
      .filter((flash) => flash.element === element)
      .sort((first, second) => (
        first.variant.start - second.variant.start ||
        first.variant.end - second.variant.end
      ));
  }

  function appendWithFinalStop(
    parent: HTMLElement,
    text: string,
    element: HTMLElement,
    endsOriginal: boolean
  ) {
    if (
      endsOriginal &&
      element.dataset.finalStop === 'true' &&
      /[.!?]$/u.test(text)
    ) {
      parent.append(document.createTextNode(text.slice(0, -1)));
      const stop = document.createElement('span');
      stop.className = 'secede-final-stop';
      stop.textContent = text.slice(-1);
      parent.append(stop);
      return;
    }
    parent.append(document.createTextNode(text));
  }

  function renderTarget(element: HTMLElement) {
    const isProse = element.matches('[data-prose]');
    const isMeta = element.matches('[data-corrupt-meta]');
    const isDate = element.matches('[data-corrupt-date]');
    clearMotionWords(element);
    const unlocked = !isProse || element.dataset.unlocked === 'true';
    const original = element.dataset.original ?? element.textContent ?? '';
    const translationFlashes = activeTranslationsFor(element);
    const hasTranslationFlashes = translationFlashes.length > 0;

    if (
      isProtectedByChatLock(element) ||
      !unlocked ||
      activeHeat === 0 ||
      (isMeta && activeHeat < 5 && !hasTranslationFlashes) ||
      (isDate && activeHeat < DATE_YEAR_HEAT && !hasTranslationFlashes)
    ) {
      renderPlain(element, original);
      return;
    }

    const dateOnly = isDate;
    const effectHeat = dateOnly ? 8 : activeHeat;
    const corruptWords = isProse || (isMeta && activeHeat >= 5);
    const ranges = wordRanges(element, original);
    const dateState =
      dateOnly && activeHeat >= DATE_YEAR_HEAT
        ? getDateYearState(element, original)
        : null;
    let blinkSet = blinkSelections.get(element);

    if (!blinkSet || [...blinkSet].some((index) => index >= ranges.length)) {
      blinkSet = chooseRandomIndexes(BLINK_WORDS_PER_PARAGRAPH, ranges.length);
      blinkSelections.set(element, blinkSet);
    }

    element.replaceChildren();

    const appendWord = (
      text: string,
      sourceStart: number,
      sourceEnd: number,
      translation?: SecedeTranslationVariant
    ) => {
      const indexes = indexesInRange(ranges, sourceStart, sourceEnd);
      const wordIndex = indexes[0] ?? 0;
      const word = document.createElement('span');
      word.className = 'secede-word';
      word.dataset.wordIndex = String(wordIndex);

      if (
        corruptWords &&
        effectHeat >= 1 &&
        indexes.some((index) => blinkSet?.has(index))
      ) {
        word.classList.add('is-blink-word');
        word.style.setProperty('--blink-delay', `${-Math.random() * 8}s`);
      }

      /* The source words remain indexed for the surrounding corruption layers,
         but a live authored translation takes precedence over a name flash. */
      if (
        !translation &&
        corruptWords &&
        effectHeat >= NAME_FLASH_HEAT &&
        indexes.some((index) => (index + 1) % NAME_FLASH_STRIDE === 0)
      ) {
        word.classList.add('is-name-flash');
      }

      let displayedWord = text;
      if (!translation && dateState && text === dateState.originalMonth) {
        displayedWord = dateState.displayedMonth;
        word.dataset.dateMonth = 'true';
      } else if (
        !translation &&
        dateState &&
        /^(?:19|20)\d{2}$/u.test(text)
      ) {
        displayedWord = dateState.displayedYear;
        word.dataset.dateYear = 'true';
      }

      const nameIndex = indexes.find(
        (index) => (index + 1) % NAME_WORD_STRIDE === 0
      );
      if (
        !translation &&
        corruptWords &&
        effectHeat >= NAME_HEAT &&
        nameIndex !== undefined
      ) {
        displayedWord = replaceWordAtNameHeat(
          displayedWord,
          Math.floor(nameIndex / NAME_WORD_STRIDE) % 2 === 0
            ? 'Ray'
            : 'Eveline'
        );
        word.classList.add('is-name-replacement');
      }

      if (translation) {
        word.classList.add('secede-translation-flash');
        word.lang = translation.language;
        word.dir = translation.language === 'he' ? 'rtl' : 'ltr';
      }

      wordDisplaySources.set(word, displayedWord);
      if (sourceEnd === original.length) wordsEndingOriginal.add(word);
      if (!translation && corruptWords && effectHeat >= 7) {
        displayedWord = [...displayedWord].map(brokenCharacter).join('');
      }
      appendWithFinalStop(
        word,
        displayedWord,
        element,
        sourceEnd === original.length
      );

      /* A word that was already on its way out stays on its way out. */
      const drift = adriftSelections.get(element)?.get(wordIndex);
      if (corruptWords && effectHeat >= 8 && drift) applyAdrift(word, drift);
      element.append(word);
    };

    const appendOriginalRange = (start: number, end: number) => {
      if (end <= start) return;
      const source = original.slice(start, end);
      for (const match of source.matchAll(/\s+|\S+/gu)) {
        const text = match[0];
        const absoluteStart = start + (match.index ?? 0);
        const absoluteEnd = absoluteStart + text.length;
        if (/^\s+$/u.test(text) || !/[\p{L}\p{N}]/u.test(text)) {
          appendWithFinalStop(
            element,
            text,
            element,
            absoluteEnd === original.length
          );
          continue;
        }
        appendWord(text, absoluteStart, absoluteEnd);
      }
    };

    if (hasTranslationFlashes) {
      let cursor = 0;
      translationFlashes.forEach(({ variant }) => {
        appendOriginalRange(cursor, variant.start);
        appendWord(variant.text, variant.start, variant.end, variant);
        cursor = variant.end;
      });
      appendOriginalRange(cursor, original.length);
    } else {
      appendOriginalRange(0, original.length);
    }

    if (isProse && activeCorruptionTargets.has(element)) addPatches(element);
    if (activeHeat >= 8 && activeCorruptionTargets.has(element)) {
      queueMotionSync(element);
    }
  }

  function renderAllTargets() {
    corruptionTargets.forEach(renderTarget);
    root.dataset.heat = String(activeHeat);
    if (activeHeat >= 8) driftWords();
  }

  /*
   * Heat 8 used to keep a transform transition and compositor hint alive on
   * every word in the complete essay. Only a few hundred can be seen (or
   * approached) at once. Stand distant targets down and bring them fully up to
   * date before they enter the viewport; the visible corruption is unchanged,
   * while invisible sections stop consuming animation frames.
   */
  function setMotionWordActive(
    word: HTMLElement,
    active: boolean,
    randomize = false
  ) {
    if (
      active &&
      activeHeat >= 8 &&
      word.parentElement &&
      activeCorruptionTargets.has(word.parentElement)
    ) {
      const wasActive = motionWords.has(word);
      motionWords.add(word);
      word.classList.add('is-motion-active');
      const drift = adriftSelections
        .get(word.parentElement)
        ?.get(Number(word.dataset.wordIndex));
      if (drift) {
        if (!wasActive) applyAdrift(word, drift);
      } else if (!wasActive || randomize) {
        driftWord(word);
      }
      return;
    }

    motionWords.delete(word);
    word.classList.remove('is-motion-active', 'is-knocked');
    word.style.removeProperty('transform');
    delete word.dataset.driftX;
    delete word.dataset.driftY;
  }

  function clearMotionWords(element: HTMLElement) {
    pendingMotionTargets.delete(element);
    element.querySelectorAll<HTMLElement>('.secede-word').forEach((word) => {
      setMotionWordActive(word, false);
    });
  }

  function queueMotionSync(element?: HTMLElement) {
    if (element) pendingMotionTargets.add(element);
    else activeCorruptionTargets.forEach((target) => pendingMotionTargets.add(target));
    if (motionSyncFrame) return;

    motionSyncFrame = window.requestAnimationFrame(() => {
      motionSyncFrame = 0;
      if (activeHeat < 8) {
        pendingMotionTargets.clear();
        return;
      }
      const targets = Array.from(pendingMotionTargets);
      pendingMotionTargets.clear();
      targets.forEach((target) => syncMotionWords(target, false));
    });
  }

  function setCorruptionTargetActive(element: HTMLElement, active: boolean) {
    if (active) {
      if (activeCorruptionTargets.has(element)) return;
      activeCorruptionTargets.add(element);
      element.dataset.corruptionActive = 'true';
      if (activeHeat > 0) {
        renderTarget(element);
      }
      return;
    }

    if (!activeCorruptionTargets.delete(element)) return;
    clearMotionWords(element);
    delete element.dataset.corruptionActive;
  }

  function targetIsNearViewport(element: HTMLElement) {
    const bounds = element.getBoundingClientRect();
    const margin = window.innerHeight * CORRUPTION_VIEWPORT_MARGIN;
    return bounds.bottom >= -margin && bounds.top <= window.innerHeight + margin;
  }

  /*
   * A heat preview can be applied immediately after a browser-restored or
   * programmatic scroll, before IntersectionObserver has delivered its next
   * batch. Reconcile once at that state boundary so the already visible text
   * never waits for a later scroll event to receive its effects.
   */
  function reconcileCorruptionTargets() {
    corruptionTargets.forEach((element) => {
      if (targetIsNearViewport(element)) {
        activeCorruptionTargets.add(element);
        element.dataset.corruptionActive = 'true';
        return;
      }
      if (activeCorruptionTargets.delete(element)) clearMotionWords(element);
      delete element.dataset.corruptionActive;
    });
  }

  const corruptionVisibility = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        setCorruptionTargetActive(entry.target as HTMLElement, entry.isIntersecting);
      });
    },
    {
      rootMargin:
        `${CORRUPTION_VIEWPORT_MARGIN * 100}% 0px ` +
        `${CORRUPTION_VIEWPORT_MARGIN * 100}% 0px`
    }
  );
  corruptionTargets.forEach((element) => {
    setCorruptionTargetActive(element, targetIsNearViewport(element));
    corruptionVisibility.observe(element);
  });

  function clearTranslationFlashes(render = true) {
    const affected = new Set<HTMLElement>();
    activeTranslationFlashes.forEach((flash) => {
      window.clearTimeout(flash.timer);
      affected.add(flash.element);
    });
    activeTranslationFlashes.clear();
    if (render) affected.forEach(renderTarget);
  }

  /*
   * Heat 4: authored fragments surface in readable clusters of up to three.
   * Targets near the viewport take precedence so the effect happens where the
   * reader is looking rather than in prose already left above. Each mark is
   * still its own occurrence, and overlapping source ranges are never active
   * together. A shared mark chooses afresh between its authored variants.
   */
  function rangesOverlap(
    first: SecedeTranslationVariant,
    second: SecedeTranslationVariant
  ) {
    return first.start < second.end && second.start < first.end;
  }

  function isNearViewport(element: HTMLElement) {
    const bounds = element.getBoundingClientRect();
    const margin = window.innerHeight * TRANSLATION_VIEWPORT_MARGIN;
    return bounds.bottom >= -margin && bounds.top <= window.innerHeight + margin;
  }

  /* A blurred, unavailable section has not entered the reader's experience
     yet. None of its copy, metadata, or date is eligible for heat corruption
     until the section itself is unlocked. */
  function isProtectedByChatLock(element: HTMLElement) {
    return element.closest('.is-chat-locked') !== null;
  }

  function runTranslationFlash() {
    if (
      activeHeat < TRANSLATION_HEAT ||
      document.hidden ||
      activeTranslationFlashes.size >= TRANSLATION_FLASH_CONCURRENCY
    ) {
      return;
    }

    const eligibleTargets: Array<{
      element: HTMLElement;
      occurrences: SecedeTranslationOccurrence[];
    }> = [];

    translationOccurrencesByKey.forEach((occurrences, key) => {
      const element = translationElements.get(key);
      if (
        !element?.isConnected ||
        isProtectedByChatLock(element) ||
        (element.matches('[data-prose]') && element.dataset.unlocked !== 'true')
      ) {
        return;
      }
      const active = activeTranslationsFor(element);
      if (active.length >= TRANSLATION_FLASHES_PER_TARGET) return;

      const available = occurrences.filter((occurrence) => (
        !activeTranslationFlashes.has(occurrence.id) &&
        occurrence.variants.some((variant) => (
          active.every((flash) => !rangesOverlap(variant, flash.variant))
        ))
      ));
      if (available.length) {
        eligibleTargets.push({ element, occurrences: available });
      }
    });
    if (!eligibleTargets.length) return;

    const nearTargets = eligibleTargets.filter(({ element }) => isNearViewport(element));
    const candidates = nearTargets.length ? nearTargets : eligibleTargets;
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const targetActive = activeTranslationsFor(target.element);
    const slots = Math.min(
      TRANSLATION_FLASHES_PER_TARGET - targetActive.length,
      TRANSLATION_FLASH_CONCURRENCY - activeTranslationFlashes.size
    );
    let started = 0;

    while (started < slots) {
      const active = activeTranslationsFor(target.element);
      const available = target.occurrences
        .filter((occurrence) => !activeTranslationFlashes.has(occurrence.id))
        .map((occurrence) => ({
          occurrence,
          variants: occurrence.variants.filter((variant) => (
            active.every((flash) => !rangesOverlap(variant, flash.variant))
          ))
        }))
        .filter(({ variants }) => variants.length > 0);
      if (!available.length) break;

      const selected = available[Math.floor(Math.random() * available.length)];
      const variant =
        selected.variants[Math.floor(Math.random() * selected.variants.length)];
      const timer = window.setTimeout(() => {
        const flash = activeTranslationFlashes.get(selected.occurrence.id);
        if (!flash || flash.timer !== timer) return;
        activeTranslationFlashes.delete(selected.occurrence.id);
        if (target.element.isConnected) renderTarget(target.element);
      }, TRANSLATION_FLASH_HOLD_MS);

      activeTranslationFlashes.set(selected.occurrence.id, {
        occurrence: selected.occurrence,
        variant,
        element: target.element,
        timer
      });
      started += 1;
    }

    if (started > 0) renderTarget(target.element);
  }

  function setHeat(nextHeat: number) {
    activeHeat = Math.max(0, Math.min(8, Math.round(nextHeat)));
    reconcileCorruptionTargets();
    if (activeHeat === TRANSLATION_HEAT) startPatchTextureWarmup();
    if (activeHeat < TRANSLATION_HEAT) clearTranslationFlashes(false);
    if (siteHeader) {
      const headerHeat = activeHeat >= 6 ? 2 : activeHeat >= 5 ? 1 : 0;
      if (headerHeat) siteHeader.dataset.secedeCorruption = String(headerHeat);
      else delete siteHeader.dataset.secedeCorruption;
    }
    if (activeHeat < DATE_YEAR_HEAT) {
      dateTargets.forEach((date) => dateYearStates.delete(date));
    }
    if (activeHeat < 8) releaseAdriftWords();
    renderAllTargets();
    relocatePageField();

    if (heatViewportSettleTimer) window.clearTimeout(heatViewportSettleTimer);
    if (activeHeat >= 6) {
      heatViewportSettleTimer = window.setTimeout(() => {
        heatViewportSettleTimer = 0;
        reconcileCorruptionTargets();
        activeCorruptionTargets.forEach((element) => {
          if (
            element.matches('[data-prose]') &&
            !element.querySelector('.secede-data-patches')
          ) {
            addPatches(element);
          }
        });
        if (activeHeat >= 8) driftWords();
      }, 500);
    }
  }

  function getDateYearState(element: HTMLElement, originalDate: string) {
    let state = dateYearStates.get(element);
    if (state?.originalDate === originalDate) return state;

    const match = originalDate.match(/^([A-Za-z]+)\s+((?:19|20)\d{2})$/u);
    const originalMonth = match?.[1] ?? '';
    const originalYear = match?.[2] ?? '';
    const monthIndex = MONTH_NAMES.indexOf(originalMonth as typeof MONTH_NAMES[number]);
    const year = Number(originalYear);
    const wrongMonths: string[] = [];
    if (monthIndex >= 0) {
      for (let offset = -DATE_MONTH_RANGE; offset <= DATE_MONTH_RANGE; offset += 1) {
        if (offset === 0) continue;
        const wrappedIndex = (monthIndex + offset + MONTH_NAMES.length) % MONTH_NAMES.length;
        wrongMonths.push(MONTH_NAMES[wrappedIndex]);
      }
    }
    const wrongYears: string[] = [];
    for (let offset = -DATE_YEAR_RANGE; offset <= DATE_YEAR_RANGE; offset += 1) {
      if (offset !== 0) wrongYears.push(String(year + offset));
    }

    state = {
      originalDate,
      originalMonth,
      originalYear,
      wrongMonths: shuffle(wrongMonths),
      wrongYears: shuffle(wrongYears),
      wrongMonthIndex: 0,
      wrongIndex: 0,
      displayedMonth: originalMonth,
      displayedYear: originalYear,
      showingWrong: false,
      nextChangeAt: performance.now() + randomBetween(140, 560)
    };
    dateYearStates.set(element, state);
    return state;
  }

  function updateDateWords(element: HTMLElement) {
    renderTarget(element);
    element
      .querySelectorAll<HTMLElement>('[data-date-month], [data-date-year]')
      .forEach((word) => {
        word.classList.add('is-date-shift');
      });
  }

  function runDateYearFlash() {
    if (activeHeat < DATE_YEAR_HEAT) return;
    const now = performance.now();

    dateTargets.forEach((date) => {
      if (isProtectedByChatLock(date)) {
        dateYearStates.delete(date);
        return;
      }
      const original = date.dataset.original ?? '';
      const state = getDateYearState(date, original);
      if (!state.originalMonth || !state.originalYear || !state.wrongMonths.length) return;
      if (now < state.nextChangeAt) return;

      if (state.showingWrong) {
        state.displayedMonth = state.originalMonth;
        state.displayedYear = state.originalYear;
        state.showingWrong = false;
        state.nextChangeAt = now + randomBetween(480, 1180);
      } else {
        state.displayedMonth = state.wrongMonths[state.wrongMonthIndex];
        state.displayedYear = state.wrongYears[state.wrongIndex];
        state.wrongMonthIndex += 1;
        state.wrongIndex += 1;
        if (state.wrongMonthIndex >= state.wrongMonths.length) {
          state.wrongMonths = shuffle(state.wrongMonths);
          state.wrongMonthIndex = 0;
        }
        if (state.wrongIndex >= state.wrongYears.length) {
          state.wrongYears = shuffle(state.wrongYears);
          state.wrongIndex = 0;
        }
        state.showingWrong = true;
        state.nextChangeAt = now + randomBetween(190, 430);
      }

      if (activeCorruptionTargets.has(date)) updateDateWords(date);
    });
  }

  /*
   * Heat 2: a fresh five words per paragraph lose focus for a beat and return.
   * Per paragraph rather than page-wide — the previous level's population was
   * counted across the whole document, which meant three or four events spread
   * over the entire unlocked page and read as nothing at all.
   *
   * Each of the five starts somewhere inside the stagger window so they never
   * go soft in unison, and the whole batch is re-chosen every cycle, so a
   * reader holding on one paragraph watches different words dissolve each time.
   */
  function runWordBlur() {
    if (activeHeat < 2) return;
    activeCorruptionTargets
      .forEach((paragraph) => {
        if (
          !paragraph.matches('[data-prose]') ||
          paragraph.dataset.unlocked !== 'true'
        ) {
          return;
        }
        const words = Array.from(
          paragraph.querySelectorAll<HTMLElement>('.secede-word:not(.is-blurring)')
        );
        if (!words.length) return;

        shuffle(words)
          .slice(0, BLUR_WORDS_PER_PARAGRAPH)
          .forEach((word) => {
            const offset = Math.random() * BLUR_STAGGER_MS;
            window.setTimeout(() => {
              if (!word.isConnected || activeHeat < 2) return;
              word.classList.add('is-blurring');
              window.setTimeout(() => {
                if (!word.isConnected) return;
                word.classList.remove('is-blurring');
              }, BLUR_HOLD_MS);
            }, offset);
          });
      });
  }

  /*
   * Heat 3: flash a few of the every-fifth-word targets to a name and let them
   * fall back. Population-topped like the character mutator — hold a small
   * number visible at once and refill as they expire — so the names flicker in
   * and out across the page rather than all flashing together.
   */
  function runNameFlash() {
    if (activeHeat < NAME_FLASH_HEAT) return;
    let active = 0;
    const targets: HTMLElement[] = [];
    proseTargets.forEach((paragraph) => {
      if (paragraph.dataset.unlocked !== 'true') return;
      active += paragraph.querySelectorAll('.secede-word.is-flashing').length;
      targets.push(
        ...paragraph.querySelectorAll<HTMLElement>(
          '.secede-word.is-name-flash:not(.is-flashing)'
        )
      );
    });
    const want = NAME_FLASH_CONCURRENCY - active;
    if (want <= 0) return;

    shuffle(targets)
      .slice(0, want)
      .forEach((word) => {
        const order = Math.floor((Number(word.dataset.wordIndex) + 1) / NAME_FLASH_STRIDE);
        const name = order % 2 === 0 ? 'Ray' : 'Eveline';
        word.dataset.flashReturn = word.innerHTML;
        word.classList.add('is-flashing');
        word.textContent = name;
        window.setTimeout(() => {
          if (!word.isConnected) return;
          if (word.dataset.flashReturn !== undefined) {
            word.innerHTML = word.dataset.flashReturn;
            delete word.dataset.flashReturn;
          }
          word.classList.remove('is-flashing');
        }, NAME_FLASH_HOLD_MS);
      });
  }

  function reselectBlinkWords() {
    if (activeHeat < 1) return;
    proseTargets.forEach((paragraph) => {
      if (paragraph.dataset.unlocked !== 'true') return;
      const original = paragraph.dataset.original ?? '';
      const count = wordRanges(paragraph, original).length;
      blinkSelections.set(paragraph, chooseRandomIndexes(BLINK_WORDS_PER_PARAGRAPH, count));
      if (activeCorruptionTargets.has(paragraph)) renderTarget(paragraph);
    });
  }

  function redistributeUnicode() {
    if (activeHeat < 7) return;
    activeCorruptionTargets.forEach((element) => {
      if (
        element.matches('[data-corrupt-meta]') ||
        (element.matches('[data-prose]') && element.dataset.unlocked === 'true')
      ) {
        element
          .querySelectorAll<HTMLElement>(
            '.secede-word:not(.secede-translation-flash)'
          )
          .forEach((word) => {
            const source = wordDisplaySources.get(word);
            if (source === undefined) return;
            if (word.classList.contains('is-flashing')) {
              word.classList.remove('is-flashing');
              delete word.dataset.flashReturn;
            }
            const corrupted = [...source].map(brokenCharacter).join('');
            word.replaceChildren();
            appendWithFinalStop(
              word,
              corrupted,
              element,
              wordsEndingOriginal.has(word)
            );
          });
        if (element.matches('[data-prose]')) refreshParagraphPatches(element);
      }
    });
  }

  function driftWord(word: HTMLElement) {
    /* A word that has lost its tether is no longer station-keeping. */
    if (word.classList.contains('is-adrift')) return;
    const x = -7 + Math.random() * 14;
    const y = -4 + Math.random() * 8;
    word.dataset.driftX = x.toFixed(2);
    word.dataset.driftY = y.toFixed(2);
    word.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
  }

  function syncMotionWords(element: HTMLElement, randomize: boolean) {
    if (!activeCorruptionTargets.has(element)) return;
    const margin = window.innerHeight * MOTION_WORD_VIEWPORT_MARGIN;
    const words = Array.from(
      element.querySelectorAll<HTMLElement>('.secede-word')
    );
    /* Read every box before changing any styles, avoiding a read/write layout
       ping-pong through a long paragraph. */
    const nearby = words.map((word) => {
      const bounds = word.getBoundingClientRect();
      return bounds.bottom >= -margin && bounds.top <= window.innerHeight + margin;
    });
    words.forEach((word, index) => {
      setMotionWordActive(word, nearby[index], randomize);
    });
  }

  function driftWords(scope?: HTMLElement) {
    if (activeHeat < 8) return;
    if (scope) {
      syncMotionWords(scope, true);
      return;
    }
    activeCorruptionTargets.forEach((element) => syncMotionWords(element, true));
  }

  /*
   * At heat 8 the tether does not hold for everything. Two or three words in
   * each paragraph come loose altogether and sail off in one direction, turning
   * slowly, until they are out of sight. Nothing is deleted — the word stays in
   * the document and is only carried away — so when the reader repairs the
   * reconstruction and heat drops, releaseAdriftWords brings every one of them
   * back to its place.
   */
  /*
   * Which words in a paragraph have come loose, by word index, and when each
   * one let go. Keying on the index rather than the element matters: the lower
   * corruption layers rebuild a paragraph's spans every second or two, so a
   * departing word is destroyed and recreated many times over the course of its
   * own journey. Recording the selection here lets renderTarget put it straight
   * back on its way — see applyAdrift for how it resumes mid-flight.
   */
  function applyAdrift(word: HTMLElement, drift: AdriftWord) {
    word.style.setProperty('--adrift-x', `${drift.x.toFixed(1)}px`);
    word.style.setProperty('--adrift-y', `${drift.y.toFixed(1)}px`);
    word.style.setProperty('--adrift-spin', `${drift.spin.toFixed(0)}deg`);
    /* A negative delay starts the animation already part-way through, so a word
       recreated under a re-render picks its trajectory up where it left off
       instead of leaping back to the margin and setting out again. */
    const elapsed = (performance.now() - drift.since) / 1000;
    word.style.animationDelay = `${(-elapsed).toFixed(2)}s`;
    /* The station-keeping transform would otherwise sit under the animation. */
    word.style.transform = '';
    word.classList.add('is-adrift');
  }

  function setWordsAdrift() {
    if (activeHeat < 8) return;
    proseTargets
      .forEach((paragraph) => {
        if (paragraph.dataset.unlocked !== 'true') return;
        let selection = adriftSelections.get(paragraph);
        if (!selection) {
          selection = new Map<number, AdriftWord>();
          adriftSelections.set(paragraph, selection);
        }

        const anchored = Array.from(
          paragraph.querySelectorAll<HTMLElement>('.secede-word')
        ).filter((word) => !selection.has(Number(word.dataset.wordIndex)));
        /* Leave a paragraph alone once it has given up enough of itself. */
        if (anchored.length < 14) return;

        const count = 2 + Math.floor(Math.random() * 2);
        shuffle(anchored)
          .slice(0, count)
          .forEach((word) => {
            const angle = Math.random() * Math.PI * 2;
            const distance = 340 + Math.random() * 260;
            const drift: AdriftWord = {
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              spin: -200 + Math.random() * 400,
              since: performance.now()
            };
            selection.set(Number(word.dataset.wordIndex), drift);
            if (motionWords.has(word)) applyAdrift(word, drift);
          });
      });
  }

  function releaseAdriftWords() {
    proseTargets.forEach((paragraph) => adriftSelections.delete(paragraph));
    root.querySelectorAll<HTMLElement>('.secede-word.is-adrift').forEach((word) => {
      word.classList.remove('is-adrift');
      word.style.removeProperty('animation-delay');
      word.style.removeProperty('--adrift-x');
      word.style.removeProperty('--adrift-y');
      word.style.removeProperty('--adrift-spin');
    });
  }

  root.addEventListener('pointermove', (event) => {
    if (activeHeat < 8) return;
    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('.secede-word.is-motion-active')
        : null;
    if (!target) return;

    const baseX = Number(target.dataset.driftX ?? 0);
    const baseY = Number(target.dataset.driftY ?? 0);
    const movementX = Math.max(-6, Math.min(6, event.movementX * 0.8));
    const movementY = Math.max(-6, Math.min(6, event.movementY * 0.8));
    const knockedX = Math.max(-14, Math.min(14, baseX + movementX));
    const knockedY = Math.max(-10, Math.min(10, baseY + movementY));
    target.classList.add('is-knocked');
    target.style.transform = `translate(${knockedX}px, ${knockedY}px)`;

    const priorTimer = driftReturnTimers.get(target);
    if (priorTimer) window.clearTimeout(priorTimer);
    const timer = window.setTimeout(() => {
      if (!target.isConnected) return;
      target.classList.remove('is-knocked');
      target.style.transform = `translate(${baseX}px, ${baseY}px)`;
    }, 260);
    driftReturnTimers.set(target, timer);
  });

  window.setInterval(runWordBlur, BLUR_BATCH_MS);
  window.setInterval(runDateYearFlash, DATE_YEAR_POLL_MS);
  window.setInterval(runNameFlash, 900);
  window.setInterval(runTranslationFlash, TRANSLATION_FLASH_POLL_MS);
  window.setInterval(reselectBlinkWords, 10500);
  window.setInterval(() => {
    activeCorruptionTargets.forEach((element) => {
      if (element.matches('[data-prose]')) relocatePatches(element);
    });
    relocatePageField();
  }, 2600);
  window.setInterval(redistributeUnicode, 2850);
  window.setInterval(driftWords, 1900);
  window.setInterval(setWordsAdrift, 5200);

  window.addEventListener('secede:preview-heat', (event) => {
    const requested = Number((event as CustomEvent).detail);
    previewHeat = Number.isFinite(requested) ? Math.max(0, Math.min(8, requested)) : null;
    setHeat(previewHeat ?? authoredHeat);
  });

  renderAllTargets();
  unlockChat(0);
}
