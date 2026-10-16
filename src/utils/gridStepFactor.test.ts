import { describe, expect, it } from 'vitest';
import { gridStepFactor } from './gridStepFactor.ts';

describe('gridStepFactor', () => {
  it('makes one step of the grid one cell side', () => {
    expect(gridStepFactor(128, 320)).toBe(0.4);
  });

  it.each([
    ['a negative step, which drew every sprite at 1 × 1', -5],
    ['a zero step, which made the factor infinite', 0],
    ['a step that is not a number', Number.NaN],
    ['an infinite step', Infinity],
    ['no step at all', null],
  ])('sets no limit for %s', (_, pitch) => {
    expect(gridStepFactor(128, pitch)).toBe(Infinity);
  });
});
