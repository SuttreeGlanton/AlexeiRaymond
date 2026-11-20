/** Optional author recordings. One media element per control, one active recording per page. */
export function initReadingAudio() {
  let stopActive: (() => void) | undefined;
  document.querySelectorAll<HTMLElement>('[data-reading-audio]').forEach((root) => {
    if (root.dataset.readingReady) return;
    const audioElement = root.querySelector<HTMLAudioElement>('[data-reading-media]');
    const toggleElement = root.querySelector<HTMLButtonElement>('[data-reading-toggle]');
    const seek = root.querySelector<HTMLInputElement>('[data-reading-seek]');
    const controls = root.querySelector<HTMLElement>('[data-reading-controls]');
    const fallback = root.querySelector<HTMLAnchorElement>('[data-reading-fallback]');
    const labelElement = root.querySelector<HTMLElement>('[data-reading-label]');
    const statusElement = root.querySelector<HTMLElement>('[data-reading-status]');
    if (!audioElement || !toggleElement || !controls || !fallback || !labelElement || !statusElement || !audioElement.dataset.src) return;
    const audio = audioElement, toggle = toggleElement, label = labelElement, status = statusElement;

    type State = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';
    let state: State = 'idle';
    let wantsPlay = false;
    let attempt = 0;
    let scrubbing = false;
    let lastClick = -Infinity;
    const description = `${root.dataset.readingKind === 'excerpt' ? 'excerpt from' : 'reading of'} ${root.dataset.readingTitle || 'this piece'}`;
    const duration = () => Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    const spokenTime = (value: number) => `${Math.floor(value / 60)} minutes ${Math.floor(value % 60)} seconds`;

    function setState(next: State) {
      state = next;
      root.dataset.state = next;
      toggle.setAttribute('aria-pressed', String(next === 'playing'));
      toggle.setAttribute('aria-busy', String(next === 'loading'));
      toggle.setAttribute('aria-label', next === 'loading' ? `Cancel loading ${description}`
        : next === 'playing' ? `Pause ${description}`
        : next === 'error' ? `Retry ${description}` : `Play ${description}`);
      label.textContent = next === 'loading' ? 'Loading…' : next === 'playing' ? 'Pause' : 'Listen';
      const message = next === 'error' ? 'The recording could not play. Try again.' : '';
      if (status.textContent !== message) status.textContent = message;
      status.hidden = !message;
    }

    function paintPosition(value: number) {
      if (!seek) return;
      const length = duration();
      const position = Math.max(0, Math.min(length, value));
      seek.value = String(position);
      seek.style.setProperty('--reading-progress', `${length ? position / length * 100 : 0}%`);
      seek.setAttribute('aria-valuetext', `${spokenTime(position)} of ${spokenTime(length)}`);
    }

    function updatePosition() {
      if (!seek) return;
      seek.disabled = !duration() || state === 'error';
      seek.max = String(duration() || 1);
      if (!scrubbing) paintPosition(audio.currentTime || 0);
    }

    function pause() {
      wantsPlay = false;
      attempt += 1;
      audio.pause();
      if (stopActive === pause) stopActive = undefined;
      setState(audio.ended ? 'ended' : 'paused');
    }

    function fail() {
      pause();
      setState('error');
      updatePosition();
    }

    async function play() {
      const retry = state === 'error';
      const currentAttempt = ++attempt;
      if (stopActive && stopActive !== pause) stopActive();
      stopActive = pause;
      wantsPlay = true;
      setState('loading');
      try {
        // No request, including metadata, until an explicit Play.
        if (!audio.getAttribute('src')) audio.src = audio.dataset.src!;
        if (retry) audio.load();
        if (audio.ended || (duration() && audio.currentTime >= duration())) audio.currentTime = 0;
        await audio.play();
        if (currentAttempt !== attempt) return;
        if (!wantsPlay) audio.pause();
      } catch {
        if (currentAttempt === attempt && wantsPlay) fail();
      }
    }

    function setPosition(value: number) {
      if (!seek || seek.disabled || !duration()) return;
      const position = Math.max(0, Math.min(duration(), value));
      try {
        audio.currentTime = position;
        paintPosition(position);
        if (state === 'ended') setState('paused');
      } catch {
        scrubbing = false;
        updatePosition();
      }
    }

    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      // Ignore the second half of a double-click and accidental rapid taps.
      const now = performance.now();
      if (event.detail > 1 || now - lastClick < 300) return;
      lastClick = now;
      if (wantsPlay) pause(); else void play();
    });
    audio.addEventListener('playing', () => {
      if (!wantsPlay) { audio.pause(); return; }
      setState('playing');
      updatePosition();
    });
    audio.addEventListener('waiting', () => { if (wantsPlay) setState('loading'); });
    audio.addEventListener('pause', () => {
      // A queued pause event must not cancel a newer Play.
      if (!audio.paused || state === 'error') return;
      wantsPlay = false;
      attempt += 1;
      if (stopActive === pause) stopActive = undefined;
      setState(audio.ended ? 'ended' : 'paused');
      updatePosition();
    });
    audio.addEventListener('ended', () => {
      wantsPlay = false;
      attempt += 1;
      if (stopActive === pause) stopActive = undefined;
      setState('ended');
      updatePosition();
    });
    audio.addEventListener('error', fail);
    for (const event of ['loadedmetadata', 'durationchange', 'timeupdate', 'seeked']) audio.addEventListener(event, updatePosition);
    if (seek) {
      seek.addEventListener('pointerdown', () => { scrubbing = true; });
      const endScrub = () => { scrubbing = false; updatePosition(); };
      window.addEventListener('pointerup', endScrub);
      window.addEventListener('pointercancel', endScrub);
      seek.addEventListener('blur', endScrub);
      seek.addEventListener('input', () => setPosition(Number(seek.value)));
      seek.addEventListener('change', endScrub);
      seek.addEventListener('keydown', (event) => {
        if (seek.disabled) return;
        const current = Number(seek.value);
        const targets: Record<string, number> = {
          ArrowLeft: current - 5, ArrowDown: current - 5, ArrowRight: current + 5, ArrowUp: current + 5,
          Home: 0, End: duration(), PageDown: current - duration() / 10, PageUp: current + duration() / 10,
        };
        if (!(event.key in targets)) return;
        event.preventDefault();
        setPosition(targets[event.key]);
      });
    }
    const updateVisibility = () => root.toggleAttribute('data-document-hidden', document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    window.addEventListener('pagehide', pause);
    root.dataset.readingReady = 'true';
    setState('idle');
    updatePosition();
    updateVisibility();
    fallback.hidden = true;
    controls.hidden = false;
  });
}
