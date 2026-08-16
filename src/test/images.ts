import { DIFFERENCE_PRECISION } from '../constants/quantiser.ts';
import type { DifferenceMap, Rgba, RgbaChannel } from '../types/quantiser.ts';
import { createImage, pixelOffset, readPixel, writePixel } from '../utils/imageData.ts';

/**
 * Building `ImageData` for the quantiser's tests.
 *
 * Test-only, and here rather than in `src/utils/` because nothing in the app constructs an image
 * from a formula — the app's images come from a file the user dropped. Several test files need the
 * same builders, and this is one implementation of each rather than several subtly different ones.
 *
 * No canvas is involved: `ImageData` is a width, a height and a `Uint8ClampedArray`, all three of
 * which happy-dom provides, so the pure pipeline is testable without a rendering surface.
 */

/** An image whose every pixel is a function of its position. */
export function imageFrom(width: number, height: number, pixel: (x: number, y: number) => Rgba): ImageData {
  const image = createImage(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      writePixel(image.data, pixelOffset(width, x, y), pixel(x, y));
    }
  }
  return image;
}

/**
 * The image with every pixel averaged with the two beside it, horizontally and then vertically —
 * what a model hands back when it draws at a scale and then resamples.
 *
 * A three-tap box, separable, clamped at the edges: the kernel that turns one crisp boundary into
 * **three equal steps** rather than one, which is the whole of what defeats `detectPixelGrid`. It
 * counts any colour inequality as a transition, so every cell boundary becomes three of which two
 * miss the lattice, no candidate can account for nine tenths of them, and the answer is `null` for
 * artwork that plainly was drawn at a scale.
 *
 * Deliberately not a Gaussian or a wider kernel. Three taps is the narrowest softening that breaks
 * the exact detector, so it is the case an estimator has to read, and being able to state the kernel
 * exactly is what makes the arithmetic in these tests checkable rather than empirical: the step
 * signal is the crisp one convolved with the same three taps, so all of it lands within one pixel of
 * where it started.
 */
export function soften(image: ImageData): ImageData {
  const pass = (source: ImageData, horizontal: boolean): ImageData =>
    imageFrom(source.width, source.height, (x, y) => {
      const taps = [-1, 0, 1].map((offset) => {
        const sampleX = horizontal ? clamp(x + offset, source.width) : x;
        const sampleY = horizontal ? y : clamp(y + offset, source.height);
        return readPixel(source.data, pixelOffset(source.width, sampleX, sampleY));
      });
      const mean = (channel: RgbaChannel) =>
        taps.reduce((total, tap) => total + tap[channel], 0) / taps.length;
      return { r: mean('r'), g: mean('g'), b: mean('b'), a: mean('a') };
    });

  return pass(pass(image, true), false);
}

/** A sample position held inside the image, which is what makes the kernel clamp at the edges. */
function clamp(position: number, extent: number): number {
  return Math.min(extent - 1, Math.max(0, position));
}

/**
 * A `DifferenceMap` of one uniform distance, for the fixtures that need a result rather than a
 * measurement.
 *
 * Every `QuantiseResult` carries one, so three suites that care only about how a result is *drawn*
 * would otherwise each spell out a `Uint16Array` and the fixed point it is held in. Here once, so
 * the day that representation changes there is one place to follow it — and so a suite that does
 * care about the figures (`ImageComparison`, whose caption states them) can ask for a distance
 * rather than assembling one.
 */
export function flatDifference(width: number, height: number, distance = 0): DifferenceMap {
  return {
    width,
    height,
    cells: new Uint16Array(width * height).fill(distance * DIFFERENCE_PRECISION),
    mean: distance,
    peak: distance,
  };
}

/** Every channel as a plain array, so two images can be compared byte for byte by `toEqual`. */
export function channels(image: ImageData): number[] {
  return [...image.data];
}
