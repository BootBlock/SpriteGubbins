import { describe, expect, it } from 'vitest';
import { PRACTICAL_COMPONENT_CEILING } from '../promptText/inventory.ts';
import { limbSheetName, limbSheets } from './limbSheets.ts';

/**
 * How a body's limbs are dealt onto sheets (issue #285) — the rules `limbSheets` states, one at a time,
 * over limbs whose sizes are chosen to sit either side of `PRACTICAL_COMPONENT_CEILING`.
 */

interface TestLimb {
  readonly name: string;
  readonly size: number;
  readonly set?: string;
}

const sizeOf = (limb: TestLimb): number => limb.size;
const namesOf = (sheets: ReturnType<typeof limbSheets<TestLimb>>) =>
  sheets.map((sheet) => sheet.limbs.map((limb) => limb.name));

describe('limbSheets', () => {
  it('keeps a body that fits on one sheet', () => {
    const sheets = limbSheets<TestLimb>(
      [
        { name: 'left', size: 20 },
        { name: 'right', size: 20 },
      ],
      sizeOf,
      3,
    );
    expect(namesOf(sheets)).toEqual([['left', 'right']]);
  });

  it('starts the first sheet past the trunk it draws, and never parts a set', () => {
    // 3 + 16 + 16 fits under the ceiling of 43 and a third pair does not; the pair that overflows moves
    // whole, rather than leaving its left side on the first sheet.
    expect(PRACTICAL_COMPONENT_CEILING).toBe(43);
    const pair = (set: string, size: number): readonly TestLimb[] => [
      { name: `left ${set}`, size, set },
      { name: `right ${set}`, size, set },
    ];
    const sheets = limbSheets([...pair('a', 8), ...pair('b', 8), ...pair('c', 8)], sizeOf, 3);
    expect(namesOf(sheets)).toEqual([
      ['left a', 'right a', 'left b', 'right b'],
      ['left c', 'right c'],
    ]);
    expect(sheets.map((sheet) => sheet.sets)).toEqual([['a', 'b'], ['c']]);
  });

  it('leaves the trunk alone on the first sheet where no set fits beside it', () => {
    const sheets = limbSheets<TestLimb>(
      [{ name: 'neck', size: PRACTICAL_COMPONENT_CEILING, set: 'necks' }],
      sizeOf,
      3,
    );
    expect(namesOf(sheets)).toEqual([[], ['neck']]);
  });

  it('refuses to split a body that leaves a limb’s set unnamed', () => {
    expect(() =>
      limbSheets<TestLimb>(
        [
          { name: 'left', size: 30, set: 'fore' },
          { name: 'right', size: 30 },
        ],
        sizeOf,
        0,
      ),
    ).toThrow('names the set of every limb');
  });
});

describe('limbSheetName', () => {
  const sheet = (sets: readonly string[]) => ({ limbs: [], sets });

  it('leaves a sheet that is the whole series its plain name', () => {
    expect(limbSheetName('Articulation', sheet(['legs']), false, false)).toBe('Articulation');
  });

  it('names a split sheet for its sets, and the first pose library sheet for its trunk too', () => {
    expect(limbSheetName('Articulation', sheet(['hind legs']), true, false)).toBe('Articulation — hind legs');
    expect(limbSheetName('Pose library', sheet(['necks', 'forelimbs']), true, true)).toBe(
      'Pose library — trunk, necks and forelimbs',
    );
    expect(limbSheetName('Pose library', sheet([]), true, true)).toBe('Pose library — trunk');
  });
});
