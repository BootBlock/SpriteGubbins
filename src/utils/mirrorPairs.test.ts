import { describe, expect, it } from 'vitest';
import { DIRECTION_LISTS } from '../constants/promptText/index.ts';
import { describeMirrorPairs, mirrorPairs } from './mirrorPairs.ts';

/**
 * The geometry these tests pin: reflecting a view at yaw θ produces the view at 360° − θ, so a
 * mirrored copy can only counterfeit a facing where the sheet asks for both a yaw and its
 * reflection. Which sets contain such a pair is the whole reason the template's pair rules are
 * conditional, so the answers are asserted per set rather than per property.
 */
describe('mirrorPairs', () => {
  it('pairs west with east on the cardinal facings', () => {
    expect(mirrorPairs(['south', 'west', 'north', 'east'])).toEqual([['west', 'east']]);
  });

  it('pairs both diagonals on the diagonal facings', () => {
    expect(mirrorPairs(['south-west', 'north-west', 'north-east', 'south-east'])).toEqual([
      ['south-west', 'south-east'],
      ['north-west', 'north-east'],
    ]);
  });

  it('finds every pair of the full eight-compass set, in covered order', () => {
    expect(mirrorPairs(DIRECTION_LISTS.EIGHT_COMPASS)).toEqual([
      ['south-west', 'south-east'],
      ['west', 'east'],
      ['north-west', 'north-east'],
    ]);
  });

  it('finds none in the classic sets, which run 0° to 180° with every view right-leading', () => {
    // This is the emptiness the compiler's MIRROR_PAIRS gate rests on: a five-classic sheet holds
    // no view a reflection could counterfeit, so the pair rules must not reach its prompt.
    expect(mirrorPairs(DIRECTION_LISTS.FIVE_CLASSIC)).toEqual([]);
    expect(mirrorPairs(DIRECTION_LISTS.THREE_CLASSIC)).toEqual([]);
    expect(mirrorPairs(DIRECTION_LISTS.SINGLE_FRONT)).toEqual([]);
  });

  it('never pairs front with back, which are their own reflections', () => {
    // 0° and 180° reflect onto themselves — a mirrored front is still a front, not a counterfeit
    // back — so even a set holding both alone has nothing a reflection could fake.
    expect(mirrorPairs(['south', 'north'])).toEqual([]);
  });
});

describe('describeMirrorPairs', () => {
  it('names one pair as the prompt spells its facings', () => {
    expect(describeMirrorPairs([['west', 'east']])).toBe('west and east');
  });

  it('separates several pairs so each reads as one pairing', () => {
    expect(
      describeMirrorPairs([
        ['south-west', 'south-east'],
        ['north-west', 'north-east'],
      ]),
    ).toBe('south-west and south-east; north-west and north-east');
  });
});
