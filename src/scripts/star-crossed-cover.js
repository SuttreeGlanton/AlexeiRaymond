// Keep one next image ready, rather than downloading every variation at once.
const cover = document.querySelector('[data-sc-cover]');
const sourceData = cover?.querySelector('[data-sc-cover-sources]');

if (cover && sourceData) {
  let sources;
  try { sources = JSON.parse(sourceData.textContent || '[]'); } catch { sources = []; }
  const frames = Array.from(cover.querySelectorAll('[data-sc-cover-frame]'));
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let activeFrame = 0;
  let visible = false;
  let suspended = false;
  let timer = 0;
  let generation = 0;
  let pending = null;

  function eligible() {
    return visible && !suspended && !document.hidden && !motion.matches;
  }

  function prepareNext() {
    const index = (current + 1) % sources.length;
    if (pending?.index === index) return pending.promise;
    const source = sources[index];
    const img = new Image();
    img.alt = '';
    img.decoding = 'async';
    img.fetchPriority = 'low';
    img.width = source.width;
    img.height = source.height;
    img.sizes = source.sizes;
    img.srcset = source.srcset;
    img.src = source.src;
    const promise = img.decode().then(() => ({ index, img })).catch(() => {
      if (pending?.index === index) pending = null;
      return null;
    });
    pending = { index, promise };
    return promise;
  }

  function schedule() {
    window.clearTimeout(timer);
    const scheduledGeneration = ++generation;
    if (!eligible()) return;
    prepareNext();
    timer = window.setTimeout(() => changeCover(scheduledGeneration), 5000);
  }

  async function changeCover(scheduledGeneration) {
    const next = await prepareNext();
    if (scheduledGeneration !== generation || !eligible()) return;
    if (!next) { schedule(); return; }
    const outgoing = frames[activeFrame];
    activeFrame = 1 - activeFrame;
    const incoming = frames[activeFrame];
    incoming.replaceChildren(next.img);
    incoming.classList.add('is-entering');
    // Fade over the still-opaque original, so the painting never dims or blinks.
    window.setTimeout(() => {
      incoming.classList.add('is-current');
      incoming.classList.remove('is-entering');
      outgoing.classList.remove('is-current');
    }, 700);
    current = next.index;
    pending = null;
    cover.dataset.scCoverNumber = String(sources[current].number);
    schedule();
  }

  if (sources.length > 1 && frames.length === 2 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      schedule();
    });
    observer.observe(cover);
    motion.addEventListener('change', schedule);
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('pagehide', () => { suspended = true; schedule(); });
    window.addEventListener('pageshow', () => { suspended = false; schedule(); });
  }
}
