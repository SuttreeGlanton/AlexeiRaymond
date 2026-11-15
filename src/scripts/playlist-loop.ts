export {};

/* About playlists: the homepage mobile loop and focus behavior. */
(() => {
  const media = window.matchMedia('(max-width: 640px)');
  const gridElement = document.querySelector<HTMLElement>('[data-playlist-loop]');

  if (!gridElement) return;

  const grid: HTMLElement = gridElement;

  const tiles = Array.from(grid.querySelectorAll<HTMLElement>(':scope > .playlist-card'));
  if (!tiles.length) return;

  let loop: { ordered: HTMLElement[]; before: HTMLElement[]; after: HTMLElement[] } | undefined;
  let geometry: { centers: number[]; viewportHalf: number; period: number } | undefined;
  let centeredPlaylistId: string | undefined;
  let focused: HTMLElement[] = [];
  let gridVisible = false;
  let frame = 0;

  function clearFocus() {
    focused.forEach((tile) => tile.classList.remove('is-mobile-focus'));
    focused = [];
  }

  function createLoop() {
    // Preserve the rendered playlist order in both neighboring copy sets.
    const visualOrder = tiles.map((tile) => ({ tile, order: Number(getComputedStyle(tile).order) }));
    visualOrder.sort((a, b) => a.order - b.order);
    const ordered = visualOrder.map(({ tile }) => tile);
    const copySet = (groupOrder: number) => ordered.map((tile) => {
      const copy = tile.cloneNode(true) as HTMLElement;
      copy.style.order = String(groupOrder);
      copy.setAttribute('aria-hidden', 'true');
      if (copy instanceof HTMLAnchorElement) copy.tabIndex = -1;
      return copy;
    });

    const before = copySet(visualOrder[0].order - 1);
    const after = copySet(visualOrder[visualOrder.length - 1].order + 1);
    const position = grid.scrollLeft;
    loop = { ordered, before, after };
    grid.prepend(...before);
    grid.append(...after);
    const { centers, viewportHalf, period } = measureGeometry();
    const restoredIndex = ordered.findIndex((tile) => tile.dataset.playlistId === centeredPlaylistId);
    const left = restoredIndex >= 0 ? centers[restoredIndex] - viewportHalf : position + period;
    grid.scrollTo({ left, behavior: 'instant' });
  }

  function measureGeometry() {
    const gridBox = grid.getBoundingClientRect();
    const scrollLeft = grid.scrollLeft;
    const boxes = (loop?.ordered ?? tiles).map((tile) => tile.getBoundingClientRect());
    geometry = {
      centers: boxes.map((box) => box.left - gridBox.left + scrollLeft + box.width / 2),
      viewportHalf: gridBox.width / 2,
      period: loop ? loop.after[0].getBoundingClientRect().left - boxes[0].left : 0,
    };
    return geometry;
  }

  function invalidateGeometry() {
    geometry = undefined;
    scheduleUpdate();
  }

  function recenterLoop() {
    if (!media.matches || !gridVisible || !loop) return;

    const { period: width } = geometry ?? measureGeometry();
    if (!width) return;
    const position = grid.scrollLeft;
    // Wait for the native swipe and snap to finish, then shift to the
    // same view in the original set. Allow for fractional snap positions.
    if (position < width - 1) {
      grid.scrollTo({ left: position + width, behavior: 'instant' });
    } else if (position >= 2 * width - 1) {
      grid.scrollTo({ left: position - width, behavior: 'instant' });
    }
  }

  function updateFocus() {
    frame = 0;
    if (!media.matches || !gridVisible) {
      clearFocus();
      return;
    }

    if (!loop && tiles.length > 1) createLoop();

    const { centers, viewportHalf, period } = geometry ?? measureGeometry();
    const carouselCenter = grid.scrollLeft + viewportHalf;
    const ordered = loop?.ordered ?? tiles;
    let closestIndex = 0;
    let closestDistance = Infinity;

    centers.forEach((center, index) => {
      const delta = center - carouselCenter;
      const distance = Math.abs(period ? delta - Math.round(delta / period) * period : delta);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    if (focused[0] === ordered[closestIndex]) return;
    centeredPlaylistId = ordered[closestIndex].dataset.playlistId;
    clearFocus();
    // Keep the visual state matched when a copy becomes an original.
    focused = [ordered[closestIndex]];
    if (loop) focused.push(loop.before[closestIndex], loop.after[closestIndex]);
    focused.forEach((tile) => tile.classList.add('is-mobile-focus'));
  }

  function scheduleUpdate() {
    // Keep loop setup and measurements out of the opening render.
    if (!media.matches || !gridVisible || frame) return;
    frame = requestAnimationFrame(updateFocus);
  }

  function setGridVisible(visible: boolean) {
    if (gridVisible === visible) return;
    gridVisible = visible;

    if (gridVisible) {
      invalidateGeometry();
      return;
    }

    cancelAnimationFrame(frame);
    frame = 0;
    clearFocus();
  }

  grid.addEventListener('scroll', scheduleUpdate, { passive: true });
  if (Reflect.has(grid, 'onscrollend')) {
    grid.addEventListener('scrollend', recenterLoop);
  } else {
    let settleTimer = 0;
    let touching = false;

    function scheduleRecenter() {
      window.clearTimeout(settleTimer);
      if (!touching && loop) settleTimer = window.setTimeout(recenterLoop, 150);
    }

    grid.addEventListener('scroll', scheduleRecenter, { passive: true });
    grid.addEventListener('touchstart', () => {
      touching = true;
      scheduleRecenter();
    }, { passive: true });
    function finishTouch(event: TouchEvent) {
      touching = event.targetTouches.length > 0;
      scheduleRecenter();
    }
    grid.addEventListener('touchend', finishTouch, { passive: true });
    grid.addEventListener('touchcancel', finishTouch, { passive: true });
  }
  window.addEventListener('resize', invalidateGeometry);
  if ('ResizeObserver' in window) new ResizeObserver(invalidateGeometry).observe(grid);

  media.addEventListener('change', () => {
    geometry = undefined;
    if (media.matches) {
      scheduleUpdate();
      return;
    }

    clearFocus();
    loop?.before.forEach((tile) => tile.remove());
    loop?.after.forEach((tile) => tile.remove());
    loop = undefined;
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        setGridVisible(entries.some((entry) => entry.isIntersecting));
      },
      { rootMargin: '120px 0px' },
    );

    observer.observe(grid);
  } else {
    // Old-browser fallback preserves the existing behavior.
    setGridVisible(true);
  }
})();
