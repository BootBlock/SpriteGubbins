import { describe, expect, it } from 'vitest';
import { PALETTE_COLOR_COUNTS } from '../constants/quantiser.ts';
import { PALETTE_IDS } from '../types/palette.ts';
import { PALETTE_LIMITS } from '../types/output.ts';
import { colorPlanFor } from './colorReduction.ts';

/**
 * Where "a pinned palette supersedes the colour budget" is turned into a decision.
 *
 * The rule is stated in three other places — the template's `[IF:PALETTE!=yes]`, the note under the
 * budget control, and the studio digest — and this is the only one a test can hold to account
 * directly, so it is where the rule is pinned rather than merely described.
 */

describe('colorPlanFor — what happens to the colours', () => {
  it('reads the budget when no palette is pinned', () => {
    expect(colorPlanFor('FREE', 'STRICT_32_COLOR').reduction).toEqual({
      kind: 'MAX_COLORS',
      maxColors: 32,
    });
    expect(colorPlanFor('FREE', 'RESTRAINED_64_COLOR').reduction).toEqual({
      kind: 'MAX_COLORS',
      maxColors: 64,
    });
  });

  it('does nothing at all for UNRESTRICTED with no palette', () => {
    // `null` rather than a generous cap: a painted sheet has no colour budget to enforce, and a high
    // cap is still a cap.
    expect(PALETTE_COLOR_COUNTS.UNRESTRICTED).toBeNull();
    expect(colorPlanFor('FREE', 'UNRESTRICTED').reduction).toBeNull();
  });

  it.each(PALETTE_LIMITS)('ignores the %s budget entirely once a palette is pinned', (limit) => {
    // The whole rule in one assertion, across every budget the studio offers: the answer for a
    // pinned palette does not depend on the limit, including the `UNRESTRICTED` case that would
    // otherwise reduce nothing.
    expect(colorPlanFor('NES', limit)).toEqual(colorPlanFor('NES', 'UNRESTRICTED'));
    expect(colorPlanFor('MEGA_DRIVE', limit)).toEqual(colorPlanFor('MEGA_DRIVE', 'UNRESTRICTED'));
  });

  it.each(PALETTE_IDS)('resolves %s to something the quantiser can act on', (id) => {
    // Completeness: every member of the union, including the ones no shipped profile pins. A palette
    // that resolved to `null` would be one the studio says is pinned and the quantiser ignores.
    const { reduction } = colorPlanFor(id, 'UNRESTRICTED');
    if (id === 'FREE') {
      expect(reduction).toBeNull();
      return;
    }
    expect(reduction).not.toBeNull();
    expect(reduction?.kind).not.toBe('MAX_COLORS');
  });

  it('hands the quantiser opaque colours, since a palette entry is a colour and not a compositing state', () => {
    expect(colorPlanFor('CGA_MODE_4', 'UNRESTRICTED').reduction).toEqual({
      kind: 'PALETTE',
      entries: [
        { r: 0, g: 0, b: 0, a: 255 },
        { r: 85, g: 255, b: 255, a: 255 },
        { r: 255, g: 85, b: 255, a: 255 },
        { r: 255, g: 255, b: 255, a: 255 },
      ],
    });
  });
});

describe('colorPlanFor — what the tab says it is doing', () => {
  /**
   * The words and the transform come from one branch, which is the point of returning them together:
   * the quantiser's panel sits beside the preview, and it once reported the colour budget while the
   * pipeline mapped to four greens.
   */
  it('names the budget while the budget is what decides', () => {
    const plan = colorPlanFor('FREE', 'STRICT_32_COLOR');
    expect(plan.setting).toBe('STRICT_32_COLOR');
    expect(plan.effect).toContain('32 colours');
  });

  it('names the palette, not the budget, the moment one is pinned', () => {
    const plan = colorPlanFor('GAME_BOY_DMG', 'STRICT_32_COLOR');
    expect(plan.setting).toBe('GAME_BOY_DMG');
    expect(plan.effect).toContain('4 fixed colours');
    expect(plan.effect).not.toContain('32');
  });

  it('describes a colour space as a ladder rather than as a count of entries', () => {
    const plan = colorPlanFor('MEGA_DRIVE', 'UNRESTRICTED');
    expect(plan.setting).toBe('MEGA_DRIVE');
    expect(plan.effect).toContain('8 levels');
  });

  it.each(PALETTE_IDS)('%s always has something to say', (id) => {
    // The panel renders `setting — effect` unconditionally, so an empty half would print a dangling
    // dash. The `UNRESTRICTED` case is the one with no transform behind it and it still describes
    // itself.
    const plan = colorPlanFor(id, 'UNRESTRICTED');
    expect(plan.setting).not.toBe('');
    expect(plan.effect).not.toBe('');
  });
});
