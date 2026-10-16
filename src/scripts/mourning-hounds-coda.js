// One controller for this story's cover, header, and tablet instances.
// This module is emitted only by the story component, not the shared layout.
const story = document.querySelector('[data-mh-story]');
const prose = story?.querySelector('.archive-prose');
const trails = Array.from(document.querySelectorAll('[data-mh-coda]'));
const paragraphs = prose ? Array.from(prose.querySelectorAll(':scope > p')) : [];
const opening = paragraphs[0];
const ending = paragraphs.at(-1);

if (story && prose && opening && ending && trails.length) {
  const openingText = 'The man’s five hounds are restless';
  const endingText = 'He’s had enough of his senses for today.';

  // Fail closed if the prose changes. Never search the title or other stories.
  if (opening.textContent.startsWith(openingText) && ending.textContent.trimEnd().endsWith(endingText)) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const header = document.querySelector('[data-site-header]');
    const coverSlot = story.querySelector('.mourning-hounds-cover-slot');
    const desktopTrail = trails.find((trail) => trail.dataset.mhCoda === 'desktop');
    const footer = document.querySelector('.site-footer');
    const steps = trails.map((trail) => Array.from(trail.querySelectorAll('[data-mh-step]')));
    const returnButtons = trails.flatMap((trail) => Array.from(trail.querySelectorAll('.mh-return')));

    // The original text node is never replaced by the alternate word. The
    // echo is CSS-generated on an aria-hidden layer, preserving copying and
    // screen-reader text. The two layers reserve the wider word's natural
    // width, avoiding both compressed letters and movement during a swap.
    function wrapWord(paragraph, word, echo, offset) {
      const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
      let node;
      let consumed = 0;
      while ((node = walker.nextNode())) {
        if (offset >= consumed && offset + word.length <= consumed + node.length) {
          const target = node.splitText(offset - consumed);
          if (!target.data.startsWith(word)) return null;
          target.splitText(word.length);
          const wrapper = document.createElement('span');
          wrapper.className = 'mh-word';
          const original = document.createElement('span');
          original.className = 'mh-original';
          const alternate = document.createElement('span');
          alternate.className = 'mh-echo';
          alternate.setAttribute('aria-hidden', 'true');
          alternate.dataset.mhEcho = echo;
          const toggle = document.createElement('button');
          toggle.type = 'button';
          toggle.className = 'mh-word-toggle';
          toggle.hidden = true;
          target.before(wrapper);
          original.append(target);
          wrapper.append(original, alternate, toggle);
          return wrapper;
        }
        consumed += node.length;
      }
      return null;
    }

    const firstWord = wrapWord(opening, 'hounds', 'senses', openingText.indexOf('hounds'));
    const lastWord = wrapWord(ending, 'senses', 'hounds', ending.textContent.lastIndexOf('senses'));

    if (firstWord && lastWord) {
      trails.forEach((trail) => { trail.dataset.mhReady = ''; });
      let laid = 0;
      let endPlayed = false;
      let endingVisible = false;
      let invitationTimer = 0;
      let echoTimer = 0;
      let echoEndTimer = 0;
      let activeWord = null;
      let progressFrame = 0;
      let returnFrame = 0;
      let returning = false;
      let openingTop = 0;
      let endingBottom = 1;
      let headerHeight = 72;
      let coverHeight = 0;
      let coverStart = 0;
      let coverEnd = 0;
      let footerTop = Infinity;
      let trailHeight = -1;

      const updateWordControl = (word) => {
        const original = word.querySelector('.mh-original').textContent;
        const echo = word.querySelector('.mh-echo').dataset.mhEcho;
        const changed = word.classList.contains('is-echo');
        const button = word.querySelector('.mh-word-toggle');
        if (word === lastWord && !endPlayed && !reducedMotion.matches) {
          button.setAttribute('aria-label', `${original}. Start word sequence.`);
          return;
        }
        button.setAttribute('aria-label', `${changed ? echo : original}. Change to ${changed ? original : echo}.`);
      };
      const unlockWord = (word) => {
        updateWordControl(word);
        word.querySelector('.mh-word-toggle').hidden = false;
      };
      const clearInvitation = () => {
        window.clearTimeout(invitationTimer);
        invitationTimer = 0;
        lastWord.classList.remove('is-inviting');
      };
      const scheduleInvitation = () => {
        clearInvitation();
        if (!endingVisible || endPlayed || returning || document.hidden) return;
        // Let the reader rest with the ending in view for a few heartbeats.
        // This reveals only a cue. The words never alternate without a click.
        invitationTimer = window.setTimeout(() => {
          invitationTimer = 0;
          if (!endingVisible || endPlayed || returning || document.hidden) return;
          unlockWord(lastWord);
          lastWord.classList.add('is-inviting');
        }, 2400);
      };

      const clearEcho = () => {
        window.clearTimeout(echoTimer);
        window.clearTimeout(echoEndTimer);
        if (activeWord) {
          activeWord.classList.remove('is-echo');
          unlockWord(activeWord);
          activeWord = null;
        }
      };

      const playEcho = (word) => {
        clearEcho();
        if (reducedMotion.matches) { unlockWord(word); return; }
        if (document.hidden) return;
        activeWord = word;
        const toggle = () => {
          word.classList.toggle('is-echo');
          updateWordControl(word);
          echoTimer = window.setTimeout(toggle, 1000);
        };
        toggle();
        echoEndTimer = window.setTimeout(clearEcho, 10000);
      };

      // The first ending click starts its sequence. Later clicks choose a
      // reading directly. The opening sequence still starts on paw return.
      for (const word of [firstWord, lastWord]) {
        updateWordControl(word);
        word.querySelector('.mh-word-toggle').addEventListener('click', () => {
          if (word === lastWord && !endPlayed) {
            endPlayed = true;
            clearInvitation();
            if (!reducedMotion.matches) { playEcho(word); return; }
            // Reduced motion keeps the same manual choice without cycling.
          }
          const showEcho = !word.classList.contains('is-echo');
          clearEcho();
          word.classList.toggle('is-echo', showEcho);
          updateWordControl(word);
        });
      }

      const reveal = (count) => {
        if (count <= laid) return;
        laid = count;
        for (const trailSteps of steps) {
          trailSteps.forEach((step, index) => {
            step.classList.toggle('is-laid', index < laid);
            step.classList.toggle('is-latest', index === laid - 1);
          });
        }
        for (const button of returnButtons) button.disabled = laid < 5;
        if (laid === 5) trails.forEach((trail) => trail.classList.add('is-complete'));
      };

      // Layout is measured on load/resize/font changes, not every scroll.
      const measure = () => {
        openingTop = window.scrollY + opening.getBoundingClientRect().top;
        endingBottom = window.scrollY + lastWord.getBoundingClientRect().bottom;
        headerHeight = header?.getBoundingClientRect().height || 72;
        if (coverSlot && desktopTrail && window.innerWidth > 860) {
          const body = prose.parentElement.getBoundingClientRect();
          coverHeight = coverSlot.getBoundingClientRect().height;
          coverStart = window.scrollY + body.top;
          coverEnd = window.scrollY + body.bottom;
          footerTop = footer ? window.scrollY + footer.getBoundingClientRect().top : Infinity;
        }
        scheduleProgress();
        scheduleInvitation();
      };

      const updateProgress = () => {
        progressFrame = 0;
        if (desktopTrail && coverHeight && window.innerWidth > 860) {
          // Follow CSS sticky positioning using cached geometry. The cover
          // keeps its normal 96px inset; only the space below it adapts.
          const coverBottom = Math.min(
            Math.max(coverStart - window.scrollY, 96) + coverHeight,
            coverEnd - window.scrollY
          );
          const bottom = Math.min(window.innerHeight, footerTop - window.scrollY) - 20;
          const available = Math.max(0, Math.min(352, Math.floor(bottom - coverBottom - 20)));
          if (available !== trailHeight) {
            trailHeight = available;
            desktopTrail.style.setProperty('--mh-trail-height', `${available}px`);
          }
        }
        // Read against a line near the bottom of the viewport. The final
        // print is reserved for the actual ending entering view.
        const progress = (window.scrollY + window.innerHeight * 0.82 - openingTop) /
          Math.max(1, endingBottom - openingTop);
        if (window.scrollY > 24) {
          reveal([0.05, 0.29, 0.53, 0.77].filter((threshold) => progress >= threshold).length);
        }
      };
      function scheduleProgress() {
        if (!progressFrame && !document.hidden) progressFrame = requestAnimationFrame(updateProgress);
      }

      const endObserver = new IntersectionObserver((entries) => {
        endingVisible = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 1);
        if (endingVisible) reveal(5);
        scheduleInvitation();
      }, { threshold: 1, rootMargin: '-90px 0px -24px 0px' });
      endObserver.observe(lastWord);

      const cancelReturn = () => {
        const wasReturning = returning;
        returning = false;
        cancelAnimationFrame(returnFrame);
        returnFrame = 0;
        if (wasReturning) scheduleInvitation();
      };
      const returnToOpening = () => {
        if (returning || laid < 5) return;
        clearEcho();
        measure();
        const target = Math.max(0, Math.min(
          openingTop - headerHeight - 24,
          document.documentElement.scrollHeight - window.innerHeight
        ));
        returning = true;
        clearInvitation();
        const deadline = performance.now() + 4000;
        window.scrollTo({ top: target, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
        const arrive = () => {
          if (!returning) return;
          if (Math.abs(window.scrollY - target) <= 2) {
            cancelReturn();
            opening.setAttribute('tabindex', '-1');
            opening.focus({ preventScroll: true });
            playEcho(firstWord);
          } else if (performance.now() < deadline) {
            returnFrame = requestAnimationFrame(arrive);
          } else {
            cancelReturn(); // Never play the opening effect after an interrupted return.
          }
        };
        returnFrame = requestAnimationFrame(arrive);
      };

      returnButtons.forEach((button) => button.addEventListener('click', returnToOpening));
      window.addEventListener('scroll', () => {
        scheduleProgress();
        if (endingVisible && !endPlayed) scheduleInvitation();
      }, { passive: true });
      window.addEventListener('resize', measure);
      window.addEventListener('wheel', cancelReturn, { passive: true });
      window.addEventListener('touchstart', cancelReturn, { passive: true });
      window.addEventListener('keydown', (event) => {
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape'].includes(event.key)) cancelReturn();
        if (event.key === 'Escape') { clearEcho(); clearInvitation(); }
      });
      const pause = () => {
        clearEcho();
        cancelReturn();
        clearInvitation();
        cancelAnimationFrame(progressFrame);
        progressFrame = 0;
      };
      document.addEventListener('visibilitychange', () => {
        document.documentElement.classList.toggle('mh-coda-paused', document.hidden);
        if (document.hidden) pause();
        else measure();
      });
      reducedMotion.addEventListener('change', () => {
        clearEcho();
        [firstWord, lastWord].forEach(updateWordControl);
      });
      window.addEventListener('pagehide', pause);
      window.addEventListener('pageshow', measure);
      if ('ResizeObserver' in window) {
        const layoutObserver = new ResizeObserver(measure);
        layoutObserver.observe(prose);
        if (coverSlot) layoutObserver.observe(coverSlot);
        if (header) layoutObserver.observe(header);
      }
      document.fonts.ready.then(measure);
      measure();
    }
  }
}
