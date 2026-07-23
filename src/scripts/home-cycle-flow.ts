/*
 * Homepage cycle flow.
 *
 * Each connection belongs to the visually upper card at an adjacent boundary.
 * Its small liquid surface therefore travels with that card and naturally
 * passes over the lower card, while remaining under any card above its owner.
 */
(() => {
  const desktop = window.matchMedia(
    '(min-width: 861px) and (hover: hover) and (pointer: fine)',
  );
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fanElement = document.querySelector<HTMLElement>(
    '[data-home-cycle-fan][data-cycle-flux]',
  );

  if (!fanElement || !desktop.matches || reducedMotion.matches) return;

  const fan: HTMLElement = fanElement;
  const tiles = Array.from(
    fan.querySelectorAll<HTMLElement>(':scope > .tile'),
  );

  if (tiles.length < 2) return;

  type FlowState = {
    lift: number;
    tilt: number;
    poolX: number;
    poolY: number;
    neckReach: number;
    neckWidth: number;
    neckBend: number;
    dropReach: number;
    dropY: number;
    dropX: number;
    dropScale: number;
    radiusA: number;
    radiusB: number;
  };

  type FlowController = {
    node: HTMLElement;
    shape: HTMLElement;
    pool: HTMLElement;
    neck: HTMLElement;
    drop: HTMLElement;
    owner: HTMLElement;
    side: 'left' | 'right';
    ratio: number;
    state: FlowState;
    animations: Animation[];
  };

  const verticalPattern = [0.3, 0.68, 0.4, 0.64, 0.34, 0.7, 0.43];
  const controllers: FlowController[] = [];
  const svgNamespace = 'http://www.w3.org/2000/svg';
  let fanInView = false;
  let fanReady = fan.dataset.fanReady === 'true';
  let suspended = true;
  let resizeFrame = 0;

  const filterSvg = document.createElementNS(svgNamespace, 'svg');
  filterSvg.classList.add('cycle-flow-defs');
  filterSvg.setAttribute('aria-hidden', 'true');
  filterSvg.innerHTML = `
    <defs>
      <filter
        id="cycle-flow-goo"
        x="-55%"
        y="-55%"
        width="210%"
        height="210%"
        color-interpolation-filters="sRGB"
      >
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.65" result="soft" />
        <feColorMatrix
          in="soft"
          type="matrix"
          values="
            1 0 0 0 0
            0 1 0 0 0
            0 0 1 0 0
            0 0 0 16 -6.5
          "
          result="joined"
        />
        <feGaussianBlur in="joined" stdDeviation="0.22" />
      </filter>
    </defs>
  `;
  fan.append(filterSvg);

  function randomBetween(minimum: number, maximum: number) {
    return minimum + Math.random() * (maximum - minimum);
  }

  function nextState(): FlowState {
    return {
      lift: randomBetween(-3.4, 3.4),
      tilt: randomBetween(-5, 5),
      poolX: randomBetween(0.9, 1.1),
      poolY: randomBetween(0.88, 1.12),
      neckReach: randomBetween(0.72, 1.18),
      neckWidth: randomBetween(0.72, 1.1),
      neckBend: randomBetween(-2.8, 2.8),
      dropReach: randomBetween(0, 5.8),
      dropY: randomBetween(-4.2, 4.2),
      dropX: randomBetween(0.86, 1.13),
      dropScale: randomBetween(0.78, 1.12),
      radiusA: randomBetween(38, 62),
      radiusB: randomBetween(35, 65),
    };
  }

  function sideDirection(side: 'left' | 'right') {
    return side === 'right' ? 1 : -1;
  }

  function stateFrames(
    controller: FlowController,
    state: FlowState,
  ): {
    shape: Keyframe;
    pool: Keyframe;
    neck: Keyframe;
    drop: Keyframe;
  } {
    const direction = sideDirection(controller.side);

    return {
      shape: {
        transform: `translateY(${state.lift.toFixed(2)}px) rotate(${state.tilt.toFixed(2)}deg)`,
      },
      pool: {
        transform: `translateX(${(direction * state.neckBend * 0.22).toFixed(2)}px) scale(${state.poolX.toFixed(3)}, ${state.poolY.toFixed(3)})`,
        borderRadius: `${state.radiusA.toFixed(1)}% ${(100 - state.radiusA).toFixed(1)}% ${state.radiusB.toFixed(1)}% ${(100 - state.radiusB).toFixed(1)}% / ${(100 - state.radiusB).toFixed(1)}% ${state.radiusB.toFixed(1)}% ${(100 - state.radiusA).toFixed(1)}% ${state.radiusA.toFixed(1)}%`,
      },
      neck: {
        transform: `translate(${(direction * state.neckBend).toFixed(2)}px, ${(state.lift * -0.24).toFixed(2)}px) scale(${state.neckReach.toFixed(3)}, ${state.neckWidth.toFixed(3)}) rotate(${(state.tilt * 0.45).toFixed(2)}deg)`,
        borderRadius: `${state.radiusB.toFixed(1)}% ${(100 - state.radiusB).toFixed(1)}% ${(100 - state.radiusA).toFixed(1)}% ${state.radiusA.toFixed(1)}% / ${state.radiusA.toFixed(1)}% ${state.radiusB.toFixed(1)}% ${(100 - state.radiusB).toFixed(1)}% ${(100 - state.radiusA).toFixed(1)}%`,
      },
      drop: {
        transform: `translate(${(direction * state.dropReach).toFixed(2)}px, ${state.dropY.toFixed(2)}px) scale(${state.dropX.toFixed(3)}, ${state.dropScale.toFixed(3)}) rotate(${(state.tilt * -0.7).toFixed(2)}deg)`,
        borderRadius: `${state.radiusA.toFixed(1)}% ${(100 - state.radiusA).toFixed(1)}% ${state.radiusA.toFixed(1)}% ${(100 - state.radiusA).toFixed(1)}% / ${state.radiusB.toFixed(1)}% ${(100 - state.radiusB).toFixed(1)}% ${state.radiusB.toFixed(1)}% ${(100 - state.radiusB).toFixed(1)}%`,
      },
    };
  }

  function runFlow(controller: FlowController) {
    const from = stateFrames(controller, controller.state);
    const next = nextState();
    const to = stateFrames(controller, next);
    const duration = randomBetween(2600, 5200);
    const options: KeyframeAnimationOptions = {
      duration,
      easing: 'cubic-bezier(0.45, 0.05, 0.28, 0.98)',
      fill: 'forwards',
    };

    const previousAnimations = controller.animations;
    const animations = [
      controller.shape.animate([from.shape, to.shape], options),
      controller.pool.animate([from.pool, to.pool], options),
      controller.neck.animate([from.neck, to.neck], options),
      controller.drop.animate([from.drop, to.drop], options),
    ];

    controller.animations = animations;
    previousAnimations.forEach((animation) => animation.cancel());

    if (suspended) {
      animations.forEach((animation) => animation.pause());
    }

    animations[0]?.addEventListener(
      'finish',
      () => {
        if (controller.animations !== animations) return;
        controller.state = next;
        runFlow(controller);
      },
      { once: true },
    );
  }

  function coverGeometry(image: HTMLImageElement, media: HTMLElement) {
    const mediaWidth = media.offsetWidth;
    const mediaHeight = media.offsetHeight;
    const naturalWidth = image.naturalWidth || mediaWidth;
    const naturalHeight = image.naturalHeight || mediaHeight;
    const scale = Math.max(
      mediaWidth / naturalWidth,
      mediaHeight / naturalHeight,
    );
    const width = naturalWidth * scale;
    const height = naturalHeight * scale;

    return {
      width,
      height,
      x: (mediaWidth - width) / 2,
      y: (mediaHeight - height) / 2,
    };
  }

  function syncSurface(controller: FlowController) {
    const media = controller.owner.querySelector<HTMLElement>('.tile-media');
    const image = media?.querySelector<HTMLImageElement>('img');
    if (!media || !image) return;

    const nodeTop = Math.round(
      media.offsetHeight * controller.ratio -
        controller.node.offsetHeight / 2,
    );
    const nodeLeft =
      controller.side === 'right'
        ? controller.owner.offsetWidth - 24
        : -22;
    const geometry = coverGeometry(image, media);
    const source = image.currentSrc || image.src;

    controller.node.style.top = `${nodeTop}px`;

    [controller.pool, controller.neck, controller.drop].forEach((piece) => {
      const pieceX = nodeLeft + piece.offsetLeft;
      const pieceY = nodeTop + piece.offsetTop;

      piece.style.backgroundColor = '#4b4b4b';
      piece.style.backgroundImage = `url("${source.replaceAll('"', '\\"')}")`;
      piece.style.backgroundSize = `${geometry.width.toFixed(2)}px ${geometry.height.toFixed(2)}px`;
      piece.style.backgroundPosition = `${(geometry.x - pieceX).toFixed(2)}px ${(geometry.y - pieceY).toFixed(2)}px`;
      piece.style.backgroundRepeat = 'no-repeat';
    });
  }

  function makeController(
    leftTile: HTMLElement,
    rightTile: HTMLElement,
    boundary: number,
  ) {
    const leftZ =
      Number.parseInt(window.getComputedStyle(leftTile).zIndex, 10) || 0;
    const rightZ =
      Number.parseInt(window.getComputedStyle(rightTile).zIndex, 10) || 0;
    const owner = leftZ > rightZ ? leftTile : rightTile;
    const side: 'left' | 'right' = owner === leftTile ? 'right' : 'left';
    const node = document.createElement('span');
    const shape = document.createElement('span');
    const pool = document.createElement('span');
    const neck = document.createElement('span');
    const drop = document.createElement('span');

    node.className = `cycle-flow-node cycle-flow-node--${side}`;
    node.dataset.flowBoundary = String(boundary);
    node.setAttribute('aria-hidden', 'true');
    shape.className = 'cycle-flow-shape';
    pool.className = 'cycle-flow-piece cycle-flow-pool';
    neck.className = 'cycle-flow-piece cycle-flow-neck';
    drop.className = 'cycle-flow-piece cycle-flow-drop';
    shape.append(pool, neck, drop);
    node.append(shape);
    owner.append(node);

    const controller: FlowController = {
      node,
      shape,
      pool,
      neck,
      drop,
      owner,
      side,
      ratio: verticalPattern[boundary] ?? 0.5,
      state: nextState(),
      animations: [],
    };

    const image = owner.querySelector<HTMLImageElement>('.tile-media img');
    if (image && !image.complete) {
      image.addEventListener('load', () => syncSurface(controller), {
        once: true,
      });
    }

    syncSurface(controller);
    runFlow(controller);
    controllers.push(controller);
  }

  function hasDeliberateFocus() {
    return tiles.some((tile) =>
      tile.matches('.is-fan-focus, :hover, :focus-visible, :focus-within'),
    );
  }

  function syncSuspension() {
    const shouldSuspend =
      !fanReady ||
      !fanInView ||
      document.hidden ||
      !desktop.matches ||
      reducedMotion.matches ||
      fan.classList.contains('is-fan-pending') ||
      fan.classList.contains('is-fan-entering') ||
      hasDeliberateFocus();

    if (shouldSuspend === suspended) return;
    suspended = shouldSuspend;
    fan.classList.toggle('is-cycle-flow-suspended', suspended);

    controllers.forEach((controller) => {
      controller.animations.forEach((animation) => {
        if (suspended) {
          animation.pause();
        } else {
          animation.play();
        }
      });
    });
  }

  function scheduleGeometrySync() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      controllers.forEach(syncSurface);
    });
  }

  for (let index = 0; index < tiles.length - 1; index += 1) {
    const leftTile = tiles[index];
    const rightTile = tiles[index + 1];
    if (leftTile && rightTile) {
      makeController(leftTile, rightTile, index);
    }
  }

  fan.classList.add('has-cycle-flow', 'is-cycle-flow-suspended');

  fan.addEventListener('home-cycle-fan-ready', () => {
    fanReady = true;
    scheduleGeometrySync();
    syncSuspension();
  });
  fan.addEventListener('pointerover', syncSuspension);
  fan.addEventListener('pointerout', () => {
    window.setTimeout(syncSuspension);
  });
  fan.addEventListener('focusin', syncSuspension);
  fan.addEventListener('focusout', () => {
    window.setTimeout(syncSuspension);
  });

  window.addEventListener('resize', scheduleGeometrySync, { passive: true });
  desktop.addEventListener?.('change', syncSuspension);
  reducedMotion.addEventListener?.('change', syncSuspension);
  document.addEventListener('visibilitychange', syncSuspension);

  const visibilityObserver = new IntersectionObserver(
    (entries) => {
      fanInView = entries.some((entry) => entry.isIntersecting);
      syncSuspension();
    },
    { threshold: 0.08 },
  );

  visibilityObserver.observe(fan);
  syncSuspension();
})();
