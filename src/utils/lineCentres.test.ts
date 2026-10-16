import { describe, expect, it } from 'vitest';
import { lineCentres } from './lineCentres.ts';

describe('lineCentres', () => {
  it('answers a measured line with the median of its centres', () => {
    const at = lineCentres(new Map([[0, [100, 104, 160]]]), 300);
    expect(at(0)).toBe(104);
  });

  it('steps from the one measured line at the pitch it is given', () => {
    const at = lineCentres(new Map([[1, [470]]]), 312);
    expect([at(0), at(3)]).toEqual([158, 1094]);
  });

  it('reads an unmeasured line off the straight line through the measured ones', () => {
    // Three columns measured a pitch of 312 apart; the fourth holds no spanning piece.
    const at = lineCentres(
      new Map([
        [0, [159]],
        [1, [471]],
        [2, [783]],
      ]),
      300,
    );
    expect(at(3)).toBe(1095);
    expect(at(1)).toBe(471);
  });

  it('keeps one stray line from moving the lines read off the others', () => {
    // Four columns a pitch of 312 apart, the third drawn 40 pixels off; the fifth holds no spanning
    // piece. A least-squares line would carry a share of the 40 to it.
    const at = lineCentres(
      new Map([
        [0, [159]],
        [1, [471]],
        [2, [823]],
        [3, [1095]],
      ]),
      300,
    );
    expect(at(4)).toBe(1407);
  });

  it('leaves every line to its cell where none was measured', () => {
    expect(lineCentres(new Map(), 300)(2)).toBeUndefined();
  });
});
