import { clamp } from '../lib/motion';

/* Mobile adaptation of home-cycle-flux: the same cached noise, additive
   lobe fields, reciprocal tongues and seam film. Desktop stays untouched.
   Only two small 1x canvases paint, with all image reads outside the loop. */
type Bounds = { left: number; top: number; width: number; height: number };
type TongueProfile = { phase: number; radii: { rx: number; ry: number }[] };
type Cover = {
  tile: HTMLElement; image: HTMLImageElement; media: DOMRect; imageBox: DOMRect;
  active: boolean; textTop: number;
};
type Spot = Bounds & {
  tx: number; ty: number; nx: number; ny: number; gap: number;
  cx: number; cy: number; drift: number; speedA: number; speedB: number;
  exchangeW: number; seed: number; phase: number;
  tongueA: TongueProfile[]; tongueB: TongueProfile[];
  lobA: Float32Array; lobB: Float32Array; filmLow: Float32Array; filmHigh: Float32Array;
  low: Uint8ClampedArray; high: Uint8ClampedArray;
  base: Uint8ClampedArray; composite: Uint8ClampedArray;
  ctx: CanvasRenderingContext2D; pixels: ImageData; noiseX: number; noiseY: number;
};
export type MobileFluxController = {
  moving(): void;
  settled(left: HTMLElement, active: HTMLElement, right: HTMLElement): void;
  suspend(): void;
  discard(): void;
};

const LIQUID_TIME_SCALE = 1.9;
const PAINT_INTERVAL = 1000 / 30 - 1;
const R = 34;
const ZONE_TANGENT_SCALE = 1.65;
// The phone has a real gap; allow a little more room across that seam.
const ZONE_NORMAL_SCALE = 0.68;
const WARP_BASE = 14;
const WARP_VARIATION = 4;
const WARP_PADDING = (WARP_BASE + WARP_VARIATION) / 2 + 2;
const NOISE_TRAVEL_X = 8;
const NOISE_TRAVEL_Y = 9;
const SAMPLE_PADDING = 31;
const NOISE_SIZE = 256;
const NOISE_PADDING = 11;
const DISSOLVE_MS = 420;
const CACHE_LIMIT = 4; // Four active cycles, at most eight small cached zones.
const CONTACT_HEIGHT: Record<string, number> = {
  'conscription:portici': 0.34, 'portici:the-real': 0.54,
  'the-real:dreams': 0.33, 'dreams:mythbreaking': 0.52,
  'mythbreaking:fools-gold': 0.34, 'fools-gold:valentines-star': 0.53,
  'valentines-star:mythmaking': 0.32, 'mythmaking:conscription': 0.52,
};

function pairSeed(key: string) {
  let seed = 2166136261;
  for (let i = 0; i < key.length; i++) seed = Math.imul(seed ^ key.charCodeAt(i), 16777619);
  return seed >>> 0;
}

function makeNoise() {
  const hash = (x: number, y: number, seed: number) => {
    const key = Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed;
    return (Math.imul(key ^ (key >>> 13), 1274126177) >>> 0) / 4294967296;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const value = (x: number, y: number, seed: number) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const u = smooth(x - ix), v = smooth(y - iy);
    const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed);
    const c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
  };
  const noise = new Float32Array(NOISE_SIZE * NOISE_SIZE * 2);
  const seeds = [143, 1103];
  let index = 0;
  for (let y = 0; y < NOISE_SIZE; y++) {
    for (let x = 0; x < NOISE_SIZE; x++) {
      for (const seed of seeds) {
        noise[index++] = (2 * value(x * 0.028, y * 0.05, seed) +
          value(x * 0.056, y * 0.1, seed + 317)) / 3 - 0.5;
      }
    }
  }
  return noise;
}

function paintLobe(s: Spot, mask: Float32Array, x: number, y: number, rx: number, ry: number) {
  if (rx < 0.4 || ry < 0.4) return;
  const cx = x - s.left - 0.5, cy = y - s.top - 0.5;
  const reachX = 1.4 * Math.hypot(s.tx * rx, s.nx * ry);
  const reachY = 1.4 * Math.hypot(s.ty * rx, s.ny * ry);
  const left = Math.max(0, Math.ceil(cx - reachX));
  const right = Math.min(s.width - 1, Math.floor(cx + reachX));
  const top = Math.max(0, Math.ceil(cy - reachY));
  const bottom = Math.min(s.height - 1, Math.floor(cy + reachY));
  const du = s.tx / (rx * 1.4), dv = s.nx / (ry * 1.4);
  for (let row = top; row <= bottom; row++) {
    let u = (left - cx) * du + (row - cy) * s.ty / (rx * 1.4);
    let v = (left - cx) * dv + (row - cy) * s.ny / (ry * 1.4);
    for (let col = left, at = row * s.width + left; col <= right; col++, at++) {
      const field = 1 - u * u - v * v;
      if (field > 0) mask[at] += field * field;
      u += du;
      v += dv;
    }
  }
}

