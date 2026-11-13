// Keep native touch menus off artwork without intercepting taps or scrolling.
const touchLayout = window.matchMedia('(hover: none) and (pointer: coarse)');
const coverSelector = '.tile-media, .card-media, .archive-cover-media, .latest-release-cover';

document.addEventListener('contextmenu', (event: MouseEvent) => {
  if (!touchLayout.matches || !(event.target instanceof Element)) return;

  // Preserve keyboard menus and an explicitly identified mouse/pen menu.
  if (event instanceof PointerEvent && event.pointerType && event.pointerType !== 'touch') return;
  if (event.clientX === 0 && event.clientY === 0) return;

  if (event.target.closest(coverSelector)) {
    event.preventDefault();
    return;
  }

  // The latest card's stretched reading link sits above its cover image.
  const cover = event.target.closest('.latest-release-card')?.querySelector('.latest-release-cover');
  if (!cover) return;
  const rect = cover.getBoundingClientRect();
  if (event.clientX >= rect.left && event.clientX <= rect.right &&
      event.clientY >= rect.top && event.clientY <= rect.bottom) {
    event.preventDefault();
  }
});

export {};
