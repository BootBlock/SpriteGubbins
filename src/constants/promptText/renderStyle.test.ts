import { describe, expect, it } from 'vitest';
import type { ResolutionProfile } from '../../types/output.ts';
import { statedTargetSize } from '../../utils/componentTargetSize.ts';
import { parseTargetSize } from '../../utils/targetSize.ts';
import { minFeatureSize, resolutionProfileDescription } from './renderStyle.ts';

/**
 * The figure alone, which is what the rungs below are about — the unit has its own test.
 *
 * It is taken off the stated measurement rather than from a second export, so a rung assertion still
 * fails if the suffix stops being there at all.
 */
const NATIVE = ' native pixels';
function figure(profile: ResolutionProfile, spriteTargetSize: string): string {
  const size = parseTargetSize(spriteTargetSize);
  const stated = minFeatureSize(profile, size === null ? null : { quantity: 'COMPONENT', size }, true);
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
    // The same prose read as a component size, which is what a sheet of whole deliverable units
    // makes it — the word “assembled” is the preset author's and nothing here parses it. The case at
    // the foot of this file drives the other reading, on a sheet whose components are parts.
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
    expect(minFeatureSize('CUSTOM', { quantity: 'COMPONENT', size: { width: 16, height: 32 } }, true)).toBe(
      '1 × 1 native pixels',
    );
    expect(minFeatureSize('HIGH_RESOLUTION', null, false)).toBe('3 × 3 delivered pixels');
    // The figure does not move with the unit — only the noun does.
    expect(minFeatureSize('MID_RESOLUTION', null, true)).toBe('2 × 2 native pixels');
    expect(minFeatureSize('MID_RESOLUTION', null, false)).toBe('2 × 2 delivered pixels');
  });

  it('takes the finest rung where the stated size is the assembly, never a coarser guess', () => {
    // A rig sheet's components are a head, a torso, a pelvis and twelve limb segments, so the size
    // it states is the figure they assemble into and no rung can be derived from it. Two wrong
    // answers were available and both are coarser than the truth: the rung of the assembly is at
    // least as coarse as the rung of any piece of it, and the unstated middle rung is `2 × 2`. A
    // floor that is too coarse forbids detail a small piece legitimately needs, where one that is
    // too fine is merely inert — so the finest rung is the only answer that cannot be wrong.
    const assembled = statedTargetSize(
      'CHARACTER',
      'CUTOUT_RIG_SINGLE_DIRECTION',
      'SINGLE_FRONT',
      0,
      '480 × 960 px assembled',
    );
    expect(assembled).toEqual({ quantity: 'ASSEMBLED', size: { width: 480, height: 960 } });
    // 480 would be past the last rung as a component size, which is what makes this case the one
    // that shows the difference: `3 × 3` on limb segments a few dozen pixels across.
    expect(figure('CUSTOM', '480 × 960 px')).toBe('3 × 3');
    expect(minFeatureSize('CUSTOM', assembled, false)).toBe('1 × 1 delivered pixels');

    // And the three shipped rig presets that carry CUSTOM keep the floor they always had — each
    // sits on the finest rung by its assembled edge, so this restores rather than changes them.
    for (const size of ['64 × 96 px assembled', '56 × 88 px assembled', '64 × 80 px assembled']) {
      const rig = statedTargetSize('CHARACTER', 'CUTOUT_RIG_SINGLE_DIRECTION', 'SINGLE_FRONT', 0, size);
      expect(minFeatureSize('CUSTOM', rig, false)).toBe('1 × 1 delivered pixels');
    }
  });

  it('states what CUSTOM works to, and never names a component on a sheet that has no such size', () => {
    // The two are printed one line apart in section 2, so a flat lookup here told the generator to
    // work to a component size directly above a line stating a size and saying no component is it.
    expect(resolutionProfileDescription('CUSTOM', false)).toContain('target component size');
    expect(resolutionProfileDescription('CUSTOM', true)).toContain('target assembled size');
    expect(resolutionProfileDescription('CUSTOM', true)).not.toContain('component size');

    // The three that *are* a scale read the same either way — the assembled answer is CUSTOM's
    // alone, because CUSTOM is the only profile that defers to the field.
    for (const profile of ['HIGH_RESOLUTION', 'MID_RESOLUTION', 'RETRO_16_BIT'] as const) {
      expect(resolutionProfileDescription(profile, true)).toBe(resolutionProfileDescription(profile, false));
    }
  });
});
