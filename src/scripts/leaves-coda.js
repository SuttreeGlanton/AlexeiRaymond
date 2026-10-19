// Loaded only on Leaves. The prose stays ordinary static HTML until the
// first deliberate gust; no animation loop runs while the reader is idle.
const story = document.querySelector('[data-leaves-story]');
const prose = story?.querySelector('.archive-prose');
const opening = prose?.querySelector('[data-leaves-opening]');
const ending = prose?.querySelector('[data-leaves-ending]');
const trigger = ending?.querySelector('[data-leaves-trigger]');
const restart = story?.querySelector('[data-leaves-restart]');
const roots = Array.from(document.querySelectorAll('[data-leaves-coda]'));

if (story && prose && trigger && restart && roots.length &&
    opening?.textContent.trim() === 'Memory of that day; sans utility, sans insight.' &&
    trigger.textContent.trim() === 'Release that day; therein utility, therein insight.') {
  const header = document.querySelector('[data-site-header]');
  const mobile = window.matchMedia('(max-width: 860px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const actors = roots.map((root) => ({
    root, sprite: root.querySelector('[data-leaves-sprite]'),
    header: root.dataset.leavesCoda === 'header', width: 0, height: 0, size: 114,
    x: 0, y: 0, angle: 0, frame: 0
  }));
  const leafSheet = new Image();
  leafSheet.src = roots[0].dataset.leavesSheet;
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const random = (a, b) => a + Math.random() * (b - a);
  const frameCount = 24;
  const windHeadings = [
    { x: 1, y: 0 }, { x: -1, y: 0 },
    { x: 1, y: -1 }, { x: -1, y: -1 },
    { x: 1, y: 1 }, { x: -1, y: 1 }
  ];
  let windDirections = windHeadings.slice();
  let stage = 0;
  let progress = 0;
  let startScroll = 0;
  let endScroll = 1;
  let headerHeight = 72;
  let frameRequest = 0;
  let metricsDirty = true;
  let scrollDirty = true;
  let busy = false;
  let burst = null;
  let canvas = null;
  let context = null;
  let pixelRatio = 1;
  let characters = null;
  let pool = [];
  let reserved = [];
  let third = 0;

  function measure() {
    metricsDirty = false;
    const y = window.scrollY;
    headerHeight = header?.getBoundingClientRect().height || 72;
    startScroll = prose.getBoundingClientRect().top + y - Math.max(headerHeight + 24, innerHeight * 0.35);
    endScroll = Math.max(startScroll + 1, ending.getBoundingClientRect().bottom + y - innerHeight + 24);
    for (const actor of actors) {
      actor.width = actor.root.clientWidth;
      actor.height = actor.root.clientHeight;
      actor.size = actor.header ? 80 : 114;
    }
    scrollDirty = true;
  }

  function readProgress() {
    scrollDirty = false;
    progress = clamp((window.scrollY - startScroll) / (endScroll - startScroll));
  }

  function paintLeaf(now) {
    if (stage === 3) return;
    const reaction = burst ? clamp((now - burst.start) / 1050) : 1;
    const lift = reduced.matches ? 0 : Math.sin(Math.PI * reaction);
    const gustFrame = reaction < 1 ? Math.floor(reaction * frameCount * 2) : 0;
    for (const actor of actors) {
      if (actor.header !== mobile.matches || !actor.width) continue;
      // All positions and frames are functions of scroll progress. Reversing
      // scroll always retraces the same motion, including after the bottom.
      if (actor.header) {
        actor.x = progress * Math.max(0, actor.width - 48);
        actor.y = Math.sin(progress * Math.PI * 4) * 3;
      } else {
        const room = Math.max(0, actor.width - actor.size);
        actor.x = room * (0.5 + 0.38 * Math.sin(progress * Math.PI * 4.6));
        actor.y = Math.max(0, actor.height - actor.size) * progress;
      }
      actor.angle = reduced.matches ? 0 : Math.sin(progress * Math.PI * 6) * 9;
      actor.frame = (Math.floor(progress * frameCount * 3) + gustFrame) % frameCount;
      const nudge = lift * (actor.header ? 16 : 28);
      const dx = nudge * (burst?.wind.x || 0);
      const dy = nudge * (burst?.wind.y || 0);
      const turn = lift * 15 * (burst?.wind.x || 0);
      actor.sprite.style.transform = `translate(${(actor.x + dx).toFixed(2)}px, ${(actor.y + dy).toFixed(2)}px) rotate(${(actor.angle + turn).toFixed(2)}deg)`;
      actor.sprite.style.backgroundPosition = `${actor.frame * 100 / (frameCount - 1)}% 0`;
    }
  }

  function schedule() {
    if (!frameRequest && !document.hidden) frameRequest = requestAnimationFrame(tick);
  }

  function finishBurst() {
    burst = null;
    canvas?.remove();
    canvas = null;
    context = null;
    busy = false;
    delete story.dataset.leavesBusy;
    trigger.disabled = stage === 3;
    restart.disabled = stage !== 3;
    paintLeaf(performance.now());
  }

  function tick(now) {
    frameRequest = 0;
    if (document.hidden) return;
    if (metricsDirty) measure();
    if (scrollDirty) readProgress();
    paintLeaf(now);
    if (burst) {
      drawFlight(now);
      if (burst.particles.length || now - burst.start < 1050) schedule();
      else finishBurst();
    }
  }

  function prepareCharacters() {
    if (characters) return;
    characters = [];
    const walker = document.createTreeWalker(prose, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement?.closest('p') && /\S/u.test(node.data)) nodes.push(node);
    }
    const segmenter = typeof Intl.Segmenter === 'function'
      ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
    for (const node of nodes) {
      const owner = node.parentElement;
      const paragraph = owner.closest('p');
      const fragment = document.createDocumentFragment();
      const units = segmenter
        ? Array.from(segmenter.segment(node.data), (unit) => unit.segment) : Array.from(node.data);
      for (const letter of units) {
        if (/^\s+$/u.test(letter)) {
          fragment.append(document.createTextNode(letter));
          continue;
        }
        const span = document.createElement('span');
        span.className = 'leaves-character';
        span.textContent = letter;
        fragment.append(span);
        const character = { span, owner, paragraph, letter };
        characters.push(character);
      }
      node.replaceWith(fragment);
    }
    dealCharacters();
  }

  function dealCharacters() {
    pool = [];
    reserved = [];
    for (const character of characters) {
      (trigger.contains(character.span) ? reserved : pool).push(character);
    }
    // A uniform shuffle gives three disjoint, randomly distributed groups.
    // The final sentence is reserved, but each third uses the ORIGINAL count.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    third = Math.floor(characters.length / 3);
  }

  function restartStory() {
    if (busy || stage !== 3 || document.hidden) return;
    for (const character of characters) character.span.classList.remove('leaves-gone');
    dealCharacters();
    windDirections = windHeadings.slice();
    stage = 0;
    story.dataset.leavesStage = '0';
    roots.forEach((root) => { delete root.dataset.leavesDeparted; });
    restart.disabled = true;
    trigger.disabled = false;
    trigger.focus({ preventScroll: true });
    // Reuse the existing spans and listeners. Restore at the reader's scroll
    // position, with fresh groups and all wind directions available again.
    metricsDirty = true;
    schedule();
  }

  function createCanvas() {
    canvas = document.createElement('canvas');
    canvas.className = 'leaves-flight';
    canvas.setAttribute('aria-hidden', 'true');
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.ceil(innerWidth * pixelRatio);
    canvas.height = Math.ceil(innerHeight * pixelRatio);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    context = canvas.getContext('2d');
    if (!context) { canvas = null; return false; }
    return true;
  }

  function createWind() {
    // One unused heading and curl handedness unite the gust. Individual
    // timing, lift, and drift keep the released letters out of formation.
    const index = Math.floor(Math.random() * windDirections.length);
    const direction = windDirections.splice(index, 1)[0];
    const length = Math.hypot(direction.x, direction.y);
    const x = direction.x / length;
    const y = direction.y / length;
    const distance = Math.min(
      x ? (innerWidth + 240) / Math.abs(x) : Infinity,
      y ? (innerHeight + 240) / Math.abs(y) : Infinity
    );
    const radius = Math.max(48, Math.min(135, Math.min(innerWidth, innerHeight) * 0.16));
    const r = radius;
    return {
      x, y, radius, turn: Math.random() < 0.5 ? -1 : 1,
      // Cubic segments in along-wind / cross-wind coordinates. Their shared
      // tangents form a broad curl, including a brief turn back within it.
      path: [
        { end: 0.16, points: [0, 0, 0.35*r, 0, 0.9*r, -0.22*r, 1.2*r, -0.7*r] },
        { end: 0.38, points: [1.2*r, -0.7*r, 1.5*r, -1.18*r, 1.1*r, -1.8*r, 0.45*r, -1.6*r] },
        { end: 0.62, points: [0.45*r, -1.6*r, -0.2*r, -1.4*r, -0.1*r, -0.12*r, 0.85*r, -0.12*r] },
        { end: 1, points: [0.85*r, -0.12*r, 1.8*r, -0.12*r, distance*0.58, 0.5*r, distance, 0] }
      ]
    };
  }

  function sampleWind(wind, progress) {
    let start = 0;
    for (const segment of wind.path) {
      if (progress > segment.end) { start = segment.end; continue; }
      const t = (progress - start) / (segment.end - start);
      const v = 1 - t;
      const [x0, y0, x1, y1, x2, y2, x3, y3] = segment.points;
      const along = v*v*v*x0 + 3*v*v*t*x1 + 3*v*t*t*x2 + t*t*t*x3;
      const across = (v*v*v*y0 + 3*v*v*t*y1 + 3*v*t*t*y2 + t*t*t*y3) * wind.turn;
      const vx = 3*v*v*(x1-x0) + 6*v*t*(x2-x1) + 3*t*t*(x3-x2);
      const vy = (3*v*v*(y1-y0) + 6*v*t*(y2-y1) + 3*t*t*(y3-y2)) * wind.turn;
      return { along, across, tilt: vy / (Math.hypot(vx, vy) || 1) * 0.55 };
    }
  }

  function trajectory(x, y) {
    return {
      x, y, delay: random(0, 160), duration: random(3100, 4400),
      curlScale: random(0.5, 1.5), stretch: random(0.65, 1.4),
      carry: random(0.15, 0.85), drift: random(-0.75, 0.75),
      flutter: random(7, 18), frequency: random(9, 17), phase: random(0, Math.PI * 2),
      rotation: random(-1.2, 1.2), sway: random(0.18, 0.42)
    };
  }

  function particlePosition(particle, wind, elapsed) {
    const t = clamp((elapsed - particle.delay) / particle.duration);
    const flow = sampleWind(wind, t);
    const envelope = Math.sin(Math.PI * t);
    // Each letter catches the gust at its own moment and loosens quickly.
    // These offsets grow continuously from zero, then settle into the exit.
    const loosen = (1 - Math.exp(-t * 16)) * (1 - t*t);
    const curl = 1 - clamp((t - 0.62) / 0.38);
    const flutter = Math.sin(t * particle.frequency + particle.phase) - Math.sin(particle.phase);
    const along = flow.along * (1 + (particle.stretch - 1) * curl) + particle.carry * wind.radius * loosen;
    const across = flow.across * particle.curlScale + particle.drift * wind.radius * loosen +
      flutter * envelope * particle.flutter;
    return {
      t,
      x: particle.x + wind.x * along - wind.y * across,
      y: particle.y + wind.y * along + wind.x * across,
      angle: flow.tilt * particle.curlScale + particle.rotation * loosen +
        particle.sway * flutter * envelope + (particle.leaf ? particle.angle * Math.PI / 180 : 0)
    };
  }

  function visibleParticles(selected) {
    const particles = [];
    const paragraphVisible = new Map();
    const fonts = new Map();
    for (const character of selected) {
      const { span, owner, paragraph, letter } = character;
      if (!paragraphVisible.has(paragraph)) {
        const box = paragraph.getBoundingClientRect();
        paragraphVisible.set(paragraph, box.bottom >= headerHeight && box.top <= innerHeight);
      }
      if (!paragraphVisible.get(paragraph)) continue;
      const box = span.getBoundingClientRect();
      if (!box.width || box.bottom < headerHeight || box.top > innerHeight || box.right < 0 || box.left > innerWidth) continue;
      if (!fonts.has(owner)) {
        const css = getComputedStyle(owner);
        fonts.set(owner, {
          font: `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`,
          color: css.color, size: parseFloat(css.fontSize)
        });
      }
      const font = fonts.get(owner);
      context.font = font.font;
      const metrics = context.measureText(letter);
      const descent = metrics.fontBoundingBoxDescent ?? font.size * 0.25;
      particles.push({
        ...trajectory(box.left + box.width / 2, box.top + box.height / 2),
        letter, ...font, halfWidth: box.width / 2,
        baseline: box.height / 2 - descent, leaf: false
      });
    }
    return particles;
  }

  function departingLeaf() {
    const actor = actors.find((item) => item.header === mobile.matches);
    if (!actor || !leafSheet.complete || !leafSheet.naturalWidth) return null;
    if (actor.header && !header?.classList.contains('header-coda-on')) return null;
    const box = actor.sprite.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight || !box.width) return null;
    return {
      ...trajectory(box.left + box.width / 2, box.top + box.height / 2),
      leaf: true, size: actor.size, frame: actor.frame, angle: actor.angle
    };
  }

  function drawFlight(now) {
    if (!context || !canvas) { burst.particles = []; return; }
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    const elapsed = now - burst.start;
    const wind = burst.wind;
    const remaining = [];
    for (const particle of burst.particles) {
      const { t, x, y, angle } = particlePosition(particle, wind, elapsed);
      if (t >= 1) continue;
      const outside = x < -120 || x > innerWidth + 120 || y < -120 || y > innerHeight + 120;
      // A curl can re-enter the viewport. Cull only during the final outward
      // sweep; skip drawing temporarily offscreen particles during the curl.
      if (outside) {
        if (t <= 0.62) remaining.push(particle);
        continue;
      }
      const c = Math.cos(angle) * pixelRatio;
      const s = Math.sin(angle) * pixelRatio;
      context.setTransform(c, s, -s, c, x * pixelRatio, y * pixelRatio);
      if (particle.leaf) {
        const frame = (particle.frame + Math.floor(t * frameCount * 3)) % frameCount;
        context.imageSmoothingEnabled = false;
        context.drawImage(leafSheet, frame * 114, 0, 114, 114,
          -particle.size / 2, -particle.size / 2, particle.size, particle.size);
      } else {
        context.font = particle.font;
        context.fillStyle = particle.color;
        context.textBaseline = 'alphabetic';
        context.fillText(particle.letter, -particle.halfWidth, particle.baseline);
      }
      remaining.push(particle);
    }
    burst.particles = remaining;
  }

  async function release() {
    if (busy || stage >= 3 || document.hidden) return;
    busy = true;
    trigger.disabled = true;
    restart.disabled = true;
    story.dataset.leavesBusy = '';
    // A very early click must still measure the actual story font.
    await document.fonts?.ready;
    if (document.hidden) { finishBurst(); return; }
    try {
      prepareCharacters();
      if (metricsDirty) measure();
      readProgress();
      paintLeaf(performance.now());
      const final = stage === 2;
      const selected = final ? [...pool, ...reserved] : pool.slice(0, third);
      const animated = !reduced.matches && createCanvas();
      const wind = animated ? createWind() : null;
      const particles = animated ? visibleParticles(selected) : [];
      if (final && animated) {
        const leaf = departingLeaf();
        if (leaf) particles.push(leaf);
      }
      // Finish every geometry read before painting any source removal.
      for (const character of selected) character.span.classList.add('leaves-gone');
      pool = final ? [] : pool.slice(third);
      if (final) reserved = [];
      stage += 1;
      story.dataset.leavesStage = String(stage);
      if (final) {
        roots.forEach((root) => { root.dataset.leavesDeparted = ''; });
        trigger.blur();
      }
      if (animated) {
        document.body.append(canvas);
        burst = { start: performance.now(), particles, wind };
        // Paint the first positions immediately, before yielding the frame.
        drawFlight(burst.start);
        schedule();
      } else finishBurst();
    } catch (error) {
      // Never strand a disabled trigger after a rendering failure.
      finishBurst();
      console.error('Leaves coda:', error);
    }
  }

  function onScroll() { scrollDirty = true; schedule(); }
  function onResize() {
    if (burst) finishBurst();
    metricsDirty = true;
    schedule();
  }
  function suspend() {
    cancelAnimationFrame(frameRequest);
    frameRequest = 0;
    if (burst) finishBurst();
  }

  roots.forEach((root) => { root.dataset.leavesReady = ''; });
  story.dataset.leavesReady = '';
  story.dataset.leavesStage = '0';
  trigger.disabled = false;
  trigger.addEventListener('click', release);
  restart.addEventListener('click', restartStory);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('pagehide', suspend);
  window.addEventListener('pageshow', onResize);
  mobile.addEventListener('change', onResize);
  reduced.addEventListener('change', onResize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspend();
    else onResize();
  });
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(() => { metricsDirty = true; schedule(); });
    observer.observe(prose);
    const cover = story.querySelector('.archive-cover-card');
    if (cover) observer.observe(cover);
  }
  document.fonts?.ready.then(onResize);
  schedule();
}
