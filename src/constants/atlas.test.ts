import { describe, expect, it } from 'vitest';
import { deepestCleanMip } from '../utils/deepestCleanMip.ts';
import { ATLAS_PADDING_CHOICES, ATLAS_TOOLTIPS } from './atlas.ts';

/** The level counts the padding guidance spells out in words. */
const LEVEL_WORDS: Readonly<Record<string, number>> = { one: 1, two: 2, three: 3, four: 4 };

describe('atlas padding guidance', () => {
  it('names, on each gutter option, the deepest mip level the gutter still covers', () => {
    for (const { value, label } of ATLAS_PADDING_CHOICES) {
      const mip = deepestCleanMip(value);
      if (mip === null) expect(label).not.toMatch(/mip/);
      else expect(label).toMatch(new RegExp(`, clean to mip ${String(mip)}\\)$`));
    }
  });

  it('gives a worked example that agrees with the levels a gutter covers', () => {
    // A card that says a gutter lasts longer than it does sends you to a mip chain that bleeds.
    const example = /(\d+) px protects the first (\w+) levels/.exec(ATLAS_TOOLTIPS.padding);
    expect(example).not.toBeNull();
    const [, width = '', levels = ''] = example ?? [];
    expect(LEVEL_WORDS[levels]).toBe(deepestCleanMip(Number(width)));
  });
});