function interpolate(
  data: Float32Array | Uint8ClampedArray,
  at: number, stride: number, u: number, v: number, step = 2,
) {
  const a = data[at], b = data[at + stride];
  return (a + (data[at + step] - a) * u) * (1 - v) +
    (b + (data[at + stride + step] - b) * u) * v;
}

function makeTongueProfiles(seed: number, reverse: boolean): TongueProfile[] {
  return Array.from({ length: 3 }, (_, index) => {
    const phase = reverse ? seed + 4 + index * 1.47 : seed + index * 1.57;
    const radii = Array.from({ length: 5 }, (_, lobe) => {
      const k = lobe + 1;
      return {
        rx: 0.64 + 0.1 * (reverse ? Math.cos(phase + k) : Math.sin(phase + k)),
        ry: 1.18 + 0.16 * (reverse ? Math.sin(phase + k * 1.2) : Math.cos(phase + k * 1.3)),
      };
    });
    return { phase, radii };
  });
}

function tongues(
  s: Spot,
  px: number,
  py: number,
  time: number,
  exchange: number,
  strength: number,
) {
  /* Reciprocal pressure makes the contact legible as an exchange: the
     lower card reaches farther, then the upper card answers. Neither
     side ever goes fully still, so the flux remains ambient. */
  const driveA = 0.78 + 0.4 * exchange;
  const driveB = 0.78 - 0.4 * exchange;
  for (let i = 0; i < 3; i++) {
    const profile = s.tongueA[i];
    const ph = profile.phase;
    const along = (i - 1) * 9 + 6 * Math.sin(time * 0.72 * s.speedA + ph);
    const reach =
      clamp(0.62 + 0.38 * Math.sin(time * 0.78 * s.speedA + ph), 0.18, 1) *
      driveA *
      strength;
    const len = 12 + reach * 38;
    const bx = px + s.tx * along + s.nx * (s.gap / 2 + 3);
    const by = py + s.ty * along + s.ny * (s.gap / 2 + 3);
    const root = 4.6 + reach * 2.9;
    paintLobe(s, s.lobA, bx, by, root * 0.78, root * 1.28);
    for (let k = 1; k <= 5; k++) {
      const f = k / 5;
      const w =
        7 * Math.sin(time * 0.93 * s.speedA + ph + k * 0.86) +
        2.2 * Math.sin(time * 0.41 * s.speedB + ph * 1.7 + k);
      const r = root * (1 - 0.56 * f);
      paintLobe(
        s, s.lobA,
        bx - s.nx * len * f + s.tx * w * 0.58,
        by - s.ny * len * f + s.ty * w * 0.58,
        r * profile.radii[k - 1].rx,
        r * profile.radii[k - 1].ry,
      );
    }
  }
  for (let i = 0; i < 3; i++) {
    const profile = s.tongueB[i];
    const ph = profile.phase;
    const along = (i - 1) * 9 + 6 * Math.sin(time * 0.69 * s.speedB + ph);
    const reach =
      clamp(0.62 + 0.38 * Math.sin(time * 0.84 * s.speedB + ph), 0.18, 1) *
      driveB *
      strength;
    const len = 12 + reach * 37;
    const bx = px + s.tx * along - s.nx * (s.gap / 2 + 3);
    const by = py + s.ty * along - s.ny * (s.gap / 2 + 3);
    const root = 4.6 + reach * 2.9;
    paintLobe(s, s.lobB, bx, by, root * 0.78, root * 1.28);
    for (let k = 1; k <= 5; k++) {
      const f = k / 5;
      const w =
        7 * Math.sin(time * 0.88 * s.speedB + ph + k * 0.9) +
        2.2 * Math.sin(time * 0.44 * s.speedA + ph * 1.6 + k);
      const r = root * (1 - 0.54 * f);
      paintLobe(
        s, s.lobB,
        bx + s.nx * len * f + s.tx * w * 0.58,
        by + s.ny * len * f + s.ty * w * 0.58,
        r * profile.radii[k - 1].rx,
        r * profile.radii[k - 1].ry,
      );
    }
  }
}

