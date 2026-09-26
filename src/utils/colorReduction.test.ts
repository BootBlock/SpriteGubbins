import { describe, expect, it } from 'vitest';
import { PALETTE_COLOR_COUNTS } from '../constants/quantiser.ts';
import { PALETTE_IDS } from '../types/palette.ts';
import { PALETTE_LIMITS } from '../types/output.ts';
import { colorPlanFor } from './colorReduction.ts';
import { studioColors } from '../test/studioColors.ts';

/**
 * Where "a pinned palette supersedes the colour budget" is turned into a decision.
 *
 * The rule is stated in three other places — the template's `[IF:PALETTE!=yes]`, the note under the
 * budget control, and the studio digest — and this is the only one a test can hold to account
 * directly, so it is where the rule is pinned rather than merely described.
 */

describe('colorPlanFor — what happens to the colours', () => {
  it('reads the budget when no palette is pinned', () => {
    expect(colorPlanFor(studioColors('FREE', 'STRICT_32_COLOR'), null, 0).reduction).toEqual({
      kind: 'MAX_COLORS',
      maxColors: 32,
    });
    expect(colorPlanFor(studioColors('FREE', 'RESTRAINED_64_COLOR'), null, 0).reduction).toEqual({
      kind: 'MAX_COLORS',
      maxColors: 64,
    });
  });

  it('does nothing at all for UNRESTRICTED with no palette', () => {
    // `null` rather than a generous cap: a painted sheet has no colour budget to enforce, and a high
    // cap is still a cap.
    expect(PALETTE_COLOR_COUNTS.UNRESTRICTED).toBeNull();
    expect(colorPlanFor(studioColors('FREE', 'UNRESTRICTED'), null, 0).reduction).toBeNull();
  });

  it('reduces to the budget the render style is drawn under, which the prompt states', () => {
    // `RETRO_PIXEL_ART` names a small palette, so a stored `UNRESTRICTED` is stated in the prompt as
    // the budget that style falls back to — and a quantiser leaving the sheet alone would disagree
    // with the prompt it was generated from (issue #406).
    const retro = colorPlanFor(studioColors('FREE', 'UNRESTRICTED', null, 'RETRO_PIXEL_ART'), null, 0);
    expect(retro.reduction).toEqual({ kind: 'MAX_COLORS', maxColors: 64 });
    expect(retro.setting).toBe('RESTRAINED_64_COLOR');
    // A validation pass withdraws the budget line without changing the colour policy.
    expect(
      colorPlanFor(studioColors('FREE', 'UNRESTRICTED', null, 'CLAY_RENDER'), null, 0).reduction,
    ).toBeNull();
  });

  it.each(PALETTE_LIMITS)('ignores the %s budget entirely once a palette is pinned', (limit) => {
    // The whole rule in one assertion, across every budget the studio offers: the answer for a
    // pinned palette does not depend on the limit, including the `UNRESTRICTED` case that would
    // otherwise reduce nothing.
    expect(colorPlanFor(studioColors('NES', limit), null, 0)).toEqual(
      colorPlanFor(studioColors('NES', 'UNRESTRICTED'), null, 0),
    );
    expect(colorPlanFor(studioColors('MEGA_DRIVE', limit), null, 0)).toEqual(
      colorPlanFor(studioColors('MEGA_DRIVE', 'UNRESTRICTED'), null, 0),
    );
  });

  it.each(PALETTE_IDS)('resolves %s to something the quantiser can act on', (id) => {
    // Completeness: every member of the union, including the ones no shipped profile pins. A palette
    // that resolved to `null` would be one the studio says is pinned and the quantiser ignores.
    //
    // The two machineless ids are the exception and mean different things by it. `FREE` pins
    // nothing at all; `CUSTOM` pins nothing *yet*, because this case loads no colours into it — and
    // the studio says the same by leaving the budget control on screen for both.
    const { reduction } = colorPlanFor(studioColors(id, 'UNRESTRICTED'), null, 0);
    if (id === 'FREE' || id === 'CUSTOM') {
      expect(reduction).toBeNull();
      return;
    }
    expect(reduction).not.toBeNull();
    expect(reduction?.kind).not.toBe('MAX_COLORS');
  });

  it('maps onto the reader’s own colours once CUSTOM has some', () => {
    // The whole point of the member: a palette nothing in this repository declares reaches the
    // quantiser as the same `PALETTE` reduction a machine's list does.
    const plan = colorPlanFor(
      studioColors('CUSTOM', 'STRICT_32_COLOR', { name: 'Dusk Harbour', entries: ['#102030', '#405060'] }),
      null,
      0,
    );

    expect(plan.reduction).toEqual({
      kind: 'PALETTE',
      entries: [
        { r: 16, g: 32, b: 48, a: 255 },
        { r: 64, g: 80, b: 96, a: 255 },
      ],
    });
    // Named for the reader rather than by the identifier, which names the control and not the set.
    expect(plan.setting).toBe('Dusk Harbour');
    expect(plan.effect).toContain('2 fixed colours');

    // Singular where the list holds one, which only a palette the reader loaded can be.
    const one = colorPlanFor(
      studioColors('CUSTOM', 'STRICT_32_COLOR', { name: '', entries: ['#102030'] }),
      null,
      0,
    );
    expect(one.effect).toContain('1 fixed colour');
    expect(one.effect).not.toContain('1 fixed colours');
  });

  it('hands the quantiser opaque colours, since a palette entry is a colour and not a compositing state', () => {
    expect(colorPlanFor(studioColors('CGA_MODE_4', 'UNRESTRICTED'), null, 0).reduction).toEqual({
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
    const plan = colorPlanFor(studioColors('FREE', 'STRICT_32_COLOR'), null, 0);
    expect(plan.setting).toBe('STRICT_32_COLOR');
    expect(plan.effect).toContain('32 colours');
  });

  it('names the palette, not the budget, the moment one is pinned', () => {
    const plan = colorPlanFor(studioColors('GAME_BOY_DMG', 'STRICT_32_COLOR'), null, 0);
    expect(plan.setting).toBe('GAME_BOY_DMG');
    expect(plan.effect).toContain('4 fixed colours');
    expect(plan.effect).not.toContain('32');
  });

  it('describes a colour space as a ladder rather than as a count of entries', () => {
    const plan = colorPlanFor(studioColors('MEGA_DRIVE', 'UNRESTRICTED'), null, 0);
    expect(plan.setting).toBe('MEGA_DRIVE');
    expect(plan.effect).toContain('8 levels');
  });

  it.each(PALETTE_IDS)('%s always has something to say', (id) => {
    // The panel renders `setting — effect` unconditionally, so an empty half would print a dangling
    // dash. The `UNRESTRICTED` case is the one with no transform behind it and it still describes
    // itself.
    const plan = colorPlanFor(studioColors(id, 'UNRESTRICTED'), null, 0);
    expect(plan.setting).not.toBe('');
    expect(plan.effect).not.toBe('');
  });
});

const LOCK = {
  entries: [
    { r: 10, g: 20, b: 30, a: 255 },
    { r: 200, g: 100, b: 50, a: 255 },
  ],
  studioIdentity: 'RESTRAINED_64_COLOR',
  sheetName: 'armour.png',
} as const;

/**
 * The second half of the same rule: a palette locked on the quantiser tab supersedes both studio
 * settings, and says so where the studio has moved on since it was taken.
 *
 * Pinned here rather than left to the panel, because the panel reads the plan: a component test
 * could only ever check that it renders what this decided.
 */
describe('colorPlanFor — a locked palette', () => {
  it.each(PALETTE_IDS)('supersedes %s, whatever the studio pinned', (id) => {
    expect(colorPlanFor(studioColors(id, 'STRICT_32_COLOR'), LOCK, 20).reduction).toEqual({
      kind: 'LOCKED',
      entries: LOCK.entries,
      snap: 20,
    });
  });

  it('carries the snap distance into the instruction rather than beside it', () => {
    // Two locks holding the same colours at two distances are two different transforms, so the
    // figure has to travel with the entries — see `sameQuantiseSettings`.
    expect(colorPlanFor(studioColors('FREE', 'UNRESTRICTED'), LOCK, 8).reduction).toEqual({
      kind: 'LOCKED',
      entries: LOCK.entries,
      snap: 8,
    });
  });

  it('names nothing as superseded while the studio setting is the one it was locked under', () => {
    const plan = colorPlanFor(studioColors('FREE', 'RESTRAINED_64_COLOR'), LOCK, 20);

    expect(plan.superseded).toBeNull();
    expect(plan.studioSetting).toBe('RESTRAINED_64_COLOR');
    expect(plan.setting).toBe('Locked palette');
  });

  it('names the studio setting it is overriding once the two have parted company', () => {
    // The one state where the supersession is a surprise: a palette locked under a budget, still
    // applied after the studio has been pinned to a machine whose colours it may not even hold.
    const plan = colorPlanFor(studioColors('GAME_BOY_DMG', 'RESTRAINED_64_COLOR'), LOCK, 20);

    expect(plan.superseded).toBe('GAME_BOY_DMG');
    expect(plan.studioSetting).toBe('GAME_BOY_DMG');
  });

  it('reports the studio setting a re-lock should record, not the lock in force', () => {
    // What `PaletteLockControls` stamps a new lock with. Reading `setting` instead would stamp it
    // with the name of the palette it replaced, and the two could never part company again.
    expect(colorPlanFor(studioColors('FREE', 'STRICT_32_COLOR'), LOCK, 20).studioIdentity).toBe(
      'STRICT_32_COLOR',
    );
  });

  it('decides a custom palette’s supersession on its colours rather than on its name', () => {
    // A name cannot answer "has the studio moved" for a palette the reader loaded: a pasted list
    // states none at all, so two entirely different ones are both called `Custom`. Locked under one
    // and left standing over the other, the notice this field exists for would never appear.
    const first = studioColors('CUSTOM', 'STRICT_32_COLOR', { name: '', entries: ['#102030'] });
    const second = studioColors('CUSTOM', 'STRICT_32_COLOR', { name: '', entries: ['#405060'] });
    const lock = { ...LOCK, studioIdentity: colorPlanFor(first, null, 0).studioIdentity };

    expect(colorPlanFor(first, lock, 20).superseded).toBeNull();
    expect(colorPlanFor(second, lock, 20).superseded).toBe('Custom');
  });

  it('supersedes nothing when a palette is renamed and its colours are not', () => {
    // The other direction, and the reason the identity is the colours rather than name-plus-colours:
    // renaming a pinned palette changes no pixel of the sheet, so there is nothing to report.
    const before = studioColors('CUSTOM', 'STRICT_32_COLOR', { name: 'Dusk', entries: ['#102030'] });
    const after = studioColors('CUSTOM', 'STRICT_32_COLOR', { name: 'Dusk Harbour', entries: ['#102030'] });
    const lock = { ...LOCK, studioIdentity: colorPlanFor(before, null, 0).studioIdentity };

    expect(colorPlanFor(after, lock, 20).superseded).toBeNull();
    // What the tab calls it does move, because that is what the reader just changed.
    expect(colorPlanFor(after, lock, 20).studioSetting).toBe('Dusk Harbour');
  });

  it('supersedes nothing at a snap distance of zero, where it reaches nothing', () => {
    // The cliff this avoids, measured on the reference sheet: a lock that superseded the budget
    // while taking no colour at all left the sheet unreduced, so dragging one dial to its off
    // position took a 64-colour sheet to 9,975. A dial's off position means its own pass does not
    // run, never that another one stops running with it.
    expect(colorPlanFor(studioColors('FREE', 'STRICT_32_COLOR'), LOCK, 0)).toEqual(
      colorPlanFor(studioColors('FREE', 'STRICT_32_COLOR'), null, 0),
    );
    expect(colorPlanFor(studioColors('GAME_BOY_DMG', 'UNRESTRICTED'), LOCK, 0).superseded).toBeNull();
    expect(colorPlanFor(studioColors('FREE', 'UNRESTRICTED'), LOCK, 20).effect).toContain('armour.png');
  });
});
