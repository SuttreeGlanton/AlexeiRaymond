// Star-Crossed: the page stays complete prose if this enhancement cannot load.
const story = document.querySelector('[data-sc-story] .archive-prose');
const data = document.querySelector('[data-sc-variants]');
const announcement = document.querySelector('[data-sc-status]');

if (story && data && announcement) {
  let variants;
  try { variants = JSON.parse(data.textContent || '{}'); } catch { variants = {}; }

  // Descriptive words share a slow beat. Colours each have their own cadence.
  const BEAT = 8000;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ambient = new Map();
  let paused = motion.matches;
  let nextTextAt = performance.now() + BEAT;
  let timer = 0;
  let suspended = false;
  let count = 0;
  let colorCount = 0;

  function renderText(target, option) {
    const nodes = [];
    let cursor = 0;
    for (const [start, end] of option.emphasis || []) {
      nodes.push(document.createTextNode(option.text.slice(cursor, start)));
      const em = document.createElement('em');
      em.textContent = option.text.slice(start, end);
      nodes.push(em);
      cursor = end;
    }
    nodes.push(document.createTextNode(option.text.slice(cursor)));
    target.replaceChildren(...nodes);
  }

  function show(state) {
    const option = state.options[state.index];
    // In the hue-only fragment, keep the same text nodes and accessible name.
    if (state.text.textContent !== option.text) renderText(state.text, option);
    if (option.color) state.ink.style.setProperty('--sc-color', option.color);
    else state.ink.style.removeProperty('--sc-color');
    if (state.button.getAttribute('aria-label') !== option.text) state.button.setAttribute('aria-label', option.text);
    state.label.dataset.scIndex = String(state.index);
  }

  function eligible(state) {
    return state.visible && (state.mode === 'color' || !state.hovered) &&
      !state.label.contains(document.activeElement);
  }

  function cancelChange(state) {
    window.clearTimeout(state.swapTimer);
    state.swapTimer = 0;
    state.label.classList.remove('is-changing');
  }

  function advance(state, automatic = false) {
    cancelChange(state);
    const commit = () => {
      state.swapTimer = 0;
      state.label.classList.remove('is-changing');
      if (automatic && (paused || suspended || document.hidden || !eligible(state))) return;
      state.index = (state.index + 1) % state.options.length;
      show(state);
    };
    if (automatic && state.mode !== 'color' && !motion.matches) {
      state.label.classList.add('is-changing');
      state.swapTimer = window.setTimeout(commit, 200);
    } else commit();
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = 0;
    if (paused || suspended || document.hidden) {
      for (const state of ambient.values()) cancelChange(state);
      return;
    }
    let due = Infinity;
    for (const state of ambient.values()) {
      if (eligible(state)) due = Math.min(due, state.mode === 'color' ? state.due : Math.max(nextTextAt, state.due));
    }
    if (Number.isFinite(due)) timer = window.setTimeout(tick, Math.max(0, due - performance.now()));
  }

  function tick() {
    const now = performance.now();
    let candidate = null;
    for (const state of ambient.values()) {
      if (!eligible(state) || state.due > now + 8) continue;
      if (state.mode === 'color') {
        state.due = now + state.period;
        advance(state, true);
      } else if (!candidate || state.due < candidate.due) candidate = state;
    }
    if (candidate && now + 8 >= nextTextAt) {
      candidate.due = now + BEAT;
      nextTextAt = now + BEAT;
      advance(candidate, true);
    }
    schedule();
  }

  function resetTiming() {
    const now = performance.now();
    nextTextAt = now + BEAT;
    for (const state of ambient.values()) state.due = now + state.delay;
    schedule();
  }

  // No live announcements for ambient changes. The status speaks only when
  // the reader explicitly chooses an alternative.
  for (const original of story.querySelectorAll('[data-sc]')) {
    const definition = variants[original.dataset.sc];
    if (!definition || definition.options?.length < 2) continue;
    const { mode, options } = definition;
    if (!['click', 'ambient', 'color'].includes(mode) ||
        !options.every(option => typeof option.text === 'string') ||
        original.textContent !== options[0].text) continue;

    const label = document.createElement('label');
    label.className = `sc-fragment${mode !== 'click' ? ' sc-ambient' : ''}${mode === 'color' ? ' sc-color' : ''}`;
    label.dataset.sc = original.dataset.sc;
    label.dataset.scMode = mode;
    const ink = document.createElement('span');
    ink.className = 'sc-ink';
    ink.setAttribute('aria-hidden', 'true');
    let text = ink;
    if (mode === 'color') {
      // These short item phrases reserve the largest alternative's width.
      // Faster colour changes therefore cannot repeatedly reflow a paragraph.
      text = document.createElement('span');
      text.className = 'sc-choice';
      ink.append(text);
      for (const wording of new Set(options.map(option => option.text))) {
        const measure = document.createElement('span');
        measure.className = 'sc-measure';
        measure.textContent = wording;
        ink.append(measure);
      }
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sc-trigger';
    button.setAttribute('aria-describedby', 'sc-help');
    const state = {
      label, ink, text, button, options, mode, index: 0, visible: false, hovered: false,
      period: mode === 'color' ? 3400 + (colorCount * 730) % 1900 : BEAT,
      delay: mode === 'color' ? 900 + colorCount * 290 : BEAT + (ambient.size % 7) * 140,
      due: 0, swapTimer: 0, feedbackTimer: 0
    };
    if (mode === 'color') colorCount++;

    if (mode !== 'click') {
      ambient.set(label, state);
      label.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'mouse') return;
        state.hovered = true;
        schedule();
      });
      label.addEventListener('pointerleave', () => {
        state.hovered = false;
        if (mode !== 'color') state.due = performance.now() + BEAT;
        schedule();
      });
      button.addEventListener('focus', schedule);
      button.addEventListener('blur', () => {
        state.due = performance.now() + state.period;
        schedule();
      });
    }

    button.addEventListener('click', event => {
      advance(state);
      if (mode === 'click') {
        window.clearTimeout(state.feedbackTimer);
        label.classList.add('is-clicked');
        state.feedbackTimer = window.setTimeout(() => label.classList.remove('is-clicked'), 140);
      }
      announcement.textContent = options[state.index].text;
      if (event.detail > 0) button.blur();
      state.due = performance.now() + (mode === 'color' ? state.period : BEAT * 2);
      if (mode !== 'color') nextTextAt = performance.now() + BEAT;
      schedule();
    });
    label.append(ink, button);
    show(state);
    original.replaceWith(label);
    count++;
  }

  if (count) {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        const now = performance.now();
        for (const entry of entries) {
          const state = ambient.get(entry.target);
          state.visible = entry.isIntersecting;
          state.due = now + state.delay;
        }
        schedule();
      }, { rootMargin: '-96px 0px -32px 0px', threshold: 0 });
      for (const label of ambient.keys()) observer.observe(label);
    } else {
      // Retain every manual switch in browsers without visibility observers.
      paused = true;
    }
    motion.addEventListener('change', event => {
      paused = event.matches || !('IntersectionObserver' in window);
      resetTiming();
    });
    document.addEventListener('visibilitychange', resetTiming);
    // Rapid repeat clicks should only cycle a fragment, never select prose.
    story.addEventListener('selectstart', event => event.preventDefault());
    window.addEventListener('pagehide', () => {
      suspended = true;
      schedule();
    });
    window.addEventListener('pageshow', () => {
      suspended = false;
      resetTiming();
    });
  }
}