function film(s: Spot, px: number, py: number, time: number, exchange: number, strength: number) {
  const driveL = (0.86 + 0.34 * exchange) * strength;
  const driveH = (0.86 - 0.34 * exchange) * strength;
  for (let k = -3; k <= 3; k++) {
    const off = k * 8.5 + 3.6 * Math.sin(time * 0.7 * s.speedB + s.seed + k);
    const wob = 2.4 * Math.sin(time * 0.96 * s.speedA + k * 2.1 + s.phase);
    const rl =
      (2.2 + 2 * (0.5 + 0.5 * Math.sin(time * 1.02 * s.speedA + k * 1.3 + s.seed))) * driveL;
    const rh =
      (2.2 + 2 * (0.5 + 0.5 * Math.sin(time * 1.08 * s.speedB + k * 1.5 + s.seed + 5))) * driveH;
    paintLobe(
      s, s.filmLow,
      px + s.tx * off - s.nx * (2.8 + wob),
      py + s.ty * off - s.ny * (2.8 + wob),
      Math.max(rl * 1.55, 0.1),
      Math.max(rl * 0.68, 0.1),
    );
    paintLobe(
      s, s.filmHigh,
      px + s.tx * off + s.nx * (2.8 - wob),
      py + s.ty * off + s.ny * (2.8 - wob),
      Math.max(rh * 1.55, 0.1),
      Math.max(rh * 0.68, 0.1),
    );
  }
}

function coverSamples(scratch: HTMLCanvasElement, cover: Cover, bounds: Bounds, ox: number, oy: number) {
  const width = bounds.width + SAMPLE_PADDING * 2;
  const height = bounds.height + SAMPLE_PADDING * 2;
  scratch.width = width;
  scratch.height = height;
  const ctx = scratch.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const { image, media, imageBox, active } = cover;
  const x = media.left - ox, y = media.top - oy;
  ctx.translate(SAMPLE_PADDING - bounds.left, SAMPLE_PADDING - bounds.top);
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, media.width, media.height, 8);
  else ctx.rect(x, y, media.width, media.height);
  ctx.clip();
  // The settled image box includes the existing 1.014 focus scale. Draw its
  // object-fit crop, then clip against the unscaled media just like the CSS.
  const scale = Math.max(imageBox.width / image.naturalWidth, imageBox.height / image.naturalHeight);
  const sw = imageBox.width / scale, sh = imageBox.height / scale;
  ctx.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) / 2,
    sw, sh, imageBox.left - ox, imageBox.top - oy, imageBox.width, imageBox.height);
  let rgba: Uint8ClampedArray;
  try { rgba = ctx.getImageData(0, 0, width, height).data; } catch { return null; }
  for (let row = 0, p = 0; row < height; row++) {
    // .tile-overlay darkens the WHOLE active photo, not only the text area.
    // Match its current black .10 -> .86 gradient without canvas.filter,
    // which is not available in every Safari version.
    const position = clamp((bounds.top - SAMPLE_PADDING + row + 0.5 - y) / media.height, 0, 1);
    const shade = active ? 1 - (0.10 + 0.76 * position) : 1;
    for (let col = 0; col < width; col++, p += 4) {
      const alpha = rgba[p + 3] / 255;
      const gray = rgba[p] * 0.213 + rgba[p + 1] * 0.715 + rgba[p + 2] * 0.072;
      for (let c = 0; c < 3; c++) {
        const value = active ? rgba[p + c] * 0.9984 - 5.1 : gray * 0.651 - 6.375;
        rgba[p + c] = clamp(value, 0, 255) * shade * alpha;
      }
    }
  }
  return rgba;
}

function restingSamples(low: Uint8ClampedArray, high: Uint8ClampedArray, bounds: Bounds) {
  const base = new Uint8ClampedArray(bounds.width * bounds.height * 4);
  const stride = (bounds.width + SAMPLE_PADDING * 2) * 4;
  for (let y = 0, p = 0; y < bounds.height; y++) {
    let source = (y + SAMPLE_PADDING) * stride + SAMPLE_PADDING * 4;
    for (let x = 0; x < bounds.width; x++, source += 4, p += 4) {
      const under = 1 - high[source + 3] / 255;
      for (let c = 0; c < 4; c++) base[p + c] = high[source + c] + low[source + c] * under;
    }
  }
  return base;
}

