import { describe, expect, it } from 'vitest';
import { ASPECT_RATIOS } from '../types/output.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import { CATEGORY_ASPECT_RATIOS, resolveAspectRatio, supportsAspectRatio } from './categoryAspectRatios.ts';
import { aspectRatioChoices } from './output/aspectRatioChoices.ts';
import { PRESETS } from './presets/index.ts';

describe('the sheet canvas each category can be drawn on', () => {
  it('binds ICON alone, to the square its four-by-four grid of square cells needs', () => {
    const bound = SUBJECT_CATEGORIES.filter(
      (category) => CATEGORY_ASPECT_RATIOS[category].length < ASPECT_RATIOS.length,
    );
    expect(bound).toEqual(['ICON']);
    expect(CATEGORY_ASPECT_RATIOS.ICON).toEqual(['SQUARE_1_1']);
  });

  it.each(SUBJECT_CATEGORIES)('offers %s at least one canvas, and the control the same list', (category) => {
    expect(CATEGORY_ASPECT_RATIOS[category].length).toBeGreaterThan(0);
    expect(aspectRatioChoices(category).map((choice) => choice.value)).toEqual(
      ASPECT_RATIOS.filter((ratio) => supportsAspectRatio(category, ratio)),
    );
  });

  it('degrades a canvas a category cannot use to its first, and keeps one it can', () => {
    expect(resolveAspectRatio('ICON', 'WIDE_16_9')).toBe('SQUARE_1_1');
    expect(resolveAspectRatio('ICON', 'SQUARE_1_1')).toBe('SQUARE_1_1');
    expect(resolveAspectRatio('CHARACTER', 'TALL_9_16')).toBe('TALL_9_16');
    for (const category of SUBJECT_CATEGORIES) {
      for (const ratio of ASPECT_RATIOS) {
        expect(supportsAspectRatio(category, resolveAspectRatio(category, ratio))).toBe(true);
      }
    }
  });

  it.each(PRESETS)('$name ships a canvas its own category can be drawn on', (preset) => {
    expect(supportsAspectRatio(preset.category, preset.output.aspectRatio)).toBe(true);
  });
});
