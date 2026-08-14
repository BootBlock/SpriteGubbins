import { describe, expect, it } from 'vitest';
import { smallScaleDiscipline } from './smallScale.ts';

describe('smallScaleDiscipline', () => {
  it('adds the sprite-scale bullets at the sizes real sprites are drawn at', () => {
    const bullets = smallScaleDiscipline('CUSTOM', '16 × 16 px');
    expect(bullets).toContain('silhouette-first');
    expect(bullets).toContain('Prefer one large readable feature');
    expect(bullets).toContain('at 1:1 against the background field');
  });

  it('derives the dimensions and the pixel count from the stated target', () => {
    // Two places stating one fact share a source, per the compiler's own rule — so the numbers in
    // the bullet are read out of the same parse the target-size line uses, never written again.
    expect(smallScaleDiscipline('CUSTOM', '16 × 16 px')).toContain('16 × 16 px — 256 pixels in all');
    expect(smallScaleDiscipline('CUSTOM', '24 × 32 px')).toContain('24 × 32 px — 768 pixels in all');
  });

  it('keys on the smaller edge, which is the one detail runs out on', () => {
    // The same reduction `minFeatureSize` uses, for the same reason: a 16 × 512 polearm has sixteen
    // columns, and it is the sixteen that decide whether the silhouette is the identity.
    expect(smallScaleDiscipline('CUSTOM', '16 × 512 px')).not.toBe('');
    expect(smallScaleDiscipline('CUSTOM', '512 × 16 px')).not.toBe('');
  });

  it('answers nothing at the sizes where interior forms read on their own', () => {
    expect(smallScaleDiscipline('CUSTOM', '33 × 33 px')).toBe('');
    expect(smallScaleDiscipline('CUSTOM', '48 × 96 px assembled (2 metres tall at 48 px per metre)')).toBe(
      '',
    );
  });

  it('still fires at exactly the boundary', () => {
    // 32 is the classic console sprite and the coarsest size where silhouette is the identity, so
    // the boundary is inclusive.
    expect(smallScaleDiscipline('CUSTOM', '32 × 32 px')).not.toBe('');
  });

  it('answers nothing for the profiles that are a scale of their own', () => {
    // Only `CUSTOM` consults the free-text size — the other three profiles state their own figure,
    // and the coarsest of them is well past sprite scale. A size left in the field cannot move them,
    // exactly as it cannot move `minFeatureSize`.
    expect(smallScaleDiscipline('RETRO_16_BIT', '16 × 16 px')).toBe('');
    expect(smallScaleDiscipline('HIGH_RESOLUTION', '16 × 16 px')).toBe('');
    expect(smallScaleDiscipline('MID_RESOLUTION', '16 × 16 px')).toBe('');
  });

  it('answers nothing when no size can be read', () => {
    expect(smallScaleDiscipline('CUSTOM', '')).toBe('');
    expect(smallScaleDiscipline('CUSTOM', 'as big as it needs to be')).toBe('');
  });
});
