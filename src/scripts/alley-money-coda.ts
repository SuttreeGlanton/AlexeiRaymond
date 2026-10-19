export {};

// Both placements share the same sprite and kill/respawn state, including
// during a resize. Only positioning is driven by scrolling.
const story = document.querySelector<HTMLElement>('.archived-piece-page--alley-money');
const prose = story?.querySelector<HTMLElement>('.archive-prose');
const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-am-coda]'));
const actors = roots.flatMap((root) => {
  const button = root.querySelector<HTMLButtonElement>('[data-am-cacodemon]');
  const canvas = root.querySelector<HTMLCanvasElement>('[data-am-cacodemon-canvas]');
  const traveler = root.querySelector<HTMLElement>('[data-am-traveler]');
  const context = canvas?.getContext('2d', { willReadFrequently: true });
  return button && canvas && traveler && context
    ? [{ root, button, canvas, traveler, context, header: root.dataset.amCoda === 'header',
         width: 0, height: 0, size: 112 }] : [];
});

if (story && prose && actors.length) {
  const audio = story.querySelector<HTMLAudioElement>('[data-am-cacodemon-audio]');
  const status = story.querySelector<HTMLElement>('[data-am-cacodemon-status]');
  const mobile = window.matchMedia('(max-width: 860px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector<HTMLElement>('[data-site-header]');
  const sprite = new Image();
  let ready = false;
  let playing = false;
  let generation = 0;
  let finishSound: (() => void) | undefined;
  let frameRequest = 0;
  let metricsDirty = true;
  let startScroll = 0;
  let endScroll = 1;
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  const wait = (milliseconds: number) =>
    new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

  type SpriteFrame = { x: number; y: number; width: number; height: number };

  // Coordinates measured against the actual sprite sheet (425x859).
  const idleFrame: SpriteFrame = { x: 239, y: 12, width: 61, height: 66 };
  const deathFrames: SpriteFrame[] = [
    { x: 23, y: 765, width: 63, height: 67 },
    { x: 92, y: 765, width: 63, height: 67 },
    { x: 165, y: 762, width: 67, height: 76 },
    { x: 247, y: 771, width: 69, height: 66 },
    { x: 329, y: 783, width: 75, height: 49 }
  ];


  const clear = () => {
    for (const { context, canvas } of actors) context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const drawFrame = (frame: SpriteFrame) => {
    clear();
    for (const { context, canvas } of actors) {
      // Shared baseline preserves the original downward collapse.
      const baseline = Math.round(canvas.height * 0.84);
      context.imageSmoothingEnabled = false;
      const destinationX = Math.round((canvas.width - frame.width) / 2);
      const destinationY = baseline - frame.height;
      context.drawImage(sprite, frame.x, frame.y, frame.width, frame.height,
        destinationX, destinationY, frame.width, frame.height);

      // Key out the original cyan matte, including anti-aliased fringe pixels.
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < pixels.data.length; index += 4) {
        const red = pixels.data[index];
        const green = pixels.data[index + 1];
        const blue = pixels.data[index + 2];
        if (red < 80 && green > 170 && blue > 170) pixels.data[index + 3] = 0;
      }
      context.putImageData(pixels, 0, 0);
    }
  };

  const setBusy = (busy: boolean) => {
    playing = busy;
    for (const { button } of actors) {
      // Keep keyboard focus through death and respawn; the shared guard
      // prevents repeated activation while a kill is in progress.
      button.setAttribute('aria-disabled', String(busy));
      if (busy) button.setAttribute('aria-busy', 'true');
      else button.removeAttribute('aria-busy');
    }
  };

  const playKillSound = () => {
    if (!audio) return wait(reducedMotion.matches ? 1100 : 2400);
    audio.pause();
    audio.currentTime = 0;
    return new Promise<void>((resolve) => {
      let finished = false;
      let timer = 0;
      const finish = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(timer);
        audio.removeEventListener('ended', finish);
        audio.removeEventListener('error', finish);
        audio.pause();
        finishSound = undefined;
        resolve();
      };
      finishSound = finish;
      audio.addEventListener('ended', finish, { once: true });
      audio.addEventListener('error', finish, { once: true });
      // Keep the original audio-ended respawn. A failed/stalled request
      // must not strand the demon; the existing clip is about 3.3 seconds.
      timer = window.setTimeout(finish, 8000);
      audio.play().catch(() => {
        if (finished) return;
        window.clearTimeout(timer);
        timer = window.setTimeout(finish, reducedMotion.matches ? 1100 : 2400);
      });
    });
  };

  const playDeath = async () => {
    if (!ready || playing || document.hidden) return;
    const run = ++generation;
    setBusy(true);
    const soundFinished = playKillSound();
    if (reducedMotion.matches) {
      drawFrame(deathFrames.at(-1) ?? idleFrame);
      await wait(140);
    } else {
      for (const frame of deathFrames) {
        if (run !== generation) return;
        drawFrame(frame);
        await wait(105);
      }
    }
    if (run !== generation) return;
    clear();
    if (status) status.textContent = 'Cacodemon defeated.';
    await soundFinished;
    if (run !== generation) return;
    drawFrame(idleFrame);
    if (status) status.textContent = 'The Cacodemon returned.';
    setBusy(false);
  };

  const measure = () => {
    metricsDirty = false;
    const y = window.scrollY;
    const box = prose.getBoundingClientRect();
    const headerHeight = header?.getBoundingClientRect().height || 72;
    startScroll = box.top + y - Math.max(headerHeight + 24, innerHeight * 0.35);
    endScroll = Math.max(startScroll + 1, box.bottom + y - innerHeight + 24);
    for (const actor of actors) {
      actor.width = actor.root.clientWidth;
      actor.height = actor.root.clientHeight;
      actor.size = actor.header ? 64 : 112;
    }
  };

  const tick = () => {
    frameRequest = 0;
    if (document.hidden || !ready) return;
    if (metricsDirty) measure();
    const progress = clamp((window.scrollY - startScroll) / (endScroll - startScroll));
    for (const actor of actors) {
      if (actor.header !== mobile.matches || !actor.width) continue;
      const room = Math.max(0, actor.width - actor.size);
      // Pure scroll functions, with no completion latch at the bottom.
      // The mobile demon makes three gentle crossings and retraces on scroll-up.
      const x = reducedMotion.matches ? room / 2 : actor.header
        ? room * (0.5 - 0.5 * Math.cos(progress * Math.PI * 3))
        : room * (0.5 + 0.35 * Math.sin(progress * Math.PI * 4));
      const y = reducedMotion.matches || actor.header ? 0
        : Math.max(0, actor.height - actor.size) * progress;
      actor.traveler.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
    }
  };
  const schedule = () => {
    if (!frameRequest && !document.hidden) frameRequest = requestAnimationFrame(tick);
  };
  const remeasure = () => { metricsDirty = true; schedule(); };
  const suspend = () => {
    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    generation += 1;
    finishSound?.();
    audio?.pause();
    if (ready) drawFrame(idleFrame);
    setBusy(false);
    for (const { root } of actors) root.dataset.amPaused = '';
  };
  const resume = () => {
    for (const { root } of actors) delete root.dataset.amPaused;
    remeasure();
  };

  sprite.addEventListener('load', () => {
    drawFrame(idleFrame);
    ready = true;
    for (const { root, button } of actors) {
      root.dataset.amReady = '';
      button.addEventListener('click', () => void playDeath());
    }
    remeasure();
  }, { once: true });
  sprite.src = roots[0].dataset.spriteSheet || '';

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', remeasure);
  window.addEventListener('pagehide', suspend);
  window.addEventListener('pageshow', resume);
  mobile.addEventListener('change', remeasure);
  reducedMotion.addEventListener('change', remeasure);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspend();
    else resume();
  });
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(remeasure);
    observer.observe(prose);
    for (const { root } of actors) observer.observe(root);
    if (header) observer.observe(header);
  }
  if (typeof IntersectionObserver === 'function') {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        (entry.target as HTMLElement).toggleAttribute('data-am-paused', !entry.isIntersecting || document.hidden);
      }
    });
    for (const { root } of actors) observer.observe(root);
  }
  document.fonts.ready.then(remeasure);
}
