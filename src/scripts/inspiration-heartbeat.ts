export {};

// Both About-page tickers share the same animation and visibility lifecycle.
for (const credit of document.querySelectorAll<HTMLElement>('[data-inspiration-heartbeat], [data-location-heartbeat]')) {
  const slots = [...credit.querySelectorAll<HTMLElement>('[data-inspiration-name], [data-heartbeat-location]')];
  const venues: string[] = JSON.parse(credit.dataset.names ?? '[]');
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

  // Keep the authored opening location; inspiration names start shuffled.
  // Refill only after the queue is exhausted, excluding visible values.
  let queue: string[];
  if (credit.hasAttribute('data-location-heartbeat')) {
    queue = shuffled(venues.filter((name) => !slots.some((slot) => slot.textContent === name)));
  } else {
    queue = shuffled(venues);
    for (const slot of slots) {
      const name = queue.shift();
      if (name) slot.textContent = name;
    }
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

  if (slots.length > 0 && queue.length > 0 && typeof slots[0]!.animate === 'function') {
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