function transfer(s: Spot, mask: Float32Array, donor: Uint8ClampedArray, travel: number) {
  const dx = -s.nx * travel, dy = -s.ny * travel;
  const ix = Math.floor(dx), iy = Math.floor(dy);
  const stride = (s.width + SAMPLE_PADDING * 2) * 4;
  const u = dx - ix, v = dy - iy;
  for (let y = 0, p = 0; y < s.height; y++) {
    let source = (y + iy + SAMPLE_PADDING) * stride + (ix + SAMPLE_PADDING) * 4;
    for (let x = 0; x < s.width; x++, source += 4, p++) {
      const coverage = mask[p];
      if (coverage <= 0.19) continue;
      const maskAlpha = Math.min(1, (coverage - 0.19) * 9);
      const alpha = interpolate(donor, source + 3, stride, u, v, 4) * maskAlpha;
      if (alpha <= 0) continue;
      const under = 1 - alpha / 255, q = p * 4;
      for (let c = 0; c < 3; c++) {
        s.composite[q + c] = interpolate(donor, source + c, stride, u, v, 4) * maskAlpha + s.composite[q + c] * under;
      }
      s.composite[q + 3] = alpha + s.composite[q + 3] * under;
    }
  }
}

function reveal(s: Spot, noise: Float32Array, px: number, py: number, time: number) {
  const { width, height, composite, pixels } = s;
  const out = pixels.data;
  const warp = WARP_BASE + WARP_VARIATION * Math.sin(time * 0.52 * s.speedA + s.phase);
  const noiseX = s.noiseX - NOISE_TRAVEL_X * Math.sin(time * 0.48 * s.speedB + s.phase);
  const noiseY = s.noiseY - NOISE_TRAVEL_Y * Math.cos(time * 0.41 * s.speedB + s.phase);
  const ix = Math.floor(noiseX), iy = Math.floor(noiseY);
  const nu = noiseX - ix, nv = noiseY - iy;
  const tangent = R * ZONE_TANGENT_SCALE, normal = R * ZONE_NORMAL_SCALE;
  for (let y = 0, p = 0; y < height; y++) {
    const u = (s.top + y + 0.5 - py) / tangent;
    let n = ((y + iy) * NOISE_SIZE + ix) * 2;
    for (let x = 0; x < width; x++, p += 4, n += 2) {
      const v = (s.left + x + 0.5 - px) / normal;
      const radius = u * u + v * v;
      out[p + 3] = 0;
      if (radius >= 1) continue;
      const sx = x + warp * interpolate(noise, n, NOISE_SIZE * 2, nu, nv);
      const sy = y + warp * interpolate(noise, n + 1, NOISE_SIZE * 2, nu, nv);
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      if (x0 < 0 || y0 < 0 || x0 >= width - 1 || y0 >= height - 1) continue;
      const at = (y0 * width + x0) * 4;
      const alpha = interpolate(composite, at + 3, width * 4, sx - x0, sy - y0, 4);
      if (alpha <= 0) continue;
      for (let c = 0; c < 3; c++) {
        out[p + c] = interpolate(composite, at + c, width * 4, sx - x0, sy - y0, 4) * 255 / alpha;
      }
      out[p + 3] = alpha * (radius <= 0.62 ** 2 ? 1 : (1 - Math.sqrt(radius)) / 0.38);
    }
  }
  s.ctx.putImageData(pixels, 0, 0);
}

function readCover(tile: HTMLElement, active: HTMLElement): Cover | null {
  const image = tile.querySelector<HTMLImageElement>('.tile-media img');
  const media = tile.querySelector<HTMLElement>('.tile-media');
  if (!image?.complete || !image.naturalWidth || !media) return null;
  return {
    tile, image, media: media.getBoundingClientRect(), imageBox: image.getBoundingClientRect(),
    active: tile === active,
    textTop: tile === active
      ? tile.querySelector<HTMLElement>('.tile-blurb')?.getBoundingClientRect().top ?? Infinity
      : Infinity,
  };
}

