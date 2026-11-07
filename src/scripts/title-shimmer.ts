const title = document.querySelector<HTMLElement>('[data-title-shimmer]');

if (
  title &&
  'IntersectionObserver' in window &&
  (CSS.supports('background-clip', 'text') || CSS.supports('-webkit-background-clip', 'text'))
) {
  const displayEffects = window.matchMedia(
    'screen and (prefers-reduced-motion: no-preference) and (forced-colors: none)'
  );
  let visible = false;
  let timer = 0;

  const sweep = () => {
    title.setAttribute('data-cherry-sweeping', '');
    timer = window.setTimeout(sweep, 30_000);
  };

  const stopSweep = () => title.removeAttribute('data-cherry-sweeping');

  const schedule = () => {
    window.clearTimeout(timer);
    stopSweep();
    if (visible && !document.hidden && displayEffects.matches) {
      timer = window.setTimeout(sweep, 5_000);
    }
  };

  title.addEventListener('animationend', stopSweep);
  displayEffects.addEventListener('change', schedule);
  document.addEventListener('visibilitychange', schedule);

  const observer = new IntersectionObserver(([entry]) => {
    const inView = entry.intersectionRatio >= 0.25;
    if (inView === visible) return;
    visible = inView;
    schedule();
  }, { rootMargin: '-64px 0px 0px', threshold: 0.25 });

  observer.observe(title);
}
