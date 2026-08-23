import { describe, expect, it } from 'vitest';
import type { ResolutionProfile } from '../../types/output.ts';
import { componentTargetSize } from '../../utils/componentTargetSize.ts';
import { parseTargetSize } from '../../utils/targetSize.ts';
import { smallScaleDiscipline } from './smallScale.ts';

/**
 * The bullets for a field a reader would have typed.
 *
 * The size arrives parsed, because that is how the compiler hands it over — through
 * `componentTargetSize`. The prose stays written out here so each case still reads as the field.
 */
function bulletsFor(profile: ResolutionProfile, spriteTargetSize: string): string {
  return smallScaleDiscipline(profile, parseTargetSize(spriteTargetSize));
}

describe('smallScaleDiscipline', () => {
  it('adds the sprite-scale bullets at the sizes real sprites are drawn at', () => {
    const bullets = bulletsFor('CUSTOM', '16 × 16 px');
    expect(bullets).toContain('silhouette-first');
    expect(bullets).toContain('Prefer one large readable feature');
    expect(bullets).toContain('at 1:1 against the background field');
  });

  it('never restates the size as a per-component fact', () => {
    // The target names a typical whole figure, and section 0 requires the components to be in
    // proportion to each other — so a bullet claiming each component *is* 16 × 16 would contradict
    // that rule on every multi-part sheet. The target-size line above the bullets already states
    // the figure in the field's own words.
    const bullets = bulletsFor('CUSTOM', '16 × 16 px');
    expect(bullets).not.toContain('16 × 16');
    expect(bullets).not.toContain('256');
  });

  it('speaks of silhouettes, never of outlines', () => {
    // `OUTLINE_LESS_ALBEDO` puts "No outline" a few lines up in the same section, so a bullet that
    // leaned on "the outline shape" would hand the generator a contradiction to resolve.
    expect(bulletsFor('CUSTOM', '16 × 16 px')).not.toMatch(/outline/iu);
  });

  it('keys on the smaller edge, which is the one detail runs out on', () => {
    // The same reduction `minFeatureSize` uses, for the same reason: a 16 × 512 polearm has sixteen
    // columns, and it is the sixteen that decide whether the silhouette is the identity.
    expect(bulletsFor('CUSTOM', '16 × 512 px')).not.toBe('');
    expect(bulletsFor('CUSTOM', '512 × 16 px')).not.toBe('');
  });

  it('answers nothing at the sizes where interior forms read on their own', () => {
    expect(bulletsFor('CUSTOM', '33 × 33 px')).toBe('');
    expect(bulletsFor('CUSTOM', '48 × 96 px assembled (2 metres tall at 48 px per metre)')).toBe('');
  });

  it('still fires at exactly the boundary', () => {
    // 32 is the classic console sprite and the coarsest size where silhouette is the identity, so
    // the boundary is inclusive.
    expect(bulletsFor('CUSTOM', '32 × 32 px')).not.toBe('');
  });

  it('answers nothing for the profiles that are a scale of their own', () => {
    // Only `CUSTOM` consults the free-text size — the other three profiles state their own figure,
    // and the coarsest of them is well past sprite scale. A size left in the field cannot move them,
    // exactly as it cannot move `minFeatureSize`.
    expect(bulletsFor('RETRO_16_BIT', '16 × 16 px')).toBe('');
    expect(bulletsFor('HIGH_RESOLUTION', '16 × 16 px')).toBe('');
    expect(bulletsFor('MID_RESOLUTION', '16 × 16 px')).toBe('');
  });

  it('answers nothing when no size can be read', () => {
    expect(bulletsFor('CUSTOM', '')).toBe('');
    expect(bulletsFor('CUSTOM', 'as big as it needs to be')).toBe('');
  });

  it('answers nothing on a cut-out rig sheet, whose stated size is the assembly', () => {
    // These bullets are about how one component is drawn, and they point "above" at a line that
    // says *component* — which on a rig sheet says *assembled* instead. `componentTargetSize` is
    // what withholds the figure, so the sentence and the line it cites cannot come apart.
    const assembled = componentTargetSize('CHARACTER', 'CUTOUT_RIG_SINGLE_DIRECTION', '24 × 24 px assembled');
    expect(assembled).toBeNull();
    expect(smallScaleDiscipline('CUSTOM', assembled)).toBe('');
    // The same words on a pose library, whose components *are* the figure, still fire — so the
    // withdrawal is about the sheet rather than about the size being small.
    expect(bulletsFor('CUSTOM', '24 × 24 px assembled')).not.toBe('');
  });
});
