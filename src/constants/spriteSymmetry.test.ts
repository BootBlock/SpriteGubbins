import { describe, expect, it } from 'vitest';
import { SYMMETRY_GUIDANCE } from './spriteSymmetry.ts';

/**
 * The symmetry paragraphs describe a reading relative to the confidence floor, never in figures.
 *
 * The floor is the reader's own setting, so a share stated in prose is true at one floor and false
 * at another: the refusal once said "a sprite in the high eighties has drifted", which it shows
 * only when nothing reached the floor, and at a floor of 89 or below a high-eighties sprite snaps.
 * The badges and the axis list already state every figure, so the prose has no figure to add.
 */
describe('SYMMETRY_GUIDANCE', () => {
  it('names no share, count or figure', () => {
    const figure =
      /\d|\b(ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b|\b(tens|teens|twenties|thirties|forties|fifties|sixties|seventies|eighties|nineties)\b|per ?cent/i;

    for (const [state, paragraph] of Object.entries(SYMMETRY_GUIDANCE)) {
      expect(
        paragraph,
        `The ${state} paragraph names a figure. The floor it would be measured against is the reader’s ` +
          'setting, so state the reading relative to the floor instead.',
      ).not.toMatch(figure);
    }
  });
});
