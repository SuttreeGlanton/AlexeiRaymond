interface RevealOptions {
  trigger?: HTMLElement;
  minWidth?: number;
  resizeTarget?: HTMLElement;
}

export function trackColorReveal(
  surface: HTMLElement,
  draw: (x: number, y: number, bounds: DOMRect) => void,
  { trigger = surface, minWidth, resizeTarget }: RevealOptions = {},
) {
  const widthQuery = minWidth ? `(min-width: ${minWidth}px) and ` : '';
  const eligible = window.matchMedia(
    widthQuery + '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
  );
  let frame = 0;
  let pointer: PointerEvent | undefined;
  let active = false;
  let listeners: AbortController | undefined;

  function drawFrame() {
    frame = 0;
    if (!pointer) return;
    const bounds = surface.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    draw(pointer.clientX - bounds.left, pointer.clientY - bounds.top, bounds);
    if (!active) {
      active = true;
      surface.classList.add('is-color-reveal-active');
    }
  }

  function queue() {
    if (pointer && !frame) frame = requestAnimationFrame(drawFrame);
  }

  function move(event: PointerEvent) {
    pointer = event;
    queue();
  }

  function clear() {
    pointer = undefined;
    cancelAnimationFrame(frame);
    frame = 0;
    if (active) {
      active = false;
      surface.classList.remove('is-color-reveal-active');
    }
  }

  const resize = resizeTarget && 'ResizeObserver' in window ? new ResizeObserver(queue) : undefined;

  function sync() {
    listeners?.abort();
    resize?.disconnect();
    clear();
    if (!eligible.matches) return;

    listeners = new AbortController();
    const options = { passive: true, signal: listeners.signal };
    trigger.addEventListener('pointerenter', move, options);
    trigger.addEventListener('pointermove', move, options);
    trigger.addEventListener('pointerleave', clear, options);
    trigger.addEventListener('pointercancel', clear, options);
    window.addEventListener('scroll', queue, options);
    window.addEventListener('resize', queue, options);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) clear();
    }, options);
    if (resize && resizeTarget) {
      resize.observe(surface);
      resize.observe(resizeTarget);
    }
  }

  eligible.addEventListener('change', sync);
  sync();
}

export function setRevealPosition(
  layer: HTMLElement, x: number, y: number, bounds?: DOMRect,
) {
  layer.style.setProperty('--reveal-x', bounds ? `${x / bounds.width * 100}%` : `${x}px`);
  layer.style.setProperty('--reveal-y', bounds ? `${y / bounds.height * 100}%` : `${y}px`);
}
