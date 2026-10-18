// The original story is the static HTML. Every commitment is confined to
// this page visit; reloading restores it without any storage or cookies.
(() => {
  const story = document.querySelector('[data-mm-story]');
  if (!story || story.dataset.mmInitialized) return;
  const prose = story.querySelector('.archive-prose');
  const title = story.querySelector('#account-title');
  const opening = story.querySelector('[data-mm-opening]');
  const deletion = story.querySelector('[data-mm-delete]');
  const rewrite = story.querySelector('[data-mm-rewrite]');
  const proposal = story.querySelector('[data-mm-proposal]');
  const scene = story.querySelector('[data-mm-desktop]');
  const pouch = scene?.querySelector('[data-mm-pouch]');
  const water = scene?.querySelector('[data-mm-water]');
  const desktopRing = scene?.querySelector('[data-mm-drop]');
  const headerRing = document.querySelector('[data-mm-header]');
  const headerWater = document.querySelector('[data-mm-header-water]');
  const header = document.querySelector('[data-site-header]');
  const cover = story.querySelector('.archive-cover-card');
  if (!prose || !title || !opening || !deletion || !rewrite || !proposal ||
      !scene || !pouch || !water || !desktopRing || !headerRing || !headerWater || !cover) return;

  // Validate all anchors before changing the readable story.
  if (opening.textContent.trim() !== 'Misremember.' ||
      !deletion.textContent.startsWith('Dream it happened this way.') ||
      !rewrite.textContent.startsWith('No, it really did happen this way,') ||
      proposal.textContent.trim() !== 'Ida, will you…') return;
  let frames;
  try { frames = JSON.parse(scene.dataset.mmFrames); } catch { return; }
  if (!Array.isArray(frames) || frames.length !== 13) return;
  story.dataset.mmInitialized = 'true';

  const desktop = window.matchMedia('(min-width: 861px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const rings = [desktopRing, headerRing];
  const images = rings.map((ring) => ring.querySelector('[data-mm-frame]'));
  // The complete native sequence is about 12 KB. Preload once so a reversal
  // never flashes a missing frame or waits on an image request.
  const preload = frames.map((src) => {
    const image = new Image();
    image.src = src;
    return image;
  });
  const action = (text, name) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mm-action';
    button.textContent = text;
    button.disabled = true;
    button.setAttribute(name, '');
    return button;
  };
  const rememberButton = action('Misremember.', 'data-mm-remember');
  opening.replaceChildren(rememberButton);
  const returnButton = action('will you…', 'data-mm-return');
  // Keep the manuscript's italic final line, including the non-clickable Ida.
  const proposalText = proposal.querySelector('em') || proposal;
  proposalText.replaceChildren(document.createTextNode('Ida, '), returnButton);
  title.tabIndex = -1;
  const status = document.createElement('span');
  status.className = 'mm-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  story.append(status);

  let state = 'reading';
  let frame = -1;
  let progress = 0;
  let ringY = 0;
  let metrics = null;
  let dirty = true;
  let raf = 0;
  let returnTarget = null;
  let waterVisible = false;
  let sequence = null;
  const setState = (next) => { state = next; story.dataset.mmState = next; };
  setState('reading');
  scene.dataset.mmReady = '';
  headerRing.dataset.mmReady = '';

  const measure = () => {
    const scrollY = window.scrollY;
    const viewport = window.innerHeight;
    const maximum = Math.max(0, document.documentElement.scrollHeight - viewport);
    const proposalBottom = proposal.getBoundingClientRect().bottom + scrollY;
    const endScroll = clamp(proposalBottom - viewport * 0.72, 0, maximum);
    const proseTop = prose.getBoundingClientRect().top + scrollY;
    const sceneBox = scene.getBoundingClientRect();
    const size = desktopRing.offsetHeight;
    const pouchHeight = pouch.getBoundingClientRect().height;
    const start = Math.max(0, pouchHeight * 0.76 - size / 2);
    const surface = water.offsetTop;
    const end = Math.max(start, surface - size - 18);
    const sceneTop = sceneBox.top + scrollY;
    const startScroll = desktop.matches
      ? sceneTop + start + size / 2 - viewport * 0.55
      : proseTop - viewport * 0.55;
    metrics = {
      start, end, surface, size, sceneTop,
      startScroll: Math.min(endScroll - 1, Math.max(0, startScroll)),
      endScroll
    };
    scene.style.setProperty('--mm-water-width', sceneBox.width + 'px');
    dirty = false;
  };

  const setFrame = (next) => {
    if (frame === next) return;
    frame = next;
    for (const image of images) image.src = frames[next];
  };

  const checkReturn = () => {
    if (state !== 'returning' || returnTarget === null) return;
    const rect = title.getBoundingClientRect();
    const inset = header?.getBoundingClientRect().height || 0;
    // Arrival is measured against the title and sticky header, never against
    // Misremember. Focusing with preventScroll cannot undo that placement.
    if (Math.abs(window.scrollY - returnTarget) < 3 &&
        rect.top >= inset + 6 && rect.bottom < window.innerHeight) {
      setState('remember-ready');
      returnButton.disabled = true;
      rememberButton.disabled = false;
      title.focus({ preventScroll: true });
      if (!reduced.matches) title.classList.add('mm-title-gold');
    }
  };

  const clearTitleFlash = (event) => {
    if (event.animationName === 'mm-title-gold') title.classList.remove('mm-title-gold');
  };
  title.addEventListener('animationend', clearTitleFlash);
  title.addEventListener('animationcancel', clearTitleFlash);

  const update = () => {
    raf = 0;
    if (dirty) measure();
    if (state === 'reading') {
      progress = clamp((window.scrollY - metrics.startScroll) /
        Math.max(1, metrics.endScroll - metrics.startScroll), 0, 1);
      ringY = metrics.start + (metrics.end - metrics.start) * progress;
      scene.style.setProperty('--mm-ring-y', ringY.toFixed(2) + 'px');
      // Three dimensional turns, using the supplied views. No CSS rotation.
      setFrame(reduced.matches ? 0 : Math.floor(progress * frames.length * 3) % frames.length);
      for (const ring of rings) ring.disabled = progress < 1;
    }
    checkReturn();
  };
  const schedule = () => {
    if (!raf && !document.hidden) raf = window.requestAnimationFrame(update);
  };
  const remeasure = () => { dirty = true; schedule(); };

  const finishDrop = (keyboard) => {
    for (const ring of rings) ring.dataset.mmGone = '';
    headerWater.hidden = false;
    header?.setAttribute('data-mm-water', '');
    syncWater();
    setState('dropped');
    returnButton.disabled = false;
    if (keyboard) returnButton.focus({ preventScroll: true });
  };

  const drop = (event) => {
    if (state !== 'reading' || progress < 1) return;
    setState('dropping');
    rings.forEach((ring) => { ring.disabled = true; });
    const keyboard = event.detail === 0;
    if (reduced.matches) { finishDrop(keyboard); return; }
    const ring = desktop.matches ? desktopRing : headerRing;
    let animation;
    if (desktop.matches) {
      // The river is in front of the ring. The opaque fill hides it as it
      // sinks. No splash, ripple, or early dissolve substitutes for the drop.
      animation = ring.animate([
        { transform: 'translate(-50%, ' + ringY + 'px)' },
        { transform: 'translate(-50%, ' + (metrics.surface + metrics.size) + 'px)' }
      ], { duration: 620, easing: 'cubic-bezier(0.42, 0, 0.8, 0.55)', fill: 'forwards' });
    } else {
      animation = ring.querySelector('img').animate([
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(48px)', opacity: 0 }
      ], { duration: 420, easing: 'ease-in', fill: 'forwards' });
    }
    animation.finished.then(() => finishDrop(keyboard), () => finishDrop(keyboard));
  };

  const returnToTitle = () => {
    if (state !== 'dropped' && state !== 'returning') return;
    setState('returning');
    const inset = header?.getBoundingClientRect().height || 0;
    // On short phones the normal in-flow cover can separate the title and
    // opening by more than one screen. Fit the cover only when necessary,
    // so the return reveals both without moving past the title.
    if (!desktop.matches) {
      const span = opening.getBoundingClientRect().bottom - title.getBoundingClientRect().top;
      const excess = span - (window.innerHeight - inset - 48);
      if (excess > 0) {
        cover.style.maxWidth = Math.max(72, cover.getBoundingClientRect().width - excess * 0.75) + 'px';
        dirty = true;
      }
    }
    returnTarget = Math.max(0, window.scrollY + title.getBoundingClientRect().top - inset - 24);
    window.scrollTo({ top: returnTarget, behavior: reduced.matches ? 'instant' : 'smooth' });
    schedule();
  };

  const abortError = () => new DOMException('Rewrite finished early.', 'AbortError');
  const assertRunning = (run) => { if (run.signal.aborted) throw abortError(); };

  const pause = (ms, run) => new Promise((resolve, reject) => {
    assertRunning(run);
    const cancel = () => { clearTimeout(timer); reject(abortError()); };
    const timer = window.setTimeout(() => {
      run.signal.removeEventListener('abort', cancel);
      resolve();
    }, ms);
    run.signal.addEventListener('abort', cancel, { once: true });
  });

  const animate = async (element, keyframes, duration, run) => {
    assertRunning(run);
    if (reduced.matches || !element.animate) return;
    const animation = element.animate(keyframes, { duration, easing: 'ease-in-out', fill: 'forwards' });
    const cancel = () => animation.cancel();
    run.signal.addEventListener('abort', cancel, { once: true });
    try { await animation.finished; } catch (error) {
      if (!run.signal.aborted) throw error;
    } finally {
      run.signal.removeEventListener('abort', cancel);
      animation.cancel();
    }
    assertRunning(run);
  };

  // Follow only this explicitly requested sequence. A wheel, touch, click,
  // or navigation key gives scrolling back to the reader immediately.
  const scrollForRewrite = async (element, run, force = false) => {
    assertRunning(run);
    if (!run.follow) return;
    const box = element.getBoundingClientRect();
    const inset = (header?.getBoundingClientRect().height || 0) + 24;
    if (!force && box.top >= inset && box.bottom <= window.innerHeight - 40) return;
    const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const target = clamp(window.scrollY + box.top - inset - 24, 0, maximum);
    window.scrollTo({ top: target, behavior: reduced.matches ? 'instant' : 'smooth' });
    if (reduced.matches) return;
    await new Promise((resolve, reject) => {
      let id = 0;
      let settled = 0;
      const started = performance.now();
      const done = () => {
        window.cancelAnimationFrame(id);
        run.signal.removeEventListener('abort', cancel);
        resolve();
      };
      const cancel = () => { window.cancelAnimationFrame(id); reject(abortError()); };
      const check = () => {
        if (!run.follow) { done(); return; }
        settled = Math.abs(window.scrollY - target) < 3 ? settled + 1 : 0;
        if (settled >= 2) { done(); return; }
        if (performance.now() - started > 2200) {
          window.scrollTo({ top: target, behavior: 'instant' });
          done();
          return;
        }
        id = window.requestAnimationFrame(check);
      };
      run.signal.addEventListener('abort', cancel, { once: true });
      id = window.requestAnimationFrame(check);
    });
    assertRunning(run);
  };

  // Measure the browser's actual line breaks once, at the current font and
  // width. Both affected paragraphs are plain text. No guessed character
  // count, fixed desktop line width, or per-scroll text measurement is used.
  const prepareLines = (paragraph, keep = 0) => {
    const text = paragraph.textContent;
    const node = document.createTextNode(text);
    paragraph.replaceChildren(node);
    const range = document.createRange();
    const lines = [];
    for (const match of text.matchAll(/\S+\s*/g)) {
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].trimEnd().length);
      const rect = range.getClientRects()[0];
      if (!rect) continue;
      const last = lines.at(-1);
      if (!last || Math.abs(last.top - rect.top) > 2) {
        lines.push({ top: rect.top, start: match.index, end: match.index + match[0].length });
      } else last.end = match.index + match[0].length;
    }
    if (!lines.length) lines.push({ start: 0, end: text.length });
    const fragments = lines.map(({ start, end }) => {
      const line = document.createElement('span');
      line.className = 'mm-text-line';
      const retained = text.slice(start, Math.min(end, Math.max(start, keep)));
      line.append(document.createTextNode(retained));
      const removed = text.slice(Math.max(start, keep), end);
      let erasure = null;
      if (removed) {
        erasure = document.createElement('span');
        erasure.className = 'mm-erasure';
        erasure.textContent = removed;
        line.append(erasure);
      }
      return { line, erasure, retained: Boolean(retained.trim()) };
    });
    paragraph.classList.add('mm-lines');
    paragraph.replaceChildren(...fragments.map(({ line }) => line));
    return fragments;
  };

  const eraseLines = async (paragraph, keep, run) => {
    const lines = prepareLines(paragraph, keep);
    for (const { line, erasure, retained } of lines) {
      if (!erasure) continue;
      await scrollForRewrite(line, run);
      await animate(erasure, [
        { clipPath: 'inset(0 0 0 0)', opacity: 1 },
        { clipPath: 'inset(0 0 0 100%)', opacity: 0 }
      ], 360, run);
      erasure.style.visibility = 'hidden';
      if (!retained) {
        await animate(line, [{ height: line.getBoundingClientRect().height + 'px' }, { height: '0px' }], 150, run);
        line.style.height = '0px';
      }
      await pause(90, run);
    }
  };

  const finishRewrite = () => {
    const keyboard = sequence?.keyboard;
    sequence?.controller.abort();
    sequence = null;
    setState('rewritten');
    rememberButton.disabled = true;
    rememberButton.textContent = 'Remember.';
    rememberButton.removeAttribute('aria-label');
    deletion.remove();
    rewrite.classList.remove('mm-lines');
    rewrite.textContent = 'Yes, it really did happen this way.';
    story.removeAttribute('data-mm-sequencing');
    prose.removeAttribute('aria-busy');
    status.textContent = 'Remember. The ending has changed: Yes, it really did happen this way.';
    if (keyboard) { rewrite.tabIndex = -1; rewrite.focus({ preventScroll: true }); }
    remeasure();
  };

  const remember = async (event) => {
    if (state !== 'remember-ready') return;
    const controller = new AbortController();
    const run = {
      controller, signal: controller.signal, follow: true, keyboard: event.detail === 0,
      width: prose.getBoundingClientRect().width
    };
    sequence = run;
    setState('remembering');
    rememberButton.disabled = true;
    story.dataset.mmSequencing = '';
    prose.setAttribute('aria-busy', 'true');
    if (reduced.matches || !rememberButton.animate) {
      finishRewrite();
      const inset = (header?.getBoundingClientRect().height || 0) + 48;
      window.scrollTo({ top: Math.max(0, window.scrollY + rewrite.getBoundingClientRect().top - inset), behavior: 'instant' });
      return;
    }
    try {
      // Backspace the prefix, s then i then M. The lower-case r remains
      // visible until the prefix is gone; only then does Remember lock in.
      rememberButton.setAttribute('aria-label', 'Misremember.');
      const letters = [...'Mis'].map((letter) => {
        const span = document.createElement('span');
        span.className = 'mm-prefix-letter';
        span.textContent = letter;
        span.setAttribute('aria-hidden', 'true');
        return span;
      });
      const word = document.createElement('span');
      word.className = 'mm-remember-word';
      word.textContent = 'remember.';
      word.setAttribute('aria-hidden', 'true');
      rememberButton.replaceChildren(...letters, word);
      await pause(180, run);
      for (const letter of letters.reverse()) {
        await animate(letter, [
          { width: letter.getBoundingClientRect().width + 'px', opacity: 1 },
          { width: '0px', opacity: 0 }
        ], 180, run);
        letter.remove();
        await pause(140, run);
      }
      await pause(200, run);
      word.textContent = 'Remember.';
      rememberButton.setAttribute('aria-label', 'Remember.');
      await animate(word, [
        { color: 'var(--text-soft)', textShadow: 'none' },
        { color: 'var(--text)', textShadow: '0 0 12px rgba(242, 236, 220, 0.55)', offset: 0.35 },
        { color: 'var(--text)', textShadow: 'none' }
      ], 440, run);
      await pause(420, run);
      setState('showing-ending');
      await scrollForRewrite(deletion, run, true);
      await pause(700, run); // Let the reader see the unchanged ending first.
      setState('rewriting');
      await eraseLines(deletion, 0, run);
      deletion.remove();
      await pause(320, run);
      await scrollForRewrite(rewrite, run);
      const kept = 'No, it really did happen this way';
      await eraseLines(rewrite, kept.length, run);
      rewrite.classList.remove('mm-lines');
      const denial = document.createElement('span');
      denial.className = 'mm-overwrite';
      denial.textContent = 'No';
      rewrite.replaceChildren(denial, document.createTextNode(', it really did happen this way.'));
      await scrollForRewrite(rewrite, run);
      await pause(320, run);
      await animate(denial, [{ opacity: 1 }, { opacity: 0 }], 220, run);
      denial.textContent = 'Yes';
      await animate(denial, [
        { opacity: 0, clipPath: 'inset(0 100% 0 0)' },
        { opacity: 1, clipPath: 'inset(0 0 0 0)' }
      ], 380, run);
      await pause(360, run);
      finishRewrite();
    } catch (error) {
      // Resizing or selecting reduced motion commits a clean, reflowable
      // ending. Unexpected animation failures also leave readable prose.
      if (error.name !== 'AbortError') finishRewrite();
    }
  };

  const stopFollowing = () => {
    if (!sequence?.follow) return;
    sequence.follow = false;
    window.scrollTo({ top: window.scrollY, behavior: 'instant' });
  };
  for (const type of ['wheel', 'touchstart', 'pointerdown']) {
    window.addEventListener(type, stopFollowing, { passive: true });
  }
  window.addEventListener('keydown', (event) => {
    if (!sequence) return;
    if (event.key === 'Escape') { stopFollowing(); finishRewrite(); }
    else if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) stopFollowing();
  });
  const layoutChanged = () => {
    // Mobile browser bars change viewport height during a scroll. Only a
    // changed text width invalidates the frozen lines, not that height change.
    if (sequence && Math.abs(prose.getBoundingClientRect().width - sequence.width) > 1) finishRewrite();
    remeasure();
    syncWater();
  };

  rings.forEach((ring) => ring.addEventListener('click', drop));
  returnButton.addEventListener('click', returnToTitle);
  rememberButton.addEventListener('click', remember);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('scrollend', schedule);
  window.addEventListener('resize', layoutChanged, { passive: true });
  desktop.addEventListener('change', layoutChanged);
  reduced.addEventListener('change', () => {
    if (sequence && reduced.matches) finishRewrite();
    remeasure();
  });
  if ('ResizeObserver' in window) {
    const resize = new ResizeObserver(layoutChanged);
    resize.observe(prose);
    resize.observe(cover);
    resize.observe(pouch);
  }
  const syncWater = () => {
    scene.toggleAttribute('data-mm-water-visible', waterVisible && !document.hidden);
    headerWater.toggleAttribute('data-mm-water-visible', !headerWater.hidden && !desktop.matches && !document.hidden);
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      waterVisible = entry.isIntersecting;
      syncWater();
    }).observe(water);
  }
  document.addEventListener('visibilitychange', () => { syncWater(); if (!document.hidden) remeasure(); });
  document.fonts?.ready.then(remeasure);
  window.addEventListener('pageshow', remeasure);
  preload.forEach((image) => image.addEventListener('load', schedule, { once: true }));
  update();
})();