function makeSpot(scratch: HTMLCanvasElement, lowCover: Cover, highCover: Cover, ox: number, oy: number): Spot | null {
  const key = `${lowCover.tile.dataset.cycleId}:${highCover.tile.dataset.cycleId}`;
  const hash = pairSeed(key), seed = (hash % 10000) / 1000, phase = (hash % 10000) / 100;
  const gap = highCover.media.left - lowCover.media.right;
  // Unsupported geometry keeps an ordinary working gallery.
  if (gap < 0 || gap > 20) return null;
  const cx = (lowCover.media.right + highCover.media.left) / 2 - ox;
  const mediaTop = Math.max(lowCover.media.top, highCover.media.top);
  const mediaBottom = Math.min(lowCover.media.bottom, highCover.media.bottom);
  const safeBottom = Math.min(mediaBottom - 12, lowCover.textTop - 12, highCover.textTop - 12);
  const extentY = R * ZONE_TANGENT_SCALE + 8 + WARP_PADDING;
  const minY = mediaTop + 45 + extentY, maxY = safeBottom - extentY;
  if (maxY < minY) return null;
  const cy = clamp(mediaTop + (mediaBottom - mediaTop) * (CONTACT_HEIGHT[key] ?? 0.43), minY, maxY) - oy;
  const extentX = R * ZONE_NORMAL_SCALE + WARP_PADDING;
  const left = Math.floor(cx - extentX), top = Math.floor(cy - extentY);
  const width = Math.ceil(cx + extentX) - left, height = Math.ceil(cy + extentY) - top;
  const bounds = { left, top, width, height };
  const low = coverSamples(scratch, lowCover, bounds, ox, oy);
  const high = coverSamples(scratch, highCover, bounds, ox, oy);
  if (!low || !high) return null;
  const canvas = document.createElement('canvas');
  canvas.className = 'home-cycle-mobile-flux';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.width = width; canvas.height = height;
  canvas.style.left = `${left}px`; canvas.style.top = `${top}px`;
  // Deliberately one backing pixel per CSS pixel, also on high-DPR phones.
  canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
  canvas.style.setProperty('--mobile-flux-duration', `${DISSOLVE_MS}ms`);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  return {
    ...bounds, cx, cy, gap, tx: 0, ty: 1, nx: -1, ny: 0, drift: 4 + seed % 4,
    speedA: 0.78 + seed % 0.4, speedB: 0.75 + seed % 0.42,
    exchangeW: 0.62 + seed % 0.38, seed, phase,
    tongueA: makeTongueProfiles(seed, false), tongueB: makeTongueProfiles(seed, true),
    lobA: new Float32Array(width * height), lobB: new Float32Array(width * height),
    filmLow: new Float32Array(width * height), filmHigh: new Float32Array(width * height),
    low, high, base: restingSamples(low, high, bounds), composite: new Uint8ClampedArray(width * height * 4),
    ctx, pixels: ctx.createImageData(width, height),
    noiseX: NOISE_PADDING + hash % (NOISE_SIZE - width - NOISE_PADDING * 2),
    noiseY: NOISE_PADDING + (hash >>> 8) % (NOISE_SIZE - height - NOISE_PADDING * 2),
  };
}

type Layer = { host: HTMLElement; spots: Spot[]; key: string; painted: boolean };

