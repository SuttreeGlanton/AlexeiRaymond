/* The two contacts on each seam share the resting fan geometry. Paint only
   their small raster regions, with the same reciprocal film and tongue motion
   as the fan's original overlay. */

type Bounds = { left: number; top: number; width: number; height: number };
type Cover = {
  image: HTMLImageElement;
  matrix: DOMMatrix;
  x: number;
  y: number;
  width: number;
  height: number;
};
type TongueProfile = { phase: number; radii: { rx: number; ry: number }[] };
type Spot = Bounds & {
  pair: [number, number];
  ax: number; ay: number;
  tx: number; ty: number;
  nx: number; ny: number;
  u0: number; uLo: number; uHi: number; drift: number;
  speedA: number; speedB: number; exchangeW: number;
  seed: number; phase: number; retract: number;
  tongueA: TongueProfile[]; tongueB: TongueProfile[];
  lobA: Float32Array; lobB: Float32Array; filmLow: Float32Array; filmHigh: Float32Array;
  low: Uint8ClampedArray; high: Uint8ClampedArray;
  base: Uint8ClampedArray; composite: Uint8ClampedArray;
  ctx: CanvasRenderingContext2D; pixels: ImageData;
  noiseX: number; noiseY: number; opacity: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/* Make the exchange immediately legible without introducing jitter:
   every motion still follows long sine curves, but the liquid clock is
   decisively quicker than the previous 1.45 preview. */
const LIQUID_TIME_SCALE = 1.9;
// Leave a display frame between liquid paints on a typical 60 Hz screen.
const PAINT_INTERVAL = 1000 / 30 - 1;

/* Exactly two independently positioned contact zones per seam. Their
   narrow, seam-aligned masks frame irregular rivulets rather than round
   portals between the covers. */
const CONTACTS_PER_SEAM = 2;
const R = 34;
const ZONE_TANGENT_SCALE = 1.65;
const ZONE_NORMAL_SCALE = 0.46;
const MAX_CONTACT_DRIFT = 8;
const WARP_BASE = 14;
const WARP_VARIATION = 4;
const NOISE_TRAVEL_X = 8;
const NOISE_TRAVEL_Y = 9;
// The warp samples up to half its scale away, with room for interpolation.
const WARP_PADDING = (WARP_BASE + WARP_VARIATION) / 2 + 2;

/* Fractions of each pair's usable overlap, keyed by the actual covers.
   Keep the first pair near the lunar ground, leave the central faces
   and dome readable, and favour background texture beside the figures.
   Small local variation keeps the contacts alive without relocating
   them to an unrelated part of the photograph on every rebuild. */
const CONTACT_PLACEMENT: Record<string, readonly [number, number]> = {
  'mythbreaking:mythmaking': [0.55, 0.88],
  'mythmaking:fools-gold': [0.24, 0.76],
  'fools-gold:dreams': [0.32, 0.82],
  'dreams:portici': [0.20, 0.75],
  'portici:valentines-star': [0.22, 0.78],
  'valentines-star:conscription': [0.18, 0.80],
  'conscription:the-real': [0.30, 0.78],
};

// Donor samples can move up to 29 CSS pixels in either direction.
const SAMPLE_PADDING = 31;
const NOISE_SIZE = 256;
const NOISE_PADDING = 11;

// Build a reusable two-channel, two-scale noise field. Each contact drifts
// through a different part of it, with the original warp distance and rate.
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

/* Store premultiplied gray and alpha, with a margin for the moving sample.
   Cover crop, clipping, and tile transform are baked once per rebuild. */
function coverSamples(scratch: HTMLCanvasElement, cover: Cover, bounds: Bounds) {
  const width = bounds.width + SAMPLE_PADDING * 2;
  const height = bounds.height + SAMPLE_PADDING * 2;
  scratch.width = width;
  scratch.height = height;
  const ctx = scratch.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const { image, matrix, x, y } = cover;
  const { naturalWidth, naturalHeight } = image;
  const scale = Math.max(cover.width / naturalWidth, cover.height / naturalHeight);
  const sw = cover.width / scale, sh = cover.height / scale;
  ctx.setTransform(
    matrix.a, matrix.b, matrix.c, matrix.d,
    matrix.e - bounds.left + SAMPLE_PADDING,
    matrix.f - bounds.top + SAMPLE_PADDING,
  );
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, cover.width, cover.height, 6);
  else ctx.rect(x, y, cover.width, cover.height);
  ctx.clip();
  ctx.drawImage(image, (naturalWidth - sw) / 2, (naturalHeight - sh) / 2, sw, sh,
    x, y, cover.width, cover.height);

  let rgba: Uint8ClampedArray;
  try {
    rgba = ctx.getImageData(0, 0, width, height).data;
  } catch {
    return null;
  }
  const samples = new Uint8ClampedArray(width * height * 2);
  for (let p = 0, q = 0; p < rgba.length; p += 4, q += 2) {
    const gray = rgba[p] * 0.213 + rgba[p + 1] * 0.715 + rgba[p + 2] * 0.072;
    // Match grayscale(1), brightness(0.62), then contrast(1.05).
    samples[q] = Math.max(0, gray * 0.651 - 6.375) * rgba[p + 3] / 255;
    samples[q + 1] = rgba[p + 3];
  }
  return samples;
}

