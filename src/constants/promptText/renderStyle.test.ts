import { describe, expect, it } from 'vitest';
import { minFeatureSize } from './renderStyle.ts';

/**
 * The pixel-discipline minimum, which is a function of the scale rather than a lookup on the
 * profile — because one of the four profiles carries no scale of its own.
 */
describe('minFeatureSize', () => {
  it('gives each fixed profile the minimum its own scale affords', () => {
    expect(minFeatureSize('HIGH_RESOLUTION', '')).toBe('3 × 3');
    expect(minFeatureSize('MID_RESOLUTION', '')).toBe('2 × 2');
    expect(minFeatureSize('RETRO_16_BIT', '')).toBe('1 × 1');
  });

  it('ignores a target size on a profile that already states its own scale', () => {
    // Those three *are* a scale, so a size left in the field cannot move them. Only `CUSTOM` defers
    // to it, which is what keeps the two statements of scale from arguing.
    expect(minFeatureSize('HIGH_RESOLUTION', '16 × 16 px')).toBe('3 × 3');
    expect(minFeatureSize('RETRO_16_BIT', '512 × 512 px')).toBe('1 × 1');
  });

  it('lets CUSTOM reach single-pixel detail at the sizes sprites are actually drawn at', () => {
    // The defect a flat `2 × 2` for every `CUSTOM` configuration produced: a 16-pixel icon whose
    // smallest permitted feature was four pixels asked for a sprite drawn in sixteenths of itself,
    // and the generator resolved that by discarding one half of the instruction.
    expect(minFeatureSize('CUSTOM', '16 × 16 px')).toBe('1 × 1');
    expect(minFeatureSize('CUSTOM', '32 × 32 px')).toBe('1 × 1');
    // `US_CHARACTER_RIG`'s own field, so the shipped presets are covered by this rung too.
    expect(minFeatureSize('CUSTOM', '48 × 96 px assembled (2 metres tall at 48 px per metre)')).toBe('1 × 1');
  });

  it('climbs the rungs as the stated component grows', () => {
    expect(minFeatureSize('CUSTOM', '128 × 128 px')).toBe('1 × 1');
    expect(minFeatureSize('CUSTOM', '129 × 129 px')).toBe('2 × 2');
    expect(minFeatureSize('CUSTOM', '256 × 256 px')).toBe('2 × 2');
    expect(minFeatureSize('CUSTOM', '512 × 512 px')).toBe('3 × 3');
  });

  it('keys on the smaller edge, which is the one detail runs out on', () => {
    // A polearm is a hundred and twenty-eight rows and sixteen columns, and it is the sixteen that
    // decide what a feature can cost. Keying on height would call this mid-resolution.
    expect(minFeatureSize('CUSTOM', '16 × 512 px')).toBe('1 × 1');
    expect(minFeatureSize('CUSTOM', '512 × 16 px')).toBe('1 × 1');
  });

  it('falls back to the middle rung when CUSTOM states no readable size', () => {
    // `CUSTOM` then means "work to the sheet aspect", so there is no scale to reason from and
    // neither extreme can be justified.
    expect(minFeatureSize('CUSTOM', '')).toBe('2 × 2');
    expect(minFeatureSize('CUSTOM', 'as big as it needs to be')).toBe('2 × 2');
    expect(minFeatureSize('CUSTOM', '2 metres tall at 48 px per metre')).toBe('2 × 2');
  });
});
