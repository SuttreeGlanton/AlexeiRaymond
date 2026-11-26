import { shufflePassages } from '../lib/commonplace-shuffle.mjs';

function initCommonplace(root: HTMLElement) {
  const entries = Array.from(root.querySelectorAll('template'), template => ({
    author: template.dataset.author!,
    template,
  }));
  const view = root.querySelector<HTMLElement>('.commonplace-view')!;
  const nav = root.querySelector<HTMLElement>('.commonplace-nav')!;
  const previous = root.querySelector<HTMLButtonElement>('[data-previous]')!;
  const next = root.querySelector<HTMLButtonElement>('[data-next]')!;
  const status = root.querySelector<HTMLElement>('[role="status"]')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let round: typeof entries = [];
  let nextIndex = 0;
  const history: { template: HTMLTemplateElement; expanded: boolean }[] = [];
  let cursor = 0;
  let sizeAnimation: Animation | undefined;

  function draw() {
    if (nextIndex === round.length) {
      round = shufflePassages(entries, round);
      nextIndex = 0;
    }
    return { template: round[nextIndex++].template, expanded: false };
  }

  function fitPassage() {
    const { expanded } = history[cursor];
    const figure = view.querySelector('figure')!;
    const quote = figure.querySelector('blockquote')!;
    const toggle = figure.querySelector('button')!;
    figure.removeAttribute('data-folded');
    const lineHeight = parseFloat(getComputedStyle(quote).lineHeight);
    const fullHeight = quote.getBoundingClientRect().height;
    let canFold = quote.querySelector('[data-tail]') !== null &&
      fullHeight > lineHeight * 6 + 1;
    if (canFold) {
      figure.setAttribute('data-folded', '');
      canFold = fullHeight - quote.getBoundingClientRect().height >= lineHeight - 1;
    }
    if (!canFold && document.activeElement === toggle && !nav.hidden) next.focus({ preventScroll: true });
    toggle.hidden = !canFold;
    figure.toggleAttribute('data-folded', canFold && !expanded);
    toggle.setAttribute('aria-expanded', String(!canFold || expanded));
    toggle.setAttribute('aria-label', expanded ? 'Collapse passage' : 'Expand passage');
    toggle.title = toggle.getAttribute('aria-label')!;
  }

  function transition(update: () => void, fade: boolean) {
    const before = view.getBoundingClientRect().height;
    sizeAnimation?.cancel();
    view.style.overflow = '';
    update();
    if (reduced.matches || !view.animate) return;
    const after = view.getBoundingClientRect().height;
    if (Math.abs(before - after) > 1) {
      view.style.overflow = 'clip';
      sizeAnimation = view.animate([{ height: before + 'px' }, { height: after + 'px' }],
        { duration: 220, easing: 'ease' });
      sizeAnimation.onfinish = () => { view.style.overflow = ''; };
    }
    if (fade) view.firstElementChild?.animate([{ opacity: 0 }, { opacity: 1 }],
      { duration: 180, easing: 'ease-out' });
  }

  function showPassage() {
    if (cursor === history.length) history.push(draw());
    view.replaceChildren(history[cursor].template.content.cloneNode(true));
    if (cursor === 0 && document.activeElement === previous) next.focus({ preventScroll: true });
    previous.disabled = cursor === 0;
    view.querySelector('blockquote')!.id = 'commonplace-passage';
    fitPassage();
  }

  nav.hidden = entries.length < 2;
  root.toggleAttribute('data-browsable', !nav.hidden);
  showPassage();
  function move(step: number) {
    if (entries.length < 2 || cursor + step < 0) return;
    cursor += step;
    transition(showPassage, true);
    status.textContent = view.querySelector('blockquote p')!.textContent!.trim().split(/\s+/).slice(0, 8).join(' ')
      + '… ' + view.querySelector('figcaption')!.textContent!.trim();
  }
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));

  const swipeLayout = matchMedia('(max-width: 1080px) and (any-pointer: coarse)');
  let swipe: { id: number; x: number; y: number } | undefined;
  view.addEventListener('touchstart', event => {
    swipe = undefined;
    if (!swipeLayout.matches || entries.length < 2 || event.touches.length !== 1 ||
        (event.target instanceof Element && event.target.closest('button, a'))) return;
    const touch = event.touches[0];
    swipe = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
  }, { passive: true });
  view.addEventListener('touchcancel', () => { swipe = undefined; }, { passive: true });
  view.addEventListener('touchend', event => {
    const start = swipe;
    swipe = undefined;
    if (!start || !swipeLayout.matches || event.touches.length || window.getSelection()?.type === 'Range') return;
    const touch = Array.from(event.changedTouches).find(touch => touch.identifier === start.id);
    if (!touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) >= 44 && Math.abs(dx) > 1.5 * Math.abs(dy)) move(dx < 0 ? 1 : -1);
  }, { passive: true });

  view.addEventListener('click', event => {
    if (!(event.target instanceof Element) || !event.target.closest('.commonplace-expand')) return;
    history[cursor].expanded = !history[cursor].expanded;
    transition(fitPassage, false);
  });

  let lastWidth = view.clientWidth;
  const observer = new ResizeObserver(() => {
    if (view.clientWidth === lastWidth) return;
    lastWidth = view.clientWidth;
    fitPassage();
  });
  observer.observe(view);
  document.fonts.ready.then(fitPassage);
}

const root = document.querySelector<HTMLElement>('#commonplace');
if (root) initCommonplace(root);
