import { describe, expect, it } from 'vitest';
import type { ResolutionProfile } from '../../types/output.ts';
import { componentTargetSize } from '../../utils/componentTargetSize.ts';
import { parseTargetSize } from '../../utils/targetSize.ts';
import { minFeatureSize } from './renderStyle.ts';

/**
 * The figure alone, which is what the rungs below are about — the unit has its own test.
 *
 * It is taken off the stated measurement rather than from a second export, so a rung assertion still
 * fails if the suffix stops being there at all.
 */
const NATIVE = ' native pixels';
function figure(profile: ResolutionProfile, spriteTargetSize: string): string {
  const stated = minFeatureSize(profile, parseTargetSize(spriteTargetSize), true);
  expect(stated.endsWith(NATIVE), stated).toBe(true);
  return stated.slice(0, -NATIVE.length);
}

/**
 * The pixel-discipline minimum, which is a function of the scale rather than a lookup on the
 * profile — because one of the four profiles carries no scale of its own.
 */
describe('minFeatureSize', () => {
  it('gives each fixed profile the minimum its own scale affords', () => {
    expect(figure('HIGH_RESOLUTION', '')).toBe('3 × 3');
    expect(figure('MID_RESOLUTION', '')).toBe('2 × 2');
    expect(figure('RETRO_16_BIT', '')).toBe('1 × 1');
  });

  it('ignores a target size on a profile that already states its own scale', () => {
    // Those three *are* a scale, so a size left in the field cannot move them. Only `CUSTOM` defers
    // to it, which is what keeps the two statements of scale from arguing.
    expect(figure('HIGH_RESOLUTION', '16 × 16 px')).toBe('3 × 3');
    expect(figure('RETRO_16_BIT', '512 × 512 px')).toBe('1 × 1');
  });

  it('lets CUSTOM reach single-pixel detail at the sizes sprites are actually drawn at', () => {
    // The defect a flat `2 × 2` for every `CUSTOM` configuration produced: a 16-pixel icon whose
    // smallest permitted feature was four pixels asked for a sprite drawn in sixteenths of itself,
    // and the generator resolved that by discarding one half of the instruction.
    expect(figure('CUSTOM', '16 × 16 px')).toBe('1 × 1');
    expect(figure('CUSTOM', '32 × 32 px')).toBe('1 × 1');
    // The same prose on a sheet whose components *are* the figure — a rig sheet withholds it
    // instead, which the case at the foot of this file drives.
    expect(figure('CUSTOM', '48 × 96 px assembled (2 metres tall at 48 px per metre)')).toBe('1 × 1');
  });

  it('climbs the rungs as the stated component grows', () => {
    expect(figure('CUSTOM', '128 × 128 px')).toBe('1 × 1');
    expect(figure('CUSTOM', '129 × 129 px')).toBe('2 × 2');
    expect(figure('CUSTOM', '256 × 256 px')).toBe('2 × 2');
    expect(figure('CUSTOM', '512 × 512 px')).toBe('3 × 3');
  });

  it('keys on the smaller edge, which is the one detail runs out on', () => {
    // A polearm is a hundred and twenty-eight rows and sixteen columns, and it is the sixteen that
    // decide what a feature can cost. Keying on height would call this mid-resolution.
    expect(figure('CUSTOM', '16 × 512 px')).toBe('1 × 1');
    expect(figure('CUSTOM', '512 × 16 px')).toBe('1 × 1');
  });

  it('falls back to the middle rung when CUSTOM states no readable size', () => {
    // `CUSTOM` then means "work to the sheet aspect", so there is no scale to reason from and
    // neither extreme can be justified.
    expect(figure('CUSTOM', '')).toBe('2 × 2');
    expect(figure('CUSTOM', 'as big as it needs to be')).toBe('2 × 2');
    expect(figure('CUSTOM', '2 metres tall at 48 px per metre')).toBe('2 × 2');
  });

  it('counts native pixels only where the prompt defines one, and delivered pixels otherwise', () => {
    // The defect: the bullet said *native pixels* on every pixel-art sheet, while the block defining
    // a native pixel is gated on a far narrower condition — so the app's own default configuration
    // stated a measurement in a unit its prompt never established.
    expect(minFeatureSize('CUSTOM', { width: 16, height: 32 }, true)).toBe('1 × 1 native pixels');
    expect(minFeatureSize('HIGH_RESOLUTION', null, false)).toBe('3 × 3 delivered pixels');
    // The figure does not move with the unit — only the noun does.
    expect(minFeatureSize('MID_RESOLUTION', null, true)).toBe('2 × 2 native pixels');
    expect(minFeatureSize('MID_RESOLUTION', null, false)).toBe('2 × 2 delivered pixels');
  });

  it('falls back to the middle rung on a cut-out rig sheet, whose stated size is the assembly', () => {
    // A rig sheet's components are a head, a torso, a pelvis and twelve limb segments, so the 48 × 96
    // it states is the figure they assemble into. Keyed off that, the floor above claimed a
    // per-component minimum derived from a number no component has — so `componentTargetSize`
    // withholds it, and `CUSTOM` falls back to the rung it uses whenever there is no scale to reason
    // from. `US_CHARACTER_RIG`'s own field, so the shipped presets are covered by this rung now.
    const assembled = componentTargetSize(
      'CHARACTER',
      'CUTOUT_RIG_SINGLE_DIRECTION',
      '48 × 96 px assembled (2 metres tall at 48 px per metre)',
    );
    expect(assembled).toBeNull();
    expect(minFeatureSize('CUSTOM', assembled, true)).toBe('2 × 2 native pixels');
  });
});
