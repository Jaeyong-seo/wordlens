import { describe, expect, it } from "vitest";
import {
  countRedPixels,
  downsampleLuma,
  isPageTurn,
  isRedPixel,
  pageChangeRatio,
  shouldSendFrame,
} from "@/lib/prefilter";

function rgbaFrame(
  width: number,
  height: number,
  fill: [number, number, number],
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = 255;
  }
  return data;
}

describe("isRedPixel", () => {
  it("detects pure red ink", () => {
    expect(isRedPixel(255, 0, 0)).toBe(true);
    expect(isRedPixel(200, 40, 40)).toBe(true);
  });

  it("rejects paper white, text black, and other hues", () => {
    expect(isRedPixel(255, 255, 255)).toBe(false); // white paper
    expect(isRedPixel(20, 20, 20)).toBe(false); // black text
    expect(isRedPixel(0, 0, 255)).toBe(false); // blue
    expect(isRedPixel(0, 255, 0)).toBe(false); // green
    expect(isRedPixel(255, 230, 100)).toBe(false); // yellow-ish (low saturation red? no: hue off)
  });

  it("rejects dark noise below the value floor", () => {
    expect(isRedPixel(50, 5, 5)).toBe(false);
  });
});

describe("countRedPixels", () => {
  it("counts only red pixels in an RGBA array", () => {
    // 2 red pixels + 2 white pixels
    const data = new Uint8ClampedArray([
      255, 0, 0, 255, 255, 255, 255, 255, 220, 30, 30, 255, 255, 255, 255, 255,
    ]);
    expect(countRedPixels(data)).toBe(2);
  });

  it("returns 0 for an empty array", () => {
    expect(countRedPixels(new Uint8ClampedArray(0))).toBe(0);
  });
});

describe("shouldSendFrame", () => {
  const total = 1_000_000;

  it("triggers when new red pixels exceed 0.05% of the frame", () => {
    expect(shouldSendFrame(0, 600, total)).toBe(true);
  });

  it("stays quiet below the threshold", () => {
    expect(shouldSendFrame(0, 400, total)).toBe(false);
  });

  it("ignores red pixels disappearing (hand moving away)", () => {
    expect(shouldSendFrame(5000, 1000, total)).toBe(false);
  });

  it("handles zero-size frames", () => {
    expect(shouldSendFrame(0, 100, 0)).toBe(false);
  });
});

describe("page-turn detection", () => {
  it("flags a full-frame change as a page turn", () => {
    const white = downsampleLuma(rgbaFrame(32, 32, [255, 255, 255]), 32, 32);
    const black = downsampleLuma(rgbaFrame(32, 32, [10, 10, 10]), 32, 32);
    expect(pageChangeRatio(white, black)).toBe(1);
    expect(isPageTurn(white, black)).toBe(true);
  });

  it("does not flag an identical frame", () => {
    const a = downsampleLuma(rgbaFrame(32, 32, [200, 200, 200]), 32, 32);
    const b = downsampleLuma(rgbaFrame(32, 32, [200, 200, 200]), 32, 32);
    expect(pageChangeRatio(a, b)).toBe(0);
    expect(isPageTurn(a, b)).toBe(false);
  });

  it("returns 0 for mismatched or empty grids", () => {
    expect(pageChangeRatio([], [])).toBe(0);
    expect(pageChangeRatio([1, 2], [1])).toBe(0);
  });
});
