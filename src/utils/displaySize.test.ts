import { describe, expect, it } from 'vitest';
import { CATEGORY_OPTIONS } from '../constants/categories/index.ts';
import { parseDisplaySize } from './displaySize.ts';

/**
 * Reading a display size out of a field a reader can type anything into (audit finding P6).
 *
 * A size read where none was written puts a false reduction into section 2, and a size missed only
 * leaves the line out — so every doubtful case answers `null`.
 */
describe('parseDisplaySize', () => {
  it('reads every size a DISPLAY_SIZE pool offers', () => {
    const pools = Object.values(CATEGORY_OPTIONS).flatMap((category) =>
      category.fields.filter((field) => field.rendering === 'DISPLAY_SIZE'),
    );
    expect(pools.length).toBeGreaterThan(0);
    for (const option of pools.flatMap((field) => field.options)) {
      expect(parseDisplaySize(option), option).not.toBeNull();
    }
    expect(parseDisplaySize('32 × 32 Pixels')).toEqual({ width: 32, height: 32 });
  });

  it('reads the shapes a reader types', () => {
    expect(parseDisplaySize('20x20')).toEqual({ width: 20, height: 20 });
    expect(parseDisplaySize('20 px')).toEqual({ width: 20, height: 20 });
    expect(parseDisplaySize('20px on the minimap')).toEqual({ width: 20, height: 20 });
    expect(parseDisplaySize('16 pixels')).toEqual({ width: 16, height: 16 });
    expect(parseDisplaySize(' 24 ')).toEqual({ width: 24, height: 24 });
  });

  it('answers nothing for a value with no size, or with two and no rule between them', () => {
    for (const text of [
      '',
      'Tiny',
      'As small as the minimap allows',
      '4K',
      '20.5 px',
      '0 px',
      '24px or 32px',
    ]) {
      expect(parseDisplaySize(text), text).toBeNull();
    }
  });
});
