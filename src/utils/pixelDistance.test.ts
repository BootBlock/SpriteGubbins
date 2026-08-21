import { describe, expect, it } from 'vitest';
import { FULLY_OPAQUE, FULLY_TRANSPARENT } from './imageData.ts';
import { srgbToOklab } from './oklab.ts';
import { pixelDistance } from './pixelDistance.ts';

const BLACK = srgbToOklab(0, 0, 0);
const WHITE = srgbToOklab(255, 255, 255);
const RED = srgbToOklab(255, 0, 0);

describe('pixelDistance', () => {
  it('is zero for two pixels of the same colour and coverage', () => {
    expect(pixelDistance(RED, FULLY_OPAQUE, RED, FULLY_OPAQUE)).toBe(0);
  });

  it('measures black against white as the full scaled range', () => {
    // The claim the whole scale rests on: `oklab.ts` stretches its axes so black to white is 255,
    // which is what lets an alpha byte be a fourth axis of the same span with no weight to choose.
    expect(pixelDistance(BLACK, FULLY_OPAQUE, WHITE, FULLY_OPAQUE)).toBeCloseTo(255, 3);
  });

  it('is symmetric', () => {
    expect(pixelDistance(RED, FULLY_OPAQUE, WHITE, 128)).toBeCloseTo(
      pixelDistance(WHITE, 128, RED, FULLY_OPAQUE),
      10,
    );
  });

  it('is zero for two fully transparent pixels whatever colour lies under them', () => {
    expect(pixelDistance(RED, FULLY_TRANSPARENT, WHITE, FULLY_TRANSPARENT)).toBe(0);
  });

  it('measures a vanished pixel by its coverage alone', () => {
    // One side clear: the colours are not compared at all, because one of them is not visible. A
    // pixel that vanished is exactly as far from its source as black is from white.
    expect(pixelDistance(RED, FULLY_OPAQUE, WHITE, FULLY_TRANSPARENT)).toBe(FULLY_OPAQUE);
    expect(pixelDistance(BLACK, FULLY_OPAQUE, BLACK, FULLY_TRANSPARENT)).toBe(FULLY_OPAQUE);
  });

  it('takes coverage as a fourth axis where both pixels are visible', () => {
    // Same colour, alphas 40 apart, so the first three axes contribute nothing and the distance is
    // the alpha difference itself.
    expect(pixelDistance(RED, 200, RED, 160)).toBeCloseTo(40, 10);
  });
});