export function mountMobileCycleFlux(grid: HTMLElement, eligible: MediaQueryList): MobileFluxController {
  let requested: [HTMLElement, HTMLElement, HTMLElement] | undefined;
  let current: Layer | undefined, outgoing: Layer | undefined;
  const cache = new Map<string, Spot[]>();
  let noise: Float32Array | undefined;
  let onScreen = false, running = false, pageActive = true;
  let raf = 0, started = 0, elapsed = 0, previousFrame = 0, revision = 0, preparing = 0;
  let outgoingTimer = 0, resizeTimer = 0;
  let width = grid.clientWidth;

  function stop() {
    if (running) elapsed = performance.now() - started;
    running = false;
    cancelAnimationFrame(raf);
  }

  function invalidate() {
    revision++;
    preparing = 0;
    stop();
  }

  function refreshHost(host: HTMLElement) {
    if (!host.querySelector('.home-cycle-mobile-flux')) {
      host.classList.remove('is-mobile-flux-host', 'is-mobile-flux-visible');
    }
  }

  function release(layer: Layer | undefined) {
    if (!layer) return;
    layer.spots.forEach(({ ctx }) => {
      ctx.canvas.remove();
      ctx.canvas.className = 'home-cycle-mobile-flux';
      ctx.canvas.style.removeProperty('--mobile-flux-from');
    });
    refreshHost(layer.host);
  }

  function dropOutgoing() {
    window.clearTimeout(outgoingTimer);
    outgoingTimer = 0;
    release(outgoing);
    outgoing = undefined;
  }

  function fadeOutgoing() {
    if (!outgoing) return;
    const layer = outgoing;
    // Read opacity only at a handoff, including an interrupted fade-in.
    // The outgoing images are frozen; CSS handles the dissolve without
    // adding a second painter or any layout reads to the animation loop.
    const opacity = layer.spots.map(({ ctx }) => getComputedStyle(ctx.canvas).opacity);
    layer.spots.forEach(({ ctx }, i) => {
      ctx.canvas.style.setProperty('--mobile-flux-from', opacity[i]);
      ctx.canvas.classList.remove('is-mobile-flux-pending', 'is-mobile-flux-entering');
      ctx.canvas.classList.add('is-mobile-flux-leaving');
    });
    window.clearTimeout(outgoingTimer);
    outgoingTimer = window.setTimeout(() => {
      if (outgoing === layer) dropOutgoing();
    }, DISSOLVE_MS + 50);
  }

  function hide() {
    invalidate();
    dropOutgoing();
    release(current);
    current = undefined;
  }

  function discard() {
    requested = undefined;
    hide();
    window.clearTimeout(resizeTimer);
    resizeTimer = 0;
    cache.clear();
    noise = undefined;
  }

  function relocate(layer: Layer | undefined, triplet: HTMLElement[]) {
    if (!layer) return;
    const host = triplet.find((tile) => tile.dataset.cycleId === layer.host.dataset.cycleId);
    if (!host || host === layer.host) return;
    const previous = layer.host;
    layer.host = host;
    host.classList.add('is-mobile-flux-host');
    if (layer.painted) host.classList.add('is-mobile-flux-visible');
    layer.spots.forEach(({ ctx }) => host.append(ctx.canvas));
    refreshHost(previous);
  }

  function canPlay() {
    return Boolean(requested && eligible.matches && onScreen && pageActive && !document.hidden && !resizeTimer);
  }

  function frame(now: number) {
    if (!running || !noise || !current) return;
    raf = requestAnimationFrame(frame);
    if (previousFrame && now - previousFrame < PAINT_INTERVAL) return;
    previousFrame = now;
    const time = (now - started) / 1000 * LIQUID_TIME_SCALE;
    for (const s of current.spots) {
      const px = s.cx, py = s.cy + s.drift * Math.sin(time * 0.13 * s.speedA + s.phase * 1.7);
      const exchange = Math.sin(time * s.exchangeW + s.phase);
      s.lobA.fill(0); s.lobB.fill(0); s.filmLow.fill(0); s.filmHigh.fill(0);
      tongues(s, px, py, time, exchange, 1);
      film(s, px, py, time, exchange, 1);
      s.composite.set(s.base);
      transfer(s, s.filmHigh, s.high, 9);
      transfer(s, s.lobB, s.high, 25 - 4 * exchange);
      transfer(s, s.filmLow, s.low, -9);
      transfer(s, s.lobA, s.low, -25 - 4 * exchange);
      reveal(s, noise, px, py, time);
    }
    if (!current.painted) {
      current.painted = true;
      current.host.classList.add('is-mobile-flux-visible');
      current.spots.forEach(({ ctx }) => {
        ctx.canvas.classList.remove('is-mobile-flux-pending');
        ctx.canvas.classList.add('is-mobile-flux-entering');
      });
      // Begin the outgoing fade only once the replacement actually has pixels.
      fadeOutgoing();
    }
  }

  async function prepare() {
    if (!canPlay() || !requested) return;
    const attempt = ++revision;
    preparing = attempt;
    const triplet = requested;
    try {
      // Keep the old bridge visible while the new photo/scrim finishes
      // changing color. Its frozen pixels cost no JavaScript animation work.
      const animations = triplet.flatMap((tile) =>
        Array.from(tile.querySelectorAll<HTMLElement>('.tile-media img, .tile-overlay'))
          .flatMap((element) => element.getAnimations?.() ?? [])
          .filter((animation) => animation.playState === 'running'),
      );
      if (animations.length) await Promise.allSettled(animations.map((animation) => animation.finished));
      if (attempt !== revision || !canPlay() || requested !== triplet) return;
      const active = triplet[1];
      if (!active.isConnected || !active.classList.contains('is-mobile-focus')) return;
      const covers = triplet.map((tile) => readCover(tile, active));
      if (!covers[1]) return;
      const key = covers.map((cover, i) => cover
        ? `${triplet[i].dataset.cycleId}:${cover.image.currentSrc}:${cover.media.width.toFixed(2)}:${cover.media.height.toFixed(2)}:${cover.textTop - cover.media.top}`
        : `${triplet[i].dataset.cycleId}:unavailable`).join('|');
      let next = cache.get(key);
      if (!next) {
        const box = active.getBoundingClientRect();
        const ox = box.left + active.clientLeft, oy = box.top + active.clientTop;
        const scratch = document.createElement('canvas');
        next = [];
        for (let i = 0; i < 2; i++) {
          const low = covers[i], high = covers[i + 1];
          if (!low || !high) continue;
          const spot = makeSpot(scratch, low, high, ox, oy);
          if (spot) next.push(spot);
        }
        if (!next.length) {
          dropOutgoing();
          outgoing = current;
          current = undefined;
          fadeOutgoing();
          return;
        }
      }
      // The existing four-state LRU remains bounded. At most two zones are
      // repainted; one additional frozen pair may overlap during a dissolve.
      cache.delete(key);
      cache.set(key, next);
      if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value!);
      stop();
      if (current?.key !== key) {
        // A quick reversal can return to the still-fading cached pair. Reuse
        // those exact canvases and their current opacity instead of flashing.
        const returning = outgoing?.spots === next ? outgoing : undefined;
        const opacity = returning?.spots.map(({ ctx }) => getComputedStyle(ctx.canvas).opacity);
        if (returning) {
          window.clearTimeout(outgoingTimer);
          outgoingTimer = 0;
          outgoing = undefined;
        } else dropOutgoing();
        outgoing = current;
        current = { host: active, spots: next, key, painted: false };
        current.host.classList.add('is-mobile-flux-host');
        next.forEach(({ ctx }, i) => {
          ctx.canvas.className = 'home-cycle-mobile-flux is-mobile-flux-pending';
          ctx.canvas.style.setProperty('--mobile-flux-from', opacity?.[i] ?? '0');
          active.append(ctx.canvas);
        });
        if (returning) refreshHost(returning.host);
      } else relocate(current, triplet);
      noise ??= makeNoise();
      running = true;
      started = performance.now() - elapsed;
      previousFrame = 0;
      raf = requestAnimationFrame(frame);
    } finally {
      if (preparing === attempt) preparing = 0;
    }
  }

  function resume() {
    if (running || preparing) return;
    void prepare().catch(() => { hide(); });
  }

  const observer = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) resume();
    else hide();
  }, { threshold: 0.05 });
  observer.observe(grid);
  eligible.addEventListener('change', () => {
    if (eligible.matches) resume();
    else discard();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hide();
    else resume();
  });
  window.addEventListener('pagehide', () => { pageActive = false; hide(); });
  window.addEventListener('pageshow', () => { pageActive = true; resume(); });
  function resize() {
    const nextWidth = grid.clientWidth;
    if (nextWidth === width) return; // Android browser-bar height changes.
    width = nextWidth;
    hide();
    cache.clear();
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => { resizeTimer = 0; resume(); }, 180);
  }
  window.addEventListener('resize', resize);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(grid);
  function imageReady(event: Event) {
    if (!requested?.some((tile) => event.target instanceof Node && tile.contains(event.target))) return;
    invalidate();
    resume();
  }
  grid.addEventListener('load', imageReady, true);
  grid.addEventListener('error', imageReady, true);
  return {
    moving() {
      requested = undefined;
      invalidate();
      // Hold the last frame on its card. Native scrolling carries the bridge
      // through the gesture without image reads, repainting or a fade-to-black.
    },
    settled(left, active, right) {
      if (requested?.[0] === left && requested[1] === active && requested[2] === right) {
        resume();
        return;
      }
      invalidate();
      requested = [left, active, right];
      // Infinite-loop normalization can swap a visible duplicate for its
      // original. Move the retained pixels to that equivalent card at once.
      relocate(current, requested);
      relocate(outgoing, requested);
      resume();
    },
    suspend() { requested = undefined; hide(); },
    discard,
  };
}