function restingSamples(low: Uint8ClampedArray, high: Uint8ClampedArray, bounds: Bounds) {
  const base = new Uint8ClampedArray(bounds.width * bounds.height * 2);
  const stride = bounds.width + SAMPLE_PADDING * 2;
  for (let y = 0, p = 0; y < bounds.height; y++) {
    let source = ((y + SAMPLE_PADDING) * stride + SAMPLE_PADDING) * 2;
    for (let x = 0; x < bounds.width; x++, source += 2, p += 2) {
      const under = 1 - high[source + 1] / 255;
      base[p] = high[source] + low[source] * under;
      base[p + 1] = high[source + 1] + low[source + 1] * under;
    }
  }
  return base;
}

// Add a small soft field around each lobe. Overlapping fields merge into
// one rounded shape, without a separate blur and alpha filter per mask.
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
  at: number, stride: number, u: number, v: number,
) {
  const a = data[at], b = data[at + stride];
  return (a + (data[at + 2] - a) * u) * (1 - v) +
    (b + (data[at + stride + 2] - b) * u) * v;
}

function transfer(s: Spot, mask: Float32Array, donor: Uint8ClampedArray, travel: number) {
  const dx = -s.nx * travel, dy = -s.ny * travel;
  const ix = Math.floor(dx), iy = Math.floor(dy);
  const stride = (s.width + SAMPLE_PADDING * 2) * 2;
  const u = dx - ix, v = dy - iy;
  const { composite } = s;
  for (let y = 0, p = 0; y < s.height; y++) {
    let source = (y + iy + SAMPLE_PADDING) * stride + (ix + SAMPLE_PADDING) * 2;
    for (let x = 0; x < s.width; x++, source += 2, p++) {
      const coverage = mask[p];
      if (coverage <= 0.19) continue;
      const maskAlpha = Math.min(1, (coverage - 0.19) * 9);
      const alpha = interpolate(donor, source + 1, stride, u, v) * maskAlpha;
      if (alpha <= 0) continue;
      const under = 1 - alpha / 255;
      const q = p * 2;
      composite[q] = interpolate(donor, source, stride, u, v) * maskAlpha + composite[q] * under;
      composite[q + 1] = alpha + composite[q + 1] * under;
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
  const left = s.left + 0.5 - px, top = s.top + 0.5 - py;
  const dt = s.tx / tangent, dn = s.nx / normal;

  for (let y = 0, p = 0; y < height; y++) {
    let u = left * dt + (y + top) * s.ty / tangent;
    let v = left * dn + (y + top) * s.ny / normal;
    let n = ((y + iy) * NOISE_SIZE + ix) * 2;
    for (let x = 0; x < width; x++, p += 4, n += 2, u += dt, v += dn) {
      const radius = u * u + v * v;
      out[p + 3] = 0;
      if (radius >= 1) continue;
      const sx = x + warp * interpolate(noise, n, NOISE_SIZE * 2, nu, nv);
      const sy = y + warp * interpolate(noise, n + 1, NOISE_SIZE * 2, nu, nv);
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      if (x0 < 0 || y0 < 0 || x0 >= width - 1 || y0 >= height - 1) continue;
      const at = (y0 * width + x0) * 2;
      const alpha = interpolate(composite, at + 1, width * 2, sx - x0, sy - y0);
      if (alpha <= 0) continue;
      const gray = interpolate(composite, at, width * 2, sx - x0, sy - y0) * 255 / alpha;
      out[p] = out[p + 1] = out[p + 2] = gray;
      out[p + 3] = alpha * (radius <= 0.62 ** 2 ? 1 : (1 - Math.sqrt(radius)) / 0.38);
    }
  }
  s.ctx.putImageData(pixels, 0, 0);
}

function tileMatrix(tile: HTMLElement, style: CSSStyleDeclaration): DOMMatrix {
  const [originX = '0', originY = '0'] = style.transformOrigin.split(' ');
  const ox = parseFloat(originX), oy = parseFloat(originY);
  const transform = new DOMMatrixReadOnly(style.transform === 'none' ? '' : style.transform);
  return new DOMMatrix()
    .translate(tile.offsetLeft + ox, tile.offsetTop + oy)
    .multiply(transform)
    .translate(-ox, -oy);
}

function makeSpot(
  scratch: HTMLCanvasElement, lower: Cover, upper: Cover, pair: [number, number],
  ax: number, ay: number, tx: number, ty: number, nx: number, ny: number,
  u0: number, uLo: number, uHi: number,
): Spot | null {
  const extentX = R * Math.hypot(ZONE_TANGENT_SCALE * tx, ZONE_NORMAL_SCALE * nx) +
    MAX_CONTACT_DRIFT * Math.abs(tx) + WARP_PADDING;
  const extentY = R * Math.hypot(ZONE_TANGENT_SCALE * ty, ZONE_NORMAL_SCALE * ny) +
    MAX_CONTACT_DRIFT * Math.abs(ty) + WARP_PADDING;
  const left = Math.floor(ax + tx * u0 - extentX);
  const top = Math.floor(ay + ty * u0 - extentY);
  const width = Math.ceil(ax + tx * u0 + extentX) - left;
  const height = Math.ceil(ay + ty * u0 + extentY) - top;
  const bounds = { left, top, width, height };
  const low = coverSamples(scratch, lower, bounds);
  const high = coverSamples(scratch, upper, bounds);
  if (!low || !high) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.left = left + 'px';
  canvas.style.top = top + 'px';
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const noiseOffset = Math.floor(Math.random() * 65536);
  const noiseX = NOISE_PADDING + (noiseOffset % (NOISE_SIZE - width - NOISE_PADDING * 2));
  const noiseY = NOISE_PADDING + (Math.floor(noiseOffset / 256) % (NOISE_SIZE - height - NOISE_PADDING * 2));
  const drift = 4 + Math.random() * (MAX_CONTACT_DRIFT - 4);
  const speedA = 0.78 + Math.random() * 0.4;
  const speedB = 0.75 + Math.random() * 0.42;
  const exchangeW = 0.62 + Math.random() * 0.38;
  const seed = Math.random() * 10;
  const phase = Math.random() * 100;
  return {
    ...bounds, pair, ax, ay, tx, ty, nx, ny, u0, uLo, uHi, drift,
    speedA, speedB, exchangeW, seed, phase, retract: 0,
    tongueA: makeTongueProfiles(seed, false), tongueB: makeTongueProfiles(seed, true),
    lobA: new Float32Array(width * height), lobB: new Float32Array(width * height),
    filmLow: new Float32Array(width * height), filmHigh: new Float32Array(width * height),
    low, high, base: restingSamples(low, high, bounds), composite: new Uint8ClampedArray(width * height * 2),
    ctx, pixels: ctx.createImageData(width, height), noiseX, noiseY, opacity: '1.00',
  };
}

// These radii depend on the spot's seed, not the animation clock. Keep
// the original formulas, but calculate them once rather than every frame.
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

/* Gooey excursions across the seam, computed in the seam's own frame:
   A grows out of the lower card and reaches onto the upper card's
   surface, B grows out of the upper card and leaks past its own edge.
   Roots sit just inside the donor card so each tongue visibly emerges
   from it. */
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
    const bx = px + s.tx * along + s.nx * 4;
    const by = py + s.ty * along + s.ny * 4;
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
    const bx = px + s.tx * along - s.nx * 4;
    const by = py + s.ty * along - s.ny * 4;
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

/* Always-on molten film hugging the seam: the under-card perpetually
   seeps onto the upper card's surface while the upper card leaks a
   little past its own edge. This is what keeps the boundary visibly
   alive between tongue surges — there is no fully inactive frame. */
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

export function mountHomeCycleFlux(grid: HTMLElement, eligible: MediaQueryList) {
  let overlay: HTMLElement | null = null;
  let tiles: HTMLElement[] = [];
  let spots: Spot[] = [];
  let noise: Float32Array | undefined;
  let onScreen = false;
  let running = false;
  let raf = 0;
  let start = 0;
  let elapsed = 0;
  let previousFrame = 0;
  let settleTimer = 0;
  let resizeTimer = 0;
  let tileFocus: boolean[] = [];

  function build() {
    tiles = Array.from(grid.querySelectorAll<HTMLElement>(':scope > .tile'));
    const images = tiles.map((tile) => tile.querySelector<HTMLImageElement>('.tile-media img'));
    // A slow lazy image can still be loading as the fan settles. Its load
    // event will recheck the visible fan once the samples can be drawn.
    if (tiles.length < 2 || images.some((image) => image && !image.complete)) return;

    tileFocus = tiles.map(() => false);
    const layouts = tiles.map((tile, index) => {
      const style = getComputedStyle(tile);
      const image = images[index];
      const media = tile.querySelector<HTMLElement>('.tile-media');
      const cover = image && image.naturalWidth && media ? {
        image, matrix: tileMatrix(tile, style), x: media.offsetLeft, y: media.offsetTop,
        width: media.offsetWidth, height: media.offsetHeight,
      } : null;
      return {
        id: tile.dataset.cycleId, z: parseFloat(style.getPropertyValue('--fan-z')) || index + 1,
        width: tile.offsetWidth, height: tile.offsetHeight, rect: tile.getBoundingClientRect(), cover,
      };
    });
    const scratch = document.createElement('canvas');
    const nextOverlay = document.createElement('div');
    nextOverlay.className = 'home-cycle-flux';
    nextOverlay.setAttribute('aria-hidden', 'true');

    // Two composed contact points per pair, still anchored to its real
    // slanted overlap. Unknown or reordered pairs use a balanced fallback.
    const gridRect = grid.getBoundingClientRect();
    for (let i = 0; i < layouts.length - 1; i++) {
      const a = layouts[i], b = layouts[i + 1];
      const bOnTop = b.z >= a.z;
      const upper = bOnTop ? b : a;
      const lower = bOnTop ? a : b;
      if (!lower.cover || !upper.cover) continue;

      const ra = a.rect, rb = b.rect;
      const top = Math.max(ra.top, rb.top) - gridRect.top;
      const bot = Math.min(ra.bottom, rb.bottom) - gridRect.top;
      if (bot - top < 60) continue;

      /* The visible boundary is the upper card's edge that faces the lower
         card. The cards are rotated, so the flow is computed in the edge's
         own (tangent, normal) frame — never plain horizontal — or it
         visibly detaches from the seam. */
      const ru = upper.rect, rl = lower.rect;
      const lowerIsLeft = (rl.left + rl.width / 2) < (ru.left + ru.width / 2);
      const M = upper.cover.matrix;
      const edgeX = lowerIsLeft ? 0 : upper.width;
      const P0 = M.transformPoint({ x: edgeX, y: upper.height * 0.1 });
      const P1 = M.transformPoint({ x: edgeX, y: upper.height * 0.9 });

      let tx = P1.x - P0.x, ty = P1.y - P0.y;
      const edgeLen = Math.hypot(tx, ty);
      if (edgeLen < 40) continue;
      tx /= edgeLen; ty /= edgeLen;

      // unit normal from the upper card toward the lower card
      const cL = lower.cover.matrix.transformPoint({
        x: lower.width / 2,
        y: lower.height / 2,
      });
      const mx = (P0.x + P1.x) / 2, my = (P0.y + P1.y) / 2;
      let nx = -ty, ny = tx;
      if (nx * (cL.x - mx) + ny * (cL.y - my) < 0) { nx = -nx; ny = -ny; }

      /* Contact segment: the part of the edge that actually overlaps the
         neighbour. Contact points live only inside it, and never below
         the cover's bottom edge, so tongues can never smear the
         neighbour's title. */
      const dy = P1.y - P0.y;
      let sLo = 0.18, sHi = 0.82;
      if (Math.abs(dy) > 1) {
        const s1 = (top - P0.y) / dy;
        const s2 = (bot - P0.y) / dy;
        sLo = clamp(Math.min(s1, s2) + 0.06, 0.08, 0.6);
        sHi = clamp(Math.max(s1, s2) - 0.06, 0.4, 0.92);
      }
      const mb = M.transformPoint({ x: edgeX, y: upper.cover.y + upper.cover.height });
      const sMedia = ((mb.x - P0.x) * tx + (mb.y - P0.y) * ty) / edgeLen;
      sHi = Math.min(sHi, sMedia - 0.03);
      if (sHi - sLo < 0.18) continue;

      const contactStart = sLo * edgeLen;
      const contactSpan = (sHi - sLo) * edgeLen;
      const padding = Math.min(12, contactSpan * 0.12);
      const randomLo = contactStart + padding;
      const randomHi = contactStart + contactSpan - padding;
      const placement = CONTACT_PLACEMENT[`${a.id}:${b.id}`] ?? [0.24, 0.76];
      const contactPoints = placement.map((fraction) =>
        randomLo + clamp(fraction + (Math.random() - 0.5) * 0.04, 0, 1) * (randomHi - randomLo),
      );
      const minGap = Math.min(48, (randomHi - randomLo) * 0.3);
      if (contactPoints[1] - contactPoints[0] < minGap) {
        contactPoints[1] = Math.min(randomHi, contactPoints[0] + minGap);
        contactPoints[0] = Math.min(contactPoints[0], contactPoints[1] - minGap);
      }

      for (const u of contactPoints.slice(0, CONTACTS_PER_SEAM)) {
        const spot = makeSpot(scratch, lower.cover, upper.cover, [i, i + 1],
          P0.x, P0.y, tx, ty, nx, ny, u, sLo * edgeLen, sHi * edgeLen);
        if (!spot) continue;
        spots.push(spot);
        nextOverlay.append(spot.ctx.canvas);
      }
    }

    if (!spots.length) return;
    noise ??= makeNoise();
    overlay = nextOverlay;
    grid.append(overlay);
  }

  function frame(now: number) {
    if (!running || !noise || !overlay) return;
    raf = requestAnimationFrame(frame);
    if (previousFrame && now - previousFrame < PAINT_INTERVAL) return;

    const firstFrame = previousFrame === 0;
    const time = ((now - start) / 1000) * LIQUID_TIME_SCALE;
    const delta = previousFrame ? Math.max(now - previousFrame, 0) : 1000 / 60;
    previousFrame = now;
    const retractEase = 1 - Math.pow(0.9, delta / (1000 / 60));
    for (let index = 0; index < tiles.length; index++) {
      tileFocus[index] = tiles[index].classList.contains('is-fan-focus');
    }

    for (const s of spots) {
      const focused = tileFocus[s.pair[0]] || tileFocus[s.pair[1]];
      s.retract += ((focused ? 1 : 0) - s.retract) * retractEase;
      const opacity = (1 - s.retract).toFixed(2);
      if (opacity !== s.opacity) {
        s.ctx.canvas.style.opacity = opacity;
        s.opacity = opacity;
      }
      if (opacity === '0.00') continue;

      const u = clamp(
        s.u0 + s.drift * Math.sin(time * 0.13 * s.speedA + s.phase * 1.7),
        s.uLo, s.uHi,
      );
      const px = s.ax + s.tx * u, py = s.ay + s.ty * u;
      const strength = 1 - 0.92 * s.retract;
      const exchange = Math.sin(time * s.exchangeW + s.phase);
      s.lobA.fill(0);
      s.lobB.fill(0);
      s.filmLow.fill(0);
      s.filmHigh.fill(0);
      tongues(s, px, py, time, exchange, strength);
      film(s, px, py, time, exchange, strength);

      // Same painter order and travel as the resting fan: the high donor
      // spills first, then the low donor, each with its film under its tongue.
      s.composite.set(s.base);
      transfer(s, s.filmHigh, s.high, 9);
      transfer(s, s.lobB, s.high, 25 - 4 * exchange);
      transfer(s, s.filmLow, s.low, -9);
      transfer(s, s.lobA, s.low, -25 - 4 * exchange);
      reveal(s, noise, px, py, time);
    }
    if (firstFrame) overlay.classList.add('is-visible');
  }

  // Visible and settled starts the effect. Leaving view or hiding the tab
  // pauses it. A resize discards geometry, and ineligibility removes it.
  function play() {
    if (running || resizeTimer || !eligible.matches || !onScreen || document.hidden) return;
    const fanMoving = grid.classList.contains('is-fan-pending') || grid.classList.contains('is-fan-entering');
    const cardsMoving = !overlay && Array.from(grid.querySelectorAll<HTMLElement>(':scope > .tile')).some(
      (tile) => tile.classList.contains('is-fan-focus') ||
        tile.getAnimations().some((animation) => animation.playState === 'running'),
    );
    if (fanMoving || cardsMoving) {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(play, 150);
      return;
    }
    if (!overlay) build();
    if (!overlay) return;
    running = true;
    start = performance.now() - elapsed;
    previousFrame = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    window.clearTimeout(settleTimer);
    if (running) elapsed = performance.now() - start;
    running = false;
    cancelAnimationFrame(raf);
  }

  function discard() {
    stop();
    overlay?.remove();
    overlay = null;
    spots = [];
    window.clearTimeout(resizeTimer);
    resizeTimer = 0;
  }

  const observer = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) play();
    else stop();
  }, { threshold: 0.05 });
  observer.observe(grid);

  eligible.addEventListener('change', () => {
    if (eligible.matches) play();
    else discard();
  });
  window.addEventListener('resize', () => {
    discard();
    if (!eligible.matches) return;
    resizeTimer = window.setTimeout(() => {
      resizeTimer = 0;
      play();
    }, 200);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else play();
  });
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', play);
  grid.addEventListener('load', play, true);
  grid.addEventListener('error', play, true);
}
