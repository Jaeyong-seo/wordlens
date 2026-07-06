/**
 * Pure pixel math for the client-side prefilter.
 * Operates on raw RGBA arrays so it is unit-testable without a canvas.
 */

/** Fraction of total pixels that must be NEW red to trigger a frame send. */
export const RED_DELTA_THRESHOLD = 0.0005;

/** Fraction of luma blocks that must change to count as a page turn. */
export const PAGE_TURN_THRESHOLD = 0.6;

/** Per-block luma difference (0-255) required to mark a block as changed. */
const BLOCK_DIFF_THRESHOLD = 24;

/**
 * Red-ink detector in HSV terms: hue near 0/360, saturated, not too dark.
 * Works for red ballpoint / highlighter strokes on paper.
 */
export function isRedPixel(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return false;
  const v = max / 255;
  const s = (max - min) / max;
  if (v < 0.3 || s < 0.4) return false;
  if (max !== r) return false;
  // hue distance from red (0deg): compare g/b balance
  const delta = max - min;
  const huePos = (g - b) / delta; // in [-1, 1]; red hue when |huePos| small-ish
  return huePos > -0.9 && huePos < 0.6;
}

/** Count red pixels in an RGBA byte array. */
export function countRedPixels(rgba: Uint8ClampedArray | number[]): number {
  let count = 0;
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    if (isRedPixel(rgba[i], rgba[i + 1], rgba[i + 2])) count++;
  }
  return count;
}

/**
 * Decide whether a frame should be sent: new red pixels appeared
 * relative to the previous frame, above the delta threshold.
 */
export function shouldSendFrame(
  prevRedCount: number,
  currRedCount: number,
  totalPixels: number,
): boolean {
  if (totalPixels <= 0) return false;
  const delta = currRedCount - prevRedCount;
  return delta / totalPixels > RED_DELTA_THRESHOLD;
}

/**
 * Downsample an RGBA frame into a grid of average-luma blocks.
 * Used for cheap page-turn detection.
 */
export function downsampleLuma(
  rgba: Uint8ClampedArray | number[],
  width: number,
  height: number,
  grid = 16,
): number[] {
  const blocks = new Array(grid * grid).fill(0);
  const counts = new Array(grid * grid).fill(0);
  for (let y = 0; y < height; y++) {
    const by = Math.min(grid - 1, Math.floor((y / height) * grid));
    for (let x = 0; x < width; x++) {
      const bx = Math.min(grid - 1, Math.floor((x / width) * grid));
      const i = (y * width + x) * 4;
      const luma =
        0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
      const b = by * grid + bx;
      blocks[b] += luma;
      counts[b] += 1;
    }
  }
  return blocks.map((sum, i) => (counts[i] ? sum / counts[i] : 0));
}

/** Fraction of luma blocks that changed significantly between frames. */
export function pageChangeRatio(prev: number[], curr: number[]): number {
  if (prev.length === 0 || prev.length !== curr.length) return 0;
  let changed = 0;
  for (let i = 0; i < prev.length; i++) {
    if (Math.abs(prev[i] - curr[i]) > BLOCK_DIFF_THRESHOLD) changed++;
  }
  return changed / prev.length;
}

export function isPageTurn(prev: number[], curr: number[]): boolean {
  return pageChangeRatio(prev, curr) > PAGE_TURN_THRESHOLD;
}
