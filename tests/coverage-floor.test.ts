import { describe, expect, it } from 'vitest';
import { COVERAGE_FLOOR, LINE_LUMA_GAP, SILHOUETTE_THRESHOLDS } from '../src/constants/quantiser.ts';
import { imageFrom } from '../src/test/images.ts';
import { hardenSilhouette } from '../src/utils/hardenSilhouette.ts';

/**
 * The two claims `COVERAGE_FLOOR`'s docblock makes about its figure.
 *
 * The floor is stated as a literal and argued from the edge-hardening ladder, so a change to either
 * side that the other did not follow fails here rather than leaving the two passes disagreeing about
 * which pixels are artwork.
 */

/** The worst error a channel takes on a premultiplied, eight-bit round trip at this alpha. */
function roundTripError(alpha: number): number {
  let worst = 0;
  for (let channel = 0; channel < 256; channel += 1) {
    const stored = Math.round((channel * alpha) / 255);
    const read = Math.min(255, Math.round((stored * 255) / alpha));
    worst = Math.max(worst, Math.abs(read - channel));
  }
  return worst;
}

describe('COVERAGE_FLOOR', () => {
  it('is the lowest alpha the edge hardening keeps at its first rung past off', () => {
    const rung = SILHOUETTE_THRESHOLDS[1];
    const edge = imageFrom(2, 1, (x) => ({ r: 90, g: 90, b: 90, a: COVERAGE_FLOOR - x }));
    const hardened = hardenSilhouette(edge, rung);

    expect(rung).toBe(10);
    expect(hardened.data[3]).toBe(255);
    expect(hardened.data[7]).toBe(0);
  });

  it('bounds the rounding a present pixel’s channels carry at a sixth of the line gap', () => {
    expect(roundTripError(1)).toBe(127);
    expect(roundTripError(8)).toBe(16);
    expect(roundTripError(COVERAGE_FLOOR)).toBe(5);
    expect(roundTripError(COVERAGE_FLOOR) * 6).toBeLessThanOrEqual(LINE_LUMA_GAP);
  });
});
