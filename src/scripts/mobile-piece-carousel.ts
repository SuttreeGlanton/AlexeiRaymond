const mobile = window.matchMedia('(max-width: 640px)');

for (const carousel of document.querySelectorAll<HTMLElement>('[data-mobile-focus-carousel]')) {
  let focused: HTMLElement | undefined;
  let frame = 0;

  function updateFocus() {
    frame = 0;
    let closest: HTMLElement | undefined;

    if (mobile.matches) {
      const { left, width } = carousel.getBoundingClientRect();
      const center = left + width / 2;
      let closestDistance = Infinity;

      for (const card of carousel.querySelectorAll<HTMLElement>(':scope > [data-piece-card]')) {
        const bounds = card.getBoundingClientRect();
        const distance = Math.abs(bounds.left + bounds.width / 2 - center);

        if (distance < closestDistance) {
          closest = card;
          closestDistance = distance;
        }
      }
    }

    if (closest !== focused) {
      focused?.classList.remove('is-mobile-focus');
      closest?.classList.add('is-mobile-focus');
      focused = closest;
    }
  }

  function scheduleUpdate() {
    if (!frame) frame = requestAnimationFrame(updateFocus);
  }

  carousel.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  mobile.addEventListener('change', scheduleUpdate);
  scheduleUpdate();
}
