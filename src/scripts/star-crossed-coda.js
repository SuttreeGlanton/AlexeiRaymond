// Star-Crossed: the page stays complete prose if this enhancement cannot load.
const story = document.querySelector('[data-sc-story] .archive-prose');
const data = document.querySelector('[data-sc-variants]');
const tools = document.querySelector('[data-sc-tools]');

if (story && data && tools) {
  let variants;
  try { variants = JSON.parse(data.textContent || '{}'); } catch { variants = {}; }

  const BEAT = 2600;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const control = tools.querySelector('[data-sc-motion]');
  const controlLabel = tools.querySelector('[data-sc-motion-label]');
  const status = tools.querySelector('[data-sc-status]');
  const ambient = new Map();
  let paused = motion.matches;
  let timer = 0;
  let suspended = false;
  let selecting = false;
  let count = 0;

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
    renderText(state.ink, option);
    if (option.color) state.ink.style.setProperty('--sc-color', option.color);
    else state.ink.style.removeProperty('--sc-color');
    state.button.setAttribute('aria-label', option.text);
    state.label.dataset.scIndex = String(state.index);
  }

  function eligible(state) {
    return state.visible && !state.hovered && !state.label.contains(document.activeElement);
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
      if (automatic && (paused || suspended || selecting || document.hidden || !eligible(state))) return;
      state.index = (state.index + 1) % state.options.length;
      show(state);
    };
    if (automatic && !motion.matches) {
      state.label.classList.add('is-changing');
      state.swapTimer = window.setTimeout(commit, 160);
    } else commit();
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = 0;
    if (paused || suspended || selecting || document.hidden) {
      for (const state of ambient.values()) cancelChange(state);
      return;
    }
    let due = Infinity;
    for (const state of ambient.values()) {
      if (eligible(state)) due = Math.min(due, state.due);
    }
    if (Number.isFinite(due)) timer = window.setTimeout(tick, Math.max(0, due - performance.now()));
  }

  function tick() {
    const now = performance.now();
    for (const state of ambient.values()) {
      if (!eligible(state) || state.due > now + 8) continue;
      state.due = now + BEAT;
      advance(state, true);
    }
    schedule();
  }

  function resetTiming() {
    const now = performance.now();
    for (const state of ambient.values()) state.due = now + BEAT + state.phase;
    schedule();
  }

  function updateControl() {
    control.toggleAttribute('data-paused', paused);
    control.setAttribute('aria-label', paused ? 'Resume automatic text changes' : 'Pause automatic text changes');
    controlLabel.textContent = paused ? 'Resume' : 'Pause';
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
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sc-trigger';
    button.setAttribute('aria-describedby', 'sc-help');
    const state = {
      label, ink, button, options, index: 0, visible: false, hovered: false,
      phase: (ambient.size % 7) * 140, due: 0, swapTimer: 0
    };

    if (mode !== 'click') {
      ambient.set(label, state);
      label.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'mouse') return;
        state.hovered = true;
        schedule();
      });
      label.addEventListener('pointerleave', () => {
        state.hovered = false;
        state.due = performance.now() + BEAT;
        schedule();
      });
      button.addEventListener('focus', schedule);
      button.addEventListener('blur', () => {
        state.due = performance.now() + BEAT * 2;
        schedule();
      });
    }

    button.addEventListener('click', event => {
      // Selecting/copying a sentence should not also replace it.
      const selection = window.getSelection();
      if (event.detail > 0 && selection && !selection.isCollapsed) return;
      advance(state);
      status.textContent = options[state.index].text;
      if (event.detail > 0) button.blur();
      state.due = performance.now() + BEAT * 2;
      schedule();
    });
    label.append(ink, button);
    show(state);
    original.replaceWith(label);
    count++;
  }

  if (count) {
    tools.hidden = false;
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        const now = performance.now();
        for (const entry of entries) {
          const state = ambient.get(entry.target);
          state.visible = entry.isIntersecting;
          state.due = now + BEAT + state.phase;
        }
        schedule();
      }, { rootMargin: '-96px 0px -32px 0px', threshold: 0 });
      for (const label of ambient.keys()) observer.observe(label);
    } else {
      // Retain every manual switch in browsers without visibility observers.
      paused = true;
      control.hidden = true;
    }
    control.addEventListener('click', () => {
      paused = !paused;
      updateControl();
      resetTiming();
    });
    motion.addEventListener('change', event => {
      if (event.matches) paused = true;
      updateControl();
      resetTiming();
    });
    document.addEventListener('visibilitychange', resetTiming);
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection();
      selecting = !!selection && !selection.isCollapsed &&
        (story.contains(selection.anchorNode) || story.contains(selection.focusNode));
      resetTiming();
    });
    window.addEventListener('pagehide', () => {
      suspended = true;
      schedule();
    });
    window.addEventListener('pageshow', () => {
      suspended = false;
      resetTiming();
    });
    updateControl();
  }
}
