import { describe, expect, it } from 'vitest';
import { ASPECT_RATIOS } from '../types/output.ts';
import { ASPECT_RATIO_TERMS } from './aspectRatioTerms.ts';

/**
 * The terms are four hand-written pairs, and what each claims is exactly what a hand-written pair
 * loses: that it is the ratio its identifier names, the right way round.
 */
describe('ASPECT_RATIO_TERMS', () => {
  it.each(ASPECT_RATIOS)('states the ratio %s names', (aspect) => {
    const named = /_(\d+)_(\d+)$/u.exec(aspect);
    expect(ASPECT_RATIO_TERMS[aspect]).toEqual({ width: Number(named?.[1]), height: Number(named?.[2]) });
  });
});
