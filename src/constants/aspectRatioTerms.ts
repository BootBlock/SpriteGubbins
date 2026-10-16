import type { AspectRatio } from '../types/output.ts';

/**
 * The exact ratio each sheet shape names, as its two smallest whole terms, width first.
 *
 * `NOMINAL_SHEET_SIZE` cannot stand in for it: that canvas floors its short edge, so its 21:9 sheet is
 * 1024 × 438, which is not 21:9. A request size has to be the ratio exactly, or the canvas the
 * generator draws is not the shape the prompt lays its grid out for. Written out rather than parsed
 * from the identifier, for the reason the nominal canvas is, and `aspectRatioTerms.test.ts` reads the
 * ratio back out of each name.
 */
export const ASPECT_RATIO_TERMS: Readonly<
  Record<AspectRatio, { readonly width: number; readonly height: number }>
> = {
  WIDE_16_9: { width: 16, height: 9 },
  SQUARE_1_1: { width: 1, height: 1 },
  TALL_9_16: { width: 9, height: 16 },
  ULTRAWIDE_21_9: { width: 21, height: 9 },
};
