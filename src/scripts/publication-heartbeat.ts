const credit = document.querySelector<HTMLElement>('[data-publication-heartbeat]');

if (credit) {
  const slots = [...credit.querySelectorAll<HTMLElement>('[data-publication-name]')];
  const venues: string[] = JSON.parse(credit.dataset.venues ?? '[]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const print = window.matchMedia('print');
  function shuffled(names: string[]): string[] {
    const result = [...names];
    for (let index = result.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [result[index], result[other]] = [result[other]!, result[index]!];
    }
    return result;
  }

  // Shuffle in the browser so every visit gets a fresh opening and order.
  // Refill only after the queue is exhausted, excluding both visible names.
  // Each position still keeps its name for two beats.
  let queue = shuffled(venues);
  for (const slot of slots) {
    const name = queue.shift();
    if (name) slot.textContent = name;
  }
  const accessibleCopy = credit.querySelector<HTMLElement>('.sr-only');
  if (accessibleCopy) {
    accessibleCopy.textContent = `Work published in ${slots.map((slot) => slot.textContent).join(' and ')}, among others.`;
  }
  let nextSlot = 0;
  let visible = false;
  let timer = 0;
  let activeAnimation: Animation | undefined;
  let generation = 0;

  const running = () => visible && !document.hidden && !reducedMotion.matches && !print.matches;

  function stop() {
    window.clearTimeout(timer);
    timer = 0;
    generation++;
    activeAnimation?.cancel();
    activeAnimation = undefined;
  }

  async function beat() {
    timer = 0;
    if (!running()) return;
    const currentGeneration = generation;
    const slot = slots[nextSlot]!;
    try {
      activeAnimation = slot.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 180, easing: 'ease-in', fill: 'forwards',
      });
      await activeAnimation.finished;
      if (generation !== currentGeneration || !running()) return;

      if (!queue.length) {
        const visibleNames = slots.map((item) => item.textContent);
        queue = shuffled(venues.filter((name) => !visibleNames.includes(name)));
      }
      const next = queue.shift()!;
      slot.textContent = next;
      activeAnimation.cancel();
      activeAnimation = slot.animate([
        { opacity: 0, textShadow: '0 0 0 transparent', offset: 0 },
        { opacity: 1, textShadow: '0 0 5px rgba(190, 160, 110, 0.24)', offset: 0.3 },
        { opacity: 0.92, textShadow: '0 0 1px rgba(190, 160, 110, 0.06)', offset: 0.5 },
        { opacity: 1, textShadow: '0 0 4px rgba(190, 160, 110, 0.18)', offset: 0.7 },
        { opacity: 1, textShadow: '0 0 0 transparent', offset: 1 },
      ], { duration: 720, easing: 'ease-in-out' });
      nextSlot = (nextSlot + 1) % slots.length;
      await activeAnimation.finished;
    } catch {
      // Cancellation on scroll, tab change or reduced motion is intentional.
    }
    if (generation === currentGeneration && running()) {
      activeAnimation = undefined;
      timer = window.setTimeout(beat, 1700);
    }
  }

  function sync() {
    stop();
    if (running()) timer = window.setTimeout(beat, 2600);
  }

  if (slots.length === 2 && queue.length > 0 && typeof slots[0]!.animate === 'function') {
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false;
      sync();
    });
    observer.observe(credit);
    document.addEventListener('visibilitychange', sync);
    reducedMotion.addEventListener('change', sync);
    print.addEventListener('change', sync);
    window.addEventListener('pagehide', stop);
    window.addEventListener('pageshow', sync);
  }
}
